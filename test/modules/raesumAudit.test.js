import raesumAudit from "../../src/models/raesumAudit.js";
import config from 'config';
import raesumDB from "../../src/modules/raesumDB.js";
import {jest} from '@jest/globals'


describe("Raesum Audit System", () => {
    // If a database tests have been enabled

    const dbTestsEnabled = config.get("developmentAndTesting.integrationTestEnabled.primaryDatabase");
    console.log("DB Tests Enabled: " + dbTestsEnabled);

    const iftest = (dbTestsEnabled) ? test : test.skip;


    iftest('Add an audit log entry via IDs', async () => {

        // Get a user ID from the table
        const userQuery = "SELECT id FROM raesum_user ORDER BY id DESC LIMIT 1";
        const userResult = await raesumDB.query(userQuery);
        const userId = userResult['rows'][0].id;

        // Set an audit log entry
        const entryKey = await raesumAudit.create(1, 1, 1, userId);

        // Verify that it arrived in the database
        const query = "SELECT * FROM raesum_audit_log WHERE id = $1";
        const result = await raesumDB.query(query, [entryKey]);

        expect(typeof entryKey).toBe('number');
        expect(result['rows'].length).toBe(1);
        expect(result['rows'][0].action_id).toBe(1);
        expect(result['rows'][0].object_id).toBe(1);
        expect(result['rows'][0].object_type_id).toBe(1);
        expect(result['rows'][0].user_id).toBe(userId);

    });

    iftest('Add an audit log entry via string_keys', async () => {

        // Get a user ID from the table
        const userQuery = "SELECT id FROM raesum_user ORDER BY id DESC LIMIT 1";
        const userResult = await raesumDB.query(userQuery);
        const userId = userResult['rows'][0].id;

        // Set an audit log entry
        const entryKey = await raesumAudit.create("log_in", "raesum_user", 1, userId);

        // Verify that it arrived in the database
        const query = "SELECT * FROM raesum_audit_log WHERE id = $1";
        const result = await raesumDB.query(query, [entryKey]);


        expect(typeof entryKey).toBe('number');
        expect(result['rows'].length).toBe(1);
        expect(result['rows'][0].action_id).toBe(1);
        expect(result['rows'][0].object_id).toBe(1);
        expect(result['rows'][0].object_type_id).toBe(1);
        expect(result['rows'][0].user_id).toBe(userId);
    });


    iftest('Add an audit log entry with invalid user', async () => {
        // Set an audit log entry
        expect(async ()=>{
            await raesumAudit.create(1, 1, 1, -473);
        }).rejects.toThrow();

    });

})