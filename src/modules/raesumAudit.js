import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "./raesumDB.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

class raesumeAuditObject{

    #actions;
    #actionsByStringKey;
    #objectTypes;
    #objectTypesByStringKey;

    async #init(){
        const start = Date.now();
        logger.info("Initializing Audit Module", Date.now() - start);

        // Get all actions from db
        let query = "SELECT * FROM raesum_action_types";

        let actions = await raesumDB.query(query);

        // Save to memory
        actions.forEach((action)=>{
            this.#actions.push(action);
            this.#actionsByStringKey[action.action_string] = action.id;
        });
        logger.info(#actions.length + " actions loaded", Date.now() - start);



        // Get all object types from db
        query = "SELECT * FROM raesum_object_types";
        let objectTypes = await raesumDB.query(query);

        // Save to memory
        objectTypes.forEach((objectType)=>{
            this.#objectTypes.push(objectType);
            this.#objectTypesByStringKey[objectType.object_type_string] = objectType.id;
        });
        logger.info(#objectTypes.length + " object types loaded", Date.now() - start);

        logger.info("Audit Module Initialized", Date.now() - start);
    }

    async logEvent(actionType, objectType, objectID, userID){
        const start = Date.now();

        // If #actions or #objectTypes are empty, run init
        if(this.#actions.length == 0 || this.#objectTypes.length == 0){
            await this.#init();
        }

        // If any of the inputs are missing log error and return false
        if(!actionType || !objectType || !objectID || !userID){
            logger.error("Missing input for logEvent", Date.now() - start);
            return false;
        }

        // If objectID or userID are not numbers, log error and return false
        if(isNaN(objectID) || isNaN(userID)){
            logger.error("Non-numeric input for logEvent", Date.now() - start);
            return false;
        }
        // if actionType is a string, convert to ID
        if(typeof actionType === "string"){
            actionType = this.#convertActionStringToID(actionType);
        }
        // if objectType is a string, convert to ID
        if(typeof objectType === "string"){
            objectType = this.#convertObjectTypeStringToID(objectType);
        }

        // If either actionType or objectType are not valid, log error and return false
        if(!actionType || !objectType){
            logger.error("Invalid input for logEvent", Date.now() - start);
            return false;
        }

        // Add audit log entry to db
        const query = "INSERT INTO raesum_audit_log (action_id, object_type_id, object_id, user_id) VALUES ($1, $2, $3, $4);";

        try{
            await raesumDB.query(query, [actionType, objectType, objectID, userID]);
            logger.info("Audit log entry added", Date.now() - start);
            return true;
        }catch(e){
            logger.error("Error adding audit log entry with error: " + e, Date.now() - start);
            return false;
        }

    }

    async #convertActionStringToID(actionString){
        const start = Date.now();
        if(this.#actionsByStringKey[actionString]){
            return this.#actionsByStringKey[actionString];
        }else{
            logger.warning("Unable to find action type with string: " + actionString, Date.now() - start);
            return false;
        }
    }

    async #convertObjectTypeStringToID(objectTypeString){
        const start = Date.now();
        if(this.#objectTypesByStringKey[objectTypeString]){
            return this.#objectTypesByStringKey[objectTypeString];
        }else{
            logger.warning("Unable to find object type with string: " + objectTypeString, Date.now() - start)
            return false;
        }
    }

    async getAllActions(){
        // If actions are not loaded, load them with init()
        // If #actions or #objectTypes are empty, run init
        if(this.#actions.length == 0){
            await this.#init();
        }

        return this.#actions;
    }

    async getAllObjectTypes(){
        // If objectTypes are not loaded, load them with init()
        // If #actions or #objectTypes are empty, run init
        if(this.#objectTypes.length == 0){
            await this.#init();
        }

        return this.#objectTypes;
    }

}

const raesumeAudit = new raesumeAuditObject();
export default raesumeAudit;