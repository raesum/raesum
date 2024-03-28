import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import path from "path";
import fs from "fs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename, "module");


class raesumAuthorizationObject {

    actionsByStringKey = {};
    objectTypesByStringKey = {};
    scopesByStringKey = {};


    async init(){
        const start = Date.now();
        logger.info("Initializing Authorization Module", Date.now() - start);

        // Get all actions from db
        if(Object.keys(this.actionsByStringKey).length == 0 || Object.keys(this.objectTypesByStringKey).length == 0){
            let query = "SELECT * FROM raesum_auth_action_type";

            let actions = await raesumDB.query(query);

            // Save to memory
            actions['rows'].forEach((action)=>{
                this.actionsByStringKey[action.string_key.toLowerCase()] = action.id;
            });
            logger.info(Object.keys(this.actionsByStringKey).length + " actions loaded", Date.now() - start);



            // Get all object types from db
            query = "SELECT * FROM raesum_auth_object_type";
            let objectTypes = await raesumDB.query(query);

            // Save to memory
            objectTypes['rows'].forEach((objectType)=>{
                this.objectTypesByStringKey[objectType.string_key.toLowerCase()] = objectType.id;
            });
            logger.info(Object.keys(this.objectTypesByStringKey).length + " object types loaded", Date.now() - start);

            // Get all scopes from db
            query = "SELECT * FROM raesum_auth_scope_type";
            let scopes = await raesumDB.query(query);

            // Save to memory
            scopes['rows'].forEach((scope)=>{
                this.scopesByStringKey[scope.string_key.toLowerCase()] = scope.id;
            });
            logger.info(Object.keys(this.scopesByStringKey).length + " scopes loaded", Date.now() - start);

        }


    }

    /**
     * Loads the global roles into the database. Should run on migrate.
     */
    async loadGlobalRolesToDatabase(){
        const start = Date.now();
        logger.info("Loading Global Roles", Date.now() - start);

        // Load the globalRoles.json file
        const dirPath = path.join(__dirname, '..','..', 'controlledData/authorization/');
        const jsonFile = fs.readFileSync(path.join(dirPath, "globalRoles.json"), 'utf8');
        const jsonData = JSON.parse(jsonFile);


        // For each role
        for (let i = 0; i < jsonData.length; i++) {
            logger.debug(`Loading Role: ${jsonData[i].name}`, Date.now() - start);
            // If there is at least one field
            if (Object.keys(jsonData[i]).length > 0) {
                // Check to see if role exists, if so get the ID of the role and update the role
                const roleQuery = "SELECT * FROM raesum_auth_role WHERE string_key = $1";
                const roleResult = await raesumDB.query(roleQuery, [jsonData[i].string_key]);


                let roleID;
                // If role does not exist, create the role and get the ID
                if(roleResult.rows.length == 0) {
                    logger.debug(`Role with key: ${jsonData[i].string_key} does not exist, creating role`, Date.now() - start);
                    const roleInsertQuery = "INSERT INTO raesum_auth_role (string_key, name, org_id, active_status) VALUES ($1, $2, $3, $4) RETURNING id";
                    const roleInsertResult = await raesumDB.query(roleInsertQuery, [jsonData[i].string_key, jsonData[i].name, 0, jsonData[i].active_status]);
                    roleID = roleInsertResult.rows[0].id;
                }else{
                    // Update the role
                    logger.debug(`Role with key: ${jsonData[i].string_key} exists, updating role`, Date.now() - start);
                    roleID = roleResult.rows[0].id;
                    const roleUpdateQuery = "UPDATE raesum_auth_role SET name = $1, active_status = $2 WHERE id = $3";
                    await raesumDB.query(roleUpdateQuery, [jsonData[i].name, jsonData[i].active_status, roleID]);
                }

                logger.debug(`Setting permissions for role: ${jsonData[i].name} with key: ${jsonData[i].string_key}` , Date.now() - start);
                if(typeof roleID == "number" && roleID > 0) {
                    // Start a transaction
                    let query = "BEGIN;"

                    // Delete all permissions for the role
                    query += `DELETE FROM raesum_auth_role_x_permission WHERE role_id = ${roleID};`

                    // Get the object keys for the role permissions
                    const objectKeys = Object.keys(jsonData[i].permissions);

                    // For each object key, get the object ID and loop through the permissions
                    for(let j=0; j<objectKeys.length; j++) {
                       // Convert object string to ID
                          const objectID = await this.convertObjectTypeStringToID(objectKeys[j]);
                            if(objectID) {
                                const theObject = jsonData[i].permissions[objectKeys[j]];
                                // Get the permission keys for the object
                                const permissionKeys = Object.keys(theObject);

                                for(let k=0; k<permissionKeys.length; k++) {
                                    // Convert permission string to ID
                                    const permissionID = await this.convertActionStringToID(permissionKeys[k]);


                                    if(permissionID) {

                                        // Loop through the scopes
                                        for(let s=0; s<theObject[permissionKeys[k]].length;s++){
                                            // Convert the scope string key into a number
                                            const scopeID = await this.convertScopeStringToID(theObject[permissionKeys[k]][s]);

                                            if(typeof scopeID == "number" && scopeID > 0){
                                                // Add the permission to the role
                                                query += `INSERT INTO raesum_auth_role_x_permission (role_id, object_type_id, action_id, scope_id) VALUES (${roleID}, ${objectID}, ${permissionID}, ${scopeID});`
                                            }
                                        }
                                    }
                                }
                            }

                    }
                    // Finish Transaction
                    query += "COMMIT;"

                    // Run transaction
                    const dbReturn = await raesumDB.query(query);

                }

            }
        }
        logger.info("Finished Loading Global Roles", Date.now() - start);

    }



