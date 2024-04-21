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

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumCognito{

    #cacheObjectType = "cognito";
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

    async getAllowedCallbacks(){
        const start = Date.now();

        const clientDescription = await this.getCognitoClientDescription();

        if(!clientDescription || !clientDescription.UserPoolClient || !clientDescription.UserPoolClient.CallbackURLs){
            logger.error("Unable to get Cognito Client Description", Date.now() - start);
            return false;
        }else{
            return clientDescription.UserPoolClient.CallbackURLs;
        }
    }
}

const singleInstance = new raesumCognito();
export default singleInstance;
