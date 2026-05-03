import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumAuthorization from "./raesumAuthorization.js";
import raesumOrganization from "./raesumOrganization.js";
import raesumUser from "./raesumUser.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

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


    async create(actionType, objectType, objectID=null, userID){
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

        // If userID are not numbers, log error and return false
        if(isNaN(userID) || userID < 1){
            logger.error("Non-numeric input for logEvent", Date.now() - start);
            throw new Error("Invalid format for objectID or userID");
        }

        // If objectID is set and not a number, throw an error
        if(objectID && (isNaN(objectID) || objectID < 1) && objectID != null){
            logger.error("Non-numeric input for objectID logEvent", Date.now() - start);
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

            logger.verbose(`Audit log entry added: ${insertedResult['rows'][0].currval}`, Date.now() - start);
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


        /**
     * Checks to see if the user is allowed to perform the action on the object. It wraps checkUserPermissionByID
     * @param  {Number} ordID The ID of the organization (required)
     * @param  {Number} userID Filter by ID of the user
     * @param  {Number} objectTypeID The string key of the objectType
     * @param  {Number} actionTypeID The ID key of the action
     * @param  {String} sortBy The column to sort by. Allowed values: date, object_type (string name), action_type (string name), userName. Defaut to date
     * @param  {String} sortOrder The order to sort by (ASC or DESC)
     * @return {Array} Returns an array of objects of the audit logs. The userID and userName are included along with both ID and string form objects and actions.
     * @throws {Error} If the orgID is not supplied
     * @throws {Error} If the userID, objectTypeID, or actionTypeID does not exist
     */
    async getAuditLogs(orgID, userID=null, objectTypeID=null, actionTypeID=null, sortBy="date", sortOrder="DESC", limit=null, offset=null){
        const start = Date.now();

        // Validate the sort by and sort order inputs. Use defaults if invalid input. Order is not case sensitive.
        const validSortByOptions = ['date', 'object_type', 'action_type', 'username'];
        const validSortOrderOptions = ['ASC', 'DESC'];
        
        if (!validSortByOptions.includes(sortBy.toLowerCase())) {
            sortBy = 'date';
        }
        
        if (!validSortOrderOptions.includes(sortOrder.toUpperCase())) {
            sortOrder = 'DESC';
        }
        
        // Convert to proper case for SQL
        sortBy = sortBy.toLowerCase();
        sortOrder = sortOrder.toUpperCase();

        // Validate the orgID, userID, objectTypeID, and actionTypeID inputs. Throw error on invalid input.
        if (!orgID || isNaN(orgID) || orgID < 1) {
            logger.error("Invalid orgID for getAuditLogs", Date.now() - start);
            throw new Error("Invalid orgID for getAuditLogs");
        }

        // Validate orgID exists using raesumOrganization model (mandatory)
        try {
            await raesumOrganization.getById(orgID);
        } catch (error) {
            logger.error(`Organization ID ${orgID} does not exist: ${error.message}`, Date.now() - start);
            throw new Error("Organization does not exist");
        }

        if (userID && (isNaN(userID) || userID < 1)) {
            logger.error("Invalid userID for getAuditLogs", Date.now() - start);
            throw new Error("Invalid userID for getAuditLogs");
        }

        // Validate userID exists and belongs to organization using raesumUser model
        if (userID) {
            try {
                const user = await raesumUser.getUserById(userID);
                if (user.current_organization_id !== orgID) {
                    logger.error(`User ID ${userID} does not belong to organization ${orgID}`, Date.now() - start);
                    throw new Error("User does not belong to this organization");
                }
            } catch (error) {
                logger.error(`User ID ${userID} validation failed: ${error.message}`, Date.now() - start);
                throw new Error("User does not exist or does not belong to this organization");
            }
        }

        if (objectTypeID && (isNaN(objectTypeID) || objectTypeID < 1)) {
            logger.error("Invalid objectTypeID for getAuditLogs", Date.now() - start);
            throw new Error("Invalid objectTypeID for getAuditLogs");
        }

        // Validate objectTypeID exists using raesumAuthorization model
        if (objectTypeID) {
            try {
                // Initialize authorization if needed
                if(Object.keys(this.#objectTypesByStringKey).length == 0){
                    await this.#init();
                }
                // Check if objectTypeID exists by checking if it's in the values
                const validObjectTypeIds = Object.values(this.#objectTypesByStringKey);
                if (!validObjectTypeIds.includes(objectTypeID)) {
                    logger.error(`Object type ID ${objectTypeID} does not exist`, Date.now() - start);
                    throw new Error("Object type does not exist");
                }
            } catch (error) {
                logger.error(`Object type ID ${objectTypeID} validation failed: ${error.message}`, Date.now() - start);
                throw new Error("Error validating object type");
            }
        }

        if (actionTypeID && (isNaN(actionTypeID) || actionTypeID < 1)) {
            logger.error("Invalid actionTypeID for getAuditLogs", Date.now() - start);
            throw new Error("Invalid actionTypeID for getAuditLogs");
        }

        // Validate actionTypeID exists using raesumAuthorization model
        if (actionTypeID) {
            try {
                // Initialize authorization if needed
                if(Object.keys(this.#actionsByStringKey).length == 0){
                    await this.#init();
                }
                // Check if actionTypeID exists by checking if it's in the values
                const validActionTypeIds = Object.values(this.#actionsByStringKey);
                if (!validActionTypeIds.includes(actionTypeID)) {
                    logger.error(`Action type ID ${actionTypeID} does not exist`, Date.now() - start);
                    throw new Error("Action type does not exist");
                }
            } catch (error) {
                logger.error(`Action type ID ${actionTypeID} validation failed: ${error.message}`, Date.now() - start);
                throw new Error("Error validating action type");
            }
        }

        // Build the audit log query
        let query = `
            SELECT 
                al.id,
                al.user_id,
                u.username,
                al.action_id,
                at.name as action_name,
                at.string_key as action_string_key,
                al.object_type_id,
                ot.name as object_type_name,
                ot.string_key as object_type_string_key,
                al.object_id,
                al.event_at,
                al.metadata
            FROM raesum_audit_log al
            LEFT JOIN raesum_user u ON al.user_id = u.id
            LEFT JOIN raesum_auth_action_type at ON al.action_id = at.id
            LEFT JOIN raesum_auth_object_type ot ON al.object_type_id = ot.id
            WHERE u.current_organization_id = $1
        `;
        
        const params = [orgID];
        let paramIndex = 2;

        if (userID) {
            query += ` AND al.user_id = $${paramIndex}`;
            params.push(userID);
            paramIndex++;
        }

        if (objectTypeID) {
            query += ` AND al.object_type_id = $${paramIndex}`;
            params.push(objectTypeID);
            paramIndex++;
        }

        if (actionTypeID) {
            query += ` AND al.action_id = $${paramIndex}`;
            params.push(actionTypeID);
            paramIndex++;
        }

        // Add ORDER BY clause based on sortBy parameter
        switch (sortBy) {
            case 'object_type':
                query += ` ORDER BY ot.string_key ${sortOrder}`;
                break;
            case 'action_type':
                query += ` ORDER BY at.string_key ${sortOrder}`;
                break;
            case 'username':
                query += ` ORDER BY u.username ${sortOrder}`;
                break;
            case 'date':
            default:
                query += ` ORDER BY al.event_at ${sortOrder}`;
                break;
        }

        // Add LIMIT and OFFSET if provided
        if (limit && !isNaN(limit) && limit > 0) {
            query += ` LIMIT $${paramIndex}`;
            params.push(limit);
            paramIndex++;
        }

        if (offset && !isNaN(offset) && offset >= 0) {
            query += ` OFFSET $${paramIndex}`;
            params.push(offset);
            paramIndex++;
        }

        // Attempt to run the query
        try {
            const result = await raesumDB.query(query, params);
            
            // Return the results as an array
            logger.info(`Retrieved ${result.rows.length} audit logs for org ${orgID}`, Date.now() - start);
            return result.rows;
            
        } catch (error) {
            // Throw error if query cannot run
            logger.error("Error retrieving audit logs: " + error, Date.now() - start);
            throw new Error("Error retrieving audit logs");
        }
        
    }

}


const raesumAudit = new raesumAuditObject();
export default raesumAudit;