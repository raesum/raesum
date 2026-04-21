import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumCognito from "../modules/raesumCognito.js";
import raesumConfig from "../modules/raesumConfig.js";
import raesumServer from "../modules/raesumServer.js";
import raesumResponses from "../modules/raesumResponses.js";
import raesumCache from "../modules/raesumCache.js";
import raesumUser from "../models/raesumUser.js";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);


class raesumUserController {

    async login(req, res, next) {
        const start = Date.now();

        let loginURL = await raesumCognito.buildBaseLoginURL();
        const clientID = await raesumConfig.get('aws.cognito.cognitoClientId');
        loginURL += "/login?client_id=" + clientID + "&response_type=code";

        const allowedCallbacks = await raesumCognito.getAllowedCallbacks();
        let allowedCallbacksUpper = [];

        if (allowedCallbacks.length === 0) {
            logger.critical("No allowed callbacks found in environment", Date.now() - start);
            throw new Error("No allowed callbacks found in environment");
        }

        const loginMethods = await raesumConfig.get('login');

        if (req.query.post_login_uri && loginMethods.useSessionCookie === true) {
            req.session.post_login_uri = req.query.post_login_uri;
        }

        for (let i = 0; i < allowedCallbacks.length; i++) {
            allowedCallbacksUpper.push(allowedCallbacks[i].toUpperCase());
        }

        if (!req.query.redirect_uri || !allowedCallbacksUpper.includes(req.query.redirect_uri.toUpperCase())) {
            let raesumServerURL = await raesumServer.buildBaseServerURL();
            raesumServerURL += "/api/v1/auth/loggedIn";

            if (allowedCallbacksUpper.includes(raesumServerURL.toUpperCase())) {
                logger.warning("Redirect URI not allowed. Redirecting to server URL", Date.now() - start);
                loginURL += "&redirect_uri=" + encodeURIComponent(raesumServerURL);
            } else {
                logger.warning("Redirect URI not allowed. Redirecting to the first allowed callback", Date.now() - start);
                loginURL += "&redirect_uri=" + encodeURIComponent(allowedCallbacks[0]);
            }
        } else {
            const redirectURL = allowedCallbacks[allowedCallbacksUpper.indexOf(req.query.redirect_uri.toUpperCase())];
            loginURL += "&redirect_uri=" + encodeURIComponent(redirectURL);
        }

        res.redirect(301, loginURL);
    }

