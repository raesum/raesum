import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumUser from "./raesumUser.js";
import raesumCache from "../modules/raesumCache.js";


const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumOrganizationObject {

    /**
     * Initializes the Raesum system. It will create the first user based on the system settings. It should only be used on the initial system setup and/or during seeding.
     */
    async initRaesum() {
        const start = Date.now();

        logger.info("Initializing: Creating Default Organization", Date.now() - start);

        try{
            // If orgID 1 already exists, don't create it again
            const existingOrg = await this.getById(1);
            if (existingOrg) {
                logger.warning("Default organization already exists, skipping creation", Date.now() - start);
                return 1;
            }
        } catch (e) {
            logger.info("No default organization found, creating one", Date.now() - start);
        }


        // Create the default organization
        return this.create("Default Organization", "This is the default organization for the Raesum system.");
    }


/**
     * Loads the global roles into the database. Should run on migrate.
     */
    async loadGlobalMetadataToDatabase() {
        /*
        Note: Several of the SQL commands here are not using prepared statements. This except is made because the data is controlled solely in the core codebase and the data is not user input. Further, this function only runs during a migrate or initialization and is not exposed to the public.
         */
        const start = Date.now();
        logger.info("Loading Global Roles", Date.now() - start);

        // Load the globalRoles.json file
        const dirPath = path.join(__dirname, '..', '..', 'controlledData/');
        const jsonFile = fs.readFileSync(path.join(dirPath, "organizationMetadata.json"), 'utf8');
        const jsonData = JSON.parse(jsonFile);

        for (let i = 0; i < jsonData.length; i++) {
            logger.verbose(`Loading Role: ${jsonData[i].name}`, Date.now() - start);
            // If there is at least one field
            if (Object.keys(jsonData[i]).length > 0) {
                // Check to see if the key exists in the database
                const existingKey = await raesumDB.query(
                    `SELECT * FROM public.raesum_organization_metadata_keys WHERE datakey = $1`,
                    [jsonData[i].datakey]
                );

                // If the key exists, update it
                if (existingKey.rows.length > 0) {
                    logger.info("Organization Metadata Key Definition Being Updated: " + jsonData[i].datakey, Date.now() - start);
                    await raesumDB.query(
                        `UPDATE public.raesum_organization_metadata_keys SET active_status = $1, description = $2, displayname = $3 WHERE datakey = $4`,
                        [jsonData[i].active_status, jsonData[i].description, jsonData[i].displayname, jsonData[i].datakey]
                    );
                }else{
                    logger.info("Organization Metadata Key Definition Being Added: " + jsonData[i].datakey, Date.now() - start);
                // Insert the metadata key
                await raesumDB.query(
                    `INSERT INTO public.raesum_organization_metadata_keys (datakey, active_status, description, displayname) VALUES ($1, $2, $3, $4)`,
                    [jsonData[i].datakey, jsonData[i].active_status, jsonData[i].description, jsonData[i].displayname]
                );
                }

            }
        }

        logger.info("Completed adding/updating organization metadata keys", Date.now() - start);

        return true;
    }



    /**
     * Creates a new organization
     * @param  {String} name The name of the organization
     * @param  {Boolean} activeStatus Whether the org is active or not (default true)
     * @return {Number} The id of the created organization
     * @throw {Error} If the organization name is not a string
     */
    async create(name, activeStatus) {
        const start = Date.now();
        if (typeof name !== 'string') {
            throw new Error("Organization name must be a string");
        }

        logger.verbose("Creating organization", Date.now() - start);
        if (activeStatus !== false) {
            activeStatus = true;
        }

        try {
            const query = "INSERT INTO raesum_organization (name, active_status) VALUES ($1, $2) RETURNING id";
            const result = await raesumDB.query(query, [name, activeStatus]);
            logger.info(`Organization created with id: ${result.rows[0].id}`, Date.now() - start);
            return parseInt(result.rows[0].id);
        } catch (e) {
            logger.error("Error creating organization: " + e, Date.now() - start);
            throw new Error("Error creating organization");
        }
    }


    /**
     * Gets an organization by ID
     * @param  {Number} id The ID of the organization
     * @return {Object} The organization object
     * @throws {Error} If the organization is not found
     * @throws {Error} If the organization ID is not a number
     * @throws {Error} If the organization ID is not an integer
     * @throws {Error} If the organization ID is less than 1
     */
    async getById(id) {
        const start = Date.now();

        logger.verbose("Getting organization by ID: " + id, Date.now() - start);

        id = parseInt(id);

        if (isNaN(id)) {
            throw new Error("Organization ID must be a number");
        }
        if (id < 1) {
            throw new Error("Organization ID must be greater than 0");
        }

        const query = "SELECT * FROM raesum_organization WHERE id = $1";
        const result = await raesumDB.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error("Organization not found");
        }
        logger.verbose(`Organization found for ID: ${id}`, Date.now() - start);
        let theOrg = result.rows[0];
        theOrg.id = parseInt(theOrg.id);
        return theOrg;
    }


    /**
     * Activates or deactivates an organization. Any users that are currently part of the organization will be moved to a different org that they are part of that is still active OR if this is their last org, they will be deactivated.
     * @param  {Number} id The ID of the org
     * @param  {Boolean} [activeStatus=true] The activation status of the org
     * @return {Boolean} The activation status
     */
    async setActivationStatus(id, activeStatus) {
        const start = Date.now();

        logger.info(`Setting activation status for org: ${id} to ${activeStatus}`, Date.now() - start);

        // Parse inputs as INT
        id = parseInt(id);

        // Validate input
        if (isNaN(id) || id < 1) {
            throw new Error("orgID must be a positive integer");
        }


        // If active is not boolean, set to true
        if (typeof activeStatus !== 'boolean') {
            if(activeStatus.toLowerCase() == "true"){
                activeStatus = true;
            } else {
                activeStatus = false;
            }
        }

        // Check to see if the org exists and throw and error if it doesn't
        try{
            await this.getById(id);
        } catch (e) {
            throw new Error("Organization not found");
        }


        // Update the org
        const query = "UPDATE raesum_organization SET active_status = $1 WHERE id = $2";
        try {

            const orgResult = await raesumDB.query(query, [activeStatus, id]);

            logger.verbose(`Activation status set for org: ${id} to ${activeStatus}`, Date.now() - start);

        } catch (e) {

            logger.error(`Error setting activation status for org: ${id} to ${activeStatus} with error: ${e}`, Date.now() - start);
            throw new Error("Error setting activation status for org");

        }

        // If deactivating, move users to another org or deactivate
            if(activeStatus === false){

                logger.info(`Deactivating org: ${id}. Starting Moving Users.`, Date.now() - start);

                // Get the list of users on the org
                const orgUsers = await this.getUsers(id, false);

                logger.info(`Found ${orgUsers.length} users on org: ${id} to deactivate or move`, Date.now() - start);
                
                for(let i=0; i<orgUsers.length; i++) {
                    logger.verbose("Organization setActivationStatus processing user: " + orgUsers[i].id);

                    // For each user, check if they are part of another org
                    const userOrgs = await raesumUser.getAllowedUserOrgs(orgUsers[i].id);
                    logger.debug("Organization setActivationStatus userOrgs: " + JSON.stringify(userOrgs));

                    if(userOrgs.length > 0) {

                        // If they are part of another org, move them to that org
                        logger.info(`Moving user: ${orgUsers[i].id} to org: ${userOrgs[0]}`, Date.now() - start);
                        await raesumUser.changeUserOrg(orgUsers[i].id, userOrgs[0]);
                    }else{

                        // If they are not part of another org, deactivate them if they are active
                        if(orgUsers[i].active_status === true){
                            logger.info(`Deactivating user: ${orgUsers[i].id}`, Date.now() - start);
                            await raesumUser.setActivationStatus(orgUsers[i].id, false);
                        }
                    }

                }

                logger.info(`Deactivating org: ${id}. Finished Moving Users.`, Date.now() - start);

            }

        logger.info(`Finished Setting activation status for org: ${id} to ${activeStatus}`, Date.now() - start);

        return activeStatus;
    }


    /**
     * Adds a user to an organization.
     * @param  {Number} userID The ID of the user
     * @param  {Number} orgID The ID of the org
     * @return {Boolean} Success or fail
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the org ID is not a positive int
     * @throws {Error} If the user is not found
     * @throws {Error} If the org is not found
     * @throws {Error} If the org is not active
     */
    async addUserToOrganization(userID, orgID) {
        const start = Date.now();

        logger.info(`Adding user: ${userID} to org: ${orgID}`, Date.now() - start);

        // Parse inputs as INT
        orgID = parseInt(orgID);
        userID = parseInt(userID);

        // Validate input
        if (isNaN(userID) || isNaN(orgID) || userID < 1 || orgID < 1) {
            throw new Error("userID and orgID must be positive integers");
        }

        // Check if user exists
        try {
            const userResult = await raesumUser.getUserById(userID);
            if (userResult.length === 0) {
                logger.warning(`Cannot add user: ${userID} to org: ${orgID}. User not found`, Date.now() - start);
                throw new Error("User not found");
            }
        } catch (e) {
            logger.warning(`Cannot add user: ${userID} to org: ${orgID}. User not found`, Date.now() - start);
            throw new Error("User not found");
        }


        // Check if org exists and is active
        try {
            const orgResult = await this.getById(orgID);
            if (orgResult.active_status === false) {
                logger.warning(`Cannot add user: ${userID} to org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
                throw new Error("Org is not active or does not exist");
            }
        } catch (e) {
            logger.warning(`Cannot add user: ${userID} to org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
            throw new Error("Org not found or does not exist");
        }

        // Check if user is already part of the org
        const checkQuery = "SELECT * FROM raesum_organization_x_user WHERE user_id = $1 AND org_id = $2";
        const checkResult = await raesumDB.query(checkQuery, [userID, orgID]);
        if (checkResult.rows.length > 0) {
            logger.verbose(`Cannot add user: ${userID} to org: ${orgID}. User is already part of the org`, Date.now() - start);
            return true;
        }

        // Upsert user to raesum_organization_x_user
        const query = "INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2) ON CONFLICT (user_id, org_id) DO NOTHING;";

        try {
            await raesumDB.query(query, [userID, orgID]);
            logger.verbose(`User: ${userID} added to org: ${orgID}`, Date.now() - start);
            return true;
        } catch (e) {
            logger.error(`Error adding user: ${userID} to org: ${orgID} with error: ${e}`, Date.now() - start);
            throw new Error("Error adding user to org");
        }
    }


    /**
     * Removes a user from organization. It will also remove any role entries for the user in the organization.
     * @param  {Number} userID The ID of the user
     * @param  {Number} orgID The ID of the org
     * @return {Boolean} Success or fail
     * @throws {Error} If the user ID is not a positive int
     * @throws {Error} If the org ID is not a positive int
     * @throws {Error} If the user is not found
     * @throws {Error} If the org is not found
     */
    async removeUserFromOrganization(userID, orgID) {
        const start = Date.now();

        logger.info(`Removing user: ${userID} from org: ${orgID}`, Date.now() - start);

        // Parse inputs as INT
        orgID = parseInt(orgID);
        userID = parseInt(userID);

        // Validate input
        if (isNaN(userID) || isNaN(orgID) || userID < 1 || orgID < 1) {
            throw new Error("userID and orgID must be positive integers");
        }

        // Check if user exists
        try {
            const userResult = await raesumUser.getUserById(userID);
            if (userResult.length === 0) {
                logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. User not found`, Date.now() - start);
                throw new Error("User not found");
            }
        } catch (e) {
            logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. User not found`, Date.now() - start);
            throw new Error("User not found");
        }


        // Check if org exists and is active
        try {
            const orgResult = await this.getById(orgID);
            if (orgResult.active_status === false) {
                logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
                throw new Error("Org is not active or does not exist");
            }
        } catch (e) {
            logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
            throw new Error("Org not found or does not exist");
        }

        // Remove user from org
        const query = "DELETE FROM raesum_organization_x_user WHERE user_id = $1 AND org_id = $2";
        try {
            await raesumDB.query(query, [userID, orgID]);
            logger.verbose(`User: ${userID} removed from org: ${orgID}`, Date.now() - start);
        } catch (e) {
            logger.error(`Error removing user: ${userID} from org: ${orgID} with error: ${e}`, Date.now() - start);
            throw new Error("Error removing user from org");
        }

        // TO-DO: Remove user roles in org


        return true;

    }


    /**
     * Gets a list of users
     * @param  {Number} orgId The ID of the organization
     * @param  {Boolean} [activeStatus=true] The activation status of the user
     * @return {Array} The array of user objects
     * @throw {Error} If the orgId is not a number or is less than 1 or is not an integer
     * @throw {Error} If the organization is not found
     */
    async getUsers(orgID, activeStatus) {
        const start = Date.now();

        logger.verbose(`Getting users for org: ${orgID}`, Date.now() - start);

        // Parse inputs as INT
        orgID = parseInt(orgID);

        // Validate input
        if (isNaN(orgID) || orgID < 1) {
            throw new Error("orgID must be a positive integer");
        }

        // If active is not boolean, set to true
        if (typeof activeStatus !== 'boolean') {
            activeStatus = true;
        }

        let activeQuery = "";
        if (activeStatus) {
            activeQuery = " AND u.active_status = true";
        }



        // Get users
        const query = `SELECT u.*
                       FROM raesum_organization_x_user as oxu
                       INNER JOIN raesum_user as u ON oxu.user_id = u.id
                       WHERE oxu.org_id = $1
                         AND u.active_status = true ${activeQuery}`;
        const result = await raesumDB.query(query, [orgID]);

        logger.info(`Organization getUsers found ${result.rows.length} users for org: ${orgID}`, Date.now() - start);
        return result.rows;
    }


    /**
     * Gets a list of all possible organization ser metadata key objects. This function will also put several objects and arrays into cache used by other functions.
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
        const cacheKey = "raesumOrganizationMetadataKeys" + show_inactive;
        const cachedKeys = await raesumCache.get(cacheKey);
        if (cachedKeys && Object.keys(cachedKeys).length > 0) {
            logger.verbose(`Returning cached organization metadata keys`, Date.now() - start)
            logger.debug(`Key list organization metadata with ${Object.keys(cachedKeys).length} keys: ${JSON.stringify(cachedKeys)}`, Date.now() - start);
            return cachedKeys;
        }


        // Create a query to get all the metadata keys
        logger.debug("Getting organization metadata keys from database", Date.now() - start);
        let sql = "SELECT * FROM raesum_organization_metadata_keys";
        if (!show_inactive) {
            sql += " WHERE active_status = true";
        }

        // Run the query
        const response = await raesumDB.query(sql);

        logger.debug("Got "+response.rows.length+" organization metadata keys from database", Date.now() - start);
        // Loop through results to build object
        let keys = {};
        for (let i = 0; i < response.rows.length; i++) {
            keys[response.rows[i]['datakey']] = response.rows[i];
        }

        // Save to cache
        await raesumCache.set(cacheKey, keys);

        // Create a list of keys
        const keyList = Object.keys(keys);
        const listCacheKey = "raesumOrganizationMetadataKeys" + show_inactive;
        const cacheResponse = await raesumCache.set(listCacheKey, keys);

        if(!cacheResponse){
            logger.error("Failed to save organization metadata keys to cache", Date.now() - start);
        }else{
            logger.debug("Saved "+response.rows.length+" organization metadata keys to cache", Date.now() - start);
        }

        // Return object
        logger.verbose(`Returning ${response.rows.length} organization metadata keys`, Date.now() - start);
        return keys;
    }

    /**
     * Gets a list of all possible organization metadata key objects. This function will also put several objects and arrays into cache used by other functions.
     * @param  {Boolean} show_inactive Include inactive keys in the list
     * @return {object} An object describing each key and whether it is connected to cognito
     */
    async getMetadataKeyList(show_inactive = false){
        const start = Date.now();

        // Limit show_inactive to boolean
        if (show_inactive !== true) {
            show_inactive = false;
        }

        // Check to see if list is already in cache
        logger.debug("Checking cache for Organization metadata key list", Date.now() - start);

        const listCacheKey = "raesumOrganizationMetadataKeys" + show_inactive;
        let cachedKeys = await raesumCache.get(listCacheKey);
            


        // If not in cache, build the list (which will cache it)
        if (!cachedKeys || Object.keys(cachedKeys).length === 0) {
            logger.verbose(`Organization Metadata key list not found in cache, building it`, Date.now() - start);
            const keys = await this.getMetadataKeys(show_inactive);
            cachedKeys = Object.keys(keys);
        }else{
            cachedKeys = Object.keys(cachedKeys);

        }
            

        logger.verbose(`Returning cached Organization metadata key list`, Date.now() - start)
        logger.debug(`Organization Key list metadata with ${cachedKeys.length} keys: ${JSON.stringify(cachedKeys)}`, Date.now() - start)
        return cachedKeys;
    }

    /*
        Clears the caches for organization metadata
    */
    async clearMetadataKeyCache(){
         const start = Date.now();       
        logger.debug("Clearing User metadata key cache", Date.now() - start);
        const cacheKeyStrings = [
            'raesumOrganizationMetadataKeystrue',
            'raesumOrganizationMetadataKeysfalse'
        ];
        
        for (const cacheKey of cacheKeyStrings) {
            await raesumCache.delete(cacheKey);
        }

        logger.verbose("User Metadata key list cache cleared", Date.now() - start);
    }

/**
     * Gets multiple organization metadata values.
     * @param  {Number} orgId The ID of the user
     * @param  {Array} keys The list of keys to get
     * @param  {boolean} activeStatus Whether to get the value of inactive keys
     * @return {Object} An object where properties are the key and value is the value
     * @throw {Error} If the userId is not a valid number
     * @throw {Error} If any of the values are not valid (string, boolean, number)
     */
    async getOrganizationMetadataValues(orgId, keys, activeStatus = false){
        const start = Date.now();
        // Throw an error if the userId is not a positive number
        orgId = parseInt(orgId);
        if (isNaN(orgId) || orgId < 1 || !Number.isInteger(orgId)) {
            throw new Error("Organization ID must be a positive integer");
        }

        // Get the list of user metadata values
        const validKeys = await this.getMetadataKeyList(activeStatus);

        logger.debug(`Geting User Metadata Key Values for user ${orgId} and keys ${keys.join(',')} before invalid keys removed`, Date.now() - start);

        logger.debug(`Valid user metadata keys ${validKeys.join(",")}`, Date.now() - start);

        // Remove invalid keys from list
        keys = keys.filter(key => validKeys.map(validKey => validKey.toLowerCase()).includes(key.toLowerCase()));
        logger.verbose(`Geting Organization Metadata Key Values for user ${orgId} and keys ${keys.join(',')}`, Date.now() - start);

        const sql = `SELECT rumk.datakey, ruxm.value as value
                     FROM raesum_organization_x_metadata as ruxm
                              INNER JOIN raesum_organization_metadata_keys as rumk on ruxm.datakey = rumk.datakey
                     WHERE ruxm.org_id = $1
                       AND rumk.datakey ILIKE ANY($2)`;

        // Run the query
        try {
            const response = await raesumDB.query(sql, [orgId, keys]);

            // Turn results into object and return
            let values = {};
            for (let i = 0; i < response.rows.length; i++) {
                values[response.rows[i].datakey] = response.rows[i].value;
            }

    
            logger.info(`Retrieved ${response.rows.length} organization metadata values for keys ${keys.join(", ")}`, Date.now() - start);
            return values;

        } catch (e) {
            throw new Error("Error getting organization metadata values", Date.now() - start);
        }
    }

/**
     * Sets multiple user metadata values. Invalid keys will automatically be excluded
     * @param  {Number} orgId The ID of the organization
     * @param  {Object} values An object where properties are the key and value is the value
     * @param  {boolean} activeStatus Whether to update the value of inactive keys
     * @return {boolean} True on success
     * @throw {Error} If the user does not exist
     * @throw {Error} If any of the values are not valid (string, boolean, number)
     */
async setOrganizationMetadataValues(orgId, values, activeStatus = false) {
    const start = Date.now();

        // Get the org
        let org;
        try {
            org = await this.getById(orgId);
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

        logger.debug(`Attempting to update organization metadata`, Date.now() - start);

        // Get the list of user metadata values
        const validKeys = await this.getMetadataKeyList(activeStatus);

        let keyList = Object.keys(values);

        // Filter the keylist for valid keys
        keyList = keyList.filter(key => validKeys.includes(key));


        // Check to see if there are existing metadata values
        const existingValues = await this.getOrganizationMetadataValues(orgId, keyList, activeStatus);
        
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
                valuesArray.push(orgId);
                valuesArray.push(newKeyList[q]);
                valuesArray.push(values[newKeyList[q]]);

                // Increment iterator
                i += 3;

            }

            sql += "INSERT INTO raesum_organization_x_metadata (org_id, datakey, value) VALUES ";
            sql += insertValuesArray.join(", ") + ";";
        }

        // Run the update query
        try {
            await raesumDB.query(sql, valuesArray);
        } catch (e) {
            logger.error(`Failed to insert new matadata values for organization: ${e.message}`, Date.now() - start)
            throw new Error("Error inserting new organization metadata values");
        }

        // Update the existing keys
        // Loop through the update keys and create an update statement for each
        for (let q = 0; q < updateKeyList.length; q++) {
            sql += `UPDATE raesum_organization_x_metadata
                   SET value = $1
                   WHERE org_id = $2
                     AND datakey ILIKE $3;`;
            try {
                await raesumDB.query(sql, [values[updateKeyList[q]], orgId, updateKeyList[q]]);
            } catch (e) {
                logger.error(`Failed to update organization metadata values: ${e.message}`, Date.now() - start);
                throw new Error("Error updating new organization metadata values");
            }
        }


        return true;
}


    /**
     * Deletes multiple organization metadata values. Invalid keys will automatically be excluded
     * @param  {Number} orgId The ID of the organization
     * @param  {array} keys An array of keys to delete from the organization
     * @param  {boolean} activeStatus Whether to consider inactive keys
     * @param  {boolean} updateCognito Whether to delete from Cognito as well
     * @return {boolean} True on success
     * @throw {Error} If the user does not exist
     */
    async deleteOrganizationMetadataValues(orgId, keys, activeStatus = false){
        const start = Date.now();

        // Validate orgId
        orgId = parseInt(orgId);
        if (isNaN(orgId) || orgId < 1 || !Number.isInteger(orgId)) {
            throw new Error("Organization ID must be a positive integer");
        }

        if (!Array.isArray(keys) || keys.length < 1) {
            throw new Error("Keys must be an array");
        }

        // Remove all values in keys that are not strings with length > 0
        keys = keys.filter(key => typeof key === 'string' && key.length > 0);



        let organization;
        try {
            organization = await this.getById(orgId);
        } catch (e) {
            // If not user, pass the error through
            throw new Error("Organizaztion not found");
        }

        // Get a list of valid metadata keys
        const validKeys = await this.getMetadataKeyList(activeStatus);


        // Remove any entries in keys that are not valid or are listed as cognito read only
        const keysToDelete = keys.filter(key => validKeys.includes(key));

        if (keysToDelete.length === 0) {
            logger.verbose(`No valid keys to delete for organizationId ${orgId}`, Date.now() - start);
            return true;
        }

        // Delete the values from the raesum_user_x_metadata table corresponding with the keys
        const deleteSql = `DELETE FROM raesum_organization_x_metadata
                          WHERE org_id = $1
                          AND datakey ILIKE ANY($2)`;

        try {
            await raesumDB.query(deleteSql, [orgId, keysToDelete]);
            logger.info(`Deleted ${keysToDelete.length} metadata values for organization ${orgId}`, Date.now() - start);
        } catch (e) {
            logger.error(`Error deleting organization metadata values for organization ${orgId}: ${e.message}`, Date.now() - start);
            throw new Error("Error deleting organization metadata values");
        }


        return true;
    }

}


const raesumOrganization = new raesumOrganizationObject();
export default raesumOrganization;