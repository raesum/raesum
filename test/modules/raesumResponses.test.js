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
        expect(async ()=>{
            await raesumResponses.get("nonexistent")
        }).toThrow();
    });


    test('Get a Message with a variable',async ()=> {
        const response = await raesumResponses.get("requestMissingFields",["TEST"]);
        expect(response.message).toBe("The request is missing fields: TEST");
    });


    test('Get a Message with a variable missing',async ()=> {
        expect(async ()=>{
            await raesumResponses.get("requestMissingFields")
        }).toThrow();
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

});