    /**
     * Checks to see if the user is allowed to perform the action on the object. It wraps checkUserPermissionByID
     * @param  {Number} id The ID of the user
     * @param  {String} objectTypeString The string key of the object type
     * @param  {String} actionString The string key of the action
     * @return {Boolean} Whether the user has permission or not
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the object type string is not a string or is not a valid object type
     * @throws {Error} If the action string is not a string or is not a valid action type
     */
    async checkUserPermission(userID,objectTypeString,actionString){
        const start = Date.now();

        // Init if needed
        if(Object.keys(this.objectTypesByStringKey).length == 0){
            await this.init();
        }

        // Convert object type string to ID
        try{
            objectTypeString = await this.convertObjectTypeStringToID(objectTypeString);
        }catch(e){
            throw e;
        }

        // Convert action type string to ID
        try{
            actionString = await this.convertActionStringToID(actionString);
        }catch(e){
            throw e;
        }

        return await this.checkUserPermissionByID(userID,objectTypeString,actionString);

    }



    /**
     * Checks to see if the user is allowed to perform the action on the object. It wraps checkUserPermissionByID
     * @param  {Number} id The ID of the user
     * @param  {Number} objectTypeId The id of the object type
     * @param  {Number} actionId The id of the action
     * @return {Boolean} Whether the user has permission or not. Will return false if valid data types but non-existant values are supplied
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the object type string is not an id
     * @throws {Error} If the action string is not an id
     */
    async checkUserPermissionByID(userID,objectTypeId,actionId){

    }



    /**
     * Converts the action string to an ID
     * @param  {String} actionString The string key of the object type
     * @returns {Number} The ID of the action type
     * @throws {Error} If the action string is not a string or is not a valid action type
     */
    async convertActionStringToID(actionString){
        const start = Date.now();
        if(Object.keys(this.actionsByStringKey).length == 0){
            await this.init();
        }


        if(typeof actionString != "string"){
            logger.error("Invalid input for convertActionStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertActionStringToID. Must be a string.")
        }

        actionString = actionString.toLowerCase();

        if(this.actionsByStringKey[actionString]){
            return this.actionsByStringKey[actionString];
        }else{
            logger.warning("Unable to find action type with string: " + actionString, Date.now() - start);
            return false;
        }
    }

    /**
     * Converts the object string to an ID
     * @param  {String} objectTypeString The string key of the object type
     * @returns {Number} The ID of the object type
     * @throws {Error} If the object string is not a string or is not a valid object type
     */
    async convertObjectTypeStringToID(objectTypeString){
        const start = Date.now();
        if(Object.keys(this.actionsByStringKey).length == 0){
            await this.init();
        }

        if(typeof objectTypeString != "string"){
            logger.error("Invalid input for convertObjectTypeStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertObjectTypeStringToID. Must be a string.")
        }

        objectTypeString = objectTypeString.toLowerCase();

        if(this.objectTypesByStringKey[objectTypeString]){
            return this.objectTypesByStringKey[objectTypeString];
        }else{
            logger.warning("Unable to find object type with string: " + objectTypeString, Date.now() - start)
            return false;
        }
    }

    /**
     * Converts the scope string to an ID
     * @param  {String} scopeString The string key of the object type
     * @returns {Number} The ID of the scope type
     * @throws {Error} If the scope string is not a string or is not a valid scope type
     */
    async convertScopeStringToID(scopeString){
        const start = Date.now();
        if(Object.keys(this.scopesByStringKey).length == 0){
            await this.init();
        }

        if(typeof scopeString != "string"){
            logger.error("Invalid input for convertScopeStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertScopeStringToID. Must be a string.")
        }

        scopeString = scopeString.toLowerCase();

        if(this.scopesByStringKey[scopeString]){
            return this.scopesByStringKey[scopeString];
        }else{
            logger.warning("Unable to find scope type with string: " + scopeString, Date.now() - start)
            return false;
        }

    }

}



const raesumAuthorization = new raesumAuthorizationObject();
export default raesumAuthorization;