import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumCognito from "../modules/raesumCognito.js";
import raesumConfig from "../modules/raesumConfig.js";
import raesumServer from "../modules/raesumServer.js";
import raesumResponses from "../modules/raesumResponses.js";
import CognitoExpress from "cognito-express";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

// amazon-cognito-identity-js

class raesumUserController {

    /*
    * The login function uses the cognito-hosted interface and will redirect the user to cognito's login page.
     */
    async login(req, res, next) {

        const start = Date.now();

        // If the user is already logged in, redirect to the login success page

        // Get the login URL from Cognito
        let loginURL = await raesumCognito.buildBaseLoginURL();
        const clientID = await raesumConfig.get('aws.cognito.cognitoClientId')
        loginURL += "/login?client_id=" + clientID + "&response_type=code"


        // Get cognito's allowed redirect URL from the environment
        const allowedCallbacks = await raesumCognito.getAllowedCallbacks();
        let allowedCallbacksUpper = [];

        // Verify that there is at least one allowed callback
        if (allowedCallbacks.length == 0) {
            logger.critical("No allowed callbacks found in environment", Date.now() - start);
            throw new Error("No allowed callbacks found in environment");
        }

        // If session cookie login is enabled and the post_login_uri is supplied, store it in session
        // Get the allowed login methods from raesume config
        const loginMethods = await raesumConfig.get('login');


        if (req.query.post_login_uri && loginMethods.useSessionCookie == true) {
            req.session.post_login_uri = req.query.post_login_uri;
        }

        // Convert to uppercase to make comparisions case insensitive
        for(let i=0; i<allowedCallbacks.length;i++){
            allowedCallbacksUpper.push(allowedCallbacks[i].toUpperCase());
        }

        // If the requested redirect is NOT allowed set the redirect to the login success API url or if redirect_uri is missing from the req.params
        if (!req.query.redirect_uri || !allowedCallbacksUpper.includes(req.query.redirect_uri.toUpperCase())) {

            // If the server's url is in the allowed redirects, default to it
            let raesumServerURL = await raesumServer.buildBaseServerURL();
            raesumServerURL += "/api/v1/auth/loggedIn";

            if (allowedCallbacksUpper.includes(raesumServerURL.toUpperCase())) {
                logger.warning("Redirect URI not allowed. Redirecting to server URL", Date.now() - start);
                loginURL += "&redirect_uri=" + encodeURIComponent(raesumServerURL);
            } else {
                // else use the first allowed redirect from allowedCallbacks
                logger.warning("Redirect URI not allowed. Redirecting to the first allowed callback", Date.now() - start);
                loginURL += "&redirect_uri=" + encodeURIComponent(allowedCallbacks[0]);
            }

        } else {
            // Use the 'official' redirect from the allowed callbacks so that case is matched
            const redirectURL = allowedCallbacks[allowedCallbacksUpper.indexOf(req.query.redirect_uri.toUpperCase())];
            loginURL += "&redirect_uri=" + encodeURIComponent(redirectURL);

        }


        // Redirect to cognito's login page
        res.redirect(301, loginURL);


    }

    async logout(req, res, next) {
        const start = Date.now();

        // Get allowed login types
        const loginMethods = await raesumConfig.get('login');

        // If login type is JWT && JWT not included
        let accessTokenFromClient = null;
        if(loginMethods.jwt == true && !req.headers.authorization){

            logger.warning("Unable to logout JWT not found in header",Date.now()-start);

            // Get the error message
            const message = await raesumResponses.get("missingHeader",["Authorization"]);

            // Return the error message
            return res.status(message.httpResponse).json(message);

        }else if(loginMethods.jwt == true && req.headers.authorization) {

            // Get the JWT from request
            accessTokenFromClient = req.headers.authorization;

        }else if(req.session.jwt){

            // Get JWT from session
            accessTokenFromClient = req.session.jwt;

        }else{

            // Log error that JWT not found in session
            logger.error("Unable to logout JWT not found in session or header but was expected",Date.now()-start);

            // Get the error message
            const response = await raesumResponses.get("notLoggedIn");
            return res.status(response.httpResponse).json(response);
        }




        // Extract the JWT

        // Calculate remaining time on JWT

        // If EnableTokenRevocation on cognito

            // Revoke the token via cognito

        // Add JWT to revoked list in cache
            // Build cache key

            // Calculate the time between now and token expiration

            // Add key to cache with remaining time as TTL


        // Delete the session


        // Get the logout message

        // Return message

    }

