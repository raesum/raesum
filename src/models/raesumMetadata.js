import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raseumMetadataObject{

    /**
     * Sets a metadata value
     * @param  {String} key The ID of the metadata key
     * @param  {String} value The value of the metadata
     * @return {boolean} whether metadata was set
     * @throws {Error} If the metadata key is not a string
     * @throws {Error} If the metadata value is not a string, number, or boolean
     */
    async set(key, value){
        const start = Date.now();

        logger.verbose("Setting metadata by key: " + key, Date.now() - start);

        if (typeof key !== 'string') {
            throw new Error("Metadata key must be a string");
        }
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
            throw new Error("Metadata value must be a string, number, or boolean");
        }

        const query = "INSERT INTO raesum_metadata (datakey, datavalue) VALUES ($1, $2) ON CONFLICT (datakey) DO UPDATE SET datavalue = $2";
        const result = await raesumDB.query(query, [key, value]);

        return true;
    }

    /**
     * Gets a metadata value
     * @param  {String} key The ID of the metadata key
     * @return {string} value of the metadata
     * @throws {Error} If the metadata is not found
     * @throws {Error} If the metadata key is not a string
     */
    async getByKey(key){
        const start = Date.now();

        logger.verbose("Getting metadata by key: " + key, Date.now() - start);

        if (typeof key !== 'string') {
            throw new Error("Metadata key must be a string");
        }

        const query = "SELECT datavalue FROM raesum_metadata WHERE datakey = $1";
        const result = await raesumDB.query(query, [key]);

        if (result.rows.length === 0) {
            logger.warning("Metadata not found by key: " + key, Date.now() - start);
            throw new Error("Metadata not found");
        }

        // Check for boolean values and convert
        if(result.rows[0].datavalue == "true"){
            return true;
        }else if(result.rows[0].datavalue == "false"){
            return false;
        }

        // Check for number values and convert
        if(parseInt(result.rows[0].datavalue) == result.rows[0].datavalue){
            return parseInt(result.rows[0].datavalue);
        }else if(parseFloat(result.rows[0].datavalue) == result.rows[0].datavalue){
            return parseFloat(result.rows[0].datavalue);
        }

        return result.rows[0].datavalue;
    }

    /**
     * Deletes metadata value
     * @param  {String} key The ID of the metadata key
     * @returns {boolean} whether metadata was deleted. False if metadata was not found.
     * @throws {Error} If the metadata key is not a string
     */
    async delete(key){
        const start = Date.now();

        logger.info("Deleting metadata by key: " + key, Date.now() - start);

        if (typeof key !== 'string') {
            throw new Error("Metadata key must be a string");
        }

        const query = "DELETE FROM raesum_metadata WHERE datakey = $1";
        const result = await raesumDB.query(query, [key]);
        // Check to see how many rows deleted
        if (result.rowCount === 0) {
            logger.warning("Metadata not found for deletion: " + key, Date.now() - start);
            return false;
        }
        logger.verbose("Metadata deleted: " + key, Date.now() - start);

        return true;
    }

}


const raseumMetadata = new raseumMetadataObject();
export default raseumMetadata;