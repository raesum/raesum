import express from 'express';
import raesumUser from '../controllers/raesumUser.js';
import raesumAuth from '../controllers/raesumAuth.js';
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
raesumAuthRouter.get('/login', raesumAuth.login);

/**
 * @swagger
 * /api/v1/auth/signup:
 *   get:
 *     summary: Redirect user to Cognito signup page
 *     description: Initiates the user registration flow by redirecting the user to the AWS Cognito hosted signup page
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: redirect_uri
 *         schema:
 *           type: string
 *         description: The URI to redirect to after successful signup
 *         required: false
 *       - in: query
 *         name: post_login_uri
 *         schema:
 *           type: string
 *         description: The URI to redirect to after login (stored in session)
 *         required: false
 *     responses:
 *       301:
 *         description: Redirect to Cognito signup page
 *       400:
 *         description: User is already logged in and signed up
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.get('/signup', raesumAuth.signUp);

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
raesumAuthRouter.get('/logout', raesumAuth.logout);

/**
 * @swagger
 * /api/v1/auth/role/get:
 *   get:
 *     summary: Get available roles for organization
 *     description: Retrieves all available roles for the user's current organization
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved available roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     description: Role ID
 *                   example: [1, 2, 3]
 *       401:
 *         description: Not authorized to read roles
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/v1/auth/role/get/{organizationId}:
 *   get:
 *     summary: Get available roles for specific organization
 *     description: Retrieves all available roles for a specific organization
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Organization ID to get roles for
 *     responses:
 *       200:
 *         description: Successfully retrieved available roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: integer
 *                     description: Role ID
 *                   example: [1, 2, 3]
 *       400:
 *         description: Invalid organization ID
 *       401:
 *         description: Not authorized to read roles
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.get('/role/get/', raesumAuth.getAvailableRoles);
raesumAuthRouter.get('/role/get/:organizationId', raesumAuth.getAvailableRoles);

/**
 * @swagger
 * /api/v1/auth/role/user/get:
 *   get:
 *     summary: Get current user's roles
 *     description: Retrieves all roles assigned to the current user for their organization
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Role ID
 *                         example: 1
 *                       role_id:
 *                         type: integer
 *                         description: Role ID
 *                         example: 1
 *                       org_id:
 *                         type: integer
 *                         description: Organization ID
 *                         example: 1
 *                       role_key:
 *                         type: string
 *                         description: Role string key
 *                         example: "admin"
 *                       role_name:
 *                         type: string
 *                         description: Role display name
 *                         example: "Administrator"
 *       401:
 *         description: Not authorized to read user roles
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/v1/auth/role/user/get/{organizationId}:
 *   get:
 *     summary: Get user's roles for specific organization
 *     description: Retrieves all roles assigned to the current user for a specific organization
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Organization ID to get user roles for
 *     responses:
 *       200:
 *         description: Successfully retrieved user roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Role ID
 *                         example: 1
 *                       role_id:
 *                         type: integer
 *                         description: Role ID
 *                         example: 1
 *                       org_id:
 *                         type: integer
 *                         description: Organization ID
 *                         example: 1
 *                       role_key:
 *                         type: string
 *                         description: Role string key
 *                         example: "admin"
 *                       role_name:
 *                         type: string
 *                         description: Role display name
 *                         example: "Administrator"
 *       400:
 *         description: Invalid organization ID
 *       401:
 *         description: Not authorized to read user roles
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.get('/role/user/get/', raesumAuth.getUserRoles);
raesumAuthRouter.get('/role/user/get/:organizationId', raesumAuth.getUserRoles);

/**
 * @swagger
 * /api/v1/auth/callbackSession:
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
raesumAuthRouter.get('/callbackSession', raesumAuth.callbackSession);

/**
 * @swagger
 * /api/v1/auth/callbackJWT:
 *   get:
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
 *                 title:
 *                   type: string
 *                   example: "Success"
 *                   description: Response title
 *                 message:
 *                   type: string
 *                   example: "OK"
 *                   description: Response message
 *                 description:
 *                   type: string
 *                   example: "The request was successful."
 *                   description: Response description
 *                 code:
 *                   type: integer
 *                   example: 200
 *                   description: HTTP status code
 *                 keycode:
 *                   type: integer
 *                   example: 1
 *                   description: Internal response code
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
raesumAuthRouter.get('/callbackJWT', raesumAuth.callbackJWT);

/**
 * @swagger
 * /api/v1/auth/refreshJWT:
 *   post:
 *     summary: Refresh JWT tokens using refresh token
 *     description: Uses a refresh token to obtain new ID, access, and refresh tokens from AWS Cognito. JWT logins must be enabled.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token obtained from previous authentication
 *                 example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Successfully refreshed JWT tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   example: "Success"
 *                   description: Response title
 *                 message:
 *                   type: string
 *                   example: "OK"
 *                   description: Response message
 *                 description:
 *                   type: string
 *                   example: "The request was successful."
 *                   description: Response description
 *                 code:
 *                   type: integer
 *                   example: 200
 *                   description: HTTP status code
 *                 keycode:
 *                   type: integer
 *                   example: 1
 *                   description: Internal response code
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_token:
 *                       type: string
 *                       description: JWT ID token containing user identity
 *                       example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     access_token:
 *                       type: string
 *                       description: JWT access token for API calls
 *                       example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refresh_token:
 *                       type: string
 *                       description: JWT refresh token for obtaining new access tokens
 *                       example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     expires_in:
 *                       type: integer
 *                       description: Token expiration time in seconds
 *                       example: 3600
 *                     token_type:
 *                       type: string
 *                       example: "Bearer"
 *                       description: Token type
 *                   description: Object containing new JWT tokens
 *       400:
 *         description: Bad request - missing or invalid refresh token
 *       403:
 *         description: JWT authentication not allowed
 *       500:
 *         description: Internal server error or token refresh failed
 */