    async logout(req, res, next) {
        const start = Date.now();

        const loginMethods = await raesumConfig.get('login');

        let accessTokenFromClient = null;
        if (loginMethods.jwt === true && !req.headers.authorization) {
            const message = await raesumResponses.get("missingHeader", ["Authorization"]);
            return res.status(message.code).json(message);
        } else if (loginMethods.jwt === true && req.headers.authorization) {
            accessTokenFromClient = req.headers.authorization;
        } else if (req.session.jwt) {
            accessTokenFromClient = req.session.jwt;
        } else {
            logger.error("Unable to logout: JWT not found in session or header", Date.now() - start);
            const response = await raesumResponses.get("notLoggedIn");
            return res.status(response.code).json(response);
        }

        // Decode the token to calculate remaining TTL
        const decodedToken = jwt.decode(accessTokenFromClient);
        if (decodedToken && decodedToken.exp) {
            const now = Math.floor(Date.now() / 1000);
            const ttlSeconds = Math.max(decodedToken.exp - now, 0);

            if (ttlSeconds > 0) {
                // Store revoked token in cache until it expires naturally
                const cacheKey = "revokedToken" + accessTokenFromClient;
                await raesumCache.set(cacheKey, true, ttlSeconds, "auth");
                logger.info("Token added to revoked list with TTL: " + ttlSeconds + "s", Date.now() - start);
            }
        }

        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                logger.error("Error destroying session: " + err, Date.now() - start);
            }
        });

        const response = await raesumResponses.get("loggedOut");
        return res.status(response.code).json(response);
    }

    async loggedIn(req, res, next) {
        const start = Date.now();

        if (!req.query.code) {
            logger.warning("No code supplied. Redirecting to login", Date.now() - start);
            return res.redirect(301, "/api/v1/auth/login");
        }

        const loginMethods = await raesumConfig.get('login');

        if (loginMethods.useSessionCookie !== true) {
            const message = await raesumResponses.get("loginTypeNotAllowed");
            return res.status(message.code).json(message);
        }

        if (req.session.loginType === "jwt") {
            const response = await raesumResponses.get("alreadyLoggedInDifferentType");
            return res.status(response.code).json(response);
        }

        // Exchange code for tokens if not already logged in via session
        if (!req.session.loggedIn) {
            const serverURL = await raesumServer.buildBaseServerURL();
            const redirectUri = serverURL + "/api/v1/auth/loggedIn";

            try {
                const tokens = await raesumCognito.exchangeCodeForTokens(req.query.code, redirectUri);

                const decodedToken = jwt.decode(tokens.id_token);
                if (!decodedToken || !decodedToken.sub) {
                    throw new Error("Invalid token response from Cognito");
                }

                const cognitoUserID = decodedToken.sub;

                let userProfile = null;
                try {
                    userProfile = await raesumUser.getUserByExternalID(cognitoUserID);
                } catch (e) {
                    logger.warning("User not found in Raesum during session login", Date.now() - start);
                    return res.redirect(301, "/api/v1/auth/login");
                }

                if (!userProfile.active_status) {
                    logger.warning(`Inactive user attempted session login: ${cognitoUserID}`, Date.now() - start);
                    return res.redirect(301, "/api/v1/auth/login");
                }

                req.session.loggedIn = true;
                req.session.cognitoUserID = cognitoUserID;
                req.session.loginType = "sessionCookie";
                req.session.jwt = tokens.id_token;

                logger.info(`Session login successful for user: ${cognitoUserID}`, Date.now() - start);

            } catch (e) {
                logger.error("Error during session login code exchange: " + e, Date.now() - start);
                return res.redirect(301, "/api/v1/auth/login");
            }
        }

        // Determine where to redirect after login
        let post_login_url = "/";

        if (req.session.post_login_uri) {
            let isAbsoluteRegex = new RegExp('^(?:[a-z]+:)?//', 'i');
            if (isAbsoluteRegex.test(req.session.post_login_uri)) {
                try {
                    const testURL = new URL(req.session.post_login_uri);
                    const testDomain = testURL.hostname;

                    let allowedDomains = await raesumConfig.get('allowedOrigins');
                    const raesumURL = await raesumServer.buildBaseServerURL();
                    const raesumDomain = new URL(raesumURL).hostname;
                    allowedDomains.push(raesumDomain);

                    if (allowedDomains.includes(testDomain)) {
                        post_login_url = req.session.post_login_uri;
                    }
                } catch (e) {
                    logger.error("Error parsing post_login_uri", Date.now() - start);
                }
            } else {
                post_login_url = req.session.post_login_uri;
            }
        }

        delete req.session.post_login_uri;

        return res.redirect(301, post_login_url);
    }

    async getJWT(req, res, next) {
        const start = Date.now();

        if (!req.query.code) {
            const message = await raesumResponses.get("requestMissingFields", ['code']);
            return res.status(message.code).json(message);
        }

        const loginMethods = await raesumConfig.get('login');

        if (loginMethods.jwt !== true) {
            const message = await raesumResponses.get("loginTypeNotAllowed");
            return res.status(message.code).json(message);
        }

        if (req.session.loginType === "sessionCookie") {
            const response = await raesumResponses.get("alreadyLoggedInDifferentType");
            return res.status(response.code).json(response);
        }

        // Determine the redirect_uri used in the original login request
        let redirectUri = req.query.redirect_uri;
        if (!redirectUri) {
            const serverURL = await raesumServer.buildBaseServerURL();
            redirectUri = serverURL + "/api/v1/auth/loggedIn";
        }

        try {
            const tokens = await raesumCognito.exchangeCodeForTokens(req.query.code, redirectUri);

            const decodedToken = jwt.decode(tokens.id_token);
            if (!decodedToken || !decodedToken.sub) {
                throw new Error("Invalid token response from Cognito");
            }

            const cognitoUserID = decodedToken.sub;

            let userProfile = null;
            try {
                userProfile = await raesumUser.getUserByExternalID(cognitoUserID);
            } catch (e) {
                logger.warning("User not found in Raesum during JWT login", Date.now() - start);
                const response = await raesumResponses.get("notLoggedIn");
                return res.status(response.code).json(response);
            }

            if (!userProfile.active_status) {
                logger.warning(`Inactive user attempted JWT login: ${cognitoUserID}`, Date.now() - start);
                const response = await raesumResponses.get("notLoggedIn");
                return res.status(response.code).json(response);
            }

            // Record the session state for conflict detection
            req.session.loggedIn = true;
            req.session.cognitoUserID = cognitoUserID;
            req.session.loginType = "jwt";

            logger.info(`JWT login successful for user: ${cognitoUserID}`, Date.now() - start);

            const response = await raesumResponses.get("loggedIn", [userProfile.username]);
            response.token = tokens.id_token;

            return res.status(response.code).json(response);

        } catch (e) {
            logger.error("Error exchanging code for JWT: " + e, Date.now() - start);
            const response = await raesumResponses.get("notLoggedIn");
            return res.status(response.code).json(response);
        }
    }
}


const singleInstance = new raesumUserController();
export default singleInstance;
