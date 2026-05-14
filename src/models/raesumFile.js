import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumCache from "../modules/raesumCache.js";
import raesumConfig from "../modules/raesumConfig.js";
import raesumUser from "./raesumUser.js";
import raesumOrganization from "./raesumOrganization.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raseumFileObject{

        /**
     * Gets a list of allowed file types. Throws an error if it fails
     * @return {Object} Object of all file types by key
     * @throws {Error} If unable to get file types
     */
    async getFileTypes(){
        const start = Date.now();

        logger.debug("Getting file types", Date.now() - start);
        
        // Check to see if file types are in cache
        const cacheKey = "raesumFileTypes";
        const cachedTypes = await raesumCache.get(cacheKey);
        if (cachedTypes && Object.keys(cachedTypes).length > 0) {
            logger.verbose(`Returning cached file types`, Date.now() - start);
            logger.debug(`File types with ${Object.keys(cachedTypes).length} types: ${JSON.stringify(cachedTypes)}`, Date.now() - start);
            return cachedTypes;
        }

        // If cache is empty, get the file types from the json file
        logger.debug("Getting file types from controlled data", Date.now() - start);
        try {
            const fileTypesData = await import('../../controlledData/file/allowedUploadTypes.json', {
                assert: { type: 'json' }
            });
            
            // Build object of file types by key
            const fileTypes = {};
            for (const [key, config] of Object.entries(fileTypesData.default)) {
                fileTypes[key] = {
                    ...config,
                    datakey: key
                };
            }

            // Save to cache
            await raesumCache.set(cacheKey, fileTypes);
            
            logger.debug(`Got ${Object.keys(fileTypes).length} file types from controlled data`, Date.now() - start);
            logger.verbose(`Returning ${Object.keys(fileTypes).length} file types`, Date.now() - start);
            
            return fileTypes;
        } catch (e) {
            logger.error(`Error getting file types: ${e.message}`, Date.now() - start);
            throw new Error("Unable to get file types");
        }
    }

            /**
     * Gets single file type definition. Throws an error if it fails
     * @param  {String} fileTypeKey The org that will be the nominal owner of the file
     * @return {Object} Object one file type definition. Returns false if no type found
     * @throws {Error} If unable to get file types
     */
    async getOneFileType(fileTypeKey){
        const start = Date.now();

        // Validate fileTypeKey
        if (typeof fileTypeKey !== 'string' || fileTypeKey.trim().length === 0) {
            throw new Error("File type key must be a non-empty string");
        }

        logger.debug(`Getting file type for key: ${fileTypeKey}`, Date.now() - start);

        try {
            // Get all file types
            const fileTypes = await this.getFileTypes();
            
            // Check if the requested file type exists
            if (fileTypes[fileTypeKey]) {
                logger.verbose(`Found file type: ${fileTypeKey}`, Date.now() - start);
                return fileTypes[fileTypeKey];
            } else {
                logger.warning(`File type not found: ${fileTypeKey}`, Date.now() - start);
                return false;
            }
        } catch (e) {
            logger.error(`Error getting file type ${fileTypeKey}: ${e.message}`, Date.now() - start);
            throw new Error("Unable to get file type");
        }
    }
    

    /**
     * Creates a record for the file. The record will assume that the file is sent to the quarantine bucket initially.
     * @param  {String} fileTypeKey The type of file being created
     * @param  {Number} orgId The org that will be the nominal owner of the file
     * @param  {Number} userId The user that owns the file
     * @param  {String} originalFileName The original name of the file (this will not be kept after upload)
     * @return {Number} the ID of the file in the raesum_file table.
     * @throws {Error} If the fileTypeKey, orgId, or userId is invalid
     * @throws {Error} If unable to create the record
     */
    async createFileEntry(fileTypeKey,orgId, userId, originalFileName){
        const start = Date.now();

        logger.verbose(`Attempting to create file entry for fileType: ${fileTypeKey}, orgId: ${orgId}, userId: ${userId}`, Date.now() - start);

        // Validate fileTypeKey
        if (typeof fileTypeKey !== 'string' || fileTypeKey.trim().length === 0) {
            throw new Error("File type key must be a non-empty string");
        }

        // Validate orgId
        orgId = parseInt(orgId);
        if (isNaN(orgId) || orgId < 1 || !Number.isInteger(orgId)) {
            throw new Error("Organization ID must be a positive integer");
        }

        // Validate userId
        userId = parseInt(userId);
        if (isNaN(userId) || userId < 1 || !Number.isInteger(userId)) {
            throw new Error("User ID must be a positive integer");
        }

        // Validate originalFileName - allow null/undefined or non-empty string
        if (originalFileName !== null && originalFileName !== undefined) {
            if (typeof originalFileName !== 'string' || originalFileName.trim().length === 0) {
                throw new Error("Original file name must be null, undefined, or a non-empty string");
            }
        }

        // Validate that the file type exists
        const fileType = await this.getOneFileType(fileTypeKey);
        if (!fileType) {
            throw new Error("Invalid file type key");
        }

        // Check that the user exists
        try {
            await raesumUser.getUserById(userId);
        } catch (e) {
            logger.error(`User with ID: ${userId} does not exist`, Date.now() - start);
            throw new Error("User does not exist");
        }

        // Check that the organization exists
        try {
            await raesumOrganization.getById(orgId);
        } catch (e) {
            logger.error(`Organization with ID: ${orgId} does not exist`, Date.now() - start);
            throw new Error("Organization does not exist");
        }

        // Get AWS configuration for quarantine bucket
        const awsRegion = await raesumConfig.get("aws.region");
        const quarantineBucket = await raesumConfig.get("aws.s3.quarantine.bucketName");

        // Create the file entry with quarantine = true (default)
        try {
            const query = `INSERT INTO raesum_file (user_id, org_id, quarantine, awsregion, bucket, path, original_file_name, status_id) 
                          VALUES ($1, $2, true, $3, $4, '', $5, 1) 
                          RETURNING id`;
            const result = await raesumDB.query(query, [userId, orgId, awsRegion, quarantineBucket, originalFileName]);
            const fileId = parseInt(result.rows[0].id);
            logger.info(`File entry created with ID: ${fileId}`, Date.now() - start);
            return fileId;
        } catch (e) {
            logger.error(`Error creating file entry: ${e.message}`, Date.now() - start);
            throw new Error("Unable to create file entry");
        }
    }


    // This function updates the file status in the database. It will only allow for valid status values but any 'reason' can be supplied as a string
    /**
     * Updates the file status in the database
     * @param  {Number} fileId The ID of the file to update
     * @param  {String} status The new status of the file
     * @param  {String} reason The reason for the status change
     * @return {Boolean} True if the update was successful, false otherwise
     * @throws {Error} If the fileId, status, or reason is invalid
     * @throws {Error} If unable to update the record
     */
    async updateFileStatus(fileId,status,reason){
        const start = Date.now();

        logger.verbose(`Attempting to update file status for fileId: ${fileId} to status: ${status}`, Date.now() - start);

        // Validate fileId
        fileId = parseInt(fileId);
        if (isNaN(fileId) || fileId < 1 || !Number.isInteger(fileId)) {
            throw new Error("File ID must be a positive integer");
        }

        // Validate status
        if (typeof status !== 'string' || status.trim().length === 0) {
            throw new Error("Status must be a non-empty string");
        }

        // Validate reason
        if (typeof reason !== 'string' || reason.trim().length === 0) {
            throw new Error("Reason must be a non-empty string");
        }

        // Check if the file exists
        try {
            const checkQuery = "SELECT * FROM raesum_file WHERE id = $1";
            const checkResult = await raesumDB.query(checkQuery, [fileId]);
            if (checkResult.rows.length === 0) {
                throw new Error("File not found");
            }
        } catch (e) {
            logger.error(`Error checking file existence: ${e.message}`, Date.now() - start);
            throw new Error("File not found");
        }

        // Get the status_id from raesum_file_status table based on status datakey
        let statusId;
        try {
            const statusQuery = "SELECT id FROM raesum_file_status WHERE datakey = $1";
            const statusResult = await raesumDB.query(statusQuery, [status]);
            if (statusResult.rows.length === 0) {
                throw new Error("Invalid status");
            }
            statusId = statusResult.rows[0].id;
        } catch (e) {
            logger.error(`Error getting status ID: ${e.message}`, Date.now() - start);
            throw new Error("Invalid status");
        }

        // Update the file status
        try {
            const updateQuery = "UPDATE raesum_file SET status_id = $1 WHERE id = $2";
            await raesumDB.query(updateQuery, [statusId, fileId]);
            logger.info(`File status updated for fileId: ${fileId} to status: ${status}`, Date.now() - start);
            return true;
        } catch (e) {
            logger.error(`Error updating file status: ${e.message}`, Date.now() - start);
            throw new Error("Unable to update file status");
        }
    }



    /**
     * Uploads the file to the S3 quarantine bucket. When uploaded, it will update the file record status from uploading to validating when complete. Before returning it will call the validateFileAsync but not wait for it complete. 
     * @param  {string} fileId The ID of the file to update
     * @param  {string} s3Path This is the expected path that the object will be stored in including the final file ID/name.
     * @param  {String} bufferStream The new status of the file
     * @param  {String} mimetype The identified mimetype of the file being uploaded
     * @return {Boolean} True if the file was was successfully uploaded, false otherwise
     * @throws {Error} If any of the params are missing or invalid
     * @throws {Error} If the S3 bucket doesn't exist or the file cannot be uploaded
     * @throws {Error} If the object already exists in the bucket AND the s3Path doesn't match the file record
     * @throws {Error} If the s3Path is not unique AND is in the database AND not attached to the current file record
     */
    async upload(fileId, s3Path, bufferStream, mimetype){
        const start = Date.now();

        // Validate fileId
        fileId = parseInt(fileId);
        if (isNaN(fileId) || fileId < 1 || !Number.isInteger(fileId)) {
            throw new Error("File ID must be a positive integer");
        }

        // Validate s3Path - must be a valid S3 object key
        if (typeof s3Path !== 'string' || s3Path.trim().length === 0) {
            throw new Error("S3 path must be a non-empty string");
        }
        
        // Validate S3 path format (no leading/trailing slashes, no consecutive slashes)
        const s3PathRegex = /^[a-zA-Z0-9\-_.\/]+$/;
        if (!s3PathRegex.test(s3Path)) {
            throw new Error("Invalid S3 object key format");
        }
        
        // Check for consecutive slashes or leading/trailing slashes
        if (s3Path.startsWith('/') || s3Path.endsWith('/') || s3Path.includes('//')) {
            throw new Error("Invalid S3 object key format");
        }

        // Validate bufferStream
        if (!bufferStream) {
            throw new Error("Buffer stream is required");
        }

        // Validate mimetype
        if (typeof mimetype !== 'string' || mimetype.trim().length === 0) {
            throw new Error("Mimetype must be a non-empty string");
        }

        logger.debug(`Starting file upload for fileId: ${fileId} to S3 path: ${s3Path}`, Date.now() - start);

        // Check if file exists and get current status
        let fileRecord;
        try {
            const fileResult = await raesumDB.query("SELECT * FROM raesum_file WHERE id = $1", [fileId]);
            if (fileResult.rows.length === 0) {
                throw new Error("File not found");
            }
            fileRecord = fileResult.rows[0];
        } catch (e) {
            logger.error(`Error getting file record: ${e.message}`, Date.now() - start);
            throw new Error("File not found");
        }

        // Check if s3Path is unique in database (unless it's the current file's path)
        try {
            const pathCheckResult = await raesumDB.query(
                "SELECT id FROM raesum_file WHERE s3path = $1 AND id != $2",
                [s3Path, fileId]
            );
            if (pathCheckResult.rows.length > 0) {
                throw new Error("S3 path already exists in database");
            }
        } catch (e) {
            if (e.message === "S3 path already exists in database") {
                throw e;
            }
            logger.warning(`Error checking S3 path uniqueness: ${e.message}`, Date.now() - start);
        }

        // Get S3 configuration
        let s3Client;
        try {
            const awsRegion = await raesumConfig.get("aws.region");
            const quarantineBucket = await raesumConfig.get("aws.s3.quarantine.bucketName");
            
            // Import and configure S3 client
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            s3Client = new S3Client({ region: awsRegion });
            
            // Upload file to S3
            const putCommand = new PutObjectCommand({
                Bucket: quarantineBucket,
                Key: s3Path,
                Body: bufferStream,
                ContentType: mimetype
            });
            
            await s3Client.send(putCommand);
            logger.info(`File uploaded to S3: ${s3Path}`, Date.now() - start);
            
        } catch (e) {
            logger.error(`Error uploading file to S3: ${e.message}`, Date.now() - start);
            throw new Error("Failed to upload file to S3");
        }

        // Update file record with S3 path and change status to validating
        try {
            // Update s3path first
            await raesumDB.query(
                "UPDATE raesum_file SET s3path = $1 WHERE id = $2",
                [s3Path, fileId]
            );
            
            // Use updateFileStatus to change status to validating
            await this.updateFileStatus(fileId, "validating", "File uploaded successfully");
            
            logger.info(`File record updated for fileId: ${fileId} with status: validating`, Date.now() - start);
            
        } catch (e) {
            logger.error(`Error updating file record: ${fileId} with error ${e.message}`, Date.now() - start);
            throw new Error("Failed to update file record");
        }

        // Trigger async validation (don't wait for completion)
        this.validateFileAsync(fileId).catch(e => {
            logger.error(`Async validation failed for fileId: ${fileId}: ${e.message}`);
        });

        logger.verbose(`File upload completed for fileId: ${fileId}`, Date.now() - start);
        return true;
    }

        /**
     * This function is called when the 'external' validation process is complete and the file needs to be moved to the bucket type specified by the file type, quarantined, or deleted.
     * @param  {Number} fileId The ID of the file to update
     * @param  {String} status The new status of the file
     * @param  {String} reason The reason for the status change
     * @return {Boolean} True if the update was successful, false otherwise
     * @throws {Error} If the fileId, status, or reason is invalid
     * @throws {Error} If unable to update the record
     */
    async uploadDisposition(fileId,status,reason){}

        /**
     * Deletes the file from the S3 bucket and marks it as deleted in the database. It will NOT delete the record. It will update the database status to deleted if the file doesn't exist in S3.
     * @param  {Number} fileId The ID of the file to update
     * @return {Boolean} True if the update was successful, false otherwise. Note it will return true if the file already has been deleted from the S3 bucket.
     * @throws {Error} If the fileId is invalid or missing from database
     * @throws {Error} If the file cannot be deleted from the database due to foreign key contraints. The DB check occurs before attempting to delete from S3 bucket. If foreign key constraints are present, delete must be done via the model/object that governs the constraints.
     * @throws {Error} If the file cannot be deleted from the S3 bucket but the file exists.
     * @throws {Error} If unable to update the record
     */
    async delete(fileId){}


    /**
     * Gets the information of one file
     * @param  {Number} fileId The ID of the file to update
     * @return {Object} Returns a single record of the file from the database
     * @throws {Error} If the fileId is invalid
     * @throws {Error} If unable to update the record
     */
    async getEntryById(fileId){
        const start = Date.now();

        logger.verbose(`Getting file entry by ID: ${fileId}`, Date.now() - start);

        // Validate fileId
        fileId = parseInt(fileId);
        if (isNaN(fileId) || fileId < 1 || !Number.isInteger(fileId)) {
            throw new Error("File ID must be a positive integer");
        }

        // Get the file entry
        try {
            const query = "SELECT * FROM raesum_file WHERE id = $1";
            const result = await raesumDB.query(query, [fileId]);
            
            if (result.rows.length === 0) {
                logger.warning(`File with ID: ${fileId} not found`, Date.now() - start);
                throw new Error("File not found");
            }

            const file = result.rows[0];
            // Parse integer fields
            file.id = parseInt(file.id);
            file.user_id = parseInt(file.user_id);
            file.org_id = parseInt(file.org_id);
            if (file.status_id) {
                file.status_id = parseInt(file.status_id);
            }

            logger.info(`File with ID: ${fileId} found`, Date.now() - start);
            return file;
        } catch (e) {
            logger.error(`Error getting file entry by ID: ${e.message}`, Date.now() - start);
            throw new Error("Unable to get file entry");
        }
    }

    /**
     * Gets the information of several files. 
     * @param  {userId} userId The ID of the user
     * @param  {orgId} orgId The ID of the organization
     * @return {Array} Returns an array of file records of from the database
     * @throws {Error} If the userId or orgId is invalid
     * @throws {Error} If the userId or orgId are not set (either can be null but not BOTH)
     * @throws {Error} If unable to update the record
     */
    async getEntriesByUserAndOrg(userId, orgId){
        const start = Date.now();

        logger.verbose(`Getting file entries for userId: ${userId}, orgId: ${orgId}`, Date.now() - start);

        // Validate that at least one parameter is provided
        if ((userId === null || userId === undefined) && (orgId === null || orgId === undefined)) {
            throw new Error("At least one of userId or orgId must be provided");
        }

        // Build the query dynamically based on which parameters are provided
        let query = "SELECT * FROM raesum_file WHERE ";
        let params = [];
        let paramCount = 0;

        if (userId !== null && userId !== undefined) {
            userId = parseInt(userId);
            if (isNaN(userId) || userId < 1 || !Number.isInteger(userId)) {
                throw new Error("User ID must be a positive integer");
            }
            query += `user_id = $${paramCount + 1}`;
            params.push(userId);
            paramCount++;
        }

        if (orgId !== null && orgId !== undefined) {
            orgId = parseInt(orgId);
            if (isNaN(orgId) || orgId < 1 || !Number.isInteger(orgId)) {
                throw new Error("Organization ID must be a positive integer");
            }
            if (paramCount > 0) {
                query += " AND ";
            }
            query += `org_id = $${paramCount + 1}`;
            params.push(orgId);
            paramCount++;
        }

        try {
            const result = await raesumDB.query(query, params);
            
            // Parse integer fields for each result
            const files = result.rows.map(file => {
                file.id = parseInt(file.id);
                file.user_id = parseInt(file.user_id);
                file.org_id = parseInt(file.org_id);
                if (file.status_id) {
                    file.status_id = parseInt(file.status_id);
                }
                return file;
            });

            logger.info(`Found ${files.length} file entries`, Date.now() - start);
            return files;
        } catch (e) {
            logger.error(`Error getting file entries by user and org: ${e.message}`, Date.now() - start);
            throw new Error("Unable to get file entries");
        }
    }


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