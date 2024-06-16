import {jest} from '@jest/globals';
import raesumResponses from "../../src/modules/raesumResponses.js";
import path from "path";
import fs from "fs";
import Joi from "joi";

import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


describe("Raesum API Responses", () => {

    test('Get a Message',async ()=> {
        const response = await raesumResponses.get("success");
        expect(response.title).toBe("Success");
    });


    test('Get a Message that does not exist',async ()=> {

        expect.assertions(1);

        try {
            await raesumResponses.get("nonexistent");
        } catch (error) {
            expect(error.message).toBe('Response key not found');
        }
    });


    test('Get a Message with a variable',async ()=> {
        const response = await raesumResponses.get("requestMissingFields",["TEST"]);
        //await raesumResponses.get("requestMissingFields",["moo"]);
        expect(response.message).toBe("The request is missing fields: TEST");
    });


    test('Get a Message with a variable missing',async ()=> {
        expect.assertions(1);

        try {
            await raesumResponses.get("requestMissingFields");
        } catch (error) {
            expect(error.message).toBe('Variable count does not match');
        }


    });

});

describe("Raesum API Responses Validation", () => {

    // Load the JSON file
    const dirPath = path.join(__dirname, '..','..', 'controlledData');
    const responseJSON = JSON.parse(fs.readFileSync(path.join(dirPath, "responses.json"), 'utf8'));

    // Define JOI Validation Schema
    const responseSchema = Joi.object().keys({
        title: Joi.string().required(),
        message: Joi.string().required(),
        description: Joi.string().required(),
        code: Joi.number().integer().min(100).max(599).required(),
        keycode: Joi.number().integer().min(1).required()
    });

    // Validate the JSON itself
    test('Validate the JSON',async ()=> {
        const keyArray = Object.keys(responseJSON);
        let invalidKeys = [];
        for(let i=0; i<keyArray.length; i++){
            const result = responseSchema.validate(responseJSON[keyArray[i]]);
            if(result.error){
                invalidKeys.push(keyArray[i]);
            }
        }
        if(invalidKeys.length > 0){
            console.log("INVALID Response Keys: ",invalidKeys);
        }
        expect(invalidKeys.length).toBe(0);
    });



    // Ensure that all keycodes are unique
    test('Validate Unique Keycodes',async ()=> {

        const keyArray = Object.keys(responseJSON);
        let keycodes = [];
        for(let i=0; i<keyArray.length; i++){
            keycodes.push(responseJSON[keyArray[i]].keycode);
        }
        const uniqueKeycodes = new Set(keycodes);
        expect(uniqueKeycodes.size).toBe(keyArray.length);
    });

    // Ensure that all messages with variables have the correct sequence of variables
    test('Validate Variable Sequence',async ()=> {

            const keyArray = Object.keys(responseJSON);
            let invalidKeys = [];
            for(let i=0; i<keyArray.length; i++){
                const message = responseJSON[keyArray[i]].message;
                const variableCount = (message.match(/{[0-9]*}/g) || []).length;
                if(variableCount > 0){
                    const variables = message.match(/{[0-9]*}/g);
                    for(let j=0; j<variables.length; j++){
                        if(variables[j] !== `{${j}}`){
                            invalidKeys.push(keyArray[i]);
                        }
                    }
                }
            }
            if(invalidKeys.length > 0){
                console.log("INVALID Response Keys: ",invalidKeys);
            }
            expect(invalidKeys.length).toBe(0);
    });

});