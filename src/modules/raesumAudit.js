import raesumConfig from "./raesumConfig.js";
import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
import {conditionallyParseJSON} from "../utils/stringUtils";
import raesumDB from "./raesumDB.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

class raesumeAudit{

    async logEvent(actionType, objectType, objectID, userID){}

}