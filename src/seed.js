import { raesumLogger } from './modules/raesumLogger.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import raesumMigrate from './modules/raesumMigrate.js';
import readline from 'node:readline';
import raesumSeed from './modules/raesumSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename);

const start = Date.now();
logger.info('Starting Seeding', Date.now() - start);

async function runSeeding() {
    const start = Date.now();
    const seeder = new raesumSeed();

    const canSeed = await seeder.canSeed();
    if (!canSeed) {
        process.exit(1);
    }

    // Run seed
    const seederResult = await seeder.seedDB();
    if (!seederResult) {
        logger.error('Seeding Failed', Date.now() - start);
        process.exit(1);
    }

    logger.info('Seeding Finished', Date.now() - start);
    process.exit(0);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question(
    "WARNING! \nWARNING! \nWARNING! \nThis will delete all data in the database and seed it with new data. Are you sure you want to continue? (type 'yes' to confirm)\n",
    (confirmation) => {
        if (confirmation != 'yes') {
            console.log("You must type 'yes' to continue. Exiting.");
            logger.warning('Seeding Cancelled', Date.now() - start);
            process.exit(0);
        } else {
            // Proceed with seeding

            runSeeding();
        }
        rl.close();
    }
);
