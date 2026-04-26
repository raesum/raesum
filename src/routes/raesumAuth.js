import express from 'express';
import raesumUser from "../controllers/raesumUser.js";
const raesumAuthRouter = express.Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   get:
 *     summary: Redirect user to Cognito login page
 *     description: Initiates the authentication flow by redirecting the user to the AWS Cognito hosted login page
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: redirect_uri
 *         schema:
 *           type: string
 *         description: The URI to redirect to after successful login
 *         required: false
 *       - in: query
 *         name: post_login_uri
 *         schema:
 *           type: string
 *         description: The URI to redirect to after login (stored in session)
 *         required: false
 *     responses:
 *       301:
 *         description: Redirect to Cognito login page
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.get('/login', raesumUser.login);

/**
 * @swagger
 * /api/v1/auth/loggedIn:
 *   get:
 *     summary: Handle OAuth callback and create session
 *     description: Processes the authorization code from Cognito and creates a user session
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Cognito
 *         required: true
 *     responses:
 *       301:
 *         description: Redirect to post-login URI or default page
 *       400:
 *         description: Bad request - missing or invalid code
 *       403:
 *         description: Session-based login not allowed
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.get('/loggedIn', raesumUser.loggedIn);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   get:
 *     summary: Logout user and invalidate session
 *     description: Logs out the user by revoking tokens, destroying session, and clearing authentication state
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully logged out"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - missing authentication token
 *       401:
 *         description: Not logged in
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.get('/logout', raesumUser.logout);

/**
 * @swagger
 * /api/v1/auth/getJWT:
 *   post:
 *     summary: Exchange authorization code for JWT tokens
 *     description: Exchanges the OAuth authorization code for JWT access tokens for API authentication
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Cognito
 *         required: true
 *     responses:
 *       200:
 *         description: Successfully obtained JWT tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       description: JWT access token for API calls
 *                     id_token:
 *                       type: string
 *                       description: JWT ID token containing user identity
 *                     refresh_token:
 *                       type: string
 *                       description: JWT refresh token for obtaining new access tokens
 *                     expires_in:
 *                       type: integer
 *                       description: Token expiration time in seconds
 *                     token_type:
 *                       type: string
 *                       example: "Bearer"
 *       400:
 *         description: Bad request - missing authorization code
 *       403:
 *         description: JWT authentication not allowed
 *       409:
 *         description: Conflict - user already logged in with different method
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.post('/getJWT', raesumUser.getJWT);

export default raesumAuthRouter;