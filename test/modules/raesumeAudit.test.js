import raesumAudit from "../../src/models/raesumAudit.js";
import config from 'config';
import raesumDB from "../../src/modules/raesumDB.js";
import {jest} from '@jest/globals'


describe("Raesum Audit System", () => {
    // If a database tests have been enabled

    const dbTestsEnabled = config.get("integrationTestEnabled.primaryDatabase");
    console.log("DB Tests Enabled: " + dbTestsEnabled);

    const iftest = (dbTestsEnabled) ? test : test.skip;


    iftest('Add an audit log entry via IDs', async () => {

        // Set an audit log entry
        const entryKey = await raesumAudit.create(1, 1, 1, 2);

        // Verify that it arrived in the database
        const query = "SELECT * FROM raesum_audit_log WHERE id = $1";
        const result = await raesumDB.query(query, [entryKey]);

        expect(typeof entryKey).toBe('number');
        expect(result['rows'].length).toBe(1);
        expect(result['rows'][0].action_id).toBe(1);
        expect(result['rows'][0].object_id).toBe(1);
        expect(result['rows'][0].object_type_id).toBe(1);
        expect(result['rows'][0].user_id).toBe("2");

    });

    iftest('Add an audit log entry via string_keys', async () => {

        // Set an audit log entry
        const entryKey = await raesumAudit.create("log_in", "raesum_user", 1, 2);

        // Verify that it arrived in the database
        const query = "SELECT * FROM raesum_audit_log WHERE id = $1";
        const result = await raesumDB.query(query, [entryKey]);


        expect(typeof entryKey).toBe('number');
        expect(result['rows'].length).toBe(1);
        expect(result['rows'][0].action_id).toBe(1);
        expect(result['rows'][0].object_id).toBe(1);
        expect(result['rows'][0].object_type_id).toBe(1);
        expect(result['rows'][0].user_id).toBe("2");
    });


    iftest('Add an audit log entry with invalid user', async () => {
        // Set an audit log entry
        expect(async ()=>{
            await raesumAudit.create(1, 1, 1, -473);
        }).rejects.toThrow();

    });

})