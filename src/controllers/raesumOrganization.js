import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumOrganization from "../models/raesumOrganization.js";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumOrganizationController {
    
}

const singleInstance = new raesumOrganizationController();
export default singleInstance;