import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumUser from "./raesumUser.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumOrganizationObject {

    /**
     * Initializes the Raesum system. It will create the first user based on the system settings. It should only be used on the initial system setup and/or during seeding.
     */
    async initRaesum() {
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
            activeStatus = true;
        }


        // Update the org
        const query = "UPDATE raesum_organization SET active_status = $1 WHERE id = $2";
        try {

            await raesumDB.query(query, [activeStatus, id]);
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

                for(let i=0; i<orgUsers.length; i++) {

                    // For each user, check if they are part of another org
                    const userOrgs = await raesumUser.getOrganizations(orgUsers[i].id);
                    if(userOrgs.length > 1) {

                        // If they are part of another org, move them to that org
                        logger.verbose(`Moving user: ${orgUsers[i].id} to org: ${userOrgs[0]}`, Date.now() - start);
                        await this.addUserToOrganization(orgUsers[i].id, userOrgs[0]);
                    }else{

                        // If they are not part of another org, deactivate them if they are active
                        if(orgUsers[i].active_status === true){
                            logger.verbose(`Deactivating user: ${orgUsers[i].id}`, Date.now() - start);
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

        // Get users
        const query = `SELECT *
                       FROM raesum_organization_x_user as oxu
                       LEFT JOIN raesum_user as u ON oxu.user_id = u.id
                       WHERE oxu.org_id = $1
                         AND u.active_status = $2`;
        const result = await raesumDB.query(query, [orgID, activeStatus]);

        logger.verbose(`Users found for org: ${orgID}`, Date.now() - start);
        return result.rows;
    }

}


const raesumOrganization = new raesumOrganizationObject();
export default raesumOrganization;