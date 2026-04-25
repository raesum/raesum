import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumConfig from "../modules/raesumConfig.js";
import raesumOrganization from "./raesumOrganization.js";
import raesumDB from "../modules/raesumDB.js";
import raesumCache from "../modules/raesumCache.js";


const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);


class raesumUserObject {
    // Create User
    /**
     * Creates a new user
     * @param  {String} external_id The ID of the user in the external (AWS Cognito) system
     * @param  {String} username The username
     * @param  {Number} currentOrganizationId The org the user should be assigned to
     * @param  {activeStatus} currentOrganizationId Whether the user is active or not
     * @return {Number} The id of the created user
     * @throw {Error} If the external_id is not a string
     * @throw {Error} If the username is not a string or is empty or is not unique
     * @throw {Error} If the currentOrganizationId is not a number or is less than 1 or is not an integer or is not a valid organization
     */
    async createUser(external_id, username, currentOrganizationId, activeStatus) {
        const start = Date.now();

        logger.verbose(`Attempting to create user with username: ${username} for org: ${currentOrganizationId}`, Date.now() - start);

        // If activeStatus is not passed or is not boolean, default to true
        if (typeof activeStatus !== 'boolean') {
            activeStatus = true;
        }

        // If external_id is not a string, throw error
        if (typeof external_id !== 'string' || external_id.length < 1) {
            throw new Error("External ID must be a non-empty string");
        }

        // If username is not a string, throw error
        if (typeof username !== 'string' || username.length < 1) {
            throw new Error("Username must be a non-empty string");
        }

        // If currentOrganizationId is not a number, throw error
        if (isNaN(currentOrganizationId) || currentOrganizationId < 1 || !Number.isInteger(currentOrganizationId)) {
            throw new Error("Organization ID must be a positive integer");
        }

        // Check if the organization exists

        const org = await raesumOrganization.getById(currentOrganizationId);

        // If the organization does not exist, throw error
        if (!org) {
            throw new Error("Organization does not exist");
        }

        // Check if the username is unique
        logger.debug(`Checking if username: ${username} is unique`, Date.now() - start);
        let user = null;

        try {
            user = await this.getUserByUsername(username);
        } catch {
            // User doesn't yet exist
            user = null;
        }

        // If the username is not unique, throw error
        if (user) {
            throw new Error("Username is not unique");
        }

        // Check if externalID is unique
        logger.debug(`Checking if external_id: ${external_id} is unique`, Date.now() - start);

        try {
            user = await this.getUserByExternalID(external_id);
        } catch {
            // User doesn't yet exist
            user = null;
        }

        // If the username is not unique, throw error
        if (user) {
            logger.error(`Cannot create new user. ExternalID: ${external_id} is not unique`, Date.now() - start);
            throw new Error("ExternalID is not unique");
        }


        // Create the user
        let newUserID = null;
        try {
            const query = "INSERT INTO raesum_user (external_id, username, current_organization_id, active_status) VALUES ($1, $2, $3, $4) RETURNING id";
            const result = await raesumDB.query(query, [external_id, username, currentOrganizationId, activeStatus]);
            newUserID = parseInt(result.rows[0].id);
        } catch (e) {
            logger.error("DB Error creating user: " + e, Date.now() - start);
            throw new Error("Error creating user");
        }

        // Upsert user to organization_x_user table
        const addedToOrg = await raesumOrganization.addUserToOrganization(newUserID, currentOrganizationId);

        if (addedToOrg) {
            logger.info(`User created with ID: ${newUserID}`, Date.now() - start);
            return newUserID;
        } else {
            throw new Error("Error adding user to organization");
        }
    }

    /**
     * Gets a user by ID
     * @param  {Number} id The ID of the user
     * @return {Object} The user object
     * @throw {Error} If the ID is not a number or is less than 1 or is not an integer
     * @throw {Error} If the user is not found
     */
    async getUserById(id) {
        const start = Date.now();

        logger.verbose(`Getting user by ID: ${id}`, Date.now() - start);

        // If the ID is not a number, throw error
        if (isNaN(id) || id < 1 || !Number.isInteger(id)) {
            throw new Error("User ID must be a positive integer");
        }

        // Get the user
        let user = null;
        try {
            const query = "SELECT * FROM raesum_user WHERE id = $1";
            const result = await raesumDB.query(query, [id]);
            user = result.rows[0];
        } catch (e) {
            logger.warning("Error getting user by ID: " + e, Date.now() - start);
            throw new Error("Error getting user by ID");
        }

        // If the user is not found, throw error
        if (!user) {
            logger.warning(`User with ID: ${id} not found`, Date.now() - start);
            throw new Error("User not found");
        } else {
            logger.debug(`User with ID: ${id} found`, Date.now() - start);
            return user;
        }
    }

