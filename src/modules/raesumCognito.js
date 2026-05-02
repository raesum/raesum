import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import {buildAWSClientConfig} from "../utils/awsUtils.js";
import raesumConfig from "../modules/raesumConfig.js";
import {
        CognitoIdentityProviderClient,
        DescribeUserPoolCommand,
        DescribeUserPoolClientCommand,
        InitiateAuthCommand,
        AdminInitiateAuthCommand,
        RespondToAuthChallengeCommand,
        RevokeTokenCommand,
        GlobalSignOutCommand,
        AdminSetUserSettingsCommand,
        AdminDisableUserCommand,
        AdminEnableUserCommand,
        AdminCreateUserCommand,
        AdminGetUserCommand,
        AdminUpdateUserAttributesCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoIdentityClient, GetIdCommand } from "@aws-sdk/client-cognito-identity";
import raesumCache from "./raesumCache.js";
import raesumUser from "../models/raesumUser.js";
import raesumDB from "./raesumDB.js";
import jwt from 'jsonwebtoken';
import { CognitoJwtVerifier } from "aws-jwt-verify";
import raesumServer from "../modules/raesumServer.js";
import raesumAudit from "../models/raesumAudit.js";


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
     * Check the cognito connection and update any user metadata keys. (Does NOT sync the individual values of the user metadata)
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
        const metadataKeys = await raesumUser.getMetadataKeys(true);


        // Build a list of metadata keys that are NOT cognito attributes
        let nonCognitoMetadataKeys = [];

        for(let i=0; i<metadataKeys.length;i++){
            if(!attrKeys.includes(metadataKeys[i])){
                nonCognitoMetadataKeys.push(metadataKeys[i]);
            }
        }

        // Set all metadata cognito attributes to false where not in the cognito list
        logger.verbose("Updating metadata keys in raesum from cognito", Date.now() - start);
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
            if(metadataKeys.includes(i)){
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

    /**
     * Exchanges an authorization code for JWT tokens using OAuth2 flow
     * @param {string} code - The authorization code from Cognito
     * @param {string} redirectUri - The redirect URI used in the original request
     * @return {Object} Token response containing id_token, access_token, refresh_token, expires_in
     * @throws {Error} if unable to exchange code for tokens
     */
    async exchangeCodeForTokens(code, redirectUri) {
        const start = Date.now();

        try {
            // Get required configuration
            const clientId = await raesumConfig.get('aws.cognito.cognitoClientId');
            const region = await raesumConfig.get('aws.region');
            const userPoolId = await raesumConfig.get('aws.cognito.userPoolId');

            // Build the token endpoint URL
            let tokenEndpoint;
            const userPoolDescription = await this.getCognitoUserPoolDescription();
            
            if (userPoolDescription.UserPool.CustomDomain) {
                tokenEndpoint = `https://${userPoolDescription.UserPool.CustomDomain.Domain}/oauth2/token`;
            } else {
                tokenEndpoint = `https://${userPoolDescription.UserPool.Domain}.auth.${region}.amazoncognito.com/oauth2/token`;
            }

            // Prepare the request body
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('client_id', clientId);
            params.append('code', code);
            params.append('redirect_uri', redirectUri);

            // Make the token request
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Token exchange failed: ${response.status} ${errorText}`, Date.now() - start);
                throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
            }

            const tokenData = await response.json();

            logger.info('Successfully exchanged authorization code for JWT tokens', Date.now() - start);

            return {
                id_token: tokenData.id_token,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type
            };

        } catch (error) {
            logger.error(`Error exchanging code for tokens: ${error.message}`, Date.now() - start);
            throw new Error(`Failed to exchange authorization code for tokens: ${error.message}`);
        }
    }

    /**
     * Validates a JWT token and returns the payload
     * @param {string} token - The JWT token to validate
     * @return {Object} The decoded token payload
     * @throws {Error} if token is invalid
     */
    async validateJWTToken(token) {
        const start = Date.now();

        try {
            // Get the user pool and region for the verifier
            const userPoolId = await raesumConfig.get('aws.cognito.userPoolId');
            const clientId = await raesumConfig.get('aws.cognito.cognitoClientId');
            const region = await raesumConfig.get('aws.region');

            logger.debug(`Setting up JWT verifier for user pool: ${userPoolId}`, Date.now() - start);

            // Create the Cognito JWT verifier
            const verifier = CognitoJwtVerifier.create({
                userPoolId: userPoolId,
                tokenUse: 'id',
                clientId: clientId,
                region: region
            });

            logger.debug(`Verifying token: ${token}`, Date.now() - start);

            // Verify the token using aws-jwt-verify
            const payload = await verifier.verify(token);

            logger.info('JWT token validated successfully', Date.now() - start);
            return payload;

        } catch (error) {
            logger.error(`JWT token validation failed: ${error.message}`, Date.now() - start);
            throw new Error(`Invalid JWT token: ${error.message}`);
        }
    }


        /**
     * Utility function that will attempt to exchange code for user data AND will create a user that exists in cognito but not in Raesum's user database
     * @param  {Object} req Uses the request from the express route
     * @return {Object} Returns an object with the following structure {success: boolean, responseMessageKey: string, user: object, jwt: object}
     */
    async processJWT(req){
            const start = Date.now();

        // Attempt to exchange the code for valid JWT tokens
        try {

            // Get the redirect URI from allowed callbacks
            logger.verbose("Is the current server URL allowed in the callbacks", Date.now() - start);

            const allowedCallbacks = await this.getAllowedCallbacks();
            let raesumServerURL = await raesumServer.buildBaseServerURL();
            raesumServerURL += "/api/v1/auth/callbackSession";

            // Confirm that the raesum server is in the allowed callbacks
            if (!allowedCallbacks.includes(raesumServerURL)) {
                logger.error("No allowed callbacks found for token exchange", Date.now() - start);
                return {"success": false, "responseMessageKey": "internalServerError", "user": null, "jwt": null}
            }

             // Exchange the authorization code for JWT tokens
             logger.verbose("Exchanging authorization code for JWT tokens", Date.now() - start);
            const tokenResponse = await this.exchangeCodeForTokens(req.query.code, raesumServerURL);

            // Validate the ID token to get user information
            logger.verbose("Validating ID token to get user information", Date.now() - start);

            const tokenPayload = await this.validateJWTToken(tokenResponse.id_token);

            // Extract Cognito user ID from token
            const cognitoUserId = tokenPayload.sub;
            const email = tokenPayload.email;
            const username = tokenPayload['cognito:username'];

            // Get the user from Raesum DB
            let user = null;
            try{
                logger.verbose("Getting user from Raesum DB", Date.now() - start);
                user = await raesumUser.getUserByExternalID(cognitoUserId); 
            }
            catch(e){
                logger.info(`User ${cognitoUserId} does not exist in Raesum DB`, Date.now() - start);
            }

            // If user is inactive,
            if (user && user.active_status === false) {
                logger.warning(`User ${cognitoUserId} is inactive in Raesum DB`, Date.now() - start);

                // Invoke cognito API and set user to inactive
                // TODO: Implement Cognito user deactivation if needed
                
                // Delete the session
                req.session.destroy();

                // Return error message
                return {"success": false, "responseMessageKey": "invalidUserPool", "user": null, "tokenResponse": null, "tokenPayload": null}
            }

                        // If user doesn't exist in Raesum DB, create them
            if (!user) {
                logger.verbose("User doesn't exist in Raesum DB, starting new user creation", Date.now() - start);
                try {
                    const newUserDefaults = await raesumConfig.get("newUserDefaults");

                    logger.verbose("New User Defaults: " + JSON.stringify(newUserDefaults), Date.now() - start);
                    const newUser = await raesumUser.createUser(cognitoUserId,
                        username,
                        newUserDefaults.currentOrganizationId,
                        newUserDefaults.activeStatus
                    );

                    await raesumAudit.create("create", "raesum_user", newUser, newUser);
                    logger.info(`Created new user in Raesum DB for Cognito user ${newUser}`, Date.now() - start);

                user = await raesumUser.getUserByExternalID(cognitoUserId); 

                } catch (createError) {
                    logger.error(`Failed to create user in Raesum DB: ${createError.message}`, Date.now() - start);
                    return {"success": false, "responseMessageKey": "unableToCreateEditUser", "user": null, "tokenResponse": null, "tokenPayload": null}
                }
            }

            return {"success": true, "responseMessageKey": null, "user": user, "tokenResponse": tokenResponse, "tokenPayload": tokenPayload}
        }catch(error){
            logger.error("Error exchanging code for JWT tokens", Date.now() - start);
            return {"success": false, "responseMessageKey": "internalServerError", "tokenResponse": null, "tokenPayload": null}
        }
    }


    /**
     * Performs global sign out for a user (invalidates all tokens)
     * @param {string} accessToken - The access token
     * @return {boolean} True if successful
     * @throws {Error} if unable to sign out
     */
    async globalSignOut(accessToken) {
        const start = Date.now();

        try {
            // Initialize the cognito client
            logger.verbose("Initializing awsCognito client for global sign out", Date.now() - start);
            const awsCognitoConfig = await buildAWSClientConfig();
            const client = new CognitoIdentityProviderClient(awsCognitoConfig);

            // Build the global sign out command
            const command = new GlobalSignOutCommand({
                AccessToken: accessToken
            });

            // Execute the command
            logger.verbose("Sending client command for global sign out", Date.now() - start);
            await client.send(command);


            // Add JWT to revoked list in cache
            logger.verbose("Adding JWT to internal cached revokelist", Date.now() - start);
            try {
                // Build cache key using the JWT token hash
                const cacheKey = `revokedJWT|${accessToken.substring(0, 50)}`;
                
                // Check if AWS token revocation is enabled
                const enableTokenRevocation = await raesumConfig.get('aws.cognito.enableTokenRevocation') || true;
                let cacheTTL;
                
                if (enableTokenRevocation) {
                    // Use token's remaining time when AWS revocation is enabled
                    cacheTTL = Math.ceil(remainingTime / 1000);
                    logger.verbose(`Using token remaining time for cache TTL: ${cacheTTL} seconds (AWS revocation enabled)`, Date.now() - start);
                } else {
                    // Use 1 year when AWS revocation is disabled
                    cacheTTL = 365 * 24 * 60 * 60; // 1 year in seconds
                    logger.verbose(`Using 1 year cache TTL: ${cacheTTL} seconds (AWS revocation disabled)`, Date.now() - start);
                }
                
                await raesumCache.set(cacheKey, true, cacheTTL, 'revoked_tokens');
                
                logger.info(`Added JWT to revoked list in cache with TTL: ${cacheTTL} seconds`, Date.now() - start);
            } catch (cacheError) {
                logger.warning(`Failed to add JWT to revoked cache: ${cacheError.message}`, Date.now() - start);
                // Continue with logout even if cache fails
            }


            logger.info('Successfully performed global sign out in Cognito', Date.now() - start);
            return true;

        } catch (error) {
            logger.error(`Failed to perform global sign out: ${error.message}`, Date.now() - start);
            throw new Error(`Failed to perform global sign out: ${error.message}`);
        }
    }

    /**
     * Sets the enabled status of a user in Cognito
     * @param {string} username - The Cognito username
     * @param {boolean} enabled - Whether the user should be enabled
     * @return {boolean} True if successful
     * @throws {Error} if unable to update user status
     */
    async setUserEnabledStatus(username, enabled) {
        const start = Date.now();

        try {
            // Initialize the cognito client
            logger.verbose(`Initializing AWS Cognito client to ${enabled ? 'enable' : 'disable'} user: ${username}`, Date.now() - start);
            const awsCognitoConfig = await buildAWSClientConfig();
            const client = new CognitoIdentityProviderClient(awsCognitoConfig);

            const userPoolId = await raesumConfig.get('aws.cognito.userPoolId');

            // Build the appropriate command
            const command = enabled 
                ? new AdminEnableUserCommand({
                    UserPoolId: userPoolId,
                    Username: username
                })
                : new AdminDisableUserCommand({
                    UserPoolId: userPoolId,
                    Username: username
                });

            // Execute the command
            logger.verbose(`Sending command to ${enabled ? 'enable' : 'disable'} Cognito user: ${username}`, Date.now() - start);
            await client.send(command);

            logger.info(`Successfully ${enabled ? 'enabled' : 'disabled'} Cognito user: ${username}`, Date.now() - start);
            return true;

        } catch (error) {
            logger.error(`Failed to ${enabled ? 'enable' : 'disable'} Cognito user ${username}: ${error.message}`, Date.now() - start);
            throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} Cognito user: ${error.message}`);
        }
    }

    /**
     * Creates a new user in Cognito or returns existing user ID if already present
     * @param {string} username - The username for the new user
     * @param {string} email - The email address for the new user
     * @param {string} initialPassword - The initial password for the new user
     * @param {boolean} [suppressMessage=false] - Whether to suppress the welcome message
     * @return {string} The Cognito user ID (sub) of the created or existing user
     * @throws {Error} if unable to create user or get user info
     */
    async createCognitoUser(username, email, initialPassword, suppressMessage = false) {
        const start = Date.now();

        // Validate inputs
        if (typeof username !== 'string' || username.length < 1) {
            throw new Error("Username must be a non-empty string");
        }
        if (typeof email !== 'string' || email.length < 1) {
            throw new Error("Email must be a non-empty string");
        }
        if (typeof initialPassword !== 'string' || initialPassword.length < 1) {
            throw new Error("Initial password must be a non-empty string");
        }

        // Initialize the cognito client
        logger.verbose(`Initializing AWS Cognito client for user: ${username}`, Date.now() - start);
        const awsCognitoConfig = await buildAWSClientConfig();
        const client = new CognitoIdentityProviderClient(awsCognitoConfig);

        const userPoolId = await raesumConfig.get('aws.cognito.userPoolId');

        // First, check if user already exists
        try {
            logger.verbose(`Checking if user ${username} already exists in Cognito`, Date.now() - start);
            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: username
            });

            const existingUserResponse = await client.send(getUserCommand);
            const existingUserId = existingUserResponse.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;

            if (existingUserId) {
                logger.info(`User ${username} already exists in Cognito with ID: ${existingUserId}`, Date.now() - start);
                return existingUserId;
            }
        } catch (getUserError) {
            // If UserNotFoundException, proceed to create the user
            if (getUserError.name === 'UserNotFoundException') {
                logger.verbose(`User ${username} not found in Cognito, proceeding to create`, Date.now() - start);
            } else {
                // Other errors when checking user - log but don't throw, try to create anyway
                logger.info(`Error checking if user ${username} exists: ${getUserError.message}`, Date.now() - start);
            }
        }

        // Create the user
        try {
            const createCommand = new AdminCreateUserCommand({
                UserPoolId: userPoolId,
                Username: username,
                TemporaryPassword: initialPassword,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email
                    },
                    {
                        Name: 'email_verified',
                        Value: 'true'
                    }
                ],
                MessageAction: suppressMessage ? 'SUPPRESS' : undefined,
                DesiredDeliveryMediums: suppressMessage ? undefined : ['EMAIL']
            });

            logger.verbose(`Sending AdminCreateUser command for user: ${username}`, Date.now() - start);
            const response = await client.send(createCommand);

            // Extract the Cognito user ID (sub) from the response
            const cognitoUserId = response.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value;

            if (!cognitoUserId) {
                throw new Error("Cognito user created but no sub attribute found in response");
            }

            logger.info(`Successfully created Cognito user: ${username} with ID: ${cognitoUserId}`, Date.now() - start);
            return cognitoUserId;

        } catch (createError) {
            // If user already exists (race condition), try to get them
            if (createError.name === 'UsernameExistsException') {
                logger.verbose(`User ${username} already exists (race condition), fetching existing user`, Date.now() - start);
                try {
                    const getUserCommand = new AdminGetUserCommand({
                        UserPoolId: userPoolId,
                        Username: username
                    });

                    const existingUserResponse = await client.send(getUserCommand);
                    const existingUserId = existingUserResponse.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;

                    if (existingUserId) {
                        logger.info(`Retrieved existing Cognito user: ${username} with ID: ${existingUserId}`, Date.now() - start);
                        return existingUserId;
                    } else {
                        throw new Error("User exists but no sub attribute found");
                    }
                } catch (finalError) {
                    logger.error(`Failed to retrieve existing user ${username}: ${finalError.message}`, Date.now() - start);
                    throw new Error(`User exists but unable to retrieve: ${finalError.message}`);
                }
            }

            logger.error(`Failed to create Cognito user ${username}: ${createError.message}`, Date.now() - start);
            throw new Error(`Failed to create Cognito user: ${createError.message}`);
        }
    }

    /**
     * Extracts the expiration time from a JWT token
     * @param {string} token - The JWT token
     * @return {number} Expiration timestamp in milliseconds
     */
    getTokenExpiration(token) {
        try {
            const decoded = jwt.decode(token);
            return decoded.exp * 1000; // Convert to milliseconds
        } catch (error) {
            logger.error(`Failed to decode token for expiration: ${error.message}`);
            return Date.now() + 3600000; // Default to 1 hour from now
        }
    }

    /**
     * Gets a user from Cognito by username
     * @param {string} username - The username (or sub/cognitoID) of the user
     * @return {Object} The Cognito user object with UserAttributes array
     * @throws {Error} if user not found or unable to retrieve
     */
    async getCognitoUser(username) {
        const start = Date.now();

        try {
            // Initialize the cognito client
            logger.verbose(`Getting Cognito user: ${username}`, Date.now() - start);
            const awsCognitoConfig = await buildAWSClientConfig();
            const client = new CognitoIdentityProviderClient(awsCognitoConfig);

            const userPoolId = await raesumConfig.get('aws.cognito.userPoolId');

            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: username
            });

            const response = await client.send(getUserCommand);

            logger.info(`Successfully retrieved Cognito user: ${username}`, Date.now() - start);
            return response;

        } catch (error) {
            logger.error(`Failed to get Cognito user ${username}: ${error.message}`, Date.now() - start);
            throw new Error(`Failed to get Cognito user: ${error.message}`);
        }
    }

    /**
     * Updates user attributes in Cognito
     * @param {string} username - The username (or sub/cognitoID) of the user
     * @param {Array} attributes - Array of {Name, Value} objects to update
     * @return {boolean} True if successful
     * @throws {Error} if unable to update attributes
     */
    async updateCognitoUserAttributes(username, attributes) {
        const start = Date.now();

        try {
            // Initialize the cognito client
            logger.verbose(`Updating Cognito user attributes for: ${username}`, Date.now() - start);
            const awsCognitoConfig = await buildAWSClientConfig();
            const client = new CognitoIdentityProviderClient(awsCognitoConfig);

            const userPoolId = await raesumConfig.get('aws.cognito.userPoolId');

            const updateCommand = new AdminUpdateUserAttributesCommand({
                UserPoolId: userPoolId,
                Username: username,
                UserAttributes: attributes
            });

            await client.send(updateCommand);

            logger.info(`Successfully updated ${attributes.length} Cognito user attributes for: ${username}`, Date.now() - start);
            return true;

        } catch (error) {
            logger.error(`Failed to update Cognito user attributes for ${username}: ${error.message}`, Date.now() - start);
            throw new Error(`Failed to update Cognito user attributes: ${error.message}`);
        }
    }

}

const singleInstance = new raesumCognito();
export default singleInstance;
