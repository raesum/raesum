import express from 'express';
import raesumUser from "../controllers/raesumUser.js";


const raesumUserRouter = express.Router();


/**
 * @swagger
 * /api/v1/user/get/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve user information for a specific user ID. Authorization is required - users can only access their own information unless they have organization-level permissions.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved user information
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                       description: Internal user ID
 *                     current_organization_id:
 *                       type: integer
 *                       example: 1
 *                       description: Current organization ID
 *                     external_id:
 *                       type: string
 *                       example: "b49884a8-e021-70ee-50eb-817e0a3b634e"
 *                       description: External user ID (Cognito sub)
 *                     username:
 *                       type: string
 *                       example: "odin"
 *                       description: Username
 *                     active_status:
 *                       type: boolean
 *                       example: true
 *                       description: Whether the user is active
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-03T17:31:40.531Z"
 *                       description: When the user was created
 */
raesumUserRouter.get('/get/:userId', raesumUser.getUserById);

/**
 * @swagger
 * /api/v1/user/get/:
 *   get:
 *     summary: Get current user
 *     description: Retrieve information for the currently authenticated user. Uses the user ID from the authentication token.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current user information
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                       description: Internal user ID
 *                     current_organization_id:
 *                       type: integer
 *                       example: 1
 *                       description: Current organization ID
 *                     external_id:
 *                       type: string
 *                       example: "b49884a8-e021-70ee-50eb-817e0a3b634e"
 *                       description: External user ID (Cognito sub)
 *                     username:
 *                       type: string
 *                       example: "odin"
 *                       description: Username
 *                     active_status:
 *                       type: boolean
 *                       example: true
 *                       description: Whether the user is active
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-03T17:31:40.531Z"
 *                       description: When the user was created
 */
raesumUserRouter.get('/get/', raesumUser.getUserById);

/**
 * @swagger
 * /api/v1/user/metadata/get/keys:
 *   get:
 *     summary: Get all user metadata keys
 *     description: Retrieve all available user metadata keys with their properties including whether they are Cognito attributes and their writable status.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved metadata keys
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
 *                   description: Object containing metadata keys as properties
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Internal ID of the metadata key
 *                         example: 1
 *                       datakey:
 *                         type: string
 *                         description: The key name
 *                         example: "premiumUser"
 *                       cognito_attribute:
 *                         type: boolean
 *                         description: Whether this key is a Cognito attribute
 *                         example: false
 *                       cognito_writable:
 *                         type: boolean
 *                         description: Whether this Cognito attribute is writable
 *                         example: false
 *                       active_status:
 *                         type: boolean
 *                         description: Whether this key is currently active
 *                         example: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: Description of the metadata key
 *                         example: "Ascisco quis cibo cohibeo viriliter facere. Substantia circumvenio magni defessus censura certe veritas itaque."
 */
raesumUserRouter.get('/metadata/get/keys/', raesumUser.getMetaDataKeys);
/**
 * @swagger
 * /api/v1/user/metadata/get/byKey/{key}/{userId}:
 *   get:
 *     summary: Get a specific metadata value for a user
 *     description: Retrieve a single metadata key-value pair for a specific user ID. Authorization is required - users can only access their own metadata unless they have organization-level permissions.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Metadata key to retrieve
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to retrieve metadata for
 *     responses:
 *       200:
 *         description: Successfully retrieved metadata value
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
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     profileDescription: "Cometes necessitatibus possimus urbanus utrimque. Volup tum aspernatur. Vomer toties crudelis."
 *                   description: Object containing the requested metadata key-value pair
 */
raesumUserRouter.get('/metadata/get/byKey/:key/:userId', raesumUser.getOneUserMetaData);
/**
 * @swagger
 * /api/v1/user/metadata/get/byKey/{key}:
 *   get:
 *     summary: Get a specific metadata value for current user
 *     description: Retrieve a single metadata key-value pair for the currently authenticated user. Uses user ID from the authentication token.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Metadata key to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved metadata value for current user
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
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     profileDescription: "Cometes necessitatibus possimus urbanus utrimque. Volup tum aspernatur. Vomer toties crudelis."
 *                   description: Object containing the requested metadata key-value pair
 */