raesumAuthRouter.post('/refreshJWT', raesumAuth.refreshJWT);

/**
 * @swagger
 * /api/v1/auth/role/user/add:
 *   post:
 *     summary: Add roles to current user
 *     description: Adds one or more roles to the current user for their organization. Supports both role IDs and role keys.
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - values
 *             properties:
 *               values:
 *                 type: array
 *                 description: Array of role IDs (integers) or role keys (strings) to add
 *                 items:
 *                   oneOf:
 *                     - type: integer
 *                       minimum: 1
 *                       description: Role ID
 *                       example: 1
 *                     - type: string
 *                       description: Role string key
 *                       example: "admin"
 *                 example: [1, 2, "admin", "manager"]
 *     responses:
 *       200:
 *         description: Successfully added roles to user
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
 *                     addedRoles:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: Array of added role IDs
 *                       example: [1, 2, 3, 4]
 *       400:
 *         description: Bad request - missing or invalid role values
 *       401:
 *         description: Not authorized to manage user roles
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/v1/auth/role/user/add/{organizationId}:
 *   post:
 *     summary: Add roles to user for specific organization
 *     description: Adds one or more roles to the current user for a specific organization. Supports both role IDs and role keys.
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Organization ID to add roles for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - values
 *             properties:
 *               values:
 *                 type: array
 *                 description: Array of role IDs (integers) or role keys (strings) to add
 *                 items:
 *                   oneOf:
 *                     - type: integer
 *                       minimum: 1
 *                       description: Role ID
 *                       example: 1
 *                     - type: string
 *                       description: Role string key
 *                       example: "admin"
 *                 example: [1, 2, "admin", "manager"]
 *     responses:
 *       200:
 *         description: Successfully added roles to user
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
 *                     addedRoles:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: Array of added role IDs
 *                       example: [1, 2, 3, 4]
 *       400:
 *         description: Bad request - missing or invalid role values
 *       401:
 *         description: Not authorized to manage user roles
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.post('/role/user/add/', raesumAuth.addUserRoles);
raesumAuthRouter.post(
    '/role/user/add/:organizationId',
    raesumAuth.addUserRoles
);

/**
 * @swagger
 * /api/v1/auth/role/user/remove:
 *   post:
 *     summary: Remove roles from current user
 *     description: Removes one or more roles from the current user for their organization. Supports both role IDs and role keys.
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - values
 *             properties:
 *               values:
 *                 type: array
 *                 description: Array of role IDs (integers) or role keys (strings) to remove
 *                 items:
 *                   oneOf:
 *                     - type: integer
 *                       minimum: 1
 *                       description: Role ID
 *                       example: 1
 *                     - type: string
 *                       description: Role string key
 *                       example: "admin"
 *                 example: [1, 2, "admin", "manager"]
 *     responses:
 *       200:
 *         description: Successfully removed roles from user
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
 *                     removedRoles:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: Array of removed role IDs
 *                       example: [1, 2, 3, 4]
 *       400:
 *         description: Bad request - missing or invalid role values
 *       401:
 *         description: Not authorized to manage user roles
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/v1/auth/role/user/remove/{organizationId}:
 *   post:
 *     summary: Remove roles from user for specific organization
 *     description: Removes one or more roles from the current user for a specific organization. Supports both role IDs and role keys.
 *     tags:
 *       - Authorization
 *       - Roles
 *     security:
 *       - BearerAuth: []
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Organization ID to remove roles for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - values
 *             properties:
 *               values:
 *                 type: array
 *                 description: Array of role IDs (integers) or role keys (strings) to remove
 *                 items:
 *                   oneOf:
 *                     - type: integer
 *                       minimum: 1
 *                       description: Role ID
 *                       example: 1
 *                     - type: string
 *                       description: Role string key
 *                       example: "admin"
 *                 example: [1, 2, "admin", "manager"]
 *     responses:
 *       200:
 *         description: Successfully removed roles from user
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
 *                     removedRoles:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: Array of removed role IDs
 *                       example: [1, 2, 3, 4]
 *       400:
 *         description: Bad request - missing or invalid role values
 *       401:
 *         description: Not authorized to manage user roles
 *       500:
 *         description: Internal server error
 */
raesumAuthRouter.post('/role/user/remove/', raesumAuth.deleteUserRoles);
raesumAuthRouter.post(
    '/role/user/remove/:organizationId',
    raesumAuth.deleteUserRoles
);

export default raesumAuthRouter;
