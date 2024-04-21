import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumCognito from "../modules/raesumCognito.js";
import raesumConfig from "../modules/raesumConfig.js";
import raesumServer from "../modules/raesumServer.js";

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

        // Convert to uppercase to make comparisions case insensitive
        for(let i=0; i<allowedCallbacks.length;i++){
            allowedCallbacksUpper.push(allowedCallbacks[i].toUpperCase());
        }

        // If the requested redirect is NOT allowed set the redirect to the login success API url or if redirect_uri is missing from the req.params
        if (!allowedCallbacksUpper.includes(req.query.redirect_uri.toUpperCase()) || !req.query.redirect_uri) {

            // If the server's url is in the allowed redirects, default to it
            let raesumServerURL = await raesumServer.buildBaseServerURL();
            raesumServerURL += "/auth/loggedIn";

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
    }

    async loginSuccess(req, res, next) {
    }

}


const singleInstance = new raesumUserController();
export default singleInstance;