raesumUserRouter.get('/metadata/get/byKey/:key', raesumUser.getOneUserMetaData);
/**
 * @swagger
 * /api/v1/user/metadata/get/{userId}:
 *   get:
 *     summary: Get all metadata for a specific user
 *     description: Retrieve all metadata key-value pairs for a specific user ID. Authorization is required - users can only access their own metadata unless they have organization-level permissions.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to retrieve metadata for
 *     responses:
 *       200:
 *         description: Successfully retrieved user metadata
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
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     premiumUser: "false"
 *                     profileDescription: "Cometes necessitatibus possimus urbanus utrimque. Volup tum aspernatur. Vomer toties crudelis."
 *                     subscriptionDate: "Mon May 18 2026 09:06:30 GMT+0000 (Coordinated Universal Time)"
 *                   description: Object containing metadata key-value pairs
 */
raesumUserRouter.get('/metadata/get/:userId', raesumUser.getAllUserMetaData);
/**
 * @swagger
 * /api/v1/user/metadata/get/:
 *   get:
 *     summary: Get all metadata for current user
 *     description: Retrieve all metadata key-value pairs for the currently authenticated user. Uses user ID from the authentication token.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current user metadata
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
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     premiumUser: "false"
 *                     profileDescription: "Cometes necessitatibus possimus urbanus utrimque. Volup tum aspernatur. Vomer toties crudelis."
 *                     subscriptionDate: "Mon May 18 2026 09:06:30 GMT+0000 (Coordinated Universal Time)"
 *                   description: Object containing metadata key-value pairs
 */
raesumUserRouter.get('/metadata/get', raesumUser.getAllUserMetaData);


/**
 * @swagger
 * /api/v1/user/metadata/resync:
 *   get:
 *     summary: Resync user metadata from Cognito
 *     description: Synchronize the current user's metadata from AWS Cognito to the local Raesum database. This endpoint updates the user's metadata based on their Cognito attributes.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully resynced user metadata from Cognito
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                       description: Whether resync operation was successful
 *                   description: Object containing operation result
 */
raesumUserRouter.get('/metadata/resync', raesumUser.resyncUserFromCognito); // TO-DO rate-limit this



/**
 * @swagger
 * /api/v1/user/organization/getAllowed/{userId}:
 *   get:
 *     summary: Get allowed organizations for a specific user
 *     description: Retrieve all organizations that a specific user has permission to access. Authorization is required - users can only access their own organization access unless they have organization-level permissions.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to retrieve allowed organizations for
 *     responses:
 *       200:
 *         description: Successfully retrieved allowed organizations for user
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                         description: Internal organization ID
 *                       name:
 *                         type: string
 *                         example: "Main Organization"
 *                         description: Organization name
 *                       role:
 *                         type: string
 *                         example: "admin"
 *                         description: User's role in this organization
 *                   description: Array of organizations user has access to
 */
raesumUserRouter.get('/organization/getAllowed/:userId', raesumUser.getAllowedOrgs);

/**
 * @swagger
 * /api/v1/user/organization/getAllowed:
 *   get:
 *     summary: Get allowed organizations for current user
 *     description: Retrieve all organizations that the current user has permission to access. Uses user ID from authentication token.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved allowed organizations for user
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                         description: Internal organization ID
 *                       name:
 *                         type: string
 *                         example: "Main Organization"
 *                         description: Organization name
 *                       role:
 *                         type: string
 *                         example: "admin"
 *                         description: User's role in this organization
 *                   description: Array of organizations user has access to
 */
raesumUserRouter.get('/organization/getAllowed', raesumUser.getAllowedOrgs);