    /**
     * Gets a user by username. It wraps the getUserById
     * @param  {String} username The username of the user
     * @return {Object} The user object
     * @throw {Error} If the username is not a string
     * @throw {Error} If the username is not found
     */
    async getUserByUsername(username) {
        const start = Date.now();

        logger.verbose(`Getting user by username: ${username}`, Date.now() - start);

        // Valid the username input
        if (typeof username !== 'string' || username.length < 1) {
            throw new Error("Username must be a non-empty string");
        }

        // Get the user id
        let theId = null;
        try {
            const query = "SELECT id FROM raesum_user WHERE username = $1";
            const result = await raesumDB.query(query, [username]);

            if (result.rows.length > 0) {
                theId = parseInt(result.rows[0].id)
            } else {
                logger.verbose(`User with username: ${username} not found`, Date.now() - start);
                throw new Error("User not found");
            }
        } catch (e) {
            logger.verbose(`Warning getting user by username: ${username} with error: ` + e, Date.now() - start);
            throw new Error("User not found");
        }

        if (theId && !isNaN(theId) && theId > 0) {
            logger.debug(`User with username: ${username} found with ID: ${theId}`, Date.now() - start);
            return await this.getUserById(theId);
        } else {
            logger.warning(`User with username: ${username} not found`, Date.now() - start);
            throw new Error("User not found");
        }
    }

    /**
     * Gets a user by the external ID. It wraps the getUserById. In practice, this is the AWS Cognito user ID.
     * @param  {String} external_id The ID of the user in the external (AWS Cognito) system
     * @return {Object} The user object
     * @throw {Error} If the external_id is not a string
     * @throw {Error} If the user is not found
     */
    async getUserByExternalID(external_id) {
        const start = Date.now();

        logger.verbose(`Getting user by external_id: ${external_id}`, Date.now() - start);

        // Valid the username input
        if (typeof external_id !== 'string' || external_id.length < 1) {
            throw new Error("external_id must be a non-empty string");
        }

        // Get the user id
        let theId = null;
        try {
            const query = "SELECT id FROM raesum_user WHERE external_id = $1";
            const result = await raesumDB.query(query, [external_id]);

            if (result.rows.length > 0) {
                theId = parseInt(result.rows[0].id)
            } else {
                logger.verbose(`User with external_id: ${external_id} not found`, Date.now() - start);
                throw new Error("User not found");
            }
        } catch (e) {
            logger.verbose("Error getting user by external_id: " + e, Date.now() - start);
            throw new Error("Error getting user by external_id");
        }

        if (theId && !isNaN(theId) && theId > 0) {
            logger.debug(`User with username: ${external_id} found with ID: ${theId}`, Date.now() - start);
            return await this.getUserById(theId);
        } else {
            logger.warning(`User with username: ${external_id} not found`, Date.now() - start);
            throw new Error("User not found");
        }
    }

    /**
     * Activates or deactivates a user. This will also change their ability to log in via cognito.
     * @param  {Number} id The ID of the user
     * @param  {Boolean} activeStatus The activation status of the user
     * @return {Boolean} True of successful
     * @throw {Error} If the ID is not a number or is less than 1 or is not an integer
     * @throw {Error} If the user is not found
     * @throw {Error} If the activeStatus is not a boolean
     */
    async setActivationStatus(id, activeStatus) {
        const start = Date.now();


        // If activeStatus is not boolean, throw error
        if (typeof activeStatus !== 'boolean') {
            throw new Error("Activation status must be a boolean");
        }

        // If the ID is not a number, throw error
        if (isNaN(id) || id < 1 || !Number.isInteger(id)) {
            throw new Error("User ID must be a positive integer");
        }
        logger.debug(`Setting activation status for user with ID: ${id} to: ${activeStatus}`, Date.now() - start);

        // Get the user by ID
        let user = null;
        try {
            user = await this.getUserById(id);
        } catch (e) {
            logger.warning("Error getting user by ID: " + e, Date.now() - start);
            throw new Error("User not found");
        }

        // Update the user
        try {
            const query = "UPDATE raesum_user SET active_status = $1 WHERE id = $2";
            await raesumDB.query(query, [activeStatus, id]);
            logger.info(`Activation status set for user with ID: ${id} to: ${activeStatus}`, Date.now() - start);
            return true;
        } catch {
            logger.error("DB Error updating user", Date.now() - start);
            throw new Error("Error updating user");
        }
    }

