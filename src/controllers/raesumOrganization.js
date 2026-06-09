import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumDB from '../modules/raesumDB.js';
import raesumOrganization from '../models/raesumOrganization.js';
import raesumResponses from '../modules/raesumResponses.js';
import raesumAudit from '../models/raesumAudit.js';
import raesumAuthorization from '../models/raesumAuth.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumOrganizationController {
    async create(req, res, next) {
        const start = Date.now();

        // Get organization name from request body
        const { name } = req.body;

        // Validate organization name
        if (!name || typeof name !== 'string') {
            const message = await raesumResponses.get('requestMissingFields', [
                'name',
            ]);
            return res.status(message.code).json(message);
        }

        logger.debug(`Creating organization: ${name}`, Date.now() - start);

        // Use raesum authorization to check to see if this user may create organizations
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization',
            'create',
            req.user.current_organization_id,
            null
        );

        if (!isAuthorized) {
            // If not, get not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'create',
                'raesum_organization',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Create the organization
            const organizationId = await raesumOrganization.create(name);

            logger.info(
                `Organization created with id: ${organizationId}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'create',
                'raesum_organization',
                organizationId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = { id: organizationId };
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error creating organization: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets an organization by ID, default to current organization if no ID provided
    async getById(req, res, next) {
        const start = Date.now();

        let organizationId = null;

        // If no organization ID is provided, use the current organization
        if (!req.params.organizationId) {
            organizationId = req.user.current_organization_id;
        } else {
            // Validate the organization ID is a number
            if (
                isNaN(req.params.organizationId) ||
                req.params.organizationId < 1 ||
                !Number.isInteger(parseInt(req.params.organizationId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['organizationId']
                );
                return res.status(message.code).json(message);
            }
            organizationId = parseInt(req.params.organizationId);
        }

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization',
            'read',
            req.user.current_organization_id,
            organizationId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_organization',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Get the organization
            const organization =
                await raesumOrganization.getById(organizationId);

            // Return organization
            logger.info(
                `Organization ${organizationId} retrieved`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_organization',
                organizationId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = organization;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting organization ${organizationId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets a list of organization metadata keys
    async getMetaDataKeys(req, res, next) {
        const start = Date.now();

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization_metadata',
            'read',
            req.user.current_organization_id,
            null
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_organization_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Get the metadata keys
            const metadataKeys = await raesumOrganization.getMetadataKeys();

            // Return metadata keys
            logger.info(
                `Organization metadata keys retrieved`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_organization_metadata',
                null,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = metadataKeys;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting organization metadata keys: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets a single organization metadata value by key
    async getOneOrganizationMetaData(req, res, next) {
        const start = Date.now();

        let organizationId = null;
        // If no organization ID is provided, use the current organization
        if (!req.params.organizationId) {
            organizationId = req.user.current_organization_id;
        } else {
            // Validate the organization ID is a number
            if (
                isNaN(req.params.organizationId) ||
                req.params.organizationId < 1 ||
                !Number.isInteger(parseInt(req.params.organizationId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['organizationId']
                );
                return res.status(message.code).json(message);
            }
            organizationId = parseInt(req.params.organizationId);
        }

        // Get the key from the request params
        const getKey = req.params.key.toLowerCase();
        logger.verbose(
            `getOneOrganizationMetaData attempting to get key ${getKey} for organization ${organizationId}`,
            Date.now() - start
        );

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization_metadata',
            'read',
            req.user.current_organization_id,
            organizationId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_organization_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        // Get a list of valid keys
        const validKeys = await raesumOrganization.getMetadataKeyList();

        if (typeof getKey != 'string' || !validKeys.includes(getKey)) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Try and catch to get the key
        try {
            // Get the metadata values for the organization
            const metadata =
                await raesumOrganization.getOrganizationMetadataValues(
                    organizationId,
                    [getKey]
                );

            logger.info(
                `Organization metadata retrieved for organization ${organizationId} and key ${getKey}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_organization_metadata',
                organizationId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = metadata;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting organization metadata for organization ${organizationId} and key ${req.params.key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets all organization metadata values
    async getAllOrganizationMetaData(req, res, next) {
        const start = Date.now();

        let organizationId = null;
        // If no organization ID is provided, use the current organization
        if (!req.params.organizationId) {
            organizationId = req.user.current_organization_id;
        } else {
            // Validate the organization ID is a number
            if (
                isNaN(req.params.organizationId) ||
                req.params.organizationId < 1 ||
                !Number.isInteger(parseInt(req.params.organizationId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['organizationId']
                );
                return res.status(message.code).json(message);
            }
            organizationId = parseInt(req.params.organizationId);
        }

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization_metadata',
            'read',
            req.user.current_organization_id,
            organizationId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_organization_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Get the metadata values for the organization
            const keyList = await raesumOrganization.getMetadataKeyList();
            const metadata =
                await raesumOrganization.getOrganizationMetadataValues(
                    organizationId,
                    keyList
                );

            logger.info(
                `Organization metadata retrieved for organization ${organizationId}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_organization_metadata',
                organizationId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = metadata;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting organization metadata for organization ${organizationId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Sets a single organization metadata value
    async setOneOrganizationMetaData(req, res, next) {
        const start = Date.now();

        let organizationId = null;
        // If no organization ID is provided, use the current organization
        if (!req.params.organizationId) {
            organizationId = req.user.current_organization_id;
        } else {
            // Validate the organization ID is a number
            if (
                isNaN(req.params.organizationId) ||
                req.params.organizationId < 1 ||
                !Number.isInteger(parseInt(req.params.organizationId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['organizationId']
                );
                return res.status(message.code).json(message);
            }
            organizationId = parseInt(req.params.organizationId);
        }

        // Get the key from the request params
        const setKey = req.params.key.toLowerCase();
        logger.verbose(
            `setOneOrganizationMetaData attempting to set key ${setKey} for organization ${organizationId}`,
            Date.now() - start
        );

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization_metadata',
            'update',
            req.user.current_organization_id,
            organizationId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'update',
                'raesum_organization_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        // Get a list of valid keys
        const validKeys = await raesumOrganization.getMetadataKeyList();

        if (typeof setKey != 'string' || !validKeys.includes(setKey)) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Try and catch to set the key
        try {
            // Get the value from the request body
            const setValue = req.body.value;
            if (
                typeof setValue != 'string' &&
                typeof setValue != 'boolean' &&
                typeof setValue != 'number'
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['value']
                );
                return res.status(message.code).json(message);
            }

            // Set the metadata value for the organization
            await raesumOrganization.setOrganizationMetadataValues(
                organizationId,
                { [setKey]: setValue }
            );

            logger.info(
                `Organization metadata set for organization ${organizationId} and key ${setKey}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'update',
                'raesum_organization_metadata',
                organizationId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error setting organization metadata for organization ${organizationId} and key ${req.params.key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Deletes a single organization metadata value
    async deleteOneOrganizationMetaData(req, res, next) {
        const start = Date.now();

        let organizationId = null;
        // If no organization ID is provided, use the current organization organization
        if (!req.params.organizationId) {
            organizationId = req.user.current_organization_id;
        } else {
            // Validate the organization ID is a number
            if (
                isNaN(req.params.organizationId) ||
                req.params.organizationId < 1 ||
                !Number.isInteger(parseInt(req.params.organizationId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['organizationId']
                );
                return res.status(message.code).json(message);
            }
            organizationId = parseInt(req.params.organizationId);
        }

        // Get the key from the request params
        const deleteKey = req.params.key.toLowerCase();
        logger.verbose(
            `deleteOneOrganizationMetaData attempting to delete key ${deleteKey} for organization ${organizationId}`,
            Date.now() - start
        );

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization_metadata',
            'delete',
            req.user.current_organization_id,
            organizationId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'delete',
                'raesum_organization_metadata',
            ]);
            return res.status(message.code).json(message);
        }

        // Get a list of valid keys
        const validKeys = await raesumOrganization.getMetadataKeyList();

        if (typeof deleteKey != 'string' || !validKeys.includes(deleteKey)) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Try and catch to delete the key
        try {
            // Delete the metadata value for the organization
            await raesumOrganization.deleteOrganizationMetadataValues(
                organizationId,
                [deleteKey]
            );

            logger.info(
                `Organization metadata deleted for organization ${organizationId} and key ${deleteKey}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'delete',
                'raesum_organization_metadata',
                organizationId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error deleting organization metadata for organization ${organizationId} and key ${req.params.key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Sets organization activation status
    async setOrganizationActivation(req, res, next) {
        const start = Date.now();

        let organizationId = null;
        // If no organization ID is provided, use the current organization
        if (!req.params.organizationId) {
            organizationId = req.user.current_organization_id;
        } else {
            // Validate the organization ID is a number
            if (
                isNaN(req.params.organizationId) ||
                req.params.organizationId < 1 ||
                !Number.isInteger(parseInt(req.params.organizationId))
            ) {
                const message = await raesumResponses.get(
                    'requestInvalidFields',
                    ['organizationId']
                );
                return res.status(message.code).json(message);
            }
            organizationId = parseInt(req.params.organizationId);
        }

        // Get the activation status from the request body
        let activationStatus = req.body.activeStatus;
        if (typeof activationStatus !== 'boolean') {
            if (
                activationStatus !== undefined &&
                activationStatus.toLowerCase() == 'true'
            ) {
                activationStatus = true;
            } else {
                activationStatus = false;
            }
        }

        logger.debug(
            `Setting activation status for organization with ID: ${organizationId} to: ${activationStatus}`,
            Date.now() - start
        );

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_organization',
            'set_status',
            req.user.current_organization_id,
            organizationId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'update',
                'raesum_organization',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Set the activation status
            const result = await raesumOrganization.setActivationStatus(
                organizationId,
                activationStatus
            );

            logger.info(
                `Activation status set for organization with ID: ${organizationId} to: ${activationStatus}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'update',
                'raesum_organization',
                organizationId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = { activationStatus: result };
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error setting activation status for organization ${organizationId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }
}

const singleInstance = new raesumOrganizationController();
export default singleInstance;
