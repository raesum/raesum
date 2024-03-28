import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumUser from "./raesumUser.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");
const user = new raesumUser();

class raesumOrganization {

    /**
     * Initializes the Raesum system. It will create the first user based on the system settings. It should only be used on the initial system setup and/or during seeding.
     */
    async initRaesum(){
        const start = Date.now();

        logger.info("Initializing: Creating Default Organization", Date.now() - start);
        // Create the default organization
        return this.create("Default Organization", "This is the default organization for the Raesum system.");
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
        if(typeof name !== 'string'){
            throw new Error("Organization name must be a string");
        }

        logger.debug("Creating organization", Date.now() - start);
        if(activeStatus !== false){
            activeStatus = true;
        }

        try{
            const query = "INSERT INTO raesum_organization (name, active_status) VALUES ($1, $2) RETURNING id";
            const result = await raesumDB.query(query, [name, activeStatus]);
            logger.info(`Organization created with id: ${result.rows[0].id}`, Date.now() - start);
            return parseInt(result.rows[0].id);
        }catch(e){
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

        logger.debug("Getting organization by ID: " + id, Date.now() - start);

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
        logger.debug(`Organization found for ID: ${id}`, Date.now() - start);
        return result.rows[0];
    }


    /**
     * Activates or deactivates an organization. Any users that are currently part of the organization will be moved to a different org that they are part of that is still active OR if this is their last org, they will be deactivated.
     * @param  {Number} id The ID of the org
     * @param  {Boolean} activeStatus The activation status of the org
     * @return {Boolean} The activation status
     */
    async setActivationStatus(id, activeStatus) {}


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
        if(isNaN(userID) || isNaN(orgID) || userID < 1 || orgID < 1){
            throw new Error("userID and orgID must be positive integers");
        }

        // Check if user exists
        try{
            const userResult = await user.getUserById(userID);
            if(userResult.length === 0){
                logger.warning(`Cannot add user: ${userID} to org: ${orgID}. User not found`, Date.now() - start);
                throw new Error("User not found");
            }
        }catch(e){
            logger.warning(`Cannot add user: ${userID} to org: ${orgID}. User not found`, Date.now() - start);
            throw new Error("User not found");
        }


        // Check if org exists and is active
        try{
            const orgResult = await this.getById(orgID);
            if(orgResult.active_status === false){
                logger.warning(`Cannot add user: ${userID} to org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
                throw new Error("Org is not active or does not exist");
            }
        }catch(e){
            logger.warning(`Cannot add user: ${userID} to org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
            throw new Error("Org not found or does not exist");
        }

        // Check if user is already part of the org
        const checkQuery = "SELECT * FROM raesum_organization_x_user WHERE user_id = $1 AND org_id = $2";
        const checkResult = await raesumDB.query(checkQuery, [userID, orgID]);
        if(checkResult.rows.length > 0){
            logger.debug(`Cannot add user: ${userID} to org: ${orgID}. User is already part of the org`, Date.now() - start);
            return true;
        }

        // Upsert user to raesum_organization_x_user
        const query = "INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2) ON CONFLICT (user_id, org_id) DO NOTHING;";

        try{
            await raesumDB.query(query, [userID, orgID]);
            logger.debug(`User: ${userID} added to org: ${orgID}`, Date.now() - start);
            return true;
        }catch(e){
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
    async removeUserFromOrganization(userID, orgID){
        const start = Date.now();

        logger.info(`Removing user: ${userID} from org: ${orgID}`, Date.now() - start);

        // Parse inputs as INT
        orgID = parseInt(orgID);
        userID = parseInt(userID);

        // Validate input
        if(isNaN(userID) || isNaN(orgID) || userID < 1 || orgID < 1){
            throw new Error("userID and orgID must be positive integers");
        }

        // Check if user exists
        try{
            const userResult = await user.getUserById(userID);
            if(userResult.length === 0){
                logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. User not found`, Date.now() - start);
                throw new Error("User not found");
            }
        }catch(e){
            logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. User not found`, Date.now() - start);
            throw new Error("User not found");
        }


        // Check if org exists and is active
        try{
            const orgResult = await this.getById(orgID);
            if(orgResult.active_status === false){
                logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
                throw new Error("Org is not active or does not exist");
            }
        }catch(e){
            logger.warning(`Cannot remove user: ${userID} from org: ${orgID}. Org not active or doesn't exist`, Date.now() - start);
            throw new Error("Org not found or does not exist");
        }

        // Remove user from org
        const query = "DELETE FROM raesum_organization_x_user WHERE user_id = $1 AND org_id = $2";
        try {
            await raesumDB.query(query, [userID, orgID]);
            logger.debug(`User: ${userID} removed from org: ${orgID}`, Date.now() - start);
        }catch(e){
            logger.error(`Error removing user: ${userID} from org: ${orgID} with error: ${e}`, Date.now() - start);
            throw new Error("Error removing user from org");
        }

        // TO-DO: Remove user roles in org



        return true;

    }

}

export default raesumOrganization;