    /**
     * Initializes the Raesum system. It will create the first user based on the system settings. It should only be used on the initial system setup and/or during seeding.
     */
    async initRaesum(organizationID) {
        const start = Date.now();

        logger.info("Initializing: Creating Default User", Date.now() - start);


        // Get the firstUserExternalId from the system settings
        const firstUserExternalId = await raesumConfig.get("initialization.firstUserExternalId");
        const firstUserUsername = await raesumConfig.get("initialization.firstUserUsername");
        const firstUserRole = await raesumConfig.get("initialization.firstUserRole");

        // If no organizationID is passed, assume orgID 1
        if (!organizationID || isNaN(organizationID) || organizationID < 1) {
            organizationID = 1;
            logger.debug(`Initializing: No organizationID supplied, setting to: ${organizationID}`, Date.now() - start);
        }
        logger.debug(`Initializing: Creating Default User for Organization ID: ${organizationID}`, Date.now() - start);


        // Create the first user if they don't exist
        const userID = await this.createUser(firstUserExternalId, firstUserUsername, organizationID, true);

        logger.verbose(`User with ID: ${userID} created`, Date.now() - start);

        // TODO: Assign user to super admin role


        return userID;

    }


    /**
     * Gets a list of active organizations the user is allowed to be in
     * @param  {Number} userId The ID of the user
     * @return {Array} The array of organization ID's the user is allowed to switch to
     * @throw {Error} If the userId is not a number or is less than 1 or is not an integer
     */
    async getAllowedUserOrgs(userID) {
        const start = Date.now();

        logger.verbose(`Getting allowed organizations for user with ID: ${userID}`, Date.now() - start);

        // If the ID is not a number, throw error
        if (isNaN(userID) || userID < 1 || !Number.isInteger(userID)) {
            throw new Error("User ID must be a positive integer");
        }

        // Get all orgs allowed for the user
        let orgs = [];
        try {
            const query = `SELECT org_id
                           FROM raesum_organization_x_user as oxu
                                    INNER JOIN raesum_organization as o ON oxu.org_id = o.id
                           WHERE oxu.user_id = $1
                             and o.active_status = true;`;
            const result = await raesumDB.query(query, [userID]);

            for (let i = 0; i < result.rows.length; i++) {
                const orgID = parseInt(result.rows[i].organization_id);
                if (!isNaN(orgID) && orgID > 0) {
                    orgs.push(orgID);
                }
            }
        } catch (e) {
            logger.error("Error getting allowed organizations: " + e, Date.now() - start);
            throw new Error("Error getting allowed organizations");
        }
        logger.verbose(`${orgs.length} allowed organizations for user with ID: ${userID} found`, Date.now() - start);
        return orgs;
    }


    /**
     * Gets a list of active organizations the user is allowed to be in
     * @param  {Number} userId The ID of the user
     * @param  {Number} orgId The ID of the organization
     * @return {Array} The array of organization ID's the user is allowed to switch to
     * @throw {Error} If the userId is not a number or is less than 1 or is not an integer
     * @throw {Error} If the userId is not found
     * @throw {Error} If the orgId is not a number or is less than 1 or is not an integer
     * @throw {Error} If the user is not allowed to switch to the organization
     */
    async changeUserOrg(userID, orgID) {
        const start = Date.now();

        logger.verbose(`Changing user with ID: ${userID} to organization with ID: ${orgID}`, Date.now() - start);

        // If the ID is not a number, throw error
        if (isNaN(userID) || userID < 1 || !Number.isInteger(userID)) {
            throw new Error("User ID must be a positive integer");
        }

        // If the ID is not a number, throw error
        if (isNaN(orgID) || orgID < 1 || !Number.isInteger(orgID)) {
            throw new Error("Organization ID must be a positive integer");
        }

        // If the user is not allowed to switch to the organization, throw error
        const allowedOrgs = await this.getAllowedUserOrgs(userID);
        if (!allowedOrgs.includes(orgID)) {
            logger.warning(`User with ID: ${userID} is not allowed to switch to organization with ID: ${orgID}. OrgID or UserID might not exist.`, Date.now() - start);
            throw new Error("User not allowed to switch to organization");
        }

        // Update the user
        try {
            const query = "UPDATE raesum_user SET current_organization_id = $1 WHERE id = $2";
            await raesumDB.query(query, [orgID, userID]);
            logger.info(`User with ID: ${userID} changed to organization with ID: ${orgID}`, Date.now() - start);
            return true;
        } catch {
            logger.error("DB Error updating user", Date.now() - start);
            throw new Error("Error updating user");
        }
    }

