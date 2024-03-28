import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
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
     */
    async createUser(external_id, username, currentOrganizationId, activeStatus){}

    /**
     * Gets a user by ID
     * @param  {Number} id The ID of the user
     * @return {Object} The user object
     */
    async getUserByID(id){}

    /**
     * Creates a new user
     * @param  {String} external_id The ID of the user in the external (AWS Cognito) system
     * @return {Object} The user object
     */
    async getUserByExternalID(external_id){}

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
    async initRaesum(){

        // Get the firstUserExternalId from the system settings
        const firstUserExternalId = await raesumSettings.get("initialization.firstUserExternalId");
        const firstUserUsername = await raesumSettings.get("initialization.firstUserUsername");

        // Create the first user if they don't exist
        const userID = await this.createUser(firstUserExternalId, firstUserUsername, 1, true);

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