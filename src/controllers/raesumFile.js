import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumDB from '../modules/raesumDB.js';
import raesumOrganization from '../models/raesumOrganization.js';
import raesumResponses from '../modules/raesumResponses.js';
import raesumAudit from '../models/raesumAudit.js';
import raesumAuthorization from '../models/raesumAuth.js';
import raesumFile from '../models/raesumFile.js';
import { get } from 'http';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumFileController {
    async upload(req, res, next) {
        const start = Date.now();

        // Get file type and original filename from request
        const fileTypeKey = req.body.fileType;
        const originalFileName = req.file ? req.file.originalname : null;

        // Check if fileId parameter is specified
        let fileId;
        if (req.params.fileId) {
            // Validate the fileId
            if (
                isNaN(req.params.fileId) ||
                parseInt(req.params.fileId) < 1 ||
                !Number.isInteger(parseInt(req.params.fileId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['fileId']
                );
                return res.status(message.code).json(message);
            }
            fileId = parseInt(req.params.fileId);

            // Get the existing file entry
            let fileInfo;
            try {
                fileInfo = await raesumFile.getEntryById(fileId);
            } catch (e) {
                logger.error(
                    `Error getting file ${fileId}: ${e.message}`,
                    Date.now() - start
                );
                const message = await raesumResponses.get('notFound');
                return res.status(message.code).json(message);
            }

            // Check if user IDs match
            if (fileInfo.user_id !== req.user.id) {
                const message = await raesumResponses.get('notAuthorized', [
                    'upload',
                    'raesum_file',
                ]);
                return res.status(message.code).json(message);
            }

            // Check if file types match
            if (fileInfo.file_type_key !== fileTypeKey) {
                const message = await raesumResponses.get('fileTypeNotAllowed');
                return res.status(message.code).json(message);
            }

            // Check for permissions - update action on raesum_file
            const isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id,
                'raesum_file',
                'update',
                req.user.current_organization_id,
                fileInfo.user_id
            );

            if (!isAuthorized) {
                const message = await raesumResponses.get('notAuthorized', [
                    'update',
                    'raesum_file',
                ]);
                return res.status(message.code).json(message);
            }

            try {
                // Upload file to S3 using existing file info
                await raesumFile.upload(
                    fileInfo.id,
                    fileInfo.path,
                    req.file.buffer,
                    req.file.mimetype
                );

                // Create audit log
                await raesumAudit.create(
                    'update',
                    'raesum_file',
                    fileInfo.id,
                    req.user.id
                );

                const message = await raesumResponses.get('success');
                message.data = { fileId: fileInfo.id };
                return res.status(message.code).json(message);
            } catch (e) {
                logger.error(
                    `Error uploading file: ${e.message}`,
                    Date.now() - start
                );
                const message = await raesumResponses.get(
                    'internalServerError'
                );
                return res.status(message.code).json(message);
            }
        } else {
            // No fileId specified - create new file entry
            // Check for permissions - create action on raesum_file
            const isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id,
                'raesum_file',
                'create',
                req.user.current_organization_id,
                req.user.id
            );

            if (!isAuthorized) {
                const message = await raesumResponses.get('notAuthorized', [
                    'create',
                    'raesum_file',
                ]);
                return res.status(message.code).json(message);
            }

            try {
                // Create file entry in database
                const fileInfo = await raesumFile.createFileEntry(
                    fileTypeKey,
                    req.user.current_organization_id,
                    req.user.id,
                    originalFileName
                );

                // Upload file to S3
                await raesumFile.upload(
                    fileInfo.id,
                    fileInfo.path,
                    req.file.buffer,
                    req.file.mimetype
                );

                // Create audit log
                await raesumAudit.create(
                    'create',
                    'raesum_file',
                    fileInfo.id,
                    req.user.id
                );

                const message = await raesumResponses.get('success');
                message.data = { fileId: fileInfo.id };
                return res.status(message.code).json(message);
            } catch (e) {
                logger.error(
                    `Error uploading file: ${e.message}`,
                    Date.now() - start
                );
                const message = await raesumResponses.get(
                    'internalServerError'
                );
                return res.status(message.code).json(message);
            }
        }
    }

    // Gets a list of files for the current user and organization.
    async getList(req, res, next) {
        const start = Date.now();
        logger.info('Controller Getting file list', Date.now() - start);

        let userId = null;
        const orgId = req.user.current_organization_id;

        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            if (
                isNaN(req.params.userId) ||
                req.params.userId < 1 ||
                !Number.isInteger(parseInt(req.params.userId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['userId']
                );
                return res.status(message.code).json(message);
            }
            userId = parseInt(req.params.userId);
        }

        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_file',
            'read',
            orgId,
            userId
        );

        if (!isAuthorized) {
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_file',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            const files = await raesumFile.getEntriesByUserAndOrg(
                userId,
                orgId
            );

            await raesumAudit.create(
                'read',
                'raesum_file',
                userId,
                req.user.id
            );

            const message = await raesumResponses.get('success');
            message.data = files;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting file list for user ${userId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets an file entry by ID. It will also get the current status
    async getById(req, res, next) {
        const start = Date.now();

        // Validate the file ID
        let fileId;
        if (
            !req.params.fileId ||
            isNaN(parseInt(req.params.fileId)) ||
            parseInt(req.params.fileId) < 1
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'fileId',
            ]);
            return res.status(message.code).json(message);
        } else {
            fileId = parseInt(req.params.fileId);
        }

        let file;
        try {
            file = await raesumFile.getEntryById(fileId);

            // Check for permissions
            const isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id,
                'raesum_file',
                'read',
                req.user.current_organization_id,
                file.user_id
            );

            if (!isAuthorized) {
                const message = await raesumResponses.get('notAuthorized', [
                    'read',
                    'raesum_file',
                ]);
                return res.status(message.code).json(message);
            }

            // Get the file types
            const fileType = await raesumFile.getOneFileType(
                file.file_type_key
            );

            // If the file is stored in a public bucket and the file type says it should be public by default, get the public url and add it as a field in the data
            if (fileType && fileType.publicByDefault) {
                const publicURL = await raesumFile.getPublicURL(fileId);
                if (publicURL) {
                    file.public_url = publicURL;
                }
            }
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        try {
            await raesumAudit.create(
                'read',
                'raesum_file',
                fileId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = file;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets an file by ID, default to current organization if no ID provided. It will either give the file itself or a redirect to the public url of the file
    async getFileById(req, res, next) {
        const start = Date.now();

        // Validate the file ID
        let fileId;
        if (
            !req.params.fileId ||
            isNaN(parseInt(req.params.fileId)) ||
            parseInt(req.params.fileId) < 1
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'fileId',
            ]);
            return res.status(message.code).json(message);
        } else {
            fileId = parseInt(req.params.fileId);
        }

        let file;
        try {
            file = await raesumFile.getEntryById(fileId);

            // Check for permissions
            const isAuthorized = await raesumAuthorization.checkUserPermission(
                req.user.id,
                'raesum_file',
                'read',
                req.user.current_organization_id,
                file.user_id
            );

            if (!isAuthorized) {
                const message = await raesumResponses.get('notAuthorized', [
                    'read',
                    'raesum_file',
                ]);
                return res.status(message.code).json(message);
            }

            // If the file status is deleted, get the deleted message and return that
            if (file.status_id === 7) {
                const message = await raesumResponses.get('fileDeleted');
                return res.status(message.code).json(message);
            }

            // If the file status is deleted, get the deleted message and return that
            if (file.status_id === 5) {
                const message = await raesumResponses.get('fileFailed');
                return res.status(message.code).json(message);
            }

            // If the file status is NOT accepted, get the quarantine message and return that (don't expose the true status if it's been rejected)
            if (file.status_id !== 3) {
                const message = await raesumResponses.get('fileInQuarantine');
                return res.status(message.code).json(message);
            }

            // Get the file types
            const fileType = await raesumFile.getOneFileType(
                file.file_type_key
            );

            // If the file is stored in a public bucket and the file type says it should be public by default, get the public url and add it as a field in the data
            if (fileType && fileType.publicByDefault) {
                const publicURL = await raesumFile.getPublicURL(fileId);
                if (publicURL) {
                    return res.redirect(publicURL);
                } else {
                    const message = await raesumResponses.get('notFound');
                    return res.status(message.code).json(message);
                }
            } else {
                // The file is NOT public by default
                // Use the S3 client to get the file and return it as the request
                const signedURL = await raesumFile.getSignedURL(fileId);
                if (signedURL) {
                    return res.redirect(signedURL);
                }
                const message = await raesumResponses.get('notFound');
                return res.status(message.code).json(message);
            }
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    async delete(req, res, next) {
        const start = Date.now();

        // Validate the file ID
        let fileId;
        if (
            !req.params.fileId ||
            isNaN(parseInt(req.params.fileId)) ||
            parseInt(req.params.fileId) < 1
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'fileId',
            ]);
            return res.status(message.code).json(message);
        }
        fileId = parseInt(req.params.fileId);

        let file;
        try {
            file = await raesumFile.getEntryById(fileId);
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        // Check for permissions
        const isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_file',
            'delete',
            req.user.current_organization_id,
            file.user_id
        );

        if (!isAuthorized) {
            const message = await raesumResponses.get('notAuthorized', [
                'delete',
                'raesum_file',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            await raesumFile.delete(fileId);
            await raesumAudit.create(
                'delete',
                'raesum_file',
                fileId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            return res.status(message.code).json(message);
        } catch (e) {
            // Check if the error is due to foreign key constraints
            if (e.message && e.message.includes('foreign key constraints')) {
                logger.warning(
                    `Cannot delete file ${fileId} due to dependencies: ${e.message}`,
                    Date.now() - start
                );
                const message = await raesumResponses.get('deleteDependency');
                return res.status(message.code).json(message);
            }

            logger.error(
                `Error deleting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    async getFileMetadata(req, res, next) {
        return this.getAllFileMetadata(req, res, next);
    }

    async deleteOneFileMetadata(req, res, next) {
        const start = Date.now();

        let fileId;
        if (
            !req.params.fileId ||
            isNaN(parseInt(req.params.fileId)) ||
            parseInt(req.params.fileId) < 1
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'fileId',
            ]);
            return res.status(message.code).json(message);
        }
        fileId = parseInt(req.params.fileId);

        let file;
        try {
            file = await raesumFile.getEntryById(fileId);
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        const isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_file_metadata',
            'delete',
            req.user.current_organization_id,
            file.user_id
        );

        if (!isAuthorized) {
            const message = await raesumResponses.get('notAuthorized', [
                'delete',
                'raesum_file_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        const validKeys = await raesumFile.getMetaDataKeys();
        const key = req.params.key.toLowerCase();
        if (typeof key !== 'string' || !validKeys[key]) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            await raesumFile.deleteFileMetadataValues(fileId, [key]);
            await raesumAudit.create(
                'delete',
                'raesum_file_metadata',
                fileId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error deleting file metadata for file ${fileId} and key ${key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    async setOneFileMetadata(req, res, next) {
        const start = Date.now();

        let fileId;
        if (
            !req.params.fileId ||
            isNaN(parseInt(req.params.fileId)) ||
            parseInt(req.params.fileId) < 1
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'fileId',
            ]);
            return res.status(message.code).json(message);
        }
        fileId = parseInt(req.params.fileId);

        let file;
        try {
            file = await raesumFile.getEntryById(fileId);
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        const isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_file_metadata',
            'update',
            req.user.current_organization_id,
            file.user_id
        );

        if (!isAuthorized) {
            const message = await raesumResponses.get('notAuthorized', [
                'update',
                'raesum_file_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        const validKeys = await raesumFile.getMetaDataKeys();
        const key = req.params.key.toLowerCase();
        if (typeof key !== 'string' || !validKeys[key]) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        if (!Object.hasOwn(req.body, 'value')) {
            const message = await raesumResponses.get('requestMissingFields', [
                'value',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            await raesumFile.setFileMetadataValues(fileId, {
                [key]: req.body.value,
            });
            await raesumAudit.create(
                'update',
                'raesum_file_metadata',
                fileId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error setting file metadata for file ${fileId} and key ${key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    async getAllFileMetadata(req, res, next) {
        const start = Date.now();

        let fileId;
        if (
            !req.params.fileId ||
            isNaN(parseInt(req.params.fileId)) ||
            parseInt(req.params.fileId) < 1
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'fileId',
            ]);
            return res.status(message.code).json(message);
        }
        fileId = parseInt(req.params.fileId);

        let file;
        try {
            file = await raesumFile.getEntryById(fileId);
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        const isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_file_metadata',
            'read',
            req.user.current_organization_id,
            file.user_id
        );

        if (!isAuthorized) {
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_file_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            const metadataKeys = await raesumFile.getMetaDataKeys();
            const metadata = await raesumFile.getFileMetadataValues(
                fileId,
                Object.keys(metadataKeys)
            );
            await raesumAudit.create(
                'read',
                'raesum_file_metadata',
                fileId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = metadata;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting all file metadata for file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    async getOneFileMetadata(req, res, next) {
        const start = Date.now();

        let fileId;
        if (
            !req.params.fileId ||
            isNaN(parseInt(req.params.fileId)) ||
            parseInt(req.params.fileId) < 1
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'fileId',
            ]);
            return res.status(message.code).json(message);
        }
        fileId = parseInt(req.params.fileId);

        let file;
        try {
            file = await raesumFile.getEntryById(fileId);
        } catch (e) {
            logger.error(
                `Error getting file ${fileId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        const isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_file_metadata',
            'read',
            req.user.current_organization_id,
            file.user_id
        );

        if (!isAuthorized) {
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_file_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        const validKeys = await raesumFile.getMetaDataKeys();
        const key = req.params.key.toLowerCase();
        if (typeof key !== 'string' || !validKeys[key]) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            const metadata = await raesumFile.getFileMetadataValues(fileId, [
                key,
            ]);
            await raesumAudit.create(
                'read',
                'raesum_file_metadata',
                fileId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = metadata;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting file metadata for file ${fileId} and key ${key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    async getMetadataKeys(req, res, next) {
        const start = Date.now();

        const isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_file_metadata',
            'read',
            req.user.current_organization_id,
            null
        );

        if (!isAuthorized) {
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_file_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            const keys = await raesumFile.getMetaDataKeys();
            await raesumAudit.create(
                'read',
                'raesum_file_metadata',
                req.user.id,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = keys;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting file metadata keys: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }
}

const singleInstance = new raesumFileController();
export default singleInstance;