/**
 * @swagger
 * /api/v1/user/metadata/set/byKey/{key}/{userId}:
 *   post:
 *     summary: Set a specific metadata value for a user
 *     description: Set a single metadata key-value pair for a specific user ID. Authorization is required - users can only set their own metadata unless they have organization-level permissions.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Metadata key to set
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to set metadata for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: string
 *                 description: The value to set for the metadata key
 *     responses:
 *       200:
 *         description: Successfully set metadata value
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
 *                
 */
raesumUserRouter.post('/metadata/set/byKey/:key/:userId', raesumUser.setOneUserMetaData);

/**
 * @swagger
 * /api/v1/user/metadata/set/byKey/{key}:
 *   post:
 *     summary: Set a specific metadata value for current user
 *     description: Set a single metadata key-value pair for the currently authenticated user. Uses user ID from the authentication token.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Metadata key to set
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: string
 *                 description: The value to set for the metadata key
 *     responses:
 *       200:
 *         description: Successfully set metadata value for current user
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
 *                
 */
raesumUserRouter.post('/metadata/set/byKey/:key/', raesumUser.setOneUserMetaData);

/**
 * @swagger
 * /api/v1/user/metadata/delete/byKey/{key}/{userId}:
 *   post:
 *     summary: Delete a specific metadata value for a user
 *     description: Delete a single metadata key-value pair for a specific user ID. Authorization is required - users can only delete their own metadata unless they have organization-level permissions.
 *     tags:
 *       - User Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Metadata key to delete
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to delete metadata for
 *     responses:
 *       200:
 *         description: Successfully deleted metadata value
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
 *                 
 */
raesumUserRouter.post('/metadata/delete/byKey/:key/:userId', raesumUser.deleteOneUserMetaData);
raesumUserRouter.post('/metadata/delete/byKey/:key/', raesumUser.deleteOneUserMetaData);


/**
 * @swagger
 * /api/v1/user/activation/set/{userId}:
 *   post:
 *     summary: Set activation status for a user
 *     description: Change activation status for a specific user ID. Authorization is required - users can only set their own activation status unless they have organization-level permissions.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to set activation status for
 *       - in: body
 *         name: activeStatus
 *         required: true
 *         schema:
 *           type: boolean
 *           description: The activation status to set (true for active, false for inactive)
 *     responses:
 *       200:
 *         description: Successfully set user activation status
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                       description: Whether activation status was set successfully
 *                   description: Object containing operation result
 */
raesumUserRouter.post('/activation/set/:userId', raesumUser.setUserActivation);
/**
 * @swagger
 * /api/v1/user/activation/set/:
 *   post:
 *     summary: Set activation status for current user
 *     description: Change activation status for currently authenticated user. Uses user ID from authentication token.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activeStatus
 *             properties:
 *               activeStatus:
 *                 type: boolean
 *                 description: The activation status to set (true for active, false for inactive)
 *                 example: true
 *     responses:
 *       200:
 *         description: Successfully set current user activation status
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                       description: Whether activation status was set successfully
 *                   description: Object containing operation result
 */
raesumUserRouter.post('/activation/set/', raesumUser.setUserActivation);

/**
 * @swagger
 * /api/v1/user/organization/set/{userId}:
 *   post:
 *     summary: Change user's organization
 *     description: Change the current organization for a specific user ID. Authorization is required - users can only change their own organization unless they have organization-level permissions.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to change organization for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *             properties:
 *               organizationId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *                 description: New organization ID to set as current
 *     responses:
 *       200:
 *         description: Successfully changed user's organization
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                       description: Whether the organization change was successful
 *                   description: Object containing operation result
 */
raesumUserRouter.post('/organization/set/:userId', raesumUser.changeUserOrg);

/**
 * @swagger
 * /api/v1/user/organization/set/:
 *   post:
 *     summary: Change current user's organization
 *     description: Change the current organization for the currently authenticated user. Uses user ID from authentication token.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *             properties:
 *               organizationId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *                 description: New organization ID to set as current
 *     responses:
 *       200:
 *         description: Successfully changed current user's organization
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
 *                
 */
raesumUserRouter.post('/organization/set/', raesumUser.changeUserOrg);

export default raesumUserRouter;