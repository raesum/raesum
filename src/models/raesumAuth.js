import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import path from "path";
import fs from "fs";
import raesumUser from "./raesumUser.js";
import { json } from "stream/consumers";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename);


class raesumAuthorizationObject {

    actionsByStringKey = {};
    actionIDs = [];
    objectTypesByStringKey = {};
    objectIDs = [];
    scopesByStringKey = {};
    scopesIDs = [];


    async init() {
        const start = Date.now();
        logger.info("Initializing Authorization Module", Date.now() - start);

        // Get all actions from db
        if (Object.keys(this.actionsByStringKey).length == 0 || Object.keys(this.objectTypesByStringKey).length == 0) {
            let query = "SELECT * FROM raesum_auth_action_type";

            let actions = await raesumDB.query(query);

            // Save to memory
            actions['rows'].forEach((action) => {
                this.actionsByStringKey[action.string_key.toLowerCase()] = action.id;
                this.actionIDs.push(action.id);
            });
            logger.info(Object.keys(this.actionsByStringKey).length + " actions loaded", Date.now() - start);


            // Get all object types from db
            query = "SELECT * FROM raesum_auth_object_type";
            let objectTypes = await raesumDB.query(query);

            // Save to memory
            objectTypes['rows'].forEach((objectType) => {
                this.objectTypesByStringKey[objectType.string_key.toLowerCase()] = objectType.id;
                this.objectIDs.push(objectType.id);
            });
            logger.info(Object.keys(this.objectTypesByStringKey).length + " object types loaded", Date.now() - start);

            // Get all scopes from db
            query = "SELECT * FROM raesum_auth_scope_type";
            let scopes = await raesumDB.query(query);

            // Save to memory
            scopes['rows'].forEach((scope) => {
                this.scopesByStringKey[scope.string_key.toLowerCase()] = scope.id;
                this.scopesIDs.push(scope.id);
            });
            logger.info(Object.keys(this.scopesByStringKey).length + " scopes loaded", Date.now() - start);

        }


    }

