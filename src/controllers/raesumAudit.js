import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumAudit from '../models/raesumAudit.js';
import raesumAuthorization from '../models/raesumAuth.js';
import raesumResponses from '../modules/raesumResponses.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumAuditController {
    async getAuditLogs(req, res, next) {
        const start = Date.now();

        // Extract user info from request
        const requesterUserID = req.user ? req.user.id : null;
        let orgID = req.user ? req.user.current_organization_id : null;
        if ('organizationId' in req.query) {
            orgID = req.query.organizationId || null;
        }

        let userID = req.query.userId || null;

        // Check to see if user is allowed to get read the object type audit log for the user's current organization
        logger.verbose(
            'Checking user authorization for audit log access',
            Date.now() - start
        );
        try {
            // First check object-level permissions
            let isAuthorized = await raesumAuthorization.checkUserPermission(
                requesterUserID,
                'raesum_audit',
                'read',
                orgID,
                null
            );

            // If not authorized at object level, check user-specific authorization
            if (!isAuthorized) {
                logger.verbose(
                    'Object-level authorization failed, checking user-specific authorization',
                    Date.now() - start
                );
                isAuthorized = await raesumAuthorization.checkUserPermission(
                    requesterUserID,
                    'raesum_audit',
                    'read',
                    orgID,
                    requesterUserID
                );
                // User can only see their own records, force userID filter
                userID = requesterUserID;
            }

            if (!isAuthorized) {
                logger.warning(
                    `User ${requesterUserID} not authorized to read audit logs for organization ${orgID}`,
                    Date.now() - start
                );
                const notAuthorizedResponse = await raesumResponses.get(
                    'notAuthorized',
                    ['read', 'raesum_audit']
                );
                return res.status(403).json(notAuthorizedResponse);
            }

            logger.verbose(
                `User ${requesterUserID} authorized to read audit logs for organization ${orgID}`,
                Date.now() - start
            );
        } catch (error) {
            logger.error(
                'Authorization check failed: ' + error,
                Date.now() - start
            );
            const errorResponse = await raesumResponses.get('notAuthorized', [
                'read',
                'raesum_audit',
            ]);
            return res.status(errorResponse.code).json(errorResponse);
        }

        logger.verbose(
            'Getting audit logs, authorization allowed',
            Date.now() - start
        );

        // Extract query parameters
        const {
            objectTypeID,
            actionTypeID,
            sortBy = 'timestamp',
            sortOrder = 'desc',
            limit,
            offset,
        } = req.query;

        // Try to get the audit logs
        try {
            const auditLogs = await raesumAudit.getAuditLogs(
                orgID,
                userID,
                objectTypeID,
                actionTypeID,
                sortBy,
                sortOrder,
                limit ? parseInt(limit) : null,
                offset ? parseInt(offset) : null
            );
            const message = await raesumResponses.get('success');
            message.data = auditLogs;
            return res.status(message.code).json(message);
        } catch (error) {
            logger.error(
                'Error retrieving audit logs: ' + error,
                Date.now() - start
            );
            const errorResponse = await raesumResponses.get('error');
            return res.status(errorResponse.code).json(errorResponse);
        }
    }
}

const singleInstance = new raesumAuditController();
export default singleInstance;
