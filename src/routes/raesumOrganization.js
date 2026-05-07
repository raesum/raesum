import express from 'express';
import raesumOrganization from "../controllers/raesumOrganization.js";

const raesumOrganizationRouter = express.Router();


/**
 * @swagger
 * /api/v1/organization/get/{organizationId}:
 *   get:
 *     summary: Get organization by ID
 *     description: Retrieve organization information for a specific organization ID. Authorization is required - organizations can only access their own information unless they have organization-level permissions.
 *     tags:
 *       - organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: organization ID to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved organization information
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
 *                       description: Internal organization ID
 *                     current_organization_id:
 *                       type: integer
 *                       example: 1
 *                       description: Current organization ID
 *                     external_id:
 *                       type: string
 *                       example: "b49884a8-e021-70ee-50eb-817e0a3b634e"
 *                       description: External organization ID (Cognito sub)
 *                     organizationname:
 *                       type: string
 *                       example: "odin"
 *                       description: organizationname
 *                     active_status:
 *                       type: boolean
 *                       example: true
 *                       description: Whether the organization is active
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-03T17:31:40.531Z"
 *                       description: When the organization was created
 */
raesumOrganizationRouter.get('/get/:organizationId', raesumOrganization.getById);

/**
 * @swagger
 * /api/v1/organization/get/:
 *   get:
 *     summary: Get current organization
 *     description: Retrieve information for the currently authenticated organization. Uses the organization ID from the authentication token.
 *     tags:
 *       - organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current organization information
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
 *                       description: Internal organization ID
 *                     current_organization_id:
 *                       type: integer
 *                       example: 1
 *                       description: Current organization ID
 *                     external_id:
 *                       type: string
 *                       example: "b49884a8-e021-70ee-50eb-817e0a3b634e"
 *                       description: External organization ID (Cognito sub)
 *                     organizationname:
 *                       type: string
 *                       example: "odin"
 *                       description: organizationname
 *                     active_status:
 *                       type: boolean
 *                       example: true
 *                       description: Whether the organization is active
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-03T17:31:40.531Z"
 *                       description: When the organization was created
 */
raesumOrganizationRouter.get('/get/', raesumOrganization.getById);

/**
 * @swagger
 * /api/v1/organization/metadata/get/keys:
 *   get:
 *     summary: Get all organization metadata keys
 *     description: Retrieve all available organization metadata keys with their properties including whether they are Cognito attributes and their writable status.
 *     tags:
 *       - organization Metadata
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
 *                         example: "premiumorganization"
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
raesumOrganizationRouter.get('/metadata/get/keys/', raesumOrganization.getMetaDataKeys);
/**
 * @swagger
 * /api/v1/organization/metadata/get/byKey/{key}/{organizationId}:
 *   get:
 *     summary: Get a specific metadata value for a organization
 *     description: Retrieve a single metadata key-value pair for a specific organization ID. Authorization is required - organizations can only access their own metadata unless they have organization-level permissions.
 *     tags:
 *       - organization Metadata
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
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: organization ID to retrieve metadata for
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
raesumOrganizationRouter.get('/metadata/get/byKey/:key/:organizationId', raesumOrganization.getOneOrganizationMetaData);

/**
 * @swagger
 * /api/v1/organization/metadata/get/byKey/{key}:
 *   get:
 *     summary: Get a specific metadata value for current organization
 *     description: Retrieve a single metadata key-value pair for the currently authenticated organization. Uses the organization ID from the authentication token.
 *     tags:
 *       - organization Metadata
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
 *         description: Successfully retrieved metadata value for current organization
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
raesumOrganizationRouter.get('/metadata/get/byKey/:key', raesumOrganization.getOneOrganizationMetaData);
/**
 * @swagger
 * /api/v1/organization/metadata/get/{organizationId}:
 *   get:
 *     summary: Get all metadata for a specific organization
 *     description: Retrieve all metadata key-value pairs for a specific organization ID. Authorization is required - organizations can only access their own metadata unless they have organization-level permissions.
 *     tags:
 *       - organization Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: organization ID to retrieve metadata for
 *     responses:
 *       200:
 *         description: Successfully retrieved organization metadata
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
 *                     premiumorganization: "false"
 *                     profileDescription: "Cometes necessitatibus possimus urbanus utrimque. Volup tum aspernatur. Vomer toties crudelis."
 *                     subscriptionDate: "Mon May 18 2026 09:06:30 GMT+0000 (Coordinated Universal Time)"
 *                   description: Object containing metadata key-value pairs
 */
raesumOrganizationRouter.get('/metadata/get/:organizationId', raesumOrganization.getAllOrganizationMetaData);

/**
 * @swagger
 * /api/v1/organization/metadata/get/:
 *   get:
 *     summary: Get all metadata for current organization
 *     description: Retrieve all metadata key-value pairs for the currently authenticated organization. Uses the organization ID from the authentication token.
 *     tags:
 *       - organization Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current organization metadata
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
 *                     premiumorganization: "false"
 *                     profileDescription: "Cometes necessitatibus possimus urbanus utrimque. Volup tum aspernatur. Vomer toties crudelis."
 *                     subscriptionDate: "Mon May 18 2026 09:06:30 GMT+0000 (Coordinated Universal Time)"
 *                   description: Object containing metadata key-value pairs
 */
raesumOrganizationRouter.get('/metadata/get', raesumOrganization.getMetaDataKeys);

raesumOrganizationRouter.post('/metadata/set/byKey/:key/:organizationId', raesumOrganization.setOneOrganizationMetaData);
raesumOrganizationRouter.post('/metadata/set/byKey/:key/', raesumOrganization.setOneOrganizationMetaData);
raesumOrganizationRouter.post('/metadata/delete/byKey/:key/:organizationId', raesumOrganization.deleteOneOrganizationMetaData);
raesumOrganizationRouter.post('/metadata/delete/byKey/:key/', raesumOrganization.deleteOneOrganizationMetaData);

raesumOrganizationRouter.post('/activation/set/:organizationId', raesumOrganization.setOrganizationActivation);
raesumOrganizationRouter.post('/activation/set/', raesumOrganization.setOrganizationActivation);


export default raesumOrganizationRouter;