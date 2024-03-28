import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumAuthorization from "./raesumAuthorization.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

class raesumAuditObject{
    #actionsByStringKey = {};
    #objectTypesByStringKey = {};

    async #init(){
        const start = Date.now();
        logger.info("Initializing Audit Module", Date.now() - start);

        await raesumAuthorization.init();
        this.#objectTypesByStringKey = raesumAuthorization.objectTypesByStringKey
        this.#actionsByStringKey = raesumAuthorization.actionsByStringKey

        logger.info("Audit Module Initialized", Date.now() - start);
    }
    async create(actionType, objectType, objectID, userID){
        const start = Date.now();

        // If #actions or #objectTypes are empty, run init
        if(Object.keys(this.#actionsByStringKey).length == 0 || Object.keys(this.#objectTypesByStringKey).length == 0){
            await this.#init();
        }


        // If any of the inputs are missing log error and return false
        if(!actionType || !objectType || !objectID || !userID){
            logger.error("Missing input for logEvent", Date.now() - start);
            throw new Error("Missing input for logEvent");
        }

        // If objectID or userID are not numbers, log error and return false
        if(isNaN(objectID) || isNaN(userID)){
            logger.error("Non-numeric input for logEvent", Date.now() - start);
            throw new Error("Invalid format for objectID or userID");
        }

        // if actionType is a string, convert to ID
        if(typeof actionType == "string"){
            actionType = await raesumAuthorization.convertActionStringToID(actionType);
        }
        // if objectType is a string, convert to ID
        if(typeof objectType == "string"){
            objectType = await raesumAuthorization.convertObjectTypeStringToID(objectType);
        }

        // If either actionType or objectType are not valid, log error and return false
        if(!actionType || !objectType){
            logger.error("Invalid input for logEvent", Date.now() - start);
            return false;
        }

        // Add audit log entry to db
        const query = "INSERT INTO raesum_audit_log (action_id, object_type_id, object_id, user_id) VALUES ($1, $2, $3, $4);";
        const curvalQuery = "SELECT currval(pg_get_serial_sequence('raesum_audit_log','id'));"

        try{
            await raesumDB.query(query, [actionType, objectType, objectID, userID]);
            const insertedResult = await raesumDB.query(curvalQuery);

            logger.debug(`Audit log entry added: ${insertedResult['rows'][0].currval}`, Date.now() - start);
            return parseInt(insertedResult['rows'][0].currval);
        }catch(e){
            logger.error("Error adding audit log entry with error: " + e, Date.now() - start);
            throw new Error("Error adding audit log entry");
        }

    }


    async convertActionStringToID(actionString){
        const start = Date.now();
        if(Object.keys(this.#actionsByStringKey).length == 0){
            await this.#init();
        }


        if(typeof actionString != "string"){
            logger.error("Invalid input for convertActionStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertActionStringToID. Must be a string.")
        }

        actionString = actionString.toLowerCase();

        if(this.#actionsByStringKey[actionString]){
            return this.#actionsByStringKey[actionString];
        }else{
            logger.warning("Unable to find action type with string: " + actionString, Date.now() - start);
            return false;
        }
    }

    async convertObjectTypeStringToID(objectTypeString){
        const start = Date.now();
        if(Object.keys(this.#actionsByStringKey).length == 0){
            await this.#init();
        }

        if(typeof objectTypeString != "string"){
            logger.error("Invalid input for convertObjectTypeStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertObjectTypeStringToID. Must be a string.")
        }

        objectTypeString = objectTypeString.toLowerCase();

        if(this.#objectTypesByStringKey[objectTypeString]){
            return this.#objectTypesByStringKey[objectTypeString];
        }else{
            logger.warning("Unable to find object type with string: " + objectTypeString, Date.now() - start)
            return false;
        }
    }

}


const raesumAudit = new raesumAuditObject();
export default raesumAudit;