import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumOrganization from "../models/raesumOrganization.js";
import raesumUser from "../models/raesumUser.js";
import raesumMetadata from "../models/raesumMetadata.js";
import raesumAuthorization from "../models/raesumAuthorization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename, "module");

const metadata = new raesumMetadata();
class raesumStartup {

    async initialize(){
        const start = Date.now();

        logger.info("Checking to see if Raesum needs to be initialized", Date.now() - start);

        // Get metadata initialized
        const initializationStatus = await metadata.getByKey("initialized");

        // If not initialized, initialize
        if(initializationStatus === true){
            logger.info("Raesum is already initialized", Date.now() - start);
            return false;
        }else{
            logger.info("Raesum is not initialized. Initializing now.", Date.now() - start);

            try{
                // Create the default organization
                const org = new raesumOrganization();
                const firstOrgID = await org.initRaesum();

                // Create the default users
                const users = new raesumUser();
                await users.initRaesum(firstOrgID);

                // Force Reload of Global Roles to Database (these depend on the default orgs existing)
                await raesumAuthorization.loadGlobalRolesToDatabase();

            }catch(e){
                logger.critical(`Raesum failed to initialize: ${e}`, Date.now() - start);
                throw new Error("Raesum failed to initialize");
            }


            // Set the initialized metadata
            metadata.set("initialized", true);
        }

    }
}

export default raesumStartup;