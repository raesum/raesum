import express from 'express';
import raesumFile from '../controllers/raesumFile.js';
import raesumFileValidationMiddleware from '../middleware/raesumFileValidator.js';
import multer from 'multer';
import validate from '../middleware/joiValidator.js';
import { fileSchemas } from '../validators/raesumFileValidator.js';

const upload = multer({});

const raesumFileRouter = express.Router();

/**
 * @swagger
 * /api/v1/file/get/{fileId}:
 *   get:
 *     summary: Get file by ID
 *     description: Retrieve file information for a specific file ID. Authorization is required - users can only access their own files unless they have organization-level permissions.
 *     tags:
 *       - File
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: File ID to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved file information
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
 *                       description: Internal file ID
 *                     user_id:
 *                       type: integer
 *                       example: 1
 *                       description: User ID who owns the file
 *                     org_id:
 *                       type: integer
 *                       example: 1
 *                       description: Organization ID
 *                     file_type_key:
 *                       type: string
 *                       example: "testTextFile"
 *                       description: File type key
 *                     status_id:
 *                       type: integer
 *                       example: 3
 *                       description: File status ID
 *                     quarantine:
 *                       type: boolean
 *                       example: false
 *                       description: Whether file is in quarantine
 *                     path:
 *                       type: string
 *                       example: "uploads/test.txt"
 *                       description: File path in S3
 *                     bucket:
 *                       type: string
 *                       example: "localhost-public"
 *                       description: S3 bucket name
 *                     awsregion:
 *                       type: string
 *                       example: "us-east-1"
 *                       description: AWS region
 *                     key_prefix:
 *                       type: string
 *                       example: "public"
 *                       description: S3 key prefix
 *                     original_file_name:
 *                       type: string
 *                       example: "test.txt"
 *                       description: Original file name
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-19T10:00:00.000Z"
 *                       description: When the file was created
 */
raesumFileRouter.get(
    '/get/:fileId',
    validate(fileSchemas.getById, 'params'),
    raesumFile.getById
);

/**
 * @swagger
 * /api/v1/file/get/byUser/{userId}:
 *   get:
 *     summary: Get files by user ID
 *     description: Retrieve all files for a specific user ID. Authorization is required - users can only access their own files unless they have organization-level permissions.
 *     tags:
 *       - File
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: User ID to retrieve files for
 *     responses:
 *       200:
 *         description: Successfully retrieved files for user
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
 *                         description: Internal file ID
 *                       user_id:
 *                         type: integer
 *                         example: 1
 *                         description: User ID who owns the file
 *                       file_type_key:
 *                         type: string
 *                         example: "testTextFile"
 *                         description: File type key
 *                   description: Array of files belonging to the user
 */
raesumFileRouter.get(
    '/get/byUser/:userId',
    validate(fileSchemas.getList, 'params'),
    raesumFile.getList
);

/**
 * @swagger
 * /api/v1/file/get/byUser/:
 *   get:
 *     summary: Get files for current user
 *     description: Retrieve all files for the currently authenticated user. Uses user ID from the authentication token.
 *     tags:
 *       - File
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved files for current user
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
 *                         description: Internal file ID
 *                       user_id:
 *                         type: integer
 *                         example: 1
 *                         description: User ID who owns the file
 *                       file_type_key:
 *                         type: string
 *                         example: "testTextFile"
 *                         description: File type key
 *                   description: Array of files belonging to the current user
 */
raesumFileRouter.get('/get/byUser/', raesumFile.getList);

/**
 * @swagger
 * /api/v1/file/data/{fileId}:
 *   get:
 *     summary: Get file data by ID
 *     description: Retrieve file data (signed URL) for a specific file ID. Authorization is required - users can only access their own files unless they have organization-level permissions.
 *     tags:
 *       - File
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: File ID to retrieve data for
 *     responses:
 *       200:
 *         description: Successfully retrieved file data
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
 *                     signedURL:
 *                       type: string
 *                       example: "https://example.s3.amazonaws.com/file.txt?signature=..."
 *                       description: Signed URL to access the file
 */
raesumFileRouter.get(
    '/data/:fileId',
    validate(fileSchemas.getFileById, 'params'),
    raesumFile.getFileById
);

/**
 * @swagger
 * /api/v1/file/metadata/get/keys/:
 *   get:
 *     summary: Get all file metadata keys
 *     description: Retrieve all available file metadata keys with their properties including their active status.
 *     tags:
 *       - File Metadata
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
 *                         example: "documentAuthor"
 *                       active_status:
 *                         type: boolean
 *                         description: Whether this key is currently active
 *                         example: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         description: Description of the metadata key
 *                         example: "The author of the document"
 */
raesumFileRouter.get('/metadata/get/keys/', raesumFile.getMetadataKeys);

/**
 * @swagger
 * /api/v1/file/metadata/get/byKey/{key}/{fileId}:
 *   get:
 *     summary: Get a specific metadata value for a file
 *     description: Retrieve a single metadata key-value pair for a specific file ID. Authorization is required - users can only access their own file metadata unless they have organization-level permissions.
 *     tags:
 *       - File Metadata
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
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: File ID to retrieve metadata for
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
 *                     documentAuthor: "John Doe"
 *                   description: Object containing the requested metadata key-value pair
 */