    /**
     * Gets a list of all possible user metadata key objects. This function will also put several objects and arrays into cache used by other functions.
     * @param  {Boolean} show_inactive Include inactive keys in the list
     * @return {object} An object describing each key and whether it is connected to cognito
     */
    async getMetadataKeys(show_inactive = false) {
        const start = Date.now();

        logger.debug("Getting metadata keys", Date.now() - start);
        
        // Limit show_inactive to boolean
        if (show_inactive !== true) {
            show_inactive = false;
        }

        // Check to see if keys are in cache
        const cacheKey = "raesumUserMetadataKeys" + show_inactive;
        const cachedKeys = await raesumCache.get(cacheKey);
        if (cachedKeys && Object.keys(cachedKeys).length > 0) {
            logger.verbose(`Returning cached metadata keys`, Date.now() - start)
            return cachedKeys;
        }


        // Create a query to get all the metadata keys
        logger.debug("Getting metadata keys from database", Date.now() - start);
        let sql = "SELECT * FROM raesum_user_metadata_keys";
        if (!show_inactive) {
            sql += " WHERE active_status = true";
        }

        // Run the query
        const response = await raesumDB.query(sql);

        logger.debug("Got "+response.rows.length+" metadata keys from database", Date.now() - start);
        // Loop through results to build object
        let keys = {};
        for (let i = 0; i < response.rows.length; i++) {
            keys[response.rows[i]['datakey']] = response.rows[i];
        }

        // Save to cache
        await raesumCache.set(cacheKey, keys);

        // Create a list of keys
        const keyList = Object.keys(keys);
        const listCacheKey = "raesumUserMetadataKeys" + show_inactive;
        const cacheResponse = await raesumCache.set(listCacheKey, keyList);

        if(!cacheResponse){
            logger.error("Failed to save metadata keys to cache", Date.now() - start);
        }else{
            logger.debug("Saved "+response.rows.length+" metadata keys to cache", Date.now() - start);
        }

        let keyIndex = {};
        let cognitoKeys = {};
        keyList.forEach((key) => {
            keyIndex[key] = keys[key].id;

            // If the key is a cognito key, add it to the cognitoKey list
            if(keys[key].cognito_attribute){
                cognitoKeys[key] = keys[key].cognito_writable;
            }
        });

        const indexCacheKey = "raesumUserMetadataKeyIndex";

        await raesumCache.set(indexCacheKey, keyIndex);

        const cognitocacheKey = "raesumUserMetadataCognitoKeyStatus";
        await raesumCache.set(cognitocacheKey, cognitoKeys);


        // Return object
        logger.verbose(`Returning ${response.rows.length} metadata keys`, Date.now() - start);
        return keyList;
    }

    /**
     * Gets a list of all possible user metadata keys
     * @param  {Boolean} show_inactive Include inactive keys in the list
     * @return {Array} An array of possible user metadata keys
     */
    async getMetadataKeyList(show_inactive = false) {
        const start = Date.now();

        // Limit show_inactive to boolean
        if (show_inactive !== true) {
            show_inactive = false;
        }

        // Check to see if list is already in cache
        const listCacheKey = "raesumUserMetadataKeys" + show_inactive;
        let cachedKeys = await raesumCache.get(listCacheKey);

        // If not in cache, build the list (which will cache it)
        if (!cachedKeys) {
            const keys = await this.getMetadataKeys(show_inactive);
            cachedKeys = Object.keys(keys);
        }

        logger.verbose(`Returning cached metadata key list`, Date.now() - start)
        return cachedKeys;
    }

