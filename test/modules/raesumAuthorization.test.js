import raesumAuthorization from "../../src/models/raesumAuthorization.js";
import config from 'config';
import raesumDB from "../../src/modules/raesumDB.js";
import {jest} from '@jest/globals'


describe("Raesum Authorization System: Actions, Objects, and Scopes", () => {
    // If a database tests have been enabled

    const dbTestsEnabled = config.get("developmentAndTesting.integrationTestEnabled.primaryDatabase");
    console.log("DB Tests Enabled: " + dbTestsEnabled);

    const iftest = (dbTestsEnabled) ? test : test.skip;

    iftest('Convert action string_key to actionID', async () => {
        const actionID = await raesumAuthorization.convertActionStringToID("log_in");
        expect(actionID).toBe(1);
    });

    iftest('Convert action string_key to actionID wrong case', async () => {
        const actionID = await raesumAuthorization.convertActionStringToID("lOG_in");
        expect(actionID).toBe(1);
    });

    iftest('Convert action string_key to actionID bad input', async () => {
        const actionID = await raesumAuthorization.convertActionStringToID("moo");
        expect(actionID).toBe(false);
    });

    iftest('Convert object string_key to objectId', async () => {
        const actionID = await raesumAuthorization.convertObjectTypeStringToID("raesum_user");
        expect(actionID).toBe(1);
    });

    iftest('Convert object string_key to objectId wrong case', async () => {
        const actionID = await raesumAuthorization.convertObjectTypeStringToID("rAESum_user");
        expect(actionID).toBe(1);
    });

    iftest('Convert object string_key to objectId bad input', async () => {
        const actionID = await raesumAuthorization.convertObjectTypeStringToID("cow");
        expect(actionID).toBe(false);
    });

    iftest('Convert object string_key to objectId bad input type', async () => {
        expect(async () => {
            await raesumAuthorization.convertObjectTypeStringToID({"angryGOPHER": "angryGOPHER"});
        }).rejects.toThrow();
    });



})