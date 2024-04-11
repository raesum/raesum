import {raesumLogger} from "./raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumOrganization from "../models/raesumOrganization.js";
import raesumUser from "../models/raesumUser.js";
import raesumMetadata from "../models/raesumMetadata.js";
import raesumAuthorization from "../models/raesumAuthorization.js";
import readLineAsync from "../utils/readlineAsync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename);

const metadata = new raesumMetadata();

class raesumStartup {

    async initialize() {
        const start = Date.now();

        logger.info("Checking to see if Raesum needs to be initialized", Date.now() - start);

        // Get metadata initialized
        const initializationStatus = await metadata.getByKey("initialized");

        let firstUserID = null;

        // If not initialized, initialize
        if (initializationStatus === true) {
            logger.info("Raesum is already initialized", Date.now() - start);
            return false;
        } else {
            logger.info("Raesum is not initialized. Initializing now.", Date.now() - start);

            // Get the environment type name
            // This section is used to 'tattoo' the database as a safety measure to prevent accidental seeding of production databases. Once a database has been marked as 'production' it cannot be seeded or have DB-baseds tests run against it.
            // Assume that the system is a production database until proven otherwise

            let productionDB = true;
            logger.info("Checking to see if Raesum is a production database. NODE_ENV Value: " + process.env.NODE_ENV, Date.now() - start);
            if (typeof process.env.NODE_ENV == "undefined" || process.env.NODE_ENV == "undefined") {
                logger.verbose("NODE_ENV is undefined", Date.now() - start);

                // No environment type defined, ask the user if this is a production database
                productionDB = await this.askUserIfNonProductionDB();
            } else {
                logger.verbose("NODE_ENV is defined: " + process.env.NODE_ENV, Date.now() - start);

                // If it's defined, examine the name to see if it's a non-production type (or a type that shouldn't allow seeding)
                const knownDevelopmentWords = ["dev", "test", "qa", "local", "sandbox", "development"];
                const knownProductionWords = ["prod", "production", "live", "staging", "uat", "preprod"];

                let foundmatch = false;
                // Look to see if the environment type contains any known production words
                knownProductionWords.forEach((word) => {
                    // If match, set the productionDB to true and set foundmatch to true and stop loop
                    if (process.env.NODE_ENV.toLowerCase().includes(word)) {
                        productionDB = true;
                        foundmatch = true;
                        return;
                    }
                });

                // If no match is found, look in development words
                if (!foundmatch) {
                    knownDevelopmentWords.forEach((word) => {
                        // If match, set the productionDB to false and set foundmatch to true and stop loop
                        if (process.env.NODE_ENV.toLowerCase().includes(word)) {
                            productionDB = false;
                            foundmatch = true;
                            return;
                        }
                    });
                }

                // If it can't be identified, then ask the user
                if (!foundmatch) {
                    logger.info("Can't automatically determine what type of environment this and if it's a non-production or production database.", Date.now() - start);
                    productionDB = await this.askUserIfNonProductionDB();
                }

            }

            // Set the metadata value of whether this is a production-type database
            await metadata.set("isProductionDatabase", productionDB);


            try {
                // Create the default organization
                const org = new raesumOrganization();
                const firstOrgID = await org.initRaesum();

                // Create the default users
                const users = new raesumUser();
                firstUserID = await users.initRaesum(firstOrgID);

                // Force Reload of Global Roles to Database (these depend on the default orgs existing)
                await raesumAuthorization.loadGlobalRolesToDatabase();

            } catch (e) {
                logger.critical(`Raesum failed to initialize: ${e}`, Date.now() - start);
                throw new Error("Raesum failed to initialize");
            }


            // Set the initialized metadata
            metadata.set("initialized", true);
        }

        return firstUserID;
    }

    async askUserIfNonProductionDB() {
        let start = Date.now();

        // If it's undefined, pause and ask the user if this is a dev/test environment
        try {
            //const answer = await rl.question('Is this database going to be used for development / testing? (yes|no)\n: ');

            console.log('Is this database going to be used for development / testing? (yes|no):\n')
            const answer = await readLineAsync();
            // If no, then set metadata to production
            if(answer.toLowerCase() == "no") {
                return true;
            } else {
                // If yes, then set metadata to development
                return false;
            }

        } catch (e) {
            logger.error(`Error reading user input: ${e}. Cannot determine whether the database is a production type`, Date.now() - start);
            process.exit(1);
        }


    }

}

export default raesumStartup;