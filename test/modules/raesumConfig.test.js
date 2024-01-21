import {raesumGetCloudSecretKey} from '../../src/modules/raesumConfig'
import config from "config";
import {jest} from '@jest/globals'

describe("Raesum Config raesumGetCloudSecretKey", () => {
    test('Single Key Matching',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation(()=>{
            return [
                "connections.primaryDatabase.credentials",
                "connections.testDatabase"
            ]
        });

        expect(await raesumGetCloudSecretKey("connections.primaryDatabase.credentials")).toEqual(["connections.primaryDatabase.credentials"]);
        expect(await raesumGetCloudSecretKey("cows")).toEqual([]);
        expect(await raesumGetCloudSecretKey("connections.primaryDatabase")).toEqual(["connections.primaryDatabase.credentials"]);
        expect(await raesumGetCloudSecretKey("connections.testDatabase.credentials")).toEqual(["connections.testDatabase"]);
    });

    test('Multiple Key Matching',async ()=>{
        const configMock = jest.spyOn(config,"get").mockImplementation(()=>{
            return [
                "connections.primaryDatabase.credentials.username",
                "connections.primaryDatabase.credentials.password",
                "connections.testDatabase"
            ]
        });

        expect(await raesumGetCloudSecretKey("connections.primaryDatabase")).toEqual(["connections.primaryDatabase.credentials.username",
            "connections.primaryDatabase.credentials.password",]);
    });
})

describe("Raesum Config raesumGetSecret", () => {})