    async loggedIn(req, res, next) {

        const start = Date.now();

        // If the code param is not supplied, redirect to the login page
        if (!req.query.code) {
            logger.warning("No code supplied. Redirecting to login", Date.now() - start);
            // Get the message
            return res.redirect(301, "/api/v1/auth/login");
        }

        // Get allowed login types
        const loginMethods = await raesumConfig.get('login');

        // If session cookie logins are not allowed
         if(loginMethods.useSessionCookie == false) {
             // Get the error message login type not allowed
            const message = await raesumResponses.get("loginTypeNotAllowed");

             // Return the error message
             return res.status(message.httpResponse).json(message);
         }

        // Check the session to see if the user has already logged in via JWT
        if(req.session.loginType == "jwt"){
            // If the user logged in via JWT display response that the already have started a JWT session
            const response = await raesumResponses.get("alreadyLoggedInDifferentType");

            return res.status(message.httpResponse).json(message);
        }



        // If user is not already logged in
        if(req.session.loggedIn == false) {

            // Attempt to exchange the code for valid JWT tokens

            // If tokens returned,
                // Get the user from Raesum DB
                // If user is inactive,
                // Invoke cognito API and set user to inactive
                // delete the session and return error message


                // save them in the session

                // Set req.session.cognitoUserID to the cognitoUserID

                // Set the flag that user is logged in via cookie


            // Else get error that user is not logged in

                // Get user not logged in message

                // Return message

        }


        // Set the post_login_url to the default
        let post_login_url = "/";

        // If there is a post_login_uri
        if(req.session.post_login_uri){
            console.verbose("Post Login URI: " + req.session.post_login_uri,Date.now()-start);

            // Is post_login_url an absolute url?
            let isAbsoluteRegex = new RegExp('^(?:[a-z]+:)?//', 'i');
            if(isAbsoluteRegex.test(req.session.post_login_uri)) {

                try{
                    const testURL = new URL(req.session.post_login_uri);

                    // Extract domain from post_login_uri
                    const testDomain = testURL.hostname;

                    // Get list of allowed origins
                    let allowedDomains = await raesumConfig.get('allowedOrigins');

                    // Add raesum domain to allowed origins
                    const raesumURL = await raesumServer.buildBaseServerURL();
                    const raesumDomain = new URL(raesumURL).hostname;

                    allowedDomains.push(raesumDomain);

                    // If extracted domain is in allowed list then set post_login_url
                    if(allowedDomains.includes(testDomain)) {
                        post_login_url = req.session.post_login_uri;
                    }
                }catch(e){
                    logger.error("Error parsing post_login_uri it seemed to be a full uri but failed to parse.",Date.now()-start);
                }

            }else{
                // Path is relative
                post_login_url = req.session.post_login_uri
            }
        }

        // Delete post_login_url from session
        delete req.session.post_login_uri;

        // Add audit log entry


        // Redirect to post_login_url
        return res.redirect(301,post_login_url);


    }


    async getJWT(req,res,next){
        const start = Date.now();

        // If code is not supplied return error
        if(!req.query.code){
            // Get the error message
            const message = await raesumResponses.get("misrequestMissingFieldssingCode",['code']);

            // Return the error message
            return res.status(message.httpResponse).json(message);
        }

        // Get the allowed login types
        const loginMethods = await raesumConfig.get('login');

        // If JWT is not allowed return logintypenotallowed
        if(loginMethods.useJWT == false){
            // Get the error message
            const message = await raesumResponses.get("loginTypeNotAllowed");

            // Return the error message
            return res.status(message.httpResponse).json(message);
        }

        // If the user is already logged in via session cookie, return error
        if(req.session.loginType == "sessionCookie"){
            // If the user logged in via JWT display response that the already have started a JWT session
            const response = await raesumResponses.get("alreadyLoggedInDifferentType");

            return res.status(message.httpResponse).json(message);
        }

        // Attempt to exchange the code for valid JWT tokens

        // If tokens returned,
            // Get the user from Raesum DB
                // If user is inactive,
                // Invoke cognito API and set user to inactive
                // delete the session and return error message

            // Set req.session.cognitoUserID to the cognitoUserID

            // Set the flag that user is logged in via JWT

            // Build the response object
            // Get the success message

            // Add JWT to the response object

            // Add audit log entry

            // Return the response object

        // Else get login error message

            // Return the response object

    }




}


const singleInstance = new raesumUserController();
export default singleInstance;
