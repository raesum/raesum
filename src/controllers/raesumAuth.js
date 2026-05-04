import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumCognito from "../modules/raesumCognito.js";
import raesumConfig from "../modules/raesumConfig.js";
import raesumServer from "../modules/raesumServer.js";
import raesumResponses from "../modules/raesumResponses.js";
import raesumAudit from "../models/raesumAudit.js";
import raesumUser from "../models/raesumUser.js";
import raesumAuthorization from "../models/raesumAuthorization.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumAuthController {
    
    /*
    * The login function uses the cognito-hosted interface and will redirect the user to cognito's login page.
     */
    async login(req, res, next) {

        const start = Date.now();

        // If the user is already logged in, redirect to the login success page

        // Get the login URL from Cognito
        let loginURL = await raesumCognito.buildBaseLoginURL();
        const clientID = await raesumConfig.get('aws.cognito.cognitoClientId')
        
        // Request admin scope for user management capabilities
        const scope = "openid+profile+email+aws.cognito.signin.user.admin";
        loginURL += "/login?client_id=" + clientID + "&response_type=code&scope=" + scope


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
            // Note this is validated by loggedIn function and the ONLY place it will actually be used
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
            
            // Is session logins enabled?
            const sessionLoginsEnabled = loginMethods.useSessionCookie == true;
            
            if (sessionLoginsEnabled) {
                raesumServerURL += "/api/v1/auth/callbackSession";
            } else {
                raesumServerURL += "/";
            }

            logger.debug(`raesumServerURL URI for: ${raesumServerURL} with allowed redirects ${allowedCallbacks.join(", ")}`, Date.now() - start);

            if (allowedCallbacksUpper.includes(raesumServerURL.toUpperCase())) {
                logger.warning("Login Redirect URI not found or not allowed. Redirecting to server URL", Date.now() - start);
                loginURL += "&redirect_uri=" + encodeURIComponent(raesumServerURL);
            } else {
                // else use the first allowed redirect from allowedCallbacks
                logger.warning("Login Redirect URI not allowed. Redirecting to the first allowed callback", Date.now() - start);
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

        try {
        // Get allowed login types
        const loginMethods = await raesumConfig.get('login');

            // Get access token from header or session
        let accessTokenFromClient = null;
            let refreshTokenFromClient = null;
            let userId = null;

            if(loginMethods.jwt == true && !req.headers.authorization && !req.session.jwt){
                logger.warning("Unable to logout - JWT not found in header or session",Date.now()-start);
            const message = await raesumResponses.get("missingHeader",["Authorization"]);
            return res.status(message.code).json(message);
            }

            // Get JWT from header (Authorization: Bearer token)
            if(req.headers.authorization){
                accessTokenFromClient = req.headers.authorization.replace('Bearer ', '');
            } else if(req.session.jwt){
            accessTokenFromClient = req.session.jwt;
                refreshTokenFromClient = req.session.refreshToken;
                userId = req.session.userID;
            }

            if(!accessTokenFromClient){
                logger.error("Unable to logout - JWT not found in session or header but was expected",Date.now()-start);
            const response = await raesumResponses.get("notLoggedIn");
            return res.status(response.httpResponse).json(response);
        }

        // Calculate remaining time on JWT
            const tokenExpiration = raesumCognito.getTokenExpiration(accessTokenFromClient);
            const currentTime = Date.now();
            const remainingTime = Math.max(0, tokenExpiration - currentTime);

            // Check if token revocation is enabled in cognito configuration
            const enableTokenRevocation = await raesumConfig.get('aws.cognito.enableTokenRevocation') || true;

            // Revoke the token via cognito if enabled
            if(enableTokenRevocation){
                try {
                    // Perform global sign out to invalidate all tokens
                    await raesumCognito.globalSignOut(accessTokenFromClient);


                    logger.info("Successfully revoked tokens in Cognito for userId"+userId, Date.now() - start);
                } catch (revokeError) {
                    logger.warning(`Failed to revoke token in Cognito for userID ${userId}: ${revokeError.message}`, Date.now() - start);
                    // Continue with logout even if Cognito revocation fails
                }
            }


            // Add audit log entry before destroying session
            if(userId){
                await raesumAudit.create("log_out", "raesum_user", userId, userId);
            }

        // Delete the session
            try {
                req.session.destroy((err) => {
                    if(err){
                        logger.error(`Failed to destroy session for userID ${userId}: ${err.message}`, Date.now() - start);
                    } else {
                        logger.info("Successfully destroyed session for userID "+userId, Date.now() - start);
                    }
                });
            } catch (sessionError) {
                logger.warning(`Session destruction error for userID ${userId}: ${sessionError.message}`, Date.now() - start);
                // Continue even if session destruction fails
            }

            // Get the logout success message
            const message = await raesumResponses.get("loggedOut");

            // Return success message
            return res.status(message.code).json({
                success: true,
                message: message.message,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error(`Logout process failed: ${error.message}`, Date.now() - start);
            
            // Return error message
            const message = await raesumResponses.get("internalServerError");
            return res.status(message.code).json({
                success: false,
                message: message.message,
                error: error.message
            });
        }
    }




    async callbackSession(req, res, next) {

        const start = Date.now();
        logger.verbose("Session login callback received, starting processing", Date.now() - start);
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
            logger.verbose("Session based logins not allowed", Date.now() - start);
             // Get the error message login type not allowed
            const message = await raesumResponses.get("loginTypeNotAllowed");

             // Return the error message
             return res.status(message.code).json(message);
         }

        // Check the session to see if the user has already logged in via JWT
        if(req.session.loginType == "jwt"){
            // If the user logged in via JWT display response that the already have started a JWT session
            logger.verbose("JWT Login type is being used. Ignoring session login.", Date.now() - start);

            const response = await raesumResponses.get("alreadyLoggedInDifferentType");

            return res.status(message.code).json(message);
        }



        // If user is not already logged in
        let user = null;
        let tokenResponse = null;
        let tokenPayload = null;

        if(req.session.loggedIn == false || !req.session.userID) {

            logger.info("User is not logged in, processing JWT and creating session");

                // Process the supplied code into JWT
                const jwtResult = await raesumCognito.processJWT(req);
                tokenResponse = jwtResult.tokenResponse;
                tokenPayload = jwtResult.tokenPayload;
                user = jwtResult.user;

                if(jwtResult.success !== true) {                    
                    // Get user not logged in message
                    const message = await raesumResponses.get(jwtResult.responseMessageKey);
                    
                    // Return message
                    return res.status(message.code).json(message);
                }


                // Save them in the session
                req.session.jwt = tokenResponse.access_token;
                req.session.idToken = tokenResponse.id_token;
                req.session.refreshToken = tokenResponse.refresh_token;
                req.session.userID = parseInt(user.id);
                // Set req.session.cognitoUserID to the cognitoUserID
                req.session.cognitoUserID = tokenPayload.sub;

                // Set the flag that user is logged in via cookie
                req.session.loginType = "sessionCookie";
                req.session.loggedIn = true;

                // Update user metadata from Cognito
                try{
                    await raesumUser.syncUserFromCognitoToRaesum(tokenPayload.sub);
                } catch (error) {
                    logger.warning(`Failed to sync user from Cognito to Raesum: ${error.message}`, Date.now() - start);
                }

                logger.info(`User ${tokenPayload.sub} successfully logged in via session cookie`, Date.now() - start);


        }else{
            logger.info("User is already logged in via session cookie", Date.now() - start);
        }
        
        user = await raesumUser.getUserById(parseInt(req.session.userID));


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
                    }else{
                        post_login_url = raesumURL += "/";
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
        await raesumAudit.create("log_in", "raesum_user", user.id, user.id);


        // Redirect to post_login_url
        return res.redirect(301,post_login_url);

    }

    async callbackJWT(req,res,next){
        const start = Date.now();

        // If code is not supplied return error
        if(!req.query.code){
            // Get the error message
            const message = await raesumResponses.get("requestMissingFields",['code']);
            // Return the error message
            return res.status(message.code).json(message);
        }

        // Get the allowed login types
        const loginMethods = await raesumConfig.get('login');

        // If JWT is not allowed return logintypenotallowed
        if(loginMethods.useJWT == false){
            // Get the error message
            const message = await raesumResponses.get("loginTypeNotAllowed");

            // Return the error message
            return res.status(message.code).json(message);
        }

        // If the user is already logged in via session cookie, return error
        if(req.session.loginType == "sessionCookie"){
            // If the user logged in via JWT display response that the already have started a JWT session
            const response = await raesumResponses.get("alreadyLoggedInDifferentType");

            return res.status(message.code).json(message);
        }
        try {
        // Attempt to exchange the code for valid JWT tokens
            const jwtResult = await raesumCognito.processJWT(req);

            const tokenResponse = jwtResult.tokenResponse;
            const user = jwtResult.user;

            if(!jwtResult.success) {
                    logger.error(`Token exchange failed: ${tokenError.message}`, Date.now() - start);
                    
                    // Get user not logged in message
                    const message = await raesumResponses.get(jwtResult.responseMessageKey);
                    
                    // Return message
                    return res.status(message.code).json(message);
                }

            // // Set req.session.cognitoUserID to the cognitoUserID
            // req.session.cognitoUserID = cognitoUserId;

            // // Set the flag that user is logged in via JWT
            req.session.loginType = "jwt";
            req.session.loggedIn = true;


            // Build the response object
            const response = {
                success: true,
                data: {
                    access_token: tokenResponse.access_token,
                    id_token: tokenResponse.id_token,
                    refresh_token: tokenResponse.refresh_token,
                    expires_in: tokenResponse.expires_in,
                    token_type: tokenResponse.token_type,
                }
            };

                            // Update user metadata from Cognito
            try{
                    await raesumUser.syncUserFromCognitoToRaesum(tokenPayload.sub);
            } catch (error) {
                    logger.warning(`Failed to sync user from Cognito to Raesum: ${error.message}`, Date.now() - start);
            }

            // Add audit log entry
            await raesumAudit.create("log_in", "raesum_user", user.id, user.id);
            const message = await raesumResponses.get("loggedIn",[user.id]);
            logger.info(`User ${user.id} successfully logged in via JWT`, Date.now() - start);

            // Return the response object
            return res.status(message.code).json(response);

        } catch (e) {
            logger.error(`Token exchange failed: ${e.message}`, Date.now() - start);
            
            // Get login error message
            const message = await raesumResponses.get("invalidCredentials");
            
            // Return the response object
            return res.status(message.code).json(message);
        }

    }


    async getAvailableRoles(req,res,next){
        const start = Date.now();
        logger.info("Controller Getting available roles", Date.now() - start);

        let orgId = null;

        // If no organization ID is requested use the current_organization_id
        if (!req.params.organizationId) {
            orgId = req.user.current_organization_id;
        }else{
            // Validate the organization ID is a number
            if (isNaN(req.params.organizationId) || req.params.organizationId < 1 || !Number.isInteger(parseInt(req.params.organizationId))) {
                const message = await raesumResponses.get("requestInvalidFields",['organizationId']);
                return res.status(message.code).json(message);
            }
            orgId = parseInt(req.params.organizationId);
        }

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id, 
                'raesum_auth_role', 
                'read', 
                req.user.current_organization_id, 
                orgId
            );
        
        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get("notAuthorized",["read","raesum_auth_role"]);
            return res.status(message.code).json(message);
        }

        try{
            // Get the available roles for the organization
            const roles = await raesumAuthorization.getRolesForOrg(orgId, true);
            
            // Return the roles
            logger.info(`Available roles for organization ${orgId} retrieved`, Date.now() - start);

            // Add audit log entry 
            await raesumAudit.create("read", "raesum_auth_role", orgId, req.user.id); 
            const message = await raesumResponses.get("success");
            message.data = roles;
            return res.status(message.code).json(message);

        }catch(e){
            logger.error(`Error getting available roles for organization ${orgId}: ${e.message}`, Date.now()-start);
            const message = await raesumResponses.get("internalServerError");
            return res.status(message.code).json(message);
        }
    }


    async getUserRoles(req,res,next){
        const start = Date.now();
        logger.info("Controller Getting user roles", Date.now() - start);

        let userId = null;
        let orgId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId ) {
            userId = req.user.id;
        }else{
            // Validate the user ID is a number
            if (isNaN(req.params.userId) || req.params.userId < 1 || !Number.isInteger(parseInt(req.params.userId))) {
                const message = await raesumResponses.get("requestInvalidFields",['userId']);
                return res.status(message.code).json(message);
            }
            userId = parseInt(req.params.userId);
        }

        // If no organization ID is requested use the current_organization_id
        if (!req.params.organizationId) {
            orgId = req.user.current_organization_id;
        }else{
            // Validate the organization ID is a number
            if (isNaN(req.params.organizationId) || req.params.organizationId < 1 || !Number.isInteger(parseInt(req.params.organizationId))) {
                const message = await raesumResponses.get("requestInvalidFields",['organizationId']);
                return res.status(message.code).json(message);
            }
            orgId = parseInt(req.params.organizationId);
        }

            // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id, 
                'raesum_user', 
                'read', 
                req.user.current_organization_id, 
                userId
            );
        
        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get("notAuthorized",["read","raesum_user"]);
            return res.status(message.code).json(message);
        }

        try{
            // Get the user's roles
            const user = await raesumAuthorization.getUserRoles(userId);
            
            // Return the user
            logger.info(`User ${userId} retrieved`, Date.now() - start);

            // Add audit log entry 
            await raesumAudit.create("read", "raesum_user", userId, req.user.id); 
            const message = await raesumResponses.get("success");
            message.data = user;
            return res.status(message.code).json(message);

        }catch(e){
            logger.error(`Error getting user ${userId}: ${e.message}`, Date.now()-start);
            const message = await raesumResponses.get("internalServerError");
            return res.status(message.code).json(message);
        }
    }

    async addUserRoles(req,res,next){
        const start = Date.now();
        logger.info("Controller Adding user roles", Date.now() - start);

        let userId = null;
        let orgId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId ) {
            userId = req.user.id;
        }else{
            // Validate the user ID is a number
            if (isNaN(req.params.userId) || req.params.userId < 1 || !Number.isInteger(parseInt(req.params.userId))) {
                const message = await raesumResponses.get("requestInvalidFields",['userId']);
                return res.status(message.code).json(message);
            }
            userId = parseInt(req.params.userId);
        }

        // If no organization ID is requested use the current_organization_id
        if (!req.params.organizationId) {
            orgId = req.user.current_organization_id;
        }else{
            // Validate the organization ID is a number
            if (isNaN(req.params.organizationId) || req.params.organizationId < 1 || !Number.isInteger(parseInt(req.params.organizationId))) {
                const message = await raesumResponses.get("requestInvalidFields",['organizationId']);
                return res.status(message.code).json(message);
            }
            orgId = parseInt(req.params.organizationId);
        }

        // Validate that roles array is provided in the request body
        if (!req.body.values || !Array.isArray(req.body.values)) {
            const message = await raesumResponses.get("requestMissingFields",['values']);
            return res.status(message.code).json(message);
        }

        // Validate each role ID in the array
        const roles = req.body.values;


        // Use raesum authorization to check to see if this user may manage roles for the target user
        let isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id, 
                'raesum_role', 
                'update', 
                orgId, 
                userId
            );
        
        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get("notAuthorized",["update","raesum_user"]);
            return res.status(message.code).json(message);
        }

        // Get a list of valid roleIDs
        try{
            const validRoleIds = await raesumAuthorization.getRolesForOrg(orgId, true);
            const validRoles = await raesumAuthorization.getRolesByIDs(validRoleIds, true);

             // Divide the requested roles into numbers and strings
             const roleIds = [];
             const roleKeys = [];

            for (const role of roles) {
                const candidateRoleID = parseInt(role);
                if (isNaN(candidateRoleID) || candidateRoleID < 1 || !Number.isInteger(candidateRoleID)) {
                    // If the string is a valid role key name add it to the role keys, otherwise, send an error to the user
                    if (validRoles.some(r => r.key === candidateRoleID)) {
                        roleKeys.push(parseInt(candidateRoleID));
                    } else {
                        const message = await raesumResponses.get("requestInvalidFields",['values']);
                        return res.status(message.code).json(message);
                    }
                } else {
                    // If the ID is a valid role id in validRoles then add it to roleIds, otherwise send an error to the user
                    if (validRoles.some(r => r.id === parseInt(role))) {
                        roleIds.push(parseInt(role));
                    } else {
                        const message = await raesumResponses.get("requestInvalidFields",['values']);
                        return res.status(message.code).json(message);
                    }
                }
            }


        } catch (error) {
            logger.error(`Error getting valid roles: ${error.message}`, Date.now() - start);
            const message = await raesumResponses.get("internalServerError");
            return res.status(message.code).json(message);
        }


        try{
            // Add each role by ID to the user
            const addedRoles = [];
            for (const roleId of roleIds) {
                await raesumAuthorization.addUserToRole(userId, parseInt(roleId), orgId);
                addedRoles.push(parseInt(roleId));
            }

            // Add each role by key to the user
            for (const roleKey of roleKeys) {
                await raesumAuthorization.addUserToRole(userId, roleKey, orgId);
                addedRoles.push(roleKey);
            }
            
            // Return success
            logger.info(`Roles ${addedRoles.join(', ')} added to user ${userId}`, Date.now() - start);

            // Add audit log entry 
            await raesumAudit.create("update", "raesum_role", userId, req.user.id); 
            const message = await raesumResponses.get("success");
            message.data = { addedRoles: addedRoles };
            return res.status(message.code).json(message);

        }catch(e){
            logger.error(`Error adding roles to user ${userId}: ${e.message}`, Date.now()-start);
            const message = await raesumResponses.get("internalServerError");
            return res.status(message.code).json(message);
        }
    }

    async deleteUserRoles(req,res,next){
        const start = Date.now();
        logger.info("Controller Deleting user roles", Date.now() - start);

        let userId = null;
        let orgId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId ) {
            userId = req.user.id;
        }else{
            // Validate the user ID is a number
            if (isNaN(req.params.userId) || req.params.userId < 1 || !Number.isInteger(parseInt(req.params.userId))) {
                const message = await raesumResponses.get("requestInvalidFields",['userId']);
                return res.status(message.code).json(message);
            }
            userId = parseInt(req.params.userId);
        }

        // If no organization ID is requested use the current_organization_id
        if (!req.params.organizationId) {
            orgId = req.user.current_organization_id;
        }else{
            // Validate the organization ID is a number
            if (isNaN(req.params.organizationId) || req.params.organizationId < 1 || !Number.isInteger(parseInt(req.params.organizationId))) {
                const message = await raesumResponses.get("requestInvalidFields",['organizationId']);
                return res.status(message.code).json(message);
            }
            orgId = parseInt(req.params.organizationId);
        }

        // Validate that roles array is provided in the request body
        if (!req.body.values || !Array.isArray(req.body.values)) {
            const message = await raesumResponses.get("requestMissingFields",['values']);
            return res.status(message.code).json(message);
        }


        // Use raesum authorization to check to see if this user may manage roles for the target user
        let isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id, 
                'raesum_role', 
                'delete', 
                orgId, 
                userId
            );
        

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get("notAuthorized",["update","raesum_user"]);
            return res.status(message.code).json(message);
        }

        // Get the user's current roles
        const rolesByID = [];
        try {
            const userRoles = await raesumAuthorization.getUserRoles(userId, orgId);

            // Loop through the values in the body if the role is a valid INT check to see if it's a valid role in userRoles. If it is then add to rolesByID
            for (const role of req.body.values) {
                const candidateRoleID = parseInt(role);
                if (isNaN(candidateRoleID) && typeof candidateRoleID === 'number' && userRoles.some(r => r.id === candidateRoleID)) {
                    rolesByID.push(candidateRoleID);
                }else if (typeof role === 'string' && userRoles.some(r => r.string_key === role)) {
                    rolesByID.push(userRoles.find(r => r.string_key === role).id);
                }else{
                    // Invalid role, pass error to user
                    const message = await raesumResponses.get("requestInvalidFields",['values']);
                    return res.status(message.code).json(message);
                }
            }

        }catch(e){
            logger.error(`Error getting validating the requested roles to delete: ${e.message}`, Date.now() - start);
            const message = await raesumResponses.get("internalServerError");
            return res.status(message.code).json(message);
        }
        
        
        try{
            // Remove each role from the user
            const removedRoles = [];
            for (const roleId of rolesByID) {
                await raesumAuthorization.removeUserFromRole(userId, roleId, orgId);
                removedRoles.push(roleId);
            }
            
            // Return success
            logger.info(`Roles ${removedRoles.join(', ')} removed from user ${userId}`, Date.now() - start);

            // Add audit log entry 
            await raesumAudit.create("delete", "raesum_role", userId, req.user.id); 
            const message = await raesumResponses.get("success");
            message.data = { removedRoles: removedRoles };
            return res.status(message.code).json(message);

        }catch(e){
            logger.error(`Error removing roles from user ${userId}: ${e.message}`, Date.now()-start);
            const message = await raesumResponses.get("internalServerError");
            return res.status(message.code).json(message);
        }
    }

}

const singleInstance = new raesumAuthController();
export default singleInstance;