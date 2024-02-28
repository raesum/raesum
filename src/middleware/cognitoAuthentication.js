import CognitoExpress from "cognito-express";
import raesumConfig from "../modules/raesumConfig.js";
import {buildAWSConfig} from "../utils/awsUtils.js";
import raesumResponses from "../modules/raesumResponses.js";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

let cognitoExpress;

const initCognito = async()=>{
    const start = new Date.now();

    // Create the base aws configuration
    logger.verbose("Setting up Cognito - getting base AWS config",Date.now() - start);
    let awsCognitoConfig = await buildAWSConfig();

    // Get cognito settins
    awsCognitoConfig.cognitoUserPoolId = await raesumConfig.get('cognito.cognito.userPoolId')
    awsCognitoConfig.tokenExpiration = await raesumConfig.get('cognito.cognito.tokenExpiration')
    awsCognitoConfig.tokenUse = 'id'

    try{
        logger.info("Initializing Cognito Express")
        cognitoExpress = new CognitoExpress(awsCognitoConfig);
        return true;
    }catch(e){
        logger.critical("Unable to start Cognito Express with error: " + e);
        return false;
    }
}

export const raesumCognitoAuthRequired = async (req, res, next) => {
    const start = Date.now();
    logger.verbose(`Checking to see if user has logged in.`, Date.now() - start);

    // Init cognito if it has not yet been initialized
    if(!cognitoExpress){
        await initCognito();
    }

    // Get the authorization header
    let accessTokenFromClient = req.headers.authorization;
    if (!accessTokenFromClient){
        // get not logged in response and send to user
        let response = raesumResponses.get("notLoggedIn")
        return res.status(successMessage.httpCode).json(response);
    }

    cognitoExpress.validate(accessTokenFromClient, function (err, response) {
        if (err) {
            // Something has malfunctioned or a user is sending an invalid header
            logger.warning("User has sent an authorization header but has failed validation with error: " + error, Date.now() - start);

            // get not logged with error in response and send to user
            let response = raesumResponses.get("notLoggedInError",[err]);
            return res.status(successMessage.httpCode).json(response);
        };

        res.locals.user = response;

        logger.verbose(`User with id: ${response.id} is authenticated`, Date.now() - start);
        next();
    });
}
