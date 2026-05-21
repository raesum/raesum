import CognitoExpress from 'cognito-express';
import raesumConfig from '../modules/raesumConfig.js';
import { buildAWSClientConfig } from '../utils/awsUtils.js';
import raesumResponses from '../modules/raesumResponses.js';
import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumUser from '../models/raesumUser.js';
import raesumCache from '../modules/raesumCache.js';
import raesumCognito from '../modules/raesumCognito.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumAuth {
    cognitoExpress;
    cognitoExpressExpirationTime = Date.now();

    async initCognito() {
        const start = Date.now();
        logger.info('Initializing Cognito Express Auth', Date.now() - start);

        // Create the base aws configuration
        logger.debug(
            'Setting up Cognito - getting base AWS config',
            Date.now() - start
        );
        let awsCognitoConfig = await buildAWSClientConfig(2);

        // Get cognito settins
        awsCognitoConfig.cognitoUserPoolId = await raesumConfig.get(
            'aws.cognito.userPoolId'
        );
        awsCognitoConfig.tokenExpiration = await raesumConfig.get(
            'aws.cognito.tokenExpiration'
        );
        awsCognitoConfig.tokenUse = 'id';

        try {
            this.cognitoExpress = new CognitoExpress(awsCognitoConfig);
            this.cognitoExpressExpirationTime =
                Date.now() + awsCognitoConfig.tokenExpiration;
            logger.info('Cognito Express Initiated', Date.now() - start);

            return true;
        } catch (e) {
            logger.critical(
                'Unable to start Cognito Express with error: ' + e,
                Date.now() - start
            );
            return false;
        }
    }

    async cognitoAuth(req, res, next) {
        const start = Date.now();
        logger.debug(
            `Checking to see if user has logged in.`,
            Date.now() - start
        );

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
        if (allowedLoginMethods.jwt == true && accessTokenFromClient) {
            logger.verbose(
                'JWT Login Enabled and authorization header set',
                Date.now() - start
            );
            try {
                const response = await this.cognitoExpress.validate(
                    accessTokenFromClient
                );

                // Check to see if token is on revoked list
                // Build the key
                const key = 'revokedJWT|' + accessTokenFromClient;

                // Request key from cache
                const cacheResponse = await raesumCache.get(key);
                if (cacheResponse) {
                    // JWT is on revoke list
                    // get token invalid response and send to user
                    const response =
                        await raesumResponses.get('invalidClientToken');
                    return res.status(response.code).json(response);
                }

                //res.locals.user = response;
                cognitoUserID = response.sub;

                logger.debug(
                    `User with id: ${response.id} is authenticated`,
                    Date.now() - start
                );
                next();
            } catch (e) {
                // Something has malfunctioned or a user is sending an invalid header
                logger.warning(
                    'User has sent an authorization header but has failed validation with error: ' +
                        e,
                    Date.now() - start
                );

                if (e.name === 'TokenExpiredError') {
                    // get token expired response and send to user
                    const response = await raesumResponses.get('tokenExpired');
                    return res.status(response.code).json(response);
                }
                if (e.name === 'TokenNotFound') {
                    // get token invalid response and send to user
                    const response =
                        await raesumResponses.get('invalidClientToken');
                    return res.status(response.code).json(response);
                }
                if (e.name === 'InvalidTokenUse') {
                    // get not authorized response and send to user
                    const response =
                        await raesumResponses.get('invalidClientToken');
                    return res.status(response.code).json(response);
                }
                if (e.name === 'InvalidUserPool') {
                    // get not authorized response and send to user
                    const response =
                        await raesumResponses.get('invalidUserPool');
                    return res.status(response.code).json(response);
                }

                // get not logged with error in response and send to user
                let response = await raesumResponses.get('notLoggedIn');

                return res.status(response.code).json(response);
            }
        }

        // If session cookies are allowed, check to see if user has loggedIn flag on session AND a cognitoUserID
        if (
            allowedLoginMethods.useSessionCookie == true &&
            req.session.loggedIn &&
            req.session.cognitoUserID
        ) {
            cognitoUserID = req.session.cognitoUserID;
            logger.verbose(
                `Sessions Login Enabled and CognitoUserID found: ${cognitoUserID}`,
                Date.now() - start
            );
        }

        if (cognitoUserID) {
            // Get the user profile from Raesum

            try {
                logger.verbose(
                    `Authentication Middleware - Checking Raesum User Profile for CognitoUserID: ${cognitoUserID}`,
                    Date.now() - start
                );

                const userProfile =
                    await raesumUser.getUserByExternalID(cognitoUserID);

                // Check to see if the user is active in Raesum
                if (userProfile.active_status) {
                    req.session.loggedIn = true;
                    req.session.cognitoUserID = cognitoUserID;
                    res.locals.user = userProfile;
                    req.user = userProfile;
                } else {
                    // Else,
                    // delete the session
                    req.session.unset();
                    // Deactivate in AWS
                }
            } catch {
                // If no profile is found,
                // The profile should have been created on the login process. This means something very wrong has occured. Force a logout.
                logger.error(
                    `Authentication Middleware - No Raesum User Profile found for CognitoUserID: ${cognitoUserID}. Forcing logout.`,
                    Date.now() - start
                );

                // If JWT, revoke it
                // Get allowed login types
                const loginMethods = await raesumConfig.get('login');

                // Get access token from header or session
                let refreshTokenFromClient = null;

                if (
                    loginMethods.jwt == true &&
                    !req.headers.authorization &&
                    !req.session.jwt
                ) {
                    logger.warning(
                        'Unable to logout - JWT not found in header or session',
                        Date.now() - start
                    );
                    const message = await raesumResponses.get('missingHeader', [
                        'Authorization',
                    ]);
                    return res.status(message.code).json(message);
                }

                // Get JWT from header (Authorization: Bearer token)

                refreshTokenFromClient = req.session.refreshToken;

                if (!accessTokenFromClient) {
                    logger.error(
                        'Unable to logout - JWT not found in session or header but was expected',
                        Date.now() - start
                    );
                    const response = await raesumResponses.get('notLoggedIn');
                    return res.status(response.httpResponse).json(response);
                }

                // Calculate remaining time on JWT
                const tokenExpiration = raesumCognito.getTokenExpiration(
                    accessTokenFromClient
                );
                const currentTime = Date.now();
                const remainingTime = Math.max(
                    0,
                    tokenExpiration - currentTime
                );

                // Check if token revocation is enabled in cognito configuration
                const enableTokenRevocation =
                    (await raesumConfig.get(
                        'aws.cognito.enableTokenRevocation'
                    )) || true;

                // Revoke the token via cognito if enabled
                if (enableTokenRevocation) {
                    try {
                        // Perform global sign out to invalidate all tokens
                        await raesumCognito.globalSignOut(
                            accessTokenFromClient
                        );

                        logger.info(
                            'Successfully revoked tokens in Cognito for user without profile',
                            Date.now() - start
                        );
                    } catch (revokeError) {
                        logger.warning(
                            `Failed to revoke token in Cognito for user without profile: ${revokeError.message}`,
                            Date.now() - start
                        );
                        // Continue with logout even if Cognito revocation fails
                    }
                }

                // Else, just delete the session
                req.session.unset();
            }
        }

        if (!req.session.loggedIn) {
            // get not logged in response and send to user
            let response = await raesumResponses.get('notLoggedIn');
            return res.status(response.code).json(response);
        }

        next();
    }

    async raesumCognitoJWTAuth(req, res, next) {
        const start = Date.now();
        logger.debug(
            `Checking to see if user has logged in.`,
            Date.now() - start
        );

        // Init cognito if it has not yet been initialized
        if (
            !this.cognitoExpress ||
            this.cognitoExpressExpirationTime < Date.now()
        ) {
            await this.initCognito();
        }

        // Get the authorization header
        let accessTokenFromClient = req.headers.authorization;

        if (!accessTokenFromClient) {
            // get not logged in response and send to user
            let response = await raesumResponses.get('notLoggedIn');

            return res.status(response.code).json(response);
        }

        try {
            const response = await this.cognitoExpress.validate(
                accessTokenFromClient
            );

            res.locals.user = response;

            logger.debug(
                `User with id: ${response.id} is authenticated`,
                Date.now() - start
            );
            next();
        } catch (e) {
            // Something has malfunctioned or a user is sending an invalid header
            logger.warning(
                'User has sent an authorization header but has failed validation with error: ' +
                    e,
                Date.now() - start
            );

            if (e.name === 'TokenExpiredError') {
                // get token expired response and send to user
                const response = await raesumResponses.get('tokenExpired');
                return res.status(response.code).json(response);
            }
            if (e.name === 'TokenNotFound') {
                // get token invalid response and send to user
                const response =
                    await raesumResponses.get('invalidClientToken');
                return res.status(response.code).json(response);
            }
            if (e.name === 'InvalidTokenUse') {
                // get not authorized response and send to user
                const response =
                    await raesumResponses.get('invalidClientToken');
                return res.status(response.code).json(response);
            }
            if (e.name === 'InvalidUserPool') {
                // get not authorized response and send to user
                const response = await raesumResponses.get('invalidUserPool');
                return res.status(response.code).json(response);
            }

            // get not logged with error in response and send to user
            let response = await raesumResponses.get('notLoggedIn');
            return res.status(response.code).json(response);
        }
    }

    async raesumCognitoCookieAuth(req, res, next) {
        next();
    }
}

const singleInstance = new raesumAuth();
export default singleInstance;
