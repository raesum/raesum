import raesumConfig from '../../src/modules/raesumConfig'
import config from "config";
import {jest} from '@jest/globals'



describe("Raesum Config raesumConfig.getCloudSecretKey", () => {
    test('Single Key Matching',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation((key)=>{
            let returnVal;
            if(key=="cloudBasedSecrets"){
                returnVal=[
                    "connections.primaryDatabase.credentials",
                    "connections.testDatabase"
                ]
            }
            return returnVal
        });
        expect(await raesumConfig.getCloudSecretKey("connections.primaryDatabase.credentials")).toEqual(["connections.primaryDatabase.credentials"]);
        expect(await raesumConfig.getCloudSecretKey("cows")).toEqual([]);
        expect(await raesumConfig.getCloudSecretKey("connections.primaryDatabase")).toEqual(["connections.primaryDatabase.credentials"]);
        expect(await raesumConfig.getCloudSecretKey("connections.testDatabase.credentials")).toEqual(["connections.testDatabase"]);
    });

    test('Multiple Key Matching',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation(()=>{
            return [
                "connections.primaryDatabase.credentials.username",
                "connections.primaryDatabase.credentials.password",
                "connections.testDatabase"
            ]
        });

        expect(await raesumConfig.getCloudSecretKey("connections.primaryDatabase")).toEqual(["connections.primaryDatabase.credentials.username",
            "connections.primaryDatabase.credentials.password",]);
    });
})

describe("Raesum Config raesumConfigGet", () => {

    test('Single Key Non-cloud',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation((key)=>{
            let returnVal;
            if(key=="cloudBasedSecrets"){
                returnVal=[
                    //"connections.primaryDatabase.credentials",
                    "connections.testDatabase"
                ]
            }else if(key=="ephemeralKey"){
                returnVal="ephemeralKeyValue"
            }else if(key=="connections.primaryDatabase.credentials"){
                returnVal={
                    "username":"goat",
                    "password":"frolics"
                }
            }
            return returnVal
        });


        expect(await raesumConfig.get("ephemeralKey")).toEqual("ephemeralKeyValue");
        expect(await raesumConfig.get("connections.primaryDatabase.credentials")).toEqual({
            "username":"goat",
            "password":"frolics"
        });

    });

    test('Single Key Cloud',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation((key)=>{
            let returnVal;
            if(key=="cloudBasedSecrets"){
                returnVal=[
                    "connections.primaryDatabase.credentials",
                    "connections.testDatabase"
                ]
            }else if(key=="ephemeralKey"){
                returnVal="ephemeralKeyValue"
            }else if(key=="connections.primaryDatabase.credentials"){
                returnVal={
                    "username":"goat",
                    "password":"frolics"
                }
            }
            return returnVal
        });


        //expect(await raesumConfig.get("ephemeralKey")).toEqual("ephemeralKeyValue");
        expect(await raesumConfig.get("connections.primaryDatabase.credentials")).toEqual({
            "username":"goat",
            "password":"frolics"
        });

    });

    test('Parent Key in Cloud',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation((key)=>{
            let returnVal;
            if(key=="cloudBasedSecrets"){
                returnVal=[
                    "connections.primaryDatabase.credentials",
                    "connections.testDatabase"
                ]
            }else if(key=="ephemeralKey"){
                returnVal="ephemeralKeyValue"
            }else if(key=="connections.primaryDatabase.credentials"){
                returnVal={
                    "username":"goat",
                    "password":"frolics"
                }
            }
            return returnVal
        });


        //expect(await raesumConfig.get("ephemeralKey")).toEqual("ephemeralKeyValue");
        expect(await raesumConfig.get("connections.primaryDatabase.credentials.username")).toEqual("goat");

    });

    test('Child Keys in Cloud',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation((key)=>{
            let returnVal;
            if(key=="cloudBasedSecrets"){
                returnVal=[
                    "connections.primaryDatabase.credentials.username",
                    "connections.primaryDatabase.credentials.password",

                    "connections.testDatabase"
                ]
            }else if(key=="ephemeralKey"){
                returnVal="ephemeralKeyValue"
            }else if(key=="connections.primaryDatabase.credentials.username"){
                returnVal="goat"
            }else if(key=="connections.primaryDatabase.credentials.password"){
                returnVal="frolics"
            }else if(key=="connections.primaryDatabase"){
                returnVal={
                    "host": null,
                    "port": null,
                    "databaseName": null,
                    "credentials": {
                        "username": null,
                        "password": null
                    },
                    "useSSL": null
                }
            }
            return returnVal
        });


        //expect(await raesumConfig.get("ephemeralKey")).toEqual("ephemeralKeyValue");
        expect(await raesumConfig.get("connections.primaryDatabase")).toEqual( {
            "host": null,
                "port": null,
                "databaseName": null,
                "credentials": {
                "username": "goat",
                "password": "frolics"
            },
            "useSSL": null
        });

    });

})