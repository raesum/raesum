import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumAudit from "../models/raesumAudit.js";
import raesumAuthorization from "../models/raesumAuthorization.js";
import raesumResponses from "../modules/raesumResponses.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);


class raesumAuditController {

    async getAuditLogs(req, res, next){
        const start = Date.now();

        // Extract user info from request
        const requesterUserID = req.user ? req.user.id : null;
        let orgID = req.user ? req.user.current_organization_id : null;
        if("organizationId" in req.query){
            orgID = req.query.organizationId ? parseInt(req.query.organizationId) : null;
        }
        

        let userID = req.query.userId ? parseInt(req.query.userId) : null;

        // Check to see if user is allowed to get read the object type audit log for the user's current organization
        logger.verbose("Checking user authorization for audit log access", Date.now() - start);
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
                logger.verbose("Object-level authorization failed, checking user-specific authorization", Date.now() - start);
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
                logger.warning(`User ${requesterUserID} not authorized to read audit logs for organization ${orgID}`, Date.now() - start);
                const notAuthorizedResponse = await raesumResponses.get('notAuthorized',['read','raesum_audit']);
                return res.status(403).json(notAuthorizedResponse);
            }
            
            logger.verbose(`User ${requesterUserID} authorized to read audit logs for organization ${orgID}`, Date.now() - start);
        } catch (error) {
            logger.error("Authorization check failed: " + error, Date.now() - start);
            const errorResponse = await raesumResponses.get('notAuthorized',['read','raesum_audit']);
            return res.status(500).json(errorResponse);
        }

        logger.verbose("Getting audit logs, authorization allowed", Date.now() - start);

        // Extract query parameters
        const {  
            objectTypeID, 
            actionTypeID, 
            sortBy, 
            sortOrder
        } = req.query;

        // Convert string parameters to numbers if provided
        const parsedObjectTypeID = objectTypeID ? parseInt(objectTypeID) : null;
        const parsedActionTypeID = actionTypeID ? parseInt(actionTypeID) : null;

        if(!orgID) {
            logger.error("Organization ID is required", Date.now() - start);
            const errorResponse = await raesumResponses.get('requestMissingFields',['organizationId']);
            return res.status(400).json(errorResponse);
        }

        // Validate query parameters
        const validationErrors = [];

        // Validate userID if provided
        if (userID !== null || isNaN(parsedFilterUserID)) {
            validationErrors.push('userID must be a positive integer');
        }

        // Validate objectTypeID if provided
        if (objectTypeID && (isNaN(parsedObjectTypeID) || parsedObjectTypeID <= 0)) {
            validationErrors.push('objectTypeID must be a positive integer');
        }

        // Validate actionTypeID if provided
        if (actionTypeID && (isNaN(parsedActionTypeID) || parsedActionTypeID <= 0)) {
            validationErrors.push('actionTypeID must be a positive integer');
        }

        // Validate sortBy parameter
        const allowedSortFields = ['date', 'user_id', 'object_type_id', 'action_type_id'];
        if (!allowedSortFields.includes(sortBy)) {
            validationErrors.push(`sortBy must be one of: ${allowedSortFields.join(', ')}`);
        }

        // Validate sortOrder parameter
        const allowedSortOrders = ['ASC', 'DESC'];
        if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
            validationErrors.push(`sortOrder must be one of: ${allowedSortOrders.join(', ')}`);
        }

        // Return validation errors if any
        if (validationErrors.length > 0) {
            logger.warning(`Invalid query parameters: ${validationErrors.join(', ')}`, Date.now() - start);
            const validationErrorResponse = await raesumResponses.get('requestInvalidFields');
            validationErrorResponse.errors = validationErrors;
            return res.status(400).json(validationErrorResponse);
        }

        // Try to get the audit logs
        try {
            const auditLogs = await raesumAudit.getAuditLogs(
                orgID,
                userID,
                parsedObjectTypeID,
                parsedActionTypeID,
                sortBy,
                sortOrder
            );
            
            const successResponse = await raesumResponses.get('auditLogs.success');
            successResponse.data = auditLogs;
            return res.status(200).json(successResponse);
            
        } catch (error) {
            logger.error("Error retrieving audit logs: " + error, Date.now() - start);
            const errorResponse = await raesumResponses.get('auditLogs.error');
            return res.status(500).json(errorResponse);
        }
    }

}

const singleInstance = new raesumAuditController();
export default singleInstance;