    /**
     * Gets a list of all possible user metadata keys and their matching internal ID's
     * @return {Array} An array of possible user metadata keys
     */
    async getMetadataKeyIndex() {
        const start = Date.now();


        // Check to see if list is already in cache
        const listCacheKey = "raesumUserMetadataKeyIndex";
        let cachedKeys = await raesumCache.get(listCacheKey);

        // If not in cache, build the list (which will cache it)
        if (!cachedKeys || Object.keys(cachedKeys).length === 0) {
            const keys = await this.getMetadataKeys(true);
            const keyList = Object.keys(keys);
            cachedKeys = [];
            keyList.forEach((key) => {
                cachedKeys[key] = keys[key].id;
            });
        }
        logger.verbose(`Returning cached metadata key list`, Date.now() - start)
        return cachedKeys;
    }

    /**
     * Gets a list of all cognito keys and their writable status
     * @return {Object} An object with two arrays of keys - cognito keys and writable cognito keys
     */
    async getMetadataCognitoKeyStatus() {
        const start = Date.now();


        // Check to see if list is already in cache
        const cacheKey = "raesumUserMetadataCognitoKeyStatus";
        let cognitoKeys = await raesumCache.get(cacheKey);

        // If not in cache, build the list (which will cache it)
        if (!cognitoKeys) {
            const keys = await this.getMetadataKeys(true);
            const keyList = Object.keys(keys);
            raesumUserMetadataCognitoKeyStatuses = [];
            // If the key is a cognito key, add it to the cognitoKey list
            if(keys[key].cognito_attribute){
                cognitoKeys[key] = keys[key].cognito_writable;
            }
        }
        logger.verbose(`Returning list of keys controlled by cognito`, Date.now() - start)
        return cognitoKeys;
    }



    /**
     * Creates or updates a metadata key attribute.
     * @param  {string} key The metadata key
     * @return {boolean} True on success
     * @throw {Error} If the update fails
     * @throw {Error} If the key contains invalid characters
     */
    async setUserMetadataKey(key, description = "", activeStatus = true, cognitoAttribute = false, cognitoWritable = false) {
        const start = Date.now();

        // Check for invalid characters - key should only have letters, numbers, hyphen, underscore, or dot
        if (!key.match(/^[a-zA-Z0-9\-\_\.]+$/)) {
            logger.warning(`Unable to create user metadata key: ${key} contains invalid characters`, Date.now() - start);
            throw new Error("Key contains invalid characters");
        }

        // Force the booleans to be boolean
        if (activeStatus !== false) {
            activeStatus = true;
        }

        if (cognitoAttribute !== false) {
            cognitoAttribute = true;
        }

        if (cognitoWritable !== false) {
            cognitoWritable = true;
        }


        // Get the user metadata key list
        const keys = await this.getMetadataKeyList(true);
        logger.info(`Creating/setting user metadata key: ${key}`, Date.now() - start);

        // If the key is in the list update it
        if (keys.includes(key)) {
            const sql = "UPDATE raesum_user_metadata_keys SET active_status = $2, description = $3, cognito_attribute = $4, cognito_writable = $5 WHERE datakey = $1";
            try {
                // Create the key
                await raesumDB.query(sql, [key, activeStatus, description, cognitoAttribute, cognitoWritable]);
                return true;
            } catch (e) {
                logger.error(`Error creating user metadata key: ${key}`, Date.now() - start);
                throw new Error("Error creating user metadata key");
            }
        } else {
            let sql = "INSERT INTO raesum_user_metadata_keys (datakey, active_status, description, cognito_attribute, cognito_writable) VALUES ($1, true, $2, false, false)";
            try {
                // Create the key
                await raesumDB.query(sql, [key, description]);
                return true;
            } catch (e) {
                logger.error(`Error creating user metadata key: ${key}`, Date.now() - start);
                throw new Error("Error creating user metadata key");
            }
        }
    }

