import CognitoExpress from "cognito-express";
import raesumConfig from "../modules/raesumConfig.js";
import {buildAWSClientConfig} from "../utils/awsUtils.js";
import raesumResponses from "../modules/raesumResponses.js";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumUser from "../models/raesumUser.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);



class raesumAuth {

    cognitoExpress;
    cognitoExpressExpirationTime = Date.now();

    async initCognito(){
        const start = Date.now();
        logger.info("Initializing Cognito Express Auth", Date.now() - start);
    
        // Create the base aws configuration
        logger.debug("Setting up Cognito - getting base AWS config",Date.now() - start);
        let awsCognitoConfig = await buildAWSClientConfig(2);
    
        // Get cognito settins
        awsCognitoConfig.cognitoUserPoolId = await raesumConfig.get('aws.cognito.userPoolId')
        awsCognitoConfig.tokenExpiration = await raesumConfig.get('aws.cognito.tokenExpiration')
        awsCognitoConfig.tokenUse = 'id'
    
        try{
            this.cognitoExpress = new CognitoExpress(awsCognitoConfig);
            this.cognitoExpressExpirationTime = Date.now() + awsCognitoConfig.tokenExpiration;
            logger.info("Cognito Express Initiated", Date.now() - start);
    
            return true;
        }catch(e){
            logger.critical("Unable to start Cognito Express with error: " + e, Date.now() - start);;
            return false;
        }
    }

    async cognitoAuth(req, res, next){
        const start = Date.now();
        logger.debug(`Checking to see if user has logged in.`, Date.now() - start);

        // Get the allowed login types
        const allowedLoginMethods = await raesumConfig.get('login');

        // set the assumed login status
        let loggedIn = false;

        // Initialize the user object
        let user = {};
        let cognitoUserID = null;


        // Check for JWT token
        let accessTokenFromClient = req.headers.authorization;

        // Process the JWT token if it exists and login method is allowed
        if(allowedLoginMethods.jwt == true && accessTokenFromClient){
            
            try{
                const response = await this.cognitoExpress.validate(accessTokenFromClient);

                // Check to see if token is on revoked list
                    // Build the key
                    const key = "revokedJWT:" + accessTokenFromClient;

                    // Request key from cache
                    const cacheResponse = await raesumCache.get(key);
                    if(cacheResponse){
                        // JWT is on revoke list
                            // get token invalid response and send to user
                            const response = await raesumResponses.get("invalidClientToken");
                            return res.status(response.code).json(response);
                    }



                //res.locals.user = response;
                cognitoUserID = response.sub;
        
                logger.debug(`User with id: ${response.id} is authenticated`, Date.now() - start);
                next();
            }catch(e){
                // Something has malfunctioned or a user is sending an invalid header
                logger.warning("User has sent an authorization header but has failed validation with error: " + error, Date.now() - start);
        
                if(e.name === "TokenExpiredError"){
                    // get token expired response and send to user
                    const response = await raesumResponses.get("tokenExpired");
                    return res.status(response.code).json(response);
                }
                if(e.name === "TokenNotFound"){
                    // get token invalid response and send to user
                    const response = await raesumResponses.get("invalidClientToken");
                    return res.status(response.code).json(response);
                }
                if(e.name === "InvalidTokenUse"){
                    // get not authorized response and send to user
                    const response = await raesumResponses.get("invalidClientToken");
                    return res.status(response.code).json(response);
                }
                if(e.name === "InvalidUserPool"){
                    // get not authorized response and send to user
                    const response = await raesumResponses.get("invalidUserPool");
                    return res.status(response.code).json(response);
                } 
        
                // get not logged with error in response and send to user
                let response = await raesumResponses.get("notLoggedInError",[e]);
                return res.status(response.code).json(response);
            }

        }


        // If session cookies are allowed, check to see if user has loggedIn flag on session AND a cognitoUserID
        if(allowedLoginMethods.useSessionCookie == true && req.session.loggedIn && req.session.cognitoUserID){
            cognitoUserID = req.session.cognitoUserID
        }

        if(cognitoUserID){

            // Get the user profile from Raesum

            try{
                const userProfile = await raesumUser.getUserByExternalID(cognitoUserID);
               

                // Check to see if the user is active in Raesum
                if(userProfile.active_status){
                    req.session.loggedIn = true;
                    req.session.cognitoUserID = cognitoUserID;
                    res.locals.user = userProfile;
                }else{
                    // Else, 
                        // delete the session
                        req.session.unset();
                        // Deactivate in AWS

                }


            }catch{
                // If no profile is found, 
                    // Use the externalID to get the user's profile data from AWS
                        // If found in AWS
                            //create user profile
                            // get user profile
                            req.session.loggedIn = true;
                            req.session.cognitoUserID = cognitoUserID;
                            res.locals.user = userProfile;
                        // Else assume it's inactive and delete the session
            }
        }


        if (!loggedIn){
            
            // get not logged in response and send to user
            let response = await raesumResponses.get("notLoggedIn");
    
            return res.status(response.code).json(response);
        }


        next();

    }

    async raesumCognitoJWTAuth (req, res, next) {
        const start = Date.now();
        logger.debug(`Checking to see if user has logged in.`, Date.now() - start);
    
        // Init cognito if it has not yet been initialized
        if(!this.cognitoExpress || this.cognitoExpressExpirationTime < Date.now()){
            await this.initCognito();
        }
    
        // Get the authorization header
        let accessTokenFromClient = req.headers.authorization;
    
        
        if (!accessTokenFromClient){
            
            // get not logged in response and send to user
            let response = await raesumResponses.get("notLoggedIn");
    
            return res.status(response.code).json(response);
        }
    
    
        try{
            const response = await this.cognitoExpress.validate(accessTokenFromClient);
    
            res.locals.user = response;
    
            logger.debug(`User with id: ${response.id} is authenticated`, Date.now() - start);
            next();
        }catch(e){
            // Something has malfunctioned or a user is sending an invalid header
            logger.warning("User has sent an authorization header but has failed validation with error: " + error, Date.now() - start);
    
            if(e.name === "TokenExpiredError"){
                // get token expired response and send to user
                const response = await raesumResponses.get("tokenExpired");
                return res.status(response.code).json(response);
            }
            if(e.name === "TokenNotFound"){
                // get token invalid response and send to user
                const response = await raesumResponses.get("invalidClientToken");
                return res.status(response.code).json(response);
            }
            if(e.name === "InvalidTokenUse"){
                // get not authorized response and send to user
                const response = await raesumResponses.get("invalidClientToken");
                return res.status(response.code).json(response);
            }
            if(e.name === "InvalidUserPool"){
                // get not authorized response and send to user
                const response = await raesumResponses.get("invalidUserPool");
                return res.status(response.code).json(response);
            } 
    
            // get not logged with error in response and send to user
            let response = await raesumResponses.get("notLoggedInError",[e]);
            return res.status(response.code).json(response);
        }
    }

    async raesumCognitoCookieAuth (req, res, next) {
        next();
    }
    
}


const singleInstance = new raesumAuth();
export default singleInstance;




