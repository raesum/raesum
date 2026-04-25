import config from 'config';
import raesumSeed from "../src/modules/raesumSeed.js";
import raseumMetadata from "../src/models/raesumMetadata.js";
import {fileURLToPath} from "url";
import path from "path";
import {raesumLogger} from "../src/modules/raesumLogger.js";
import raesumDB from "../src/modules/raesumDB.js";
import raesumCache from "../src/modules/raesumCache.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename, "module");


export async function setup(){
    const start = Date.now();
    console.log('Setting up ...');
    console.log(`Setting up Raesum Environment: ${process.env.NODE_ENV}`, Date.now() - start);

    // Check to see if developmentAndTesting.integrationTestEnabled.primaryDatabase is enabled
    const dbTestEnabled = config.get("developmentAndTesting.integrationTestEnabled.primaryDatabase");
    const awsTestEnabled = config.get("developmentAndTesting.integrationTestEnabled.aws");
    const redisTestEnabled = config.get("developmentAndTesting.integrationTestEnabled.redis");

    // Check to see if it's a production database
    let productionDB = await raseumMetadata.getByKey("isProductionDatabase");

    logger.debug("Database type is production: " + productionDB, Date.now() - start);

    if(productionDB){
        // If any of the external tests are enabled, then the database cannot be a production database.
        if(dbTestEnabled || awsTestEnabled || redisTestEnabled){
            logger.critical("Cannot run tests on a production database. If this is a test database, disable the primaryDatabase test in the metadata table, otherwise, disable tests that rely on external systems (AWS, redis, etc).", Date.now() - start);
            throw new Error("Cannot run tests on production database");
        }
    }


    // Seed the database if required
    if(dbTestEnabled){
        const seeder = new raesumSeed();

        const canSeed = await seeder.canSeed();
        if (!canSeed) {
            logger.critical("Cannot Seed Database. Either the database is a production type or needs a migration run. If this is production-type database disable primaryDatabase and redis tests in the configuration or use a non-production database.", Date.now() - start);
            throw new Error("Not allowed to seed this database for testing")
        }

        // Run seed
        const seederResult = await seeder.seedDB()
        if(!seederResult){
            console.log("Seeding Failed", Date.now() - start);
            throw new Error("Allowed but unable to seed database for testing")

        }
    }

    return true;
}

export default async function teardown() {
  // Close database connections
    await raesumDB.end();
    await raesumCache.end();
}