    /**
     * Deletes a user metadata key definition. This can ONLY be done if no users have the metadata set.
     * @param  {string} key The metadata key
     * @return {boolean} True on success, false if the key cannot be deleted
     * @throw {Error} If the key does not exist
     * @throw {Error} If the update fails
     */
    async deleteUserMetadataKey(key) {
        const start = Date.now();

        // Get the user metadata key list
        const keys = await this.getMetadataKeyList(true);

        // If the key is not in the list thrown an error
        if (!keys.includes(key)) {
            logger.warning(`Key: ${key} not found`, Date.now() - start);
            throw new Error("Key not found");
        }

        // Check to see if the key is in use
        const sqlCheck = `SELECT COUNT(*)
                          FROM raesum_user_x_metadata as ruxm
                                   INNER JOIN raesum_user_metadata_keys as rumk on ruxm.key_id = rumk.id
                          WHERE rumk.datakey = $1`;
        const result = await raesumDB.query(sqlCheck, [key]);

        // If count is > 1 return false as the key is in use
        if (result.rows[0].count > 0) {
            logger.warning(`User metadata key: ${key} is in use and cannot be deleted`, Date.now() - start);
            return false;
        }

        // Delete the key
        const sql = "DELETE FROM raesum_user_metadata_keys WHERE datakey = $1";
        try {
            logger.info(`Deleting user metadata key: ${key}`, Date.now() - start);
            await raesumDB.query(sql, [key]);
            return true;
        } catch (e) {
            logger.error(`Error deleting user metadata key: ${key}`, Date.now() - start);
            throw new Error("Error deleting user metadata key");
        }
    }

    /**
     * Gets a list of active organizations the user is allowed to be in
     * @param  {string} key The metadata key
     * @param  {boolean} activeStatus The desired active status
     * @return {boolean} True on success
     * @throw {Error} If the key does not exist
     * @throw {Error} If the update fails
     */
    async setActivationStatusMetadataKey(key, activeStatus = true) {
        const start = Date.now();

        // Limit show_inactive to boolean
        if (activeStatus !== false) {
            activeStatus = true;
        }

        // Get the user metadata key list
        const keys = await this.getMetadataKeyList(true);

        // If the key is not in the list thrown an error
        if (!keys.includes(key)) {
            logger.warning(`Key: ${key} not found`, Date.now() - start);
            throw new Error("Key not found");
        }

        // Update the key
        const sql = "UPDATE raesum_user_metadata_keys SET active_status = $1 WHERE datakey = $2";
        try {
            await raesumDB.query(sql, [activeStatus, key]);
            return true;
        } catch (e) {
            logger.error(`Error updating key: ${key}`, Date.now() - start);
            throw new Error("Error updating key");
        }
    }


    /**
     * Gets multiple user metadata values.
     * @param  {Number} userId The ID of the user
     * @param  {Array} keys The list of keys to get
     * @param  {boolean} activeStatus Whether to get the value of inactive keys
     * @return {Object} An object where properties are the key and value is the value
     * @throw {Error} If the userId is not a valid number
     * @throw {Error} If any of the values are not valid (string, boolean, number)
     */
    async getUserMetadataValues(userId, keys, activeStatus = false) {

        // Throw an error if the userId is not a positive number
        userId = parseInt(userId);
        if (isNaN(userId) || userId < 1 || !Number.isInteger(userId)) {
            throw new Error("User ID must be a positive integer");
        }

        // Get the list of user metadata values
        const validKeys = await this.getMetadataKeyList(activeStatus);
        const keyIndex = await this.getMetadataKeyIndex();


        // Remove invalid keys from list
        keys = keys.filter(key => validKeys.includes(key));

        const sql = `SELECT rumk.datakey, ruxm.value as value
                     FROM raesum_user_x_metadata as ruxm
                              INNER JOIN raesum_user_metadata_keys as rumk on ruxm.key_id = rumk.id
                     WHERE ruxm.user_id = $1
                       AND rumk.datakey IN ($2)`;

        // Run the query
        try {
            const response = await raesumDB.query(sql, [userId, keys]);

            // Turn results into object and return
            let values = {};
            for (let i = 0; i < response.rows.length; i++) {
                values[response.rows[i].datakey] = response.rows[i].value;
            }

            return values;

        } catch (e) {
            throw new Error("Error getting user metadata values");
        }


    }


