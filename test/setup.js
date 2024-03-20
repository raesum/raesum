import config from 'config';
import readline  from 'node:readline';
import raesumSeed from "../src/modules/raesumSeed.js";
import {fileURLToPath} from "url";
import path from "path";

async function setup(){
    const start = Date.now();
    console.info('Setting up ...')

    // Check to see if integrationTestEnabled.primaryDatabase is enabled
    const dbTestEnabled = config.get("integrationTestEnabled.primaryDatabase");


    // Seed the database if required
    if(dbTestEnabled){
        const seeder = new raesumSeed();

        const canSeed = await seeder.canSeed();
        if (!canSeed) {
            console.log("Cannot Seed Database. Try running a migration first.", Date.now() - start);
            process.exit(1);
        }

        // Run seed
        const seederResult = await seeder.seedDB()
        if(!seederResult){
            console.log("Seeding Failed", Date.now() - start);
            process.exit(1);
        }
    }

    return true;
}

export default setup;