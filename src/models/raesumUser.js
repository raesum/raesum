import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumConfig from "../modules/raesumConfig.js";
import raesumOrganization from "./raesumOrganization.js";
import raesumDB from "../modules/raesumDB.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");


class raesumUser {
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
    async createUser(external_id, username, currentOrganizationId, activeStatus){
        const start = Date.now();

        logger.info(`Attempting to create user with username: ${username} for org: ${currentOrganizationId}`, Date.now() - start);

        // If activeStatus is not passed or is not boolean, default to true
        if(typeof activeStatus !== 'boolean'){
            activeStatus = true;
        }

        // If external_id is not a string, throw error
        if(typeof external_id !== 'string' || external_id.length < 1){
            throw new Error("External ID must be a non-empty string");
        }

        // If username is not a string, throw error
        if(typeof username !== 'string' || username.length < 1){
            throw new Error("Username must be a non-empty string");
        }

        // If currentOrganizationId is not a number, throw error
        if(isNaN(currentOrganizationId) || currentOrganizationId < 1 || !Number.isInteger(currentOrganizationId)){
            throw new Error("Organization ID must be a positive integer");
        }

        // Check if the organization exists
        const organization = new raesumOrganization();
        const org = await organization.getById(currentOrganizationId);

        // If the organization does not exist, throw error
        if(!org){
            throw new Error("Organization does not exist");
        }

        // Check if the username is unique
        logger.verbose(`Checking if username: ${username} is unique`, Date.now() - start);
        let user = null;

        try{
            user = await this.getUserByUsername(username);
        }catch{
            // User doesn't yet exist
            user = null;
        }

        // If the username is not unique, throw error
        if(user){
            throw new Error("Username is not unique");
        }

        // Check if externalID is unique
        logger.verbose(`Checking if external_id: ${external_id} is unique`, Date.now() - start);

        try{
            user = await this.getUserByExternalID(external_id);
        }catch{
            // User doesn't yet exist
            user = null;
        }

        // If the username is not unique, throw error
        if(user){
            throw new Error("ExternalID is not unique");
        }


        // Create the user
        let newUserID = null;
        try {
            const query = "INSERT INTO raesum_user (external_id, username, current_organization_id, active_status) VALUES ($1, $2, $3, $4) RETURNING id";
            const result = await raesumDB.query(query, [external_id, username, currentOrganizationId, activeStatus]);
            newUserID = result.rows[0].id;
        }catch (e){
            logger.error("DB Error creating user: " + e, Date.now() - start);
            throw new Error("Error creating user");
        }

        // Upsert user to organization_x_user table
        const addedToOrg = await organization.addUserToOrganization(newUserID, currentOrganizationId);

        if(addedToOrg){
            return newUserID;
        }else{
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
    async getUserById(id){
        const start = Date.now();

        logger.debug(`Getting user by ID: ${id}`, Date.now() - start);

        // If the ID is not a number, throw error
        if(isNaN(id) || id < 1 || !Number.isInteger(id)){
            throw new Error("User ID must be a positive integer");
        }

        // Get the user
        let user = null;
        try {
            const query = "SELECT * FROM raesum_user WHERE id = $1";
            const result = await raesumDB.query(query, [id]);
            user = result.rows[0];
        }catch(e){
            logger.warning("Error getting user by ID: " + e, Date.now() - start);
            throw new Error("Error getting user by ID");
        }

        // If the user is not found, throw error
        if(!user){
            logger.warning(`User with ID: ${id} not found`, Date.now() - start);
            throw new Error("User not found");
        }else{
            logger.verbose(`User with ID: ${id} found`, Date.now() - start);
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
    async getUserByUsername(username){
        const start = Date.now();

        logger.debug(`Getting user by username: ${username}`, Date.now() - start);

        // Valid the username input
        if(typeof username !== 'string' || username.length < 1){
            throw new Error("Username must be a non-empty string");
        }

        // Get the user id
        let theId = null;
        try {
            const query = "SELECT id FROM raesum_user WHERE username = $1";
            const result = await raesumDB.query(query, [username]);

            if(result.rows.length > 0){
                theId = parseInt(result.rows[0].id)
            }else{
                logger.warning(`User with username: ${username} not found`, Date.now() - start);
                throw new Error("User not found");
            }
        }catch(e){
            logger.error("Error getting user by username: " + e, Date.now() - start);
            throw new Error("Error getting user by username");
        }

        if(theId && !isNaN(theId) && theId > 0){
            logger.verbose(`User with username: ${username} found with ID: ${theId}`, Date.now() - start);
            return await this.getUserById(theId);
        }else{
            logger.warning(`User with username: ${username} not found`, Date.now() - start);
            throw new Error("User not found");
        }
    }
    
    /**
     * Gets a user by the external ID. It wraps the getUserById
     * @param  {String} external_id The ID of the user in the external (AWS Cognito) system
     * @return {Object} The user object
     * @throw {Error} If the external_id is not a string
     * @throw {Error} If the user is not found
     */
    async getUserByExternalID(external_id){
        const start = Date.now();

        logger.debug(`Getting user by external_id: ${external_id}`, Date.now() - start);

        // Valid the username input
        if(typeof external_id !== 'string' || external_id.length < 1){
            throw new Error("external_id must be a non-empty string");
        }

        // Get the user id
        let theId = null;
        try {
            const query = "SELECT id FROM raesum_user WHERE external_id = $1";
            const result = await raesumDB.query(query, [external_id]);

            if(result.rows.length > 0){
                theId = parseInt(result.rows[0].id)
            }else{
                logger.warning(`User with external_id: ${external_id} not found`, Date.now() - start);
                throw new Error("User not found");
            }
        }catch(e){
            logger.warning("Error getting user by external_id: " + e, Date.now() - start);
            throw new Error("Error getting user by external_id");
        }

        if(theId && !isNaN(theId) && theId > 0){
            logger.verbose(`User with username: ${external_id} found with ID: ${theId}`, Date.now() - start);
            return await this.getUserById(theId);
        }else{
            logger.warning(`User with username: ${external_id} not found`, Date.now() - start);
            throw new Error("User not found");
        }
    }

    /**
     * Activates or deactivates a user. This will also change their ability to log in via cognito.
     * @param  {Number} id The ID of the user
     * @param  {Boolean} activeStatus The activation status of the user
     * @return {Boolean} The activation status
     */
    async setActivationStatus(id, activeStatus){}

    /**
     * Initializes the Raesum system. It will create the first user based on the system settings. It should only be used on the initial system setup and/or during seeding.
     */
    async initRaesum(organizationID){
        const start = Date.now();

        logger.info("Initializing: Creating Default User", Date.now() - start);


        // Get the firstUserExternalId from the system settings
        const firstUserExternalId = await raesumConfig.get("initialization.firstUserExternalId");
        const firstUserUsername = await raesumConfig.get("initialization.firstUserUsername");
        const firstUserRole = await raesumConfig.get("initialization.firstUserRole");

        // If no organizationID is passed, assume orgID 1
        if(!organizationID || isNaN(organizationID) || organizationID < 1){
            organizationID = 1;
            logger.verbose(`Initializing: No organizationID supplied, setting to: ${organizationID}`, Date.now() - start);
        }
        logger.verbose(`Initializing: Creating Default User for Organization ID: ${organizationID}`, Date.now() - start);


        // Create the first user if they don't exist
        const userID = await this.createUser(firstUserExternalId, firstUserUsername, organizationID, true);

        logger.debug(`User with ID: ${userID} created`, Date.now() - start);

        // TODO: Assign user to super admin role


        return userID;

    }

    /**
     * Gets a list of users
     * @param  {Number} orgId The ID of the organization
     * @param  {Boolean} activeStatus The activation status of the user
     * @return {Array} The array of user objects
     */
    async getUsers(orgId, activeStatus){}
}

export default raesumUser;