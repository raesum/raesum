import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumResponses from '../modules/raesumResponses.js';
import raesumAudit from '../models/raesumAudit.js';
import raesumUser from '../models/raesumUser.js';
import raesumAuthorization from '../models/raesumAuth.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

// amazon-cognito-identity-js

/*

req.user example:
{
  id: 1,
  current_organization_id: 1,
  external_id: 'a big uuid',
  username: 'odin',
  active_status: true,
  created_at: 2026-05-01T22:22:43.705Z
}

*/

class raesumUserController {
    // Gets a user by ID, default to current user if no ID provided
    async getUserById(req, res, next) {
        const start = Date.now();

        let userId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user',
            'read',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Get the user
            const user = await raesumUser.getUserById(userId);

            // Return the user
            logger.info(`User ${userId} retrieved`, Date.now() - start);

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_user',
                userId,
                req.user.id
            );
            const message = await raesumResponses.get('success');
            message.data = user;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting user ${userId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets a list of user meta data keys
    async getMetaDataKeys(req, res, next) {
        const start = Date.now();

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user_metadata',
            'read',
            req.user.current_organization_id,
            null
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Get the metadata keys
            const keys = await raesumUser.getMetadataKeys();

            logger.info(`Metadata keys retrieved`, Date.now() - start);

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_user',
                req.user.id,
                req.user.id
            );

            // Return the keys
            const message = await raesumResponses.get('success');
            message.data = keys;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting metadata keys: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets all user meta data for a user by ID. default to the current user if no ID provided
    async getAllUserMetaData(req, res, next) {
        const start = Date.now();

        let userId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user_metadata',
            'read',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Get all metadata keys
            const allKeys = await raesumUser.getMetadataKeyList();

            // Get the metadata values for the user
            const metadata = await raesumUser.getUserMetadataValues(
                userId,
                allKeys
            );

            logger.info(
                `User metadata retrieved for user ${userId}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_user',
                userId,
                req.user.id
            );

            // Return the metadata
            const message = await raesumResponses.get('success');
            message.data = metadata;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting all user metadata for user ${userId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Gets one user meta data by key for a user by ID. default to the current user if no ID provided
    async getOneUserMetaData(req, res, next) {
        const start = Date.now();

        let userId = null;
        logger.debug('Starting getOneUserMetaData', Date.now() - start);
        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user_metadata',
            'read',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        // Get the key from the request params
        const getKey = req.params.key.toLowerCase();
        logger.verbose(
            `getOneUserMetaData attempting to get key ${getKey} for user ${userId}`,
            Date.now() - start
        );

        // Get a list of valid keys
        const validKeys = await raesumUser.getMetadataKeyList();

        if (
            typeof getKey != 'string' ||
            !validKeys.map((key) => key.toLowerCase()).includes(getKey)
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Try and catch to get the key
        try {
            // Get the metadata values for the user
            const metadata = await raesumUser.getUserMetadataValues(userId, [
                getKey,
            ]);

            logger.info(
                `User metadata retrieved for user ${userId} and key ${getKey}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'read',
                'raesum_user',
                userId,
                req.user.id
            );

            // Return the metadata
            const message = await raesumResponses.get('success');
            message.data = metadata;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting user metadata for user ${userId} and key ${req.params.key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    }

    // Update one user meta data by key for a user by ID. default to the current user if no ID provided.
    async setOneUserMetaData(req, res, next) {
        const start = Date.now();

        let userId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user_metadata',
            'update',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        // If no key is provided, return an error
        if (!req.params.key) {
            const message = await raesumResponses.get('requestMissingFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Get a list of valid keys
        const validKeys = await raesumUser.getMetadataKeyList();
        const getKey = req.params.key.toLowerCase();

        if (
            typeof getKey != 'string' ||
            !validKeys.map((key) => key.toLowerCase()).includes(getKey)
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Get the value from the request body
        const value = req.body.value;
        if (!value) {
            const message = await raesumResponses.get('requestMissingFields', [
                'value',
            ]);
            return res.status(message.code).json(message);
        }

        // Try and catch to update the key
        try {
            await raesumUser.setUserMetadataValues(userId, { [getKey]: value }); // fix
            logger.info(
                `User metadata set for user ${userId}`,
                Date.now() - start
            );
            await raesumAudit.create(
                'update',
                'raesum_user',
                userId,
                req.user.id
            );
        } catch (e) {
            logger.error(
                `Error updating user metadata for user ${userId} and key ${req.params.key}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        // Get success message and return
        const message = await raesumResponses.get('success');
        return res.status(message.code).json(message);
    }

    // Delete one user meta data by key for a user by ID. default to the current user if no ID provided.
    async deleteOneUserMetaData(req, res, next) {
        const start = Date.now();

        let userId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user_metadata',
            'delete',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        // If no key is provided, return an error
        if (!req.params.key) {
            const message = await raesumResponses.get('requestMissingFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Get a list of valid keys
        const validKeys = await raesumUser.getMetadataKeyList();
        const deleteKey = req.params.key.toLowerCase();
        if (
            typeof deleteKey != 'string' ||
            !validKeys.map((key) => key.toLowerCase()).includes(deleteKey)
        ) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'key',
            ]);
            return res.status(message.code).json(message);
        }

        // Delete the metadata
        try {
            await raesumUser.deleteUserMetadataValues(userId, [deleteKey]);

            logger.info(
                `User metadata deleted for user ${userId} and key ${deleteKey}`,
                Date.now() - start
            );

            // Add audit log entry
            await raesumAudit.create(
                'delete',
                'raesum_user_metadata',
                userId,
                req.user.id
            );
        } catch (e) {
            logger.error(
                `Error deleting user metadata for user ${userId} and key ${req.params.key}: ${e.message}`
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }

        // Get success message and return
        const message = await raesumResponses.get('success');
        return res.status(message.code).json(message);
    }

    // Resync user from Cognito to Raesum. ONLY applies to current user
    async resyncUserFromCognito(req, res, next) {
        const start = Date.now();

        logger.debug(
            'Attempting resyncing user from Cognito ' + req.user.username,
            Date.now() - start
        );
        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user',
            'update',
            req.user.current_organization_id,
            req.user.id
        );
        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            logger.debug(
                'Resyncing user from Cognito permission denied ' + req.user.id,
                Date.now() - start
            );
            const message = await raesumResponses.get('notAuthorized', [
                'update',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        logger.info(
            'Resyncing user from Cognito ' + req.user.username,
            Date.now() - start
        );

        try {
            await raesumUser.syncUserFromCognitoToRaesum(req.user.username);
            logger.info(
                `User resynced from Cognito for user ${req.user.external_id}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('success');

            await raesumAudit.create(
                'update',
                'raesum_user',
                req.user.id,
                req.user.id
            );
            return res.status(message.code).json(message);
        } catch (error) {
            logger.error(
                `Error resyncing user from Cognito for user ${req.user.id}: ${error.message}`,
                error
            );
            const message = await raesumResponses.get('error');
            return res.status(message.code).json(message);
        }
    }

    // Changes the user activation status. Does nothing to inactive if no status provided and the current user if no ID provided
    async setUserActivation(req, res, next) {
        const start = Date.now();

        let userId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user',
            'set_status',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        // Get value from post body. If not specifically true or false, return an invalid value error
        const activationStatus = req.body.value;
        if (activationStatus !== true && activationStatus !== false) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'value',
            ]);
            return res.status(message.code).json(message);
        }

        // Try and catch deactivating the user
        try {
            // Deactivate the user
            await raesumUser.setActivationStatus(userId, activationStatus);

            logger.info(
                `User activation status updated for user ${userId}`,
                Date.now() - start
            );

            const message = await raesumResponses.get('success');
            return res.status(message.code).json(message);
        } catch (error) {
            logger.error(
                `Error updating user activation status for user ${userId}: ${error.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('error');
            return res.status(message.code).json(message);
        }
    }

    // Changes the current organization for a user by ID. default to the current user if no ID provided
    async changeUserOrg(req, res, next) {
        const start = Date.now();

        let userId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user',
            'update',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'update',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        // Get value from post body. If not specifically true or false, return an invalid value error
        if (!req.body.organizationId) {
            const message = await raesumResponses.get('requestMissingFields', [
                'organizationId',
            ]);
            return res.status(message.code).json(message);
        }
        const orgId = parseInt(req.body.organizationId);
        if (isNaN(orgId) || orgId < 1 || !Number.isInteger(orgId)) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'orgId',
            ]);
            return res.status(message.code).json(message);
        }

        // Get a list of orgs the user may switch to

        // If the orgID is not in the list, return an invalid value error
        const allowedOrgs = await raesumUser.getAllowedUserOrgs(userId);
        if (!allowedOrgs.includes(orgId)) {
            const message = await raesumResponses.get('requestInvalidFields', [
                'orgId',
            ]);
            return res.status(message.code).json(message);
        }

        // Try and catch changing the user's organization
        try {
            // Change the user's organization
            await raesumUser.changeUserOrg(userId, orgId);

            logger.info(
                `User organization changed for user ${userId}`,
                Date.now() - start
            );

            const message = await raesumResponses.get('success');
            return res.status(message.code).json(message);
        } catch (error) {
            logger.error(
                `Error changing user organization for user ${userId}: ${error.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('error');
            return res.status(message.code).json(message);
        }
    }

    // Gets the list of allowed organizations for this user
    async getAllowedOrgs(req, res, next) {
        const start = Date.now();

        let userId = null;

        // If no user ID is provided, use the current user
        if (!req.params.userId) {
            userId = req.user.id;
        } else {
            // Validate the user ID is a number
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

        // Use raesum authorization to check to see if this user may access the requested object
        let isAuthorized = await raesumAuthorization.checkUserPermission(
            req.user.id,
            'raesum_user',
            'read',
            req.user.current_organization_id,
            userId
        );

        if (!isAuthorized) {
            // If not, get the not authorized message and return the rejected request
            const message = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_user',
            ]);
            return res.status(message.code).json(message);
        }

        try {
            // Get the allowed organizations
            const allowedOrgs = await raesumUser.getAllowedUserOrgs(userId);

            logger.info(
                `Allowed organizations for user ${userId}: ${allowedOrgs}`,
                Date.now() - start
            );

            const message = await raesumResponses.get('success');
            message.data = allowedOrgs;
            return res.status(message.code).json(message);
        } catch (e) {
            logger.error(
                `Error getting allowed organizations for user ${userId}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('error');
            return res.status(message.code).json(message);
        }
    }
}

const singleInstance = new raesumUserController();
export default singleInstance;