raesumFileRouter.get(
    '/metadata/get/byKey/:key/:fileId',
    raesumFile.getOneFileMetadata
);

/**
 * @swagger
 * /api/v1/file/metadata/get/{fileId}:
 *   get:
 *     summary: Get all metadata for a specific file
 *     description: Retrieve all metadata key-value pairs for a specific file ID. Authorization is required - users can only access their own file metadata unless they have organization-level permissions.
 *     tags:
 *       - File Metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: File ID to retrieve metadata for
 *     responses:
 *       200:
 *         description: Successfully retrieved file metadata
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
 *                     documentAuthor: "John Doe"
 *                     documentDate: "2026-05-19"
 *                   description: Object containing metadata key-value pairs
 */
raesumFileRouter.get(
    '/metadata/get/:fileId',
    validate(fileSchemas.getAllMetadata, 'params'),
    raesumFile.getAllFileMetadata
);

/**
 * @swagger
 * /api/v1/file/metadata/set/byKey/{key}/{fileId}:
 *   post:
 *     summary: Set a specific metadata value for a file
 *     description: Set a single metadata key-value pair for a specific file ID. Authorization is required - users can only set their own file metadata unless they have organization-level permissions.
 *     tags:
 *       - File Metadata
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
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: File ID to set metadata for
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
 */
raesumFileRouter.post(
    '/metadata/set/byKey/:key/:fileId',
    validate(fileSchemas.setOneMetadata, 'params'),
    validate(fileSchemas.setOneMetadata, 'body'),
    raesumFile.setOneFileMetadata
);

/**
 * @swagger
 * /api/v1/file/metadata/delete/byKey/{key}/{fileId}:
 *   post:
 *     summary: Delete a specific metadata value for a file
 *     description: Delete a single metadata key-value pair for a specific file ID. Authorization is required - users can only delete their own file metadata unless they have organization-level permissions.
 *     tags:
 *       - File Metadata
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
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: File ID to delete metadata for
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
 */
raesumFileRouter.post(
    '/metadata/delete/byKey/:key/:fileId',
    validate(fileSchemas.deleteOneMetadata, 'params'),
    raesumFile.deleteOneFileMetadata
);

/**
 * @swagger
 * /api/v1/file/upload/{fileId}:
 *   post:
 *     summary: Upload file to existing file entry
 *     description: Upload a file to an existing file entry. The user must be the owner of the file and the file type must match. Authorization is required.
 *     tags:
 *       - File
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Existing file ID to upload to
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - fileType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               fileType:
 *                 type: string
 *                 description: The file type key (must match the existing file's type)
 *     responses:
 *       200:
 *         description: Successfully uploaded file
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
 *                     fileId:
 *                       type: integer
 *                       example: 1
 *                       description: The file ID
 */
raesumFileRouter.post(
    '/upload/:fileId',
    validate(fileSchemas.uploadWithId, 'params'),
    validate(fileSchemas.uploadWithId, 'body'),
    upload.single('file'),
    raesumFileValidationMiddleware,
    raesumFile.upload
);

/**
 * @swagger
 * /api/v1/file/upload/:
 *   post:
 *     summary: Upload new file
 *     description: Upload a new file and create a new file entry. Authorization is required.
 *     tags:
 *       - File
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - fileType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               fileType:
 *                 type: string
 *                 description: The file type key
 *     responses:
 *       200:
 *         description: Successfully uploaded file
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
 *                     fileId:
 *                       type: integer
 *                       example: 1
 *                       description: The newly created file ID
 */
raesumFileRouter.post(
    '/upload/',
    validate(fileSchemas.uploadNew, 'body'),
    upload.single('file'),
    raesumFileValidationMiddleware,
    raesumFile.upload
);

/**
 * @swagger
 * /api/v1/file/delete/{fileId}:
 *   post:
 *     summary: Delete a file
 *     description: Delete a file by ID. This removes the file from S3 and marks it as deleted in the database. Authorization is required - users can only delete their own files unless they have organization-level permissions.
 *     tags:
 *       - File
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: File ID to delete
 *     responses:
 *       200:
 *         description: Successfully deleted file
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
 *       400:
 *         description: File cannot be deleted due to dependencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   example: "Delete Failed"
 *                   description: Response title
 *                 message:
 *                   type: string
 *                   example: "The file cannot be deleted due to dependencies."
 *                   description: Response message
 *                 description:
 *                   type: string
 *                   example: "The file has dependencies that prevent deletion."
 *                   description: Response description
 *                 code:
 *                   type: integer
 *                   example: 400
 *                   description: HTTP status code
 *                 keycode:
 *                   type: integer
 *                   example: 25
 *                   description: Internal response code
 */
raesumFileRouter.post(
    '/delete/:fileId',
    validate(fileSchemas.delete, 'params'),
    raesumFile.delete
);

export default raesumFileRouter;
