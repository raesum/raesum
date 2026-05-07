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
raesumUserRouter.get('/metadata/get/byKey/:key/:userId', raesumUser.getOneUserMetaData);
raesumUserRouter.get('/metadata/get/byKey/:key', raesumUser.getOneUserMetaData);
raesumUserRouter.get('/metadata/get/:userId', raesumUser.getAllUserMetaData);
raesumUserRouter.get('/metadata/get', raesumUser.getAllUserMetaData);
raesumUserRouter.get('/metadata/resync', raesumUser.resyncUserFromCognito); // TO-DO rate-limit this

raesumUserRouter.get('/organization/getAllowed', raesumUser.getAllowedOrgs);

raesumUserRouter.post('/metadata/set/byKey/:key/:userId', raesumUser.setOneUserMetaData);
raesumUserRouter.post('/metadata/set/byKey/:key/', raesumUser.setOneUserMetaData);
raesumUserRouter.post('/metadata/delete/byKey/:key/:userId', raesumUser.deleteOneUserMetaData);
raesumUserRouter.post('/metadata/delete/byKey/:key/', raesumUser.deleteOneUserMetaData);

raesumUserRouter.post('/activation/set/:userId', raesumUser.setUserActivation);
raesumUserRouter.post('/activation/set/', raesumUser.setUserActivation);

raesumUserRouter.post('/organization/set/:userId', raesumUser.changeUserOrg);
raesumUserRouter.post('/organization/set/', raesumUser.changeUserOrg);


export default raesumUserRouter;