    /**
     * Sets multiple user metadata values. Invalid keys will automatically be excluded
     * @param  {Number} userId The ID of the user
     * @param  {Object} values An object where properties are the key and value is the value
     * @param  {boolean} activeStatus Whether to update the value of inactive keys
     * @return {boolean} True on success
     * @throw {Error} If the user does not exist
     * @throw {Error} If any of the values are not valid (string, boolean, number)
     */
    async setUserMetadataValues(userId, values, activeStatus = false) {

        // Get the userID
        try {
            const user = await this.getUserById(userId);
        } catch (e) {
            // If not user, pass the error through
            throw new Error("User not found");
        }

        // Clean out any key/value pairs where the value is not string, int, or boolean
        for (const key in values) {
            if (typeof values[key] !== 'string' && typeof values[key] !== 'boolean' && typeof values[key] !== 'number') {
                delete values[key];
            }
        }


        // Get the list of user metadata values
        const validKeys = await this.getMetadataKeyList(activeStatus);
        const keyIndex = await this.getMetadataKeyIndex();
        const cognitoKeys = await this.getMetadataCognitoKeyStatus();
        const readOnlyCognitoKeys = Object.keys(cognitoKeys).filter(key => !cognitoKeys[key]);

        let keyList = Object.keys(values);

        // Filter the keylist for valid keys
        keyList = keyList.filter(key => validKeys.includes(key));

        // Remove any read-only cognito keys listed in readOnlyCognitoKeys
        keyList = keyList.filter(key => !readOnlyCognitoKeys.includes(key));

        // Check to see if there are existing metadata values
        const existingValues = await this.getUserMetadataValues(userId, keyList, activeStatus);
        const existingValuesKeyList = Object.keys(existingValues);

        let updateKeyList = [];
        let newKeyList = [];

        // Loop through the keyList
        for (let i = 0; i < keyList.length; i++) {
            // If key is in the existing value object, add it to the updateKeyList
            if (existingValuesKeyList.includes(keyList[i])) {
                updateKeyList.push(keyList[i]);
            } else {
                // Else add it to the newKey list
                newKeyList.push(keyList[i]);
            }
        }

        // Insert the new keys
        let sql = "";
        let valuesArray = [];
        let insertValuesArray = [];
        let i = 1;

        // If there are new keys
        if(newKeyList.length > 0){
            // Loop through the values and build the update query
            for (let q = 0; q < newKeyList.length; q++) {


                // Add insert/update query
                insertValuesArray.push(`($${i}, $${i + 1}, $${i + 2})`);
                valuesArray.push(userId);
                valuesArray.push(keyIndex[newKeyList[q]]);
                valuesArray.push(values[newKeyList[q]]);

                // Increment iterator
                i += 3;

            }

            sql += "INSERT INTO raesum_user_x_metadata (user_id, key_id, value) VALUES ";
            sql += insertValuesArray.join(", ") + ";";
        }

        // Run the update query
        try {
            await raesumDB.query(sql, valuesArray);
        } catch (e) {
            throw new Error("Error inserting new user metadata values");
        }

        // Update the existing keys
        // Loop through the update keys and create an update statement for each
        for (let q = 0; q < updateKeyList.length; q++) {
            sql += `UPDATE raesum_user_x_metadata
                   SET value = $1
                   WHERE user_id = $2
                     AND key_id = $3;`;
            try {
                await raesumDB.query(sql, [values[updateKeyList[q]], userId, updateKeyList[q]]);
            } catch (e) {
                throw new Error("Error inserting new user metadata values");
            }
        }

        // Update any cognito controlled keys

            // TO-DO: Update cognito with new values


        return true;

    }



    /**
     * Copies user and metadata from AWS Cognito pool to Raesum. This will also CREATE users.
     * @param  {String} external_id The ID of the user in the external (AWS Cognito) system
     * @return {Number} The internal raesum user ID
     * @throw {Error} If the external_id not found in AWS
     * @throw {Error} If the user create process fails
     */

    async syncUserFromCognitoToRaesum(external_id) {
        // If external_id is not a string, throw error
        if (typeof external_id !== 'string' || external_id.length < 1) {
            throw new Error("External ID must be a non-empty string");
            }

            // Get the user from AWS

            // Get metadata from aws

            // Get the user from raesum

                // If no user is found, create the user

            // Get possible metadata keys in raesum that are active

            // For each key from aws

                // If active in raesum, add it to a values list

            // Run bulk key set

    }


}

const raesumUser = new raesumUserObject();
export default raesumUser;