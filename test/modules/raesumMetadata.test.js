import metadata from "../../src/models/raesumMetadata.js";
import config from 'config';
import raesumDB from "../../src/modules/raesumDB.js";
import {jest} from '@jest/globals';
import raesumMetadata from "../../src/models/raesumMetadata.js";



describe("Raesum Metadata System", () => {
    // If a database tests have been enabled

    const dbTestsEnabled = config.get("integrationTestEnabled.primaryDatabase");
    console.log("DB Tests Enabled: " + dbTestsEnabled);

    const iftest = (dbTestsEnabled) ? test : test.skip;

    // afterEach(() => {
    //     // Remove the test values
    //     const query = "DELETE FROM raesum_metadata WHERE datakey = $1";
    //     raesumDB.query(query, ["testKey"]);
    // });

    iftest('Set Metadata', async () => {
        const metadata = new raesumMetadata();

        const key = "testKey";
        const value = "testValue";
        const result = await metadata.set(key, value);

        // Query the database to verify that the data is there
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);
        console.log("\n||| TEST QUERY: \n",query, queryResult['rows'])

        expect(queryResult['rows'].length).toBe(1);
        expect(queryResult['rows'][0]['datavalue']).toBe("testValue");

    });


    iftest('Set Metadata with Number Value', async () => {
        const metadata = new raesumMetadata();

        const key = "testKey";
        const value = 42;
        const result = await metadata.set(key, value);

        // Query the database to verify that the data is there
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);
        expect(queryResult['rows'].length).toBe(1);
        expect(queryResult['rows'][0]['datavalue']).toBe("42");

    });


    iftest('Set Metadata with Boolean Value', async () => {
        const metadata = new raesumMetadata();

        const key = "testKey";
        const value = true;
        const result = await metadata.set(key, value);

        // Query the database to verify that the data is there
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);
        expect(queryResult['rows'].length).toBe(1);
        expect(queryResult['rows'][0]['datavalue']).toBe("true");

    });


   iftest('Get Metadata', async () => {
       const metadata = new raesumMetadata();

       const key = "testKey";
       const value = "testValue";
       await metadata.set(key, value);

       const result = await metadata.getByKey(key);
       expect(result).toBe(value);

    });

    iftest('Get Metadata set with boolean', async () => {
        const metadata = new raesumMetadata();

        const key = "testKey";
        const value = true;
        await metadata.set(key, value);

        const result = await metadata.getByKey(key);
        expect(result).toBe(value);

    });


    iftest('Get Metadata set with float', async () => {
        const metadata = new raesumMetadata();

        const key = "testKey";
        const value = 2.2;
        await metadata.set(key, value);

        const result = await metadata.getByKey(key);
        expect(result).toBe(value);

    });

    iftest('Get Metadata set with int', async () => {
        const metadata = new raesumMetadata();

        const key = "testKey";
        const value = 438731;
        await metadata.set(key, value);

        const result = await metadata.getByKey(key);
        expect(result).toBe(value);

    });

    iftest('Delete Metadata', async () => {
        const metadata = new raesumMetadata();

        const key = "testKey";
        const value = "testValue";
        await metadata.set(key, value);

        const result = await metadata.delete(key);

        // Query the database to verify that the data is removed
        const query = "SELECT * FROM raesum_metadata WHERE datakey = $1";
        const queryResult = await raesumDB.query(query, [key]);

        expect(result).toBe(true);
        expect(queryResult['rows'].length).toBe(0);

    });

    iftest('Delete Metadata: Unknown Key', async () => {
        const metadata = new raesumMetadata();

        const key = "doesNotExist";

        expect(async () => {
            await await metadata.delete(key);
        }).rejects.toThrow();

    });


    iftest('Get Metadata: Bad Key Data Type', async () => {
        const metadata = new raesumMetadata();

        const key = {"key":"badtestKey"};

        expect(async () => {
            await await metadata.getByKey(key);
        }).rejects.toThrow();

    });

    iftest("Get Metadata: Key doesn't exist", async () => {
        const metadata = new raesumMetadata();

        const key = "badtestKey";

        expect(async () => {
            await await metadata.getByKey(key);
        }).rejects.toThrow();

    });

    iftest('Set Metadata: Bad Key Data Type', async () => {
        const metadata = new raesumMetadata();

        const key = {"key":"badtestKey"};

        expect(async () => {
            await await metadata.set(key,"Moo");
        }).rejects.toThrow();

    });

    iftest('Set Metadata: Bad Value Data Type', async () => {
        const metadata = new raesumMetadata();

        expect(async () => {
            await await metadata.set("Cow",{"key":"badtestValue"});
        }).rejects.toThrow();

    });
})