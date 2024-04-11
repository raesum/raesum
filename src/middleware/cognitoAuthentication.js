import CognitoExpress from "cognito-express";
import raesumConfig from "../modules/raesumConfig.js";
import {buildAWSConfig} from "../utils/awsUtils.js";
import raesumResponses from "../modules/raesumResponses.js";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

let cognitoExpress;

const initCognito = async()=>{
    const start = Date.now();
    logger.info("Initializing Cognito Express", Date.now() - start);

    // Create the base aws configuration
    logger.debug("Setting up Cognito - getting base AWS config",Date.now() - start);
    let awsCognitoConfig = await buildAWSConfig();

    // Get cognito settins
    awsCognitoConfig.cognitoUserPoolId = await raesumConfig.get('aws.cognito.userPoolId')
    awsCognitoConfig.tokenExpiration = await raesumConfig.get('aws.cognito.tokenExpiration')
    awsCognitoConfig.tokenUse = 'id'

    try{
        cognitoExpress = new CognitoExpress(awsCognitoConfig);
        logger.info("Cognito Express Initiated", Date.now() - start);

        return true;
    }catch(e){
        logger.critical("Unable to start Cognito Express with error: " + e, Date.now() - start);;
        return false;
    }
}

export const raesumCognitoAuthRequired = async (req, res, next) => {
    const start = Date.now();
    logger.debug(`Checking to see if user has logged in.`, Date.now() - start);

    // Init cognito if it has not yet been initialized
    if(!cognitoExpress){
        await initCognito();
    }

    // Get the authorization header
    let accessTokenFromClient = req.headers.authorization;

    
    if (!accessTokenFromClient){
        
        // get not logged in response and send to user
        let response = await raesumResponses.get("notLoggedIn");

        return res.status(response.code).json(response);
    }


    try{
        await cognitoExpress.validate(accessTokenFromClient);

        res.locals.user = response;

        logger.debug(`User with id: ${response.id} is authenticated`, Date.now() - start);
        next();
    }catch(e){
        // Something has malfunctioned or a user is sending an invalid header
        logger.warning("User has sent an authorization header but has failed validation with error: " + error, Date.now() - start);

        // get not logged with error in response and send to user
        let response = await raesumResponses.get("notLoggedInError",[e]);
        return res.status(response.code).json(response);
    }
}
