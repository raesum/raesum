import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumCache from "../modules/raesumCache.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raseumFileObject{

        /**
     * Gets a list of allowed file types. Throws an error if it fails
     * @return {Object} Object of all file types by key
     * @throws {Error} If unable to get file types
     */
    async getFileTypes(){
        // Start the timer

        // Get the file types from the cache

        // If the cache is empty, get the file types from the json file

        // Save the file types to the cache

        // Return the file types

    }

    /**
     * Creates a record for the file. The record will assume that the file is sent to the quarantine bucket initially.
     * @param  {String} fileTypeKey The ID of the metadata key
     * @param  {Number} orgId The org that will be the nominal owner of the file
     * @param  {Number} userId The user that owns the file
     * @param  {String} originalFileName The original name of the file (this will not be kept after upload)
     * @return {Number} the ID of the file in the raesum_file table.
     * @throws {Error} If the fileTypeKey, orgId, or userId is invalid
     * @throws {Error} If unable to create the record
     */
    async createFileEntry(fileTypeKey,orgId, userId, originalFileName){

    }



    async updateFileStatus(fileId,status,reason){}



    async getFileStatus(fileId){}


    async upload(s3Path, bufferStream, mimetype){}


    async delete(fileId){}


    async getEntryById(fileId){}


    async getEntriesByUserAndOrg(userId, orgId){}


    /*
        Clears the caches for file metadata
    */
    async clearMetadataKeyCache(){
         const start = Date.now();       
        logger.debug("Clearing File metadata key cache", Date.now() - start);
        const cacheKeyStrings = [
            'raesumFileMetadataKeystrue',
            'raesumFileMetadataKeysfalse'
        ];
        
        for (const cacheKey of cacheKeyStrings) {
            await raesumCache.delete(cacheKey);
        }

        logger.verbose("File Metadata key list cache cleared", Date.now() - start);
    }


    async getMetaDataKeys(show_inactive = false) {
        const start = Date.now();

        logger.debug("Getting file metadata keys", Date.now() - start);
        
        // Limit show_inactive to boolean
        if (show_inactive !== true) {
            show_inactive = false;
        }

        // Check to see if keys are in cache
        const cacheKey = "raesumFileMetadataKeys" + show_inactive;
        const cachedKeys = await raesumCache.get(cacheKey);
        if (cachedKeys && Object.keys(cachedKeys).length > 0) {
            logger.verbose(`Returning cached file metadata keys`, Date.now() - start)
            logger.debug(`Key list file metadata with ${Object.keys(cachedKeys).length} keys: ${JSON.stringify(cachedKeys)}`, Date.now() - start);
            return cachedKeys;
        }

        // Create a query to get all metadata keys
        logger.debug("Getting file metadata keys from database", Date.now() - start);
        let sql = "SELECT * FROM raesum_file_metadata_keys";
        if (!show_inactive) {
            sql += " WHERE active_status = true";
        }

        // Run query
        const response = await raesumDB.query(sql);

        logger.debug("Got "+response.rows.length+" file metadata keys from database", Date.now() - start);
        // Loop through results to build object
        let keys = {};
        for (let i = 0; i < response.rows.length; i++) {
            keys[response.rows[i]['datakey']] = response.rows[i];
        }

        // Save to cache
        await raesumCache.set(cacheKey, keys);

        // Create a list of keys
        const keyList = Object.keys(keys);
        const listCacheKey = "raesumFileMetadataKeys" + show_inactive;
        const cacheResponse = await raesumCache.set(listCacheKey, keys);

        if(!cacheResponse){
            logger.error("Failed to save file metadata keys to cache", Date.now() - start);
        }else{
            logger.debug("Saved "+response.rows.length+" file metadata keys to cache", Date.now() - start);
        }

        // Return object
        logger.verbose(`Returning ${response.rows.length} file metadata keys`, Date.now() - start);
        return keys;
    }


    async getFileMetadataValues(fileId, keys, activeStatus = false) {
        const start = Date.now();

        // Validate fileId
        fileId = parseInt(fileId);
        if (isNaN(fileId) || fileId < 1 || !Number.isInteger(fileId)) {
            throw new Error("File ID must be a positive integer");
        }

        // Get the file
        let file;
        try {
            const fileResult = await raesumDB.query("SELECT * FROM raesum_file WHERE id = $1", [fileId]);
            if (fileResult.rows.length === 0) {
                throw new Error("File not found");
            }
            file = fileResult.rows[0];
        } catch (e) {
            throw new Error("File not found");
        }

        // Get list of valid metadata keys
        const validKeys = await this.getMetaDataKeys(activeStatus);
        const validKeyArray = Object.keys(validKeys);

        // If keys is not an array, convert it to array
        if (!Array.isArray(keys)) {
            if (typeof keys === 'string') {
                keys = [keys];
            } else {
                throw new Error("Keys must be a string or array");
            }
        }

        // Filter keys for valid keys only
        keys = keys.filter(key => validKeyArray.includes(key));

        if (keys.length === 0) {
            logger.verbose(`No valid keys to retrieve for fileId ${fileId}`, Date.now() - start);
            return {};
        }

        // Build query to get metadata values
        const sql = `SELECT datakey, value 
                   FROM raesum_file_x_metadata 
                   WHERE file_id = $1 
                     AND datakey ILIKE ANY($2)`;

        try {
            const result = await raesumDB.query(sql, [fileId, keys]);
            
            // Build object of key-value pairs
            const metadata = {};
            for (let i = 0; i < result.rows.length; i++) {
                metadata[result.rows[i].datakey] = result.rows[i].value;
            }

            logger.verbose(`Retrieved ${Object.keys(metadata).length} metadata values for file ${fileId}`, Date.now() - start);
            return metadata;
        } catch (e) {
            logger.error(`Error getting file metadata values for file ${fileId}: ${e.message}`, Date.now() - start);
            throw new Error("Error getting file metadata values");
        }
    }


    async deleteFileMetadataValues(fileId, keys, activeStatus = false, forceWrite = false) {
        const start = Date.now();

        // Validate fileId
        fileId = parseInt(fileId);
        if (isNaN(fileId) || fileId < 1 || !Number.isInteger(fileId)) {
            throw new Error("File ID must be a positive integer");
        }

        if (!Array.isArray(keys) || keys.length < 1) {
            throw new Error("Keys must be an array");
        }

        // Remove all values in keys that are not strings with length > 0
        keys = keys.filter(key => typeof key === 'string' && key.length > 0);

        let file;
        try {
            const fileResult = await raesumDB.query("SELECT * FROM raesum_file WHERE id = $1", [fileId]);
            if (fileResult.rows.length === 0) {
                throw new Error("File not found");
            }
            file = fileResult.rows[0];
        } catch (e) {
            throw new Error("File not found");
        }

        // Get a list of valid metadata keys
        const validKeys = await this.getMetaDataKeys(activeStatus);

        // Remove any entries in keys that are not valid or are listed as read only (unless forceWrite is true)
        const keysToDelete = keys.filter(key => {
            if (!validKeys[key]) {
                return false; // Invalid key
            }
            if (!forceWrite && !validKeys[key].writable) {
                return false; // Key is not writable and forceWrite is false
            }
            return true; // Valid and writable (or forceWrite is true)
        });

        if (keysToDelete.length === 0) {
            logger.verbose(`No valid keys to delete for fileId ${fileId}`, Date.now() - start);
            return true;
        }

        // Delete values from raesum_file_x_metadata table corresponding with keys
        const deleteSql = `DELETE FROM raesum_file_x_metadata
                          WHERE file_id = $1
                          AND datakey ILIKE ANY($2)`;

        try {
            await raesumDB.query(deleteSql, [fileId, keysToDelete]);
            logger.info(`Deleted ${keysToDelete.length} metadata values for file ${fileId}`, Date.now() - start);
        } catch (e) {
            logger.error(`Error deleting file metadata values for file ${fileId}: ${e.message}`, Date.now() - start);
            throw new Error("Error deleting file metadata values");
        }

        return true;
    }


    async setFileMetadataValues(fileId, values, activeStatus = false, forceWrite = false) {
        const start = Date.now();

        // Validate fileId
        fileId = parseInt(fileId);
        if (isNaN(fileId) || fileId < 1 || !Number.isInteger(fileId)) {
            throw new Error("File ID must be a positive integer");
        }

        // Get the file
        let file;
        try {
            const fileResult = await raesumDB.query("SELECT * FROM raesum_file WHERE id = $1", [fileId]);
            if (fileResult.rows.length === 0) {
                throw new Error("File not found");
            }
            file = fileResult.rows[0];
        } catch (e) {
            throw new Error("File not found");
        }

        // Clean out any key/value pairs where value is not string, int, or boolean
        for (const key in values) {
            if (typeof values[key] !== 'string' && typeof values[key] !== 'boolean' && typeof values[key] !== 'number') {
                delete values[key];
            }
        }

        logger.debug(`setFileMetadataValues Attempting to update file metadata`, Date.now() - start);

        // Get list of file metadata values
        const validKeys = await this.getMetaDataKeys(activeStatus);

        let keyList = Object.keys(values);

        // Filter keylist for valid keys and check write permissions
        keyList = keyList.filter(key => {
            if (!validKeys[key]) {
                return false; // Invalid key
            }
            if (!forceWrite && !validKeys[key].writable) {
                return false; // Key is not writable and forceWrite is false
            }
            return true; // Valid and writable (or forceWrite is true)
        });

        // Check to see if there are existing metadata values
        const existingValues = await this.getFileMetadataValues(fileId, keyList, activeStatus);
        
        const existingValuesKeyList = Object.keys(existingValues);

        let updateKeyList = [];
        let newKeyList = [];

        // Loop through keyList
        for (let i = 0; i < keyList.length; i++) {
            // If key is in existing value object, add it to updateKeyList
            if (existingValuesKeyList.includes(keyList[i])) {
                updateKeyList.push(keyList[i]);
            } else {
                // Else add it to the newKey list
                newKeyList.push(keyList[i]);
            }
        }

        logger.debug(`setFileMetadataValues existingValues: ${JSON.stringify(existingValues)} validKeys: ${Object.keys(validKeys).join(", ")} keyList: ${keyList.join(", ")} updateKeyList: ${updateKeyList.join(", ")} newKeyList: ${newKeyList.join(", ")}`, Date.now() - start);

        // Insert new keys
        let sql = "";
        let valuesArray = [];
        let insertValuesArray = [];
        let i = 1;
        
        // If there are new keys
        if(newKeyList.length > 0){
            // Loop through values and build update query
            for (let q = 0; q < newKeyList.length; q++) {

                // Add insert/update query
                insertValuesArray.push(`($${i}, $${i + 1}, $${i + 2})`);
                valuesArray.push(fileId);
                valuesArray.push(newKeyList[q]);
                valuesArray.push(values[newKeyList[q]]);

                // Increment iterator
                i += 3;

            }

            sql += "INSERT INTO raesum_file_x_metadata (file_id, datakey, value) VALUES ";
            sql += insertValuesArray.join(", ") + ";";
        }

        // Run insert query
        try {
            await raesumDB.query(sql, valuesArray);
        } catch (e) {
            logger.error(`Failed setFileMetadataValues to insert new metadata values for file: ${e.message}`, Date.now() - start)
            throw new Error("Error setFileMetadataValues inserting new file metadata values");
        }

        // Update existing keys
        // Loop through update keys and create an update statement for each
        for (let q = 0; q < updateKeyList.length; q++) {
            sql = `UPDATE raesum_file_x_metadata
                   SET value = $1
                   WHERE file_id = $2
                     AND datakey ILIKE $3;`;
            try {
                await raesumDB.query(sql, [values[updateKeyList[q]], fileId, updateKeyList[q]]);
            } catch (e) {
                logger.error(`Failed setFileMetadataValues to update file metadata values: ${e.message}`, Date.now() - start);
                throw new Error("Error setFileMetadataValues updating file metadata values");
            }
        }

        logger.verbose("File setFileMetadataValues completed for file: " + fileId + " with keys " + Object.keys(values).join(", "), Date.now() - start);
        return true;
    }
    
}


const raseumFileInstance = new raseumFileObject();
export default raseumFileInstance;