    /**
     * Loads the global roles into the database. Should run on migrate.
     */
    async loadGlobalRolesToDatabase() {
        /*
        Note: Several of the SQL commands here are not using prepared statements. This except is made because the data is controlled solely in the core codebase and the data is not user input. Further, this function only runs during a migrate or initialization and is not exposed to the public.
         */
        const start = Date.now();
        logger.info("Loading Global Roles", Date.now() - start);

        // Load the globalRoles.json file
        const dirPath = path.join(__dirname, '..', '..', 'controlledData/authorization/');
        const jsonFile = fs.readFileSync(path.join(dirPath, "globalRoles.json"), 'utf8');
        const jsonData = JSON.parse(jsonFile);


        // For each role
        for (let i = 0; i < jsonData.length; i++) {
            logger.verbose(`Loading Role: ${jsonData[i].name}`, Date.now() - start);
            // If there is at least one field
            if (Object.keys(jsonData[i]).length > 0) {
                // Check to see if role exists, if so get the ID of the role and update the role
                const roleQuery = "SELECT * FROM raesum_auth_role WHERE string_key = $1";
                const roleResult = await raesumDB.query(roleQuery, [jsonData[i].string_key]);


                let roleID;

                // If role does not exist, create the role and get the ID
                if (roleResult.rows.length == 0) {
                    logger.verbose(`Role with key: ${jsonData[i].string_key} does not exist, creating role`, Date.now() - start);
                    const roleInsertQuery = "INSERT INTO raesum_auth_role (string_key, name, active_status) VALUES ($1, $2, $3) RETURNING id";
                    const roleInsertResult = await raesumDB.query(roleInsertQuery, [jsonData[i].string_key, jsonData[i].name, jsonData[i].active_status]);
                    roleID = roleInsertResult.rows[0].id;
                } else {
                    // Update the role
                    logger.verbose(`Role with key: ${jsonData[i].string_key} exists, updating role`, Date.now() - start);
                    roleID = roleResult.rows[0].id;
                    const roleUpdateQuery = "UPDATE raesum_auth_role SET name = $1, active_status = $2 WHERE id = $3";
                    await raesumDB.query(roleUpdateQuery, [jsonData[i].name, jsonData[i].active_status, roleID]);
                }

                // Create the role org restrictions
                if (jsonData[i].restrict_to_organization.length > 0) {
                    // Start a transaction
                    let query = "BEGIN;";

                    // Remove old restrictions
                    query += `DELETE
                              FROM raesum_auth_role_x_organization_restriction
                              WHERE role_id = ${roleID}; `;

                    // Add new restrictions

                    // Remove all non-int from restriction array
                    const orgRestrictionsArr = jsonData[i].restrict_to_organization.filter((el) => {
                        return typeof el == "number";
                    });

                    // Insert new restrictions if any are INT
                    if (orgRestrictionsArr.length > 0) {
                        const orgRestrictionsString = orgRestrictionsArr.join(",");
                        query += `INSERT INTO raesum_auth_role_x_organization_restriction (role_id, org_id)
                                  SELECT ${roleID} as role_id, id as org_id
                                  FROM raesum_organization as ro
                                  WHERE ro.id IN (${orgRestrictionsString}); `;
                    }

                    // Commit transaction
                    query += "COMMIT;";

                    // Run transaction
                    try {
                        const dbReturn = await raesumDB.query(query);
                        logger.verbose(`Set org restrictions set for role: ${jsonData[i].name} with key: ${jsonData[i].string_key}`, Date.now() - start);
                    } catch (e) {
                        logger.error(`Error setting org restrictions for role: ${jsonData[i].name} with key: ${jsonData[i].string_key}. Error: ${e}`, Date.now() - start);
                    }


                } else {
                    logger.verbose(`No org restrictions for role: ${jsonData[i].name} with key: ${jsonData[i].string_key}`, Date.now() - start);
                    // Delete all org restrictions
                    const deleteOrgRestrictionsQuery = `DELETE
                                                        FROM raesum_auth_role_x_organization_restriction
                                                        WHERE role_id = ${roleID}`;
                    await raesumDB.query(deleteOrgRestrictionsQuery);
                }


                // Create the role permissions
                logger.verbose(`Setting permissions for role: ${jsonData[i].name} with key: ${jsonData[i].string_key}`, Date.now() - start);
                if (typeof roleID == "number" && roleID > 0) {
                    // Start a transaction
                    let query = "BEGIN;"

                    // Delete all permissions for the role
                    query += `DELETE
                              FROM raesum_auth_role_x_permission
                              WHERE role_id = ${roleID};`

                    // Get the object keys for the role permissions
                    const objectKeys = Object.keys(jsonData[i].permissions);

                    // For each object key, get the object ID and loop through the permissions
                    for (let j = 0; j < objectKeys.length; j++) {

                        // Convert object string to ID
                        const objectID = await this.convertObjectTypeStringToID(objectKeys[j]);
                        if (objectID) {
                            const theObject = jsonData[i].permissions[objectKeys[j]];
                            // Get the permission keys for the object
                            const permissionKeys = Object.keys(theObject);

                            for (let k = 0; k < permissionKeys.length; k++) {
                                // Convert permission string to ID
                                const permissionID = await this.convertActionStringToID(permissionKeys[k]);


                                if (permissionID) {

                                    // Loop through the scopes
                                    for (let s = 0; s < theObject[permissionKeys[k]].length; s++) {
                                        // Convert the scope string key into a number
                                        const scopeID = await this.convertScopeStringToID(theObject[permissionKeys[k]][s]);

                                        if (typeof scopeID == "number" && scopeID > 0) {
                                            // Add the permission to the role
                                            query += `INSERT INTO raesum_auth_role_x_permission (role_id, object_type_id, action_id, scope_id)
                                                      VALUES (${roleID}, ${objectID}, ${permissionID}, ${scopeID});`
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
     * @param  {Number} orgID The ID of the organization
     * @param  {Number} objectOwnerUserID The ID of the user who owns the object
     * @param  {Array} [scopesRequired=[]] An array of scopes required to perform the action
     * @return {Boolean} Whether the user has permission or not
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the object type string is not a string or is not a valid object type
     * @throws {Error} If the action string is not a string or is not a valid action type
     */
    async checkUserPermission(userID, objectTypeString, actionString, orgID, objectOwnerUserID) {
        const start = Date.now();

        // Init if needed
        if (Object.keys(this.objectTypesByStringKey).length == 0) {
            await this.init();
        }

        // Convert object type string to ID
        let objectTypeID = false;
        try {
            objectTypeID = await this.convertObjectTypeStringToID(objectTypeString);
            logger.debug("Permission Converted object type string to ID (" + objectTypeString + ")");
        } catch (e) {
            logger.error("Failed to convert object type string (" + objectTypeString + ") to ID: " + e);
            return false;
        }

        if (!objectTypeID) {
            logger.error("Failed to convert object type string (" + objectTypeString + ") to ID");
            return false;
        }

        // Convert action type string to ID
        try {
            actionString = await this.convertActionStringToID(actionString);
            logger.debug("Permission Converted action type string to ID  (" + actionString + ")");
        } catch (e) {
            logger.error("Failed to convert action string (" + actionString + ") to ID: " + e);
            return false;
        }

        logger.debug("Checking user permission for user " + userID + " on object type " + objectTypeString + " with action " + actionString + " in organization " + orgID + " for object owner " + objectOwnerUserID);
        return await this.checkUserPermissionByID(userID, objectTypeID, actionString, orgID, objectOwnerUserID);

    }


    /**
     * Checks to see if the user is allowed to perform the action on the object. It wraps checkUserPermissionByID
     * @param  {Number} id The ID of the user
     * @param  {Number} objectTypeId The id of the object type
     * @param  {Number} actionId The id of the action
     * @param  {Number} orgID The ID of the organization
     * @param  {Number} objectOwnerUserID The ID of the user who owns the object
     * @param  {Array} [scopesRequired=[]] An array of scopes required to perform the action
     * @return {Boolean} Whether the user has permission or not. Will return false if valid data types but non-existant values are supplied
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the object type string is not an id
     * @throws {Error} If the action string is not an id
     * @throws {Error} If the orgID is not a positive int
     * @throws {Error} If the objectOwnerUserID is not a positive int
     */
    async checkUserPermissionByID(userID, objectTypeId, actionId, orgID, objectOwnerUserID, scopesRequired) {
        const start = Date.now();

        // Init if not already initialized
        if (this.scopesIDs.length == 0) {
            await this.init();
        }

        // Check to see if orgID is positive int
        if (typeof orgID != "number" || orgID < 1) {
            logger.error("Invalid input for checkUserPermissionByID. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for checkUserPermissionByID. Must be a positive int.");
        }

        // Check to see if the user ID is a positive int
        if (typeof userID != "number" || userID < 1) {
            logger.error("Invalid input for checkUserPermissionByID. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for checkUserPermissionByID. Must be a positive int.");
        }

        // Check to see if the object type ID is in the objectID list
        if (!this.objectIDs.includes(objectTypeId)) {
            logger.error("Invalid input for checkUserPermissionByID. Must be a valid object type ID.", Date.now() - start);
            throw new Error("Invalid input for checkUserPermissionByID. Must be a valid object type ID.");
        }


        // Check to see if the action ID is in the action list
        if (!this.actionIDs.includes(actionId)) {
            logger.error("Invalid input for checkUserPermissionByID. Must be a valid action ID.", Date.now() - start);
            throw new Error("Invalid input for checkUserPermissionByID. Must be a valid action ID.");
        }

        // Determine allowed scopes
        logger.verbose("Determining allowed scopes", Date.now() - start);

        // If scopesRequired has been supplied and is an array
        if (scopesRequired && Array.isArray(scopesRequired) && scopesRequired.length > 0) {
            logger.debug("Scopes required have been supplied", Date.now() - start);
            // Check to see if the specified scopes exist
            for (let i = 0; i < scopesRequired.length; i++) {
                if (!this.scopesIDs.includes(scopesRequired[i])) {
                    scopesRequired.splice(i, 1);
                }
            }
        } else {
            scopesRequired = [];
        }

        if (scopesRequired.length == 0) {
            logger.debug("No valid scopes required have been supplied", Date.now() - start);

            // If the user is the owner of the object, and their current org matches the object org, then look for scopes 1, 2, 3
            if (userID == objectOwnerUserID && orgID == objectOwnerUserID) {
                logger.debug("User is the owner of the object and the org matches the object org", Date.now() - start);
                scopesRequired = [1, 2, 3];
            } else {
                logger.debug("User is not the owner of the object. Getting user org to determine if org-level access is allowed", Date.now() - start);
                // Get current user's org

                const user = await raesumUser.getUserById(userID);
                const userOrg = user.current_organization_id;

                // If the user's current org and the object's org match then look for scopes 2, 3
                if (userOrg == orgID) {
                    logger.debug("User's org matches the object's org. Using org level or global scope", Date.now() - start);
                    scopesRequired = [2, 3];
                } else {
                    // If there are no matches, then require scope three
                    logger.debug("User's org does not match the object's org. Using global scope", Date.now() - start);
                    scopesRequired = [3];
                }
            }
        }

        // Check to see if the user has a deny permission
        const denyquery = `SELECT user_id
                       FROM raesum_auth_role_x_permission as rxp
                                INNER JOIN raesum_auth_user_x_organization_x_role as uxoxr
                                           ON rxp.role_id = uxoxr.role_id
                                               AND uxoxr.org_id = $1
                                               AND uxoxr.user_id = $2
                       WHERE action_id = $3
                         AND object_type_id = $4
                       LIMIT 1;`;

        const denyparams = [orgID, userID, 6, objectTypeId];
        logger.debug("Checking for deny permission " +  + JSON.stringify(denyparams), Date.now() - start);
        const denyresult = await raesumDB.query(denyquery, denyparams);

        if (denyresult.rows.length > 0) {
            logger.debug("User has permission denied", Date.now() - start);
            return false;
        }


        // Check to see if the user has the required permissions
        const query = `SELECT user_id
                       FROM raesum_auth_role_x_permission as rxp
                                INNER JOIN raesum_auth_user_x_organization_x_role as uxoxr
                                           ON rxp.role_id = uxoxr.role_id
                                               AND uxoxr.org_id = $1
                                               AND uxoxr.user_id = $2
                       WHERE rxp.scope_id = ANY($3)
                         AND action_id = $4
                         AND object_type_id = $5
                       LIMIT 1;`;

        const params = [orgID, userID, scopesRequired, actionId, objectTypeId];
        logger.debug("Checking for permission " + JSON.stringify(params), Date.now() - start);
        const result = await raesumDB.query(query, params);

        if (result.rows.length > 0) {
            logger.debug("User has permission", Date.now() - start);
            return true;
        } else {
            logger.debug("User does not have permission", Date.now() - start);
            return false;
        }

    }

    /**
     * Returns the most powerful scope permitted for this user / object / action combination. This can be used to craft params for bulk functions (like get a list of objects)
     * @param  {Number} id The ID of the user
     * @param  {Number} objectTypeId The id of the object type
     * @param  {Number} actionId The id of the action
     * @return {Number} Get most permissive scope for the user / object / action combination
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the object type string is not an id
     * @throws {Error} If the action string is not an id
     */
    async getAllowedUserScopesByIDs(userID, objectTypeId, actionId) {
        const start = Date.now();

        // Init if not already initialized
        if (this.scopesIDs.length == 0) {
            await this.init();
        }

        // Check to see if the user ID is a positive int
        if (typeof userID != "number" || userID < 1) {
            logger.error("Invalid input for checkUserPermissionByID. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for checkUserPermissionByID. Must be a positive int.");
        }

        // Check to see if the object type ID is in the objectID list
        if (!this.objectIDs.includes(objectTypeId)) {
            logger.error("Invalid input for getAllowedUserScopesByIDs. Must be a valid object type ID.", Date.now() - start);
            throw new Error("Invalid input for getAllowedUserScopesByIDs. Must be a valid object type ID.");
        }

        // Check to see if actionID is in the actionLIst
        if (!this.actionIDs.includes(actionId)) {
            logger.error("Invalid input for checkUserPermissionByID. Must be a valid action ID.", Date.now() - start);
            throw new Error("Invalid input for checkUserPermissionByID. Must be a valid action ID.");
        }


        // Check for Deny Permission
        const denyquery = `SELECT rxp.scope_id
                       FROM raesum_auth_role_x_permission as rxp
                                INNER JOIN raesum_auth_user_x_organization_x_role as uxoxr
                                           ON rxp.role_id = uxoxr.role_id
                                               AND uxoxr.user_id = $1
                                INNER JOIN raesum_user as u
                                           ON uxoxr.user_id = u.id AND uxoxr.org_id = u.current_organization_id
                       WHERE action_id = $3
                         AND object_type_id = $2
                       ORDER BY rxp.scope_id DESC
                       LIMIT 1;`

        const denyparams = [userID, objectTypeId, 6];

        const denyresult = await raesumDB.query(denyquery, denyparams);
        if (denyresult.rows.length > 0) {
            logger.debug("User has been denied permission", Date.now() - start);
            return false;
        }


        // Get the highest value scopeID
        const query = `SELECT rxp.scope_id
                       FROM raesum_auth_role_x_permission as rxp
                                INNER JOIN raesum_auth_user_x_organization_x_role as uxoxr
                                           ON rxp.role_id = uxoxr.role_id
                                               AND uxoxr.user_id = $1
                                INNER JOIN raesum_user as u
                                           ON uxoxr.user_id = u.id AND uxoxr.org_id = u.current_organization_id
                       WHERE action_id = $3
                         AND object_type_id = $2
                       ORDER BY rxp.scope_id DESC
                       LIMIT 1;`

        const params = [userID, objectTypeId, actionId];

        const result = await raesumDB.query(query, params);
        if (result.rows.length > 0 && !isNaN(parseInt(result.rows[0].scope_id))) {
            const allowedScope = parseInt(result.rows[0].scope_id);
            logger.debug("User has allowed scope: " + allowedScope, Date.now() - start);
            return allowedScope;
        } else {
            logger.debug("No scopes found for user", Date.now() - start);
            return false;
        }
    }

    /**
     * Converts the action string to an ID
     * @param  {String} actionString The string key of the object type
     * @returns {Number} The ID of the action type
     * @throws {Error} If the action string is not a string or is not a valid action type
     */
    async convertActionStringToID(actionString) {
        const start = Date.now();
        if (Object.keys(this.actionsByStringKey).length == 0) {
            await this.init();
        }


        if (typeof actionString != "string") {
            logger.error("Invalid input for convertActionStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertActionStringToID. Must be a string.")
        }

        actionString = actionString.toLowerCase();

        if (this.actionsByStringKey[actionString]) {
            return this.actionsByStringKey[actionString];
        } else {
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
    async convertObjectTypeStringToID(objectTypeString) {
        const start = Date.now();
        if (Object.keys(this.actionsByStringKey).length == 0) {
            await this.init();
        }

        if (typeof objectTypeString != "string") {
            logger.error("Invalid input for convertObjectTypeStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertObjectTypeStringToID. Must be a string.")
        }

        objectTypeString = objectTypeString.toLowerCase();

        if (this.objectTypesByStringKey[objectTypeString]) {
            return this.objectTypesByStringKey[objectTypeString];
        } else {
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
    async convertScopeStringToID(scopeString) {
        const start = Date.now();
        if (Object.keys(this.scopesByStringKey).length == 0) {
            await this.init();
        }

        if (typeof scopeString != "string") {
            logger.error("Invalid input for convertScopeStringToID. Must be a string.", Date.now() - start);
            throw new Error("Invalid input for convertScopeStringToID. Must be a string.")
        }

        scopeString = scopeString.toLowerCase();

        if (this.scopesByStringKey[scopeString]) {
            return this.scopesByStringKey[scopeString];
        } else {
            logger.warning("Unable to find scope type with string: " + scopeString, Date.now() - start)
            return false;
        }

    }


    /**
     * Gets the roles for a user
     * @param {Number} userID The ID of the user
     * @param  {Number} [orgID=currentOrgID] The ID of the organization. Defaults to the user's current orgID
     * @param {Boolean} [showInactive=false] Whether to include inactive roles AND inactive orgs
     * @returns {Object} An Object of role IDs, org IDs, and role keys
     * @throws {Error} If the user ID is not a number or is not a valid user ID
     */
    async getUserRoles(userID, orgID = null, activeOnly = true) {
        const start = Date.now();
        logger.verbose("Starting getUserRoles for user " + userID, Date.now() - start);

        // Validate the data types of the inputs
        if (typeof userID != "number" || userID < 1) {
            logger.error("Invalid userID input for getUserRoles. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid userID input for getUserRoles. Must be a positive int.");
        }

        if (typeof activeOnly != "boolean") {
            activeOnly = false;
        }

        // If the orgID is not submitted
        if (typeof orgID != "number" || orgID < 1) {
            logger.debug("OrgID not submitted for getUserRoles. Getting current orgID for user", Date.now() - start);
            // Get the user
            const user = await raesumUser.getUserById(userID);
            
            // set the orgID equal to the user's current org
            orgID = user.current_organization_id;
        }

        const query = `SELECT RAUXOXR.role_id, RAUXOXR.org_id, RAR.string_key
                        FROM raesum_auth_user_x_organization_x_role as RAUXOXR
                        INNER JOIN raesum_auth_role as RAR ON RAR.id = RAUXOXR.role_id
                        INNER JOIN raesum_organization as RO ON RAUXOXR.org_id = RO.id
                        WHERE RAUXOXR.user_id = $1
                        AND RAR.active_status = $3
                        AND RO.active_status = $4
                        AND RAUXOXR.org_id = $2
                        ORDER BY RAUXOXR.org_id ASC, RAUXOXR.role_id ASC;`;
        const params = [userID, orgID, activeOnly, showInactive];
        try{
            const result = await raesumDB.query(query, params);

            logger.info(`Found ${result.rows.length} roles for user: ${userID}`, Date.now() - start);

            return result.rows;
        }catch(e){
            logger.error(`Error getting user roles for user: ${userID}`, Date.now() - start);
            throw e;
        }
        return [];
    }


    /**
     * Adds a user to a role for an organization. The user MUST already be allowed to switch to the organization. The role must also be available to the organization. A user cannot be added to an inactive role.
     * @param  {Number} id The ID of the user
     * @param  {Number} roleID The ID of the role
     * @param  {Number} [orgID=currentOrgID] The ID of the organization. Defaults to the user's current orgID
     * @returns {boolean} True on success
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the role ID is not a positive int
     */
    async addUserToRole(userID, roleID, orgID) {
        const start = Date.now();

        // Validate the data types of the inputs
        if (typeof userID != "number" || userID < 1) {
            logger.error("Invalid input for addUserToRole. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for addUserToRole. Must be a positive int.");
        }

        if (typeof roleID != "number" || roleID < 1) {
            logger.error("Invalid input for addUserToRole. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for addUserToRole. Must be a positive int.");
        }

        // If the orgID is not submitted
        if (typeof orgID != "number" || orgID < 1) {
            logger.debug("OrgID not submitted. Getting current orgID for user", Date.now() - start);
            // Get the user
            const user = await raesumUser.getUserById(userID);
            
            // set the orgID equal to the user's current org
            orgID = user.current_organization_id;
        }

        // Check to see if the user already is in the role
        

        logger.debug(`Checking if user is already in role: ${userID}, ${roleID}, ${orgID}`, Date.now() - start);
        try {
            const query = `SELECT * FROM raesum_auth_user_x_organization_x_role WHERE user_id = $3 AND role_id = $2 AND org_id = $1`;

            const params = [orgID, roleID, userID ];

            const result = await raesumDB.query(query, params);
            console.log("params",params)
            console.log("result.rowCount",result.rowCount);
            console.log("result.rows",result.rows);
            if (result.rowCount > 0) {
                logger.warning(`User ${userID} already in role: ${roleID} for org: ${orgID}, or role, org, or user does not exist`, Date.now() - start);
                return false;
            } 
        }catch(e){
            logger.error(`Error checking if user ${userID} is in role ${roleID} for org ${orgID} with error: ` + e, Date.now() - start);
            throw new Error("Error checking if user is in role");
        }

        logger.debug(`User is not already in role, attempting to add: ${userID}, ${roleID}, ${orgID}`, Date.now() - start);

        try {
                const params = [orgID, orgID, userID, roleID];

                const query = `INSERT INTO raesum_auth_user_x_organization_x_role 
                        SELECT  oxu.user_id, oxu.org_id, allowedRole.id as role_id
                                FROM (SELECT r.id as id, rxor.org_id as org_id
                                    FROM raesum_auth_role as r
                                            INNER JOIN raesum_auth_role_x_organization_restriction as rxor
                                                        ON r.id = rxor.role_id
                                                            AND org_id = $1
                                    WHERE r.active_status = true
                                    UNION
                                    SELECT r.id as id, $2 as org_id
                                    FROM raesum_auth_role as r
                                            LEFT JOIN raesum_auth_role_x_organization_restriction as rxor
                                                        ON r.id = rxor.role_id
                                    WHERE rxor.org_id IS NULL
                                        AND r.active_status = true) as allowedRole
                                        LEFT JOIN raesum_organization_x_user as oxu
                                                ON oxu.org_id = allowedRole.org_id AND oxu.user_id = $3
                                WHERE allowedRole.id = $4
                                AND oxu.user_id IS NOT NULL`;
                                
                const result = await raesumDB.query(query, params);
                logger.debug(`Result of adding user to role: ${userID}, ${roleID}, ${orgID}`, Date.now() - start);

                if(result.rowCount > 0){
                    logger.info(`User: ${userID} added to role: ${roleID} for org: ${orgID}`, Date.now() - start);
                    return true;
                }
                logger.warning(`User ${userID} already in role: ${roleID} for org: ${orgID}, or role, org, or user does not exist`, Date.now() - start);
                return false;
            
        } catch (e) {
            logger.error(`Error adding user ${userID} to role ${roleID} for org ${orgID} with error: ` + e, Date.now() - start);
            throw new Error("Error adding user to role");

        }

    }

    /**
     * Adds a user to a role for an organization using the role's stringkey. It wraps addUserToRole.
     * @param  {Number} id The ID of the user
     * @param  {Number} roleStringKey The ID of the role
     * @param  {Number} [orgID=currentOrgID] The ID of the organization. Defaults to the user's current orgID
     * @returns {boolean} True on success
     * @throws {Error} If the addUserToRole fails
     * @throws {Error} If the roleSringKey does not match any role
     * @throws {Error} If the roleSringKey is not a string
     */
    async addUserToRoleByKey(userID, roleStringKey, orgID) {
        const start = Date.now();

        // Validate that the role string key
        if (typeof roleStringKey != "string" || roleStringKey == "") {
            logger.error("Invalid input for addUserToRoleByKey. 'roleStringKey' must be a string.", Date.now() - start);
            throw new Error("Invalid input for addUserToRoleByKey. 'roleStringKey' must be a string.");
        }

        // Look up the roleID by string in the database
        const query = `SELECT id
                       FROM raesum_auth_role
                       WHERE string_key = $1
                       LIMIT 1;`;
        const result = await raesumDB.query(query, [roleStringKey]);
        if (result.rows.length > 0) {
            const roleID = parseInt(result.rows[0].id);
            logger.verbose(`Role found for key ${roleStringKey}. Adding user to role.`, Date.now() - start);
            return await this.addUserToRole(userID, roleID, orgID);
        } else {
            logger.warning("Role not found", Date.now() - start);
            throw new Error("Role not found");
        }

    }


    /**
     * Removes a user to a role for an organization.
     * @param  {Number} id The ID of the user
     * @param  {Number} roleID The ID of the role
     * @param  {Number} [orgID=currentOrgID] The ID of the organization. Defaults to the user's current orgID
     * @returns {boolean} True on success
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the role ID is not a positive int
     */
    async removeUserFromRole(userID, roleID, orgID) {
        const start = Date.now();

        // Validate the data types of the inputs
        if (typeof userID != "number" || userID < 1) {
            logger.error("Invalid input for removeUserFromRole. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for removeUserFromRole. Must be a positive int.");
        }

        if (typeof roleID != "number" || roleID < 1) {
            logger.error("Invalid input for removeUserFromRole. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for removeUserFromRole. Must be a positive int.");
        }

        // If the orgID is not submitted
        if (typeof orgID != "number" || orgID < 1) {
            logger.debug("OrgID not submitted. Getting current orgID for user", Date.now() - start);
            const user = await raesumUser.getUserByID(userID);
            orgID = user.org_id;
        }

        // Remove the user from the role
        const query = `DELETE
                       FROM raesum_auth_user_x_organization_x_role
                       WHERE user_id = $1
                         AND org_id = $2
                         AND role_id = $3;`;
        const params = [userID, orgID, roleID];
        try {
            const result = await raesumDB.query(query, params);
            if (result.rowCount > 0) {
                logger.info(`User: ${userID} removed from role: ${roleID} for org: ${orgID}`, Date.now() - start);
                return true;
            } else {
                logger.warning(`User ${userID} not in role: ${roleID} for org: ${orgID}, or role, org, or user does not exist`, Date.now() - start);
                return false;
            }
        } catch (e) {
            logger.error("Error removing user from role with error: " + e, Date.now() - start);
            throw new Error("Error removing user from role");
        }

    }

    /**
     * Get role by ID
     * @param  {Number} roleID The ID of the role
     * @param   {boolean} [activeOnly=true] Only return active roles
     * @returns {object} A single role object
     * @throws {Error} If the role ID is not a positive int
     * @throws {Error} If the role does not exist
     */
    async getRoleByID(roleID, activeOnly) {
        const start = Date.now();

        // Validate that roleID is a positive int
        if (typeof roleID != "number" || roleID < 1) {
            logger.error("Invalid input for getRoleByID. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for getRoleByID. Must be a positive int.");
        }

        // Determine whether to include inactive records
        // Create query fragment for activeonly
        let activeOnlyQuery = "";
        if (activeOnly !== false) {
            activeOnlyQuery = " AND r.active_status = true ";
        }

        const query = `SELECT *
                       FROM raesum_auth_role as r
                       WHERE id = $1 ${activeOnlyQuery};`;
        const result = await raesumDB.query(query, [roleID]);

        if (result.rows.length > 0) {
            logger.verbose(`Found role`, Date.now() - start);
            return result.rows[0];
        } else {
            logger.warning(`Role with ID: ${roleID} not found`, Date.now() - start);
            throw new Error("Role not found");
        }

    }

        /**
     * Get role by ID
     * @param  {Array} roleIDs The IDs of the roles
     * @param   {boolean} [activeOnly=true] Only return active roles
     * @returns {object} A single role object
     * @throws {Error} If the role ID is not a positive int
     * @throws {Error} If the role does not exist
     */
    async getRolesByIDs(roleIDs, activeOnly) {
        const start = Date.now();

        // Validate that roleID is a positive int
        if(!Array.isArray(roleIDs) || roleIDs.length === 0) {
            for(let i=0;i<roleIDs.length;i++) {
                roleIDs[i] = parseInt(roleIDs[i]);

                if(isNaN(roleIDs[i]) || typeof roleIDs[i] != "number" || roleIDs[i] < 1) {
                    logger.error("Invalid input for getRoleByID. Must be a positive int.", Date.now() - start);
                    throw new Error("Invalid input for getRoleByID. Must be a positive int.");
                }
            }
        }

        // Determine whether to include inactive records
        // Create query fragment for activeonly
        let activeOnlyQuery = "";
        if (activeOnly !== false) {
            activeOnlyQuery = " AND r.active_status = true ";
        }

        const query = `SELECT *
                       FROM raesum_auth_role as r
                       WHERE id = ANY($1) ${activeOnlyQuery};`;
        const result = await raesumDB.query(query, [roleIDs]);

        if (result.rows.length > 0) {
            logger.verbose(`getRolesByIDs found ${result.rows.length} roles`, Date.now() - start);
            return result.rows;
        } else {
            logger.warning(`Roles with IDs: ${roleIDs.join(",")} not found`, Date.now() - start);
            throw new Error("Role not found");
        }

    }

    /**
     * Get role by Key
     * @param  {Number} roleStringKey The string of the role     * @param   {boolean} [activeOnly=true] Only return active roles
     * @returns {object} A single role object
     * @throws {Error} If the role string key is a non-empty string
     * @throws {Error} If the role does not exist
     */
    async getRoleByKey(roleStringKey, activeOnly) {
        const start = Date.now();

        // Determine if the roleStringKey is a non-empty string
        if (typeof roleStringKey != "string" || roleStringKey == "") {
            logger.error("Invalid input for getRoleByKey. Must be a non-empty string.", Date.now() - start);
            throw new Error("Invalid input for getRoleByKey. Must be a non-empty string.");
        }

        // Determine whether to include inactive records
        // Create query fragment for activeonly
        let activeOnlyQuery = "";
        if (activeOnly !== false) {
            activeOnlyQuery = " AND r.active_status = true ";
        }

        // Get the role ID
        const query = `SELECT id
                       FROM raesum_auth_role as r
                       WHERE string_key = $1 ${activeOnlyQuery};`;
        const result = await raesumDB.query(query, [roleStringKey]);

        // If the role exists, get the role
        if (result.rows.length > 0) {
            return await this.getRoleByID(result.rows[0].id, activeOnly);
        } else {
            logger.warning(`Role with key: ${roleStringKey} not found`, Date.now() - start);
            throw new Error("Role not found");
        }
    }

    /**
     * Get roles by ID
     * @param  {Array} roleIDArray An array of roleIDs
     * @param   {boolean} [activeOnly=true] Only return active roles
     * @returns {Array} Array of role objects
     * @throws {Error} If the roleIDArray does not contain at least one positive INT
     * @throws {Error} If the role does not exist
     */
    async getRolesByID(roleIDArray, activeOnly) {
        const start = Date.now();

        // Validate the data types of the inputs
        if (!Array.isArray(roleIDArray) || roleIDArray.length == 0) {
            logger.error("Invalid input for getRolesByID. Must be an array with at least one positive int.", Date.now() - start);
            throw new Error("Invalid input for getRolesByID. Must be an array with at least one positive int.");
        }

        // Remove all non-positive INT from the array
        roleIDArray = roleIDArray.filter((el) => {
            return typeof el == "number" && el > 0;
        });

        // If the array is empty, throw error
        if (roleIDArray.length == 0) {
            logger.error("Invalid input for getRolesByID. Must be an array with at least one positive int.", Date.now() - start);
            throw new Error("Invalid input for getRolesByID. Must be an array with at least one positive int.");
        }

        // Determine whether to include inactive records
        // Create query fragment for activeonly
        let activeOnlyQuery = "";
        if (activeOnly !== false) {
            activeOnlyQuery = " WHERE r.active_status = true ";
        }

        const query = `SELECT *
                       FROM raesum_auth_role as r
                       WHERE id = ANY ($1) ${activeOnlyQuery};`;
        const result = await raesumDB.query(query, [roleIDArray]);

        if (result.rows.length > 0) {
            logger.verbose(`Found ${result.rows.length} roles`, Date.now() - start);
            return result.rows;
        } else {
            logger.warning("Role(s) does not exist", Date.now() - start);
            throw new Error("Role(s) does not exist");
        }

    }


    /**
     * Get roles available to an organization.
     * @param  {Number} orgID The ID of the organization.
     * @param   {boolean} [activeOnly=true] Only return active roles
     * @returns {Array} Array of roleIDs available for the organization
     * @param  {Number} orgID The ID of the organization
     * @throws {Error} If the orgID is not a positive int
     */
    async getRolesForOrg(orgID, activeOnly) {
        const start = Date.now();


        // Validate that orgID is a positive int
        if (typeof orgID != "number" || orgID < 1) {
            logger.error("Invalid input for getRolesForOrg. Must be a positive int.", Date.now() - start);
            throw new Error("Invalid input for getRolesForOrg. Must be a positive int.");
        }

        // Determine whether to include inactive records
        // Create query fragment for activeonly
        let activeOnlyQuery1 = "";
        let activeOnlyQuery2 = "";
        if (activeOnly !== false) {
            activeOnlyQuery1 = " WHERE r.active_status = true ";
            activeOnlyQuery2 = " AND r.active_status = true ";
        }

        logger.debug(`Getting roles for org: ${orgID}`, Date.now() - start);

        const query = `SELECT id
                       FROM raesum_auth_role as r
                                INNER JOIN raesum_auth_role_x_organization_restriction as rxor
                                           ON r.id = rxor.role_id AND org_id = $1
                           ${activeOnlyQuery1}
                       UNION
        SELECT id
        FROM raesum_auth_role as r
                 LEFT JOIN raesum_auth_role_x_organization_restriction as rxor ON r.id = rxor.role_id
        WHERE org_id IS NULL
            ${activeOnlyQuery2};`;

        const params = [orgID];


        const result = await raesumDB.query(query, params);

        const roleIDs = [];
        result.rows.forEach((row) => {
            roleIDs.push(row.id);
        });

        logger.verbose(`Found ${roleIDs.length} roles for org: ${orgID}`, Date.now() - start);

        return roleIDs;
    }

}


const raesumAuthorization = new raesumAuthorizationObject();
export default raesumAuthorization;