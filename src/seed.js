
import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./modules/raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumMigrate from "./modules/raesumMigrate.js";
import readline  from 'node:readline';
import raesumSeed from "./modules/raesumSeed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename, "module");

const start = Date.now();
logger.info("Starting Seeding", Date.now() - start);


async function runSeeding(){
    const start = Date.now();

    // Check to see if migrations are current
    const migrator = new raesumMigrate();
    const schemaVersion = await migrator.getCurrentSchemaVesion();
    const migrationSet = await migrator.getValidMigrationsAvailableList();
    const mostRecentMigration = migrationSet[migrationSet.length-1];
    const numberElement = parseInt(mostRecentMigration.replace(/\D/g, ''));
    logger.debug("Current Schema Version: " + schemaVersion, Date.now() - start);
    logger.debug("Most Recent Migration Version: " + numberElement, Date.now() - start);
    if (numberElement > schemaVersion) {
        logger.error("Database is not current. Please run the migration script before seeding the database.", Date.now() - start);
        process.exit(1);
    }

    // Run seed
    const seeder = new raesumSeed();

    const seederResult = await seeder.seedDB()
    if(!seederResult){
        logger.error("Seeding Failed", Date.now() - start);
        process.exit(1);
    }


    logger.info("Seeding Finished", Date.now() - start);
    process.exit(0);
}



const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


rl.question("WARNING! \nWARNING! \nWARNING! \nThis will delete all data in the database and seed it with new data. Are you sure you want to continue? (type 'yes' to confirm)\n", confirmation => {
    if(confirmation != "yes"){
        console.log("You must type 'yes' to continue. Exiting.");
        logger.info("Seeding Cancelled", Date.now() - start);
        process.exit(0);
    }else{
        // Proceed with seeding

        runSeeding();
    }
    rl.close();
});



