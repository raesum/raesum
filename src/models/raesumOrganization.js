import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

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
        const query = "INSERT INTO raesum_organizations (name, active_status) VALUES ($1, $2) RETURNING id";
        const result = await raesumDB.query(query, [name, activeStatus]);
        return result.rows[0].id;
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

        const query = "SELECT * FROM raesum_organizations WHERE id = $1";
        const result = await raesumDB.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error("Organization not found");
        }
        return result.rows[0];
    }




}

export default raesumOrganization;