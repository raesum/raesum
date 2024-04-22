import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import {buildAWSClientConfig} from "../utils/awsUtils.js";
import raesumConfig from "../modules/raesumConfig.js";
import {
        CognitoIdentityProviderClient,
        DescribeUserPoolClientCommand,
        DescribeUserPoolCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoIdentityClient, GetIdCommand } from "@aws-sdk/client-cognito-identity";
import raesumCache from "./raesumCache.js";
import raesumUser from "../models/raesumUser.js";
import raesumDB from "./raesumDB.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumCognito{

    #cacheObjectType = "cognito";


    /**
     * Gets the cognito client description object and stores it in cache
     * @return {string} The base url for the cognito login page
     */
    async buildBaseLoginURL(){
        const start = Date.now();

        // Get from cache
        const cacheKey = "cognitoLoginURL";
        const cacheValue = await raesumCache.get(cacheKey, this.#cacheObjectType);

        // Set the cognito login URL path
                let loginURL = "https://";

        // Get user pool description
        const userPoolDescription = await this.getCognitoUserPoolDescription();


        // If there is a custom domain use it
        if(userPoolDescription.UserPool.CustomDomain){
            logger.debug("Using custom domain for Cognito login", Date.now() - start);
            // Build the URL using the domain value plus the cognitoLoginPath
            loginURL += userPoolDescription.UserPool.CustomDomain.Domain;

            }else {
            logger.debug("Using AWS hosted domain for Cognito login", Date.now() - start);
            const region = await raesumConfig.get('aws.region');
            // Else build the AWS hosted domain using the domain value plus "auth" plus the region + amazoncognito.com
            loginURL += userPoolDescription.UserPool.Domain + ".auth." + region + ".amazoncognito.com";
        }
        // Set cache
        await raesumCache.set(cacheKey, loginURL, 300, this.#cacheObjectType);

        // Return the url
        return loginURL;

    }

    /**
     * Gets the cognito user pool description object and stores it in cache
     * @return {Array} The cognito user pool description object
     * @throws {Error} if unable to connect to cognito
     */
    async getCognitoUserPoolDescription(){
        const start = Date.now();

        // Get from cache
        const cacheKey = "cognitoUserPoolDescription";
        const cacheValue = await raesumCache.get(cacheKey, this.#cacheObjectType);

        if (cacheValue) {
            logger.debug("Cognito user pool information found in cache", Date.now() - start);
            return cacheValue;
        }

        // Initialize the cognito client
        logger.info("Cognito user pool information not in cache. Retrieving from AWS", Date.now() - start);
        let awsCognitoConfig = await buildAWSClientConfig();

        // Get cognito settins
        awsCognitoConfig.cognitoUserPoolId = await raesumConfig.get('aws.cognito.userPoolId')
        awsCognitoConfig.tokenExpiration = await raesumConfig.get('aws.cognito.tokenExpiration')

        const clientID = await raesumConfig.get('aws.cognito.cognitoClientId')

        logger.verbose("Getting Cognito User Pool Description", Date.now() - start);
        const client = new CognitoIdentityProviderClient(awsCognitoConfig);
        const input = { // ListUserPoolClientsRequest
            UserPoolId: awsCognitoConfig.cognitoUserPoolId, // required
        };

        const command = new DescribeUserPoolCommand(input);

        try {
            const response = await client.send(command);

            // Save to Cache
            await raesumCache.set(cacheKey, response,300,'cognito');
            logger.verbose(`Cognito User Pool Description Retrieved`, Date.now() - start)
            return response;
        } catch (e) {
            logger.error(`Error getting Cognito User Pool Description: ${e}`, Date.now() - start);
            throw new Error(e);
        }
    }

    /**
     * Gets the cognito client description object and stores it in cache
     * @return {Array} The cognito client object
     * @throws {Error} if unable to connect to cognito
     */
    async getCognitoClientDescription() {
        const start = Date.now();

        // Get from cache
        const cacheKey = "cognitoClientDescription";
        const cacheValue = await raesumCache.get(cacheKey, 'cognito');

        if (cacheValue) {
            logger.debug("Cognito client information found in cache", Date.now() - start);
            return cacheValue;
        }

        // Initialize the cognito client
        logger.info("Cognito client information not in cache. Retrieving from AWS", Date.now() - start);
        let awsCognitoConfig = await buildAWSClientConfig();

        // Get cognito settins
        awsCognitoConfig.cognitoUserPoolId = await raesumConfig.get('aws.cognito.userPoolId')
        awsCognitoConfig.tokenExpiration = await raesumConfig.get('aws.cognito.tokenExpiration')
        awsCognitoConfig.tokenUse = 'id'
        const clientID = await raesumConfig.get('aws.cognito.cognitoClientId')

        logger.verbose("Getting Cognito Client Description", Date.now() - start);
        const client = new CognitoIdentityProviderClient(awsCognitoConfig);
        const input = { // ListUserPoolClientsRequest
            UserPoolId: awsCognitoConfig.cognitoUserPoolId, // required
            ClientId: clientID
        };

        const command = new DescribeUserPoolClientCommand(input);

        try {
            const response = await client.send(command);

            // Save to Cache
            await raesumCache.set(cacheKey, response,300,'cognito');
            return response;
        } catch (e) {
            logger.error(`Error getting Cognito Client Description: ${e}`, Date.now() - start);
            throw new Error(e);
        }
    }

    /**
     * Gets a list of all possible callback urls from cognito
     * @return {Array} An object describing each key and whether it is connected to cognito
     */
    async getAllowedCallbacks(){
        const start = Date.now();

        const clientDescription = await this.getCognitoClientDescription();

        if(!clientDescription || !clientDescription.UserPoolClient || !clientDescription.UserPoolClient.CallbackURLs){
            logger.error("Unable to get Cognito Client Description", Date.now() - start);
            return [];
        }else{
            return clientDescription.UserPoolClient.CallbackURLs;
        }
    }

    /*
*
 */
    /**
     * Check the cognito connection and update any user metadata keys.
     * @return {boolean} True if successfully run
     * @throws {Error} if unable to connect to cognito or run commands to describe the user pool
     */
    async synchronizeCognitoUserMetadata(){
        const start = Date.now();

        logger.info("Checking Cognito Connection and updating user metadata keys", Date.now() - start);
        try{
            var cognitoClient = await this.getCognitoClientDescription();

        }catch(e){
            logger.critical("Unable to connect to Cognito: " + e, Date.now() - start);
            throw new Error("Unable to connect to Cognito: " + e);
        }

        // Create list of attributes that can be read from Cognito
        let attrList = {};
        let attrKeys = [];

        // Loop through the readonly attributes
        for(let i=0; i<cognitoClient.UserPoolClient.ReadAttributes.length;i++){
            let attrKeyName = cognitoClient.UserPoolClient.ReadAttributes[i];
            // Remove all non-alphanumeric characters (allow -_.)
            attrKeyName = attrKeyName.replace(/[^a-zA-Z0-9_\-\.]/g, '');
            attrList[attrKeyName] = false;
            attrKeys.push(attrKeyName);
        }

        // Loop through the attributes and set them to true if they exist in the writeattributes list
        for (let key in attrList){
            if(cognitoClient.UserPoolClient.WriteAttributes.includes(key)){
                attrList[key] = true;
            }
        }


        logger.info("Cognito connection successful.", Date.now() - start);

        // Get list of metadata keys
        const users = new raesumUser();
        const metadataKeys = await users.getMetadataKeys(true);
        const metadataKeyList = Object.keys(metadataKeys);

        // Build a list of metadata keys that are NOT cognito attributes
        let nonCognitoMetadataKeys = [];
        for(let i=0; i<metadataKeyList.length;i++){
            if(!attrKeys.includes(metadataKeyList[i])){
                nonCognitoMetadataKeys.push(metadataKeyList[i]);
            }
        }

        // Set all metadata cognito attributes to false where not in the cognito list
        const updatesql = "UPDATE raesum_user_metadata_keys SET cognito_attribute = false, cognito_writable = false WHERE datakey = ANY($1);";

        try{
            const response = await raesumDB.query(updatesql, [nonCognitoMetadataKeys]);
        }catch(e){
            logger.critical("Error updating metadata keys: " + e, Date.now() - start);
            throw new Error("Error updating metadata keys: " + e);
        }


        // Start a transaction to add/update all congito-controlled user metadata keys
        let sql = "BEGIN TRANSACTION;\n"

        // Loop through the attribute list
        for(let i in attrList) {

            // Is the attribute in the metadata keys?
            if(metadataKeyList.includes(i)){
                // If yes, update they cognito attribute and writable status accordingly
                // Create update SQL command
                sql += "UPDATE raesum_user_metadata_keys SET cognito_attribute = true , cognito_writable = " + attrList[i] + " WHERE datakey = '" + i + "';\n";


            }else{
                // If no, insert the key into the metadata keys and set the cognito attribute and writable status accordingly

                // Create insert SQL command
                sql += "INSERT INTO raesum_user_metadata_keys (datakey, cognito_attribute, cognito_writable, active_status) VALUES ('" + i + "', true, " + attrList[i] + ", true);\n";
            }
        }

        // Finish transaction
        sql += "COMMIT TRANSACTION;"

        try{
            // Run transaction
            await raesumDB.query(sql);
        }catch (e){
            logger.critical("Error updating metadata keys: " + e, Date.now() - start);
            throw new Error("Error updating metadata keys: " + e);
        }

        logger.info("Cognito connection successful and user metadata keys updated", Date.now() - start);
        return true;

    }

}

const singleInstance = new raesumCognito();
export default singleInstance;
