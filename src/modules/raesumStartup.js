import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumOrganization from "../models/raesumOrganization.js";
import raesumUser from "../models/raesumUser.js";
import raesumMetadata from "../models/raesumMetadata.js";

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
            const org = new raesumOrganization();
            await org.initRaesum();
        }

    }
}

export default raesumStartup;