import config from 'config';
import raesumDB from "../../src/modules/raesumDB.js";
import {jest} from '@jest/globals';
import raesumMetadata from "../../src/models/raesumMetadata.js";



describe("Raesum Metadata System", () => {
    // If a database tests have been enabled

    const dbTestsEnabled = config.get("developmentAndTesting.integrationTestEnabled.primaryDatabase");
    console.log("DB Tests Enabled: " + dbTestsEnabled);

    const iftest = (dbTestsEnabled) ? test : test.skip;

    afterEach(async () => {
        // Remove the test values
        const query = "DELETE FROM raesum_metadata WHERE datakey LIKE $1";
        await raesumDB.query(query, ["testKey%"]);
    });

    iftest('Set Metadata', async () => {

        const key = "testKey1";
        const value = "testValue";
        const result = await raesumMetadata.set(key, value);

        // Query the database to verify that the data is there
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);

        expect(queryResult['rows'].length).toBe(1);
        expect(queryResult['rows'][0]['datavalue']).toBe("testValue");

    });


    iftest('Set Metadata with Number Value', async () => {

        const key = "testKey2";
        const value = 42;
        const result = await raesumMetadata.set(key, value);

        // Query the database to verify that the data is there
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);
        expect(queryResult['rows'].length).toBe(1);
        expect(queryResult['rows'][0]['datavalue']).toBe("42");

    });


    iftest('Set Metadata with Boolean Value', async () => {

        const key = "testKey3";
        const value = true;
        const result = await raesumMetadata.set(key, value);

        // Query the database to verify that the data is there
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);
        expect(queryResult['rows'].length).toBe(1);
        console.log("Query Result", queryResult['rows']);
        expect(queryResult['rows'][0]['datavalue']).toBe("true");

    });


   iftest('Get Metadata', async () => {

       const key = "testKey4";
       const value = "testValue";
       await raesumMetadata.set(key, value);

       const result = await raesumMetadata.getByKey(key);
       expect(result).toBe(value);

    });

    iftest('Get Metadata set with boolean', async () => {

        const key = "testKey5";
        const value = true;
        await raesumMetadata.set(key, value);

        const result = await raesumMetadata.getByKey(key);
        expect(result).toBe(value);

    });


    iftest('Get Metadata set with float', async () => {

        const key = "testKey6";
        const value = 2.2;
        await raesumMetadata.set(key, value);

        const result = await raesumMetadata.getByKey(key);
        expect(result).toBe(value);

    });

    iftest('Get Metadata set with int', async () => {

        const key = "testKey7";
        const value = 438731;
        await raesumMetadata.set(key, value);

        const result = await raesumMetadata.getByKey(key);

        expect(result).toBe(value);

    });

    iftest('Delete Metadata', async () => {

        const key = "testKey8";
        const value = "testValue";
        await raesumMetadata.set(key, value);

        const result = await raesumMetadata.delete(key);

        // Query the database to verify that the data is removed
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);

        expect(result).toBe(true);
        expect(queryResult['rows'].length).toBe(0);

    });

    iftest('Delete Metadata: Unknown Key', async () => {

        const key = "doesNotExist";

        const result = await raesumMetadata.delete(key);

        expect(result).toBe(false);


    });


    iftest('Get Metadata: Bad Key Data Type', async () => {

        const key = {"key":"badtestKey"};

        expect(async () => {
            await raesumMetadata.getByKey(key);
        }).rejects.toThrow();

    });

    iftest("Get Metadata: Key doesn't exist", async () => {

        const key = "badtestKey";

        expect(async () => {
            await raesumMetadata.getByKey(key);
        }).rejects.toThrow();

    });

    iftest('Set Metadata: Bad Key Data Type', async () => {

        const key = {"key":"badtestKey"};

        expect(async () => {
            await raesumMetadata.set(key,"Moo");
        }).rejects.toThrow();

    });

    iftest('Set Metadata: Bad Value Data Type', async () => {

        expect(async () => {
            await raesumMetadata.set("Cow",{"key":"badtestValue"});
        }).rejects.toThrow();

    });
})