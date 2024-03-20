import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "./raesumDB.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

class raesumeAuditObject{

    #actionsByStringKey = {};
    #objectTypesByStringKey = {};

    async #init(){
        const start = Date.now();
        logger.info("Initializing Audit Module", Date.now() - start);

        // Get all actions from db
        let query = "SELECT * FROM raesum_action_types";

        let actions = await raesumDB.query(query);

        // Save to memory
        actions['rows'].forEach((action)=>{
            this.#actionsByStringKey[action.string_key.toLowerCase()] = action.id;
        });
        logger.info(Object.keys(this.#actionsByStringKey).length + " actions loaded", Date.now() - start);



        // Get all object types from db
        query = "SELECT * FROM raesum_object_types";
        let objectTypes = await raesumDB.query(query);

        // Save to memory
        objectTypes['rows'].forEach((objectType)=>{
            this.#objectTypesByStringKey[objectType.string_key.toLowerCase()] = objectType.id;
        });
        logger.info(Object.keys(this.#objectTypesByStringKey).length + " object types loaded", Date.now() - start);

        logger.info("Audit Module Initialized", Date.now() - start);
    }

    async logEvent(actionType, objectType, objectID, userID){
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
            actionType = await this.convertActionStringToID(actionType);
        }
        // if objectType is a string, convert to ID
        if(typeof objectType == "string"){
            objectType = await this.convertObjectTypeStringToID(objectType);
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
            console.log("\n|||: OBJECT TYPE STRING: ", objectTypeString, typeof objectTypeString, "\n\n");

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

const raesumeAudit = new raesumeAuditObject();
export default raesumeAudit;