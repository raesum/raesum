import { Router } from 'express';
import raesumAuditController from '../controllers/raesumAudit.js';

const router = Router();

/**
 * @swagger
 * /api/v1/audit/get:
 *   get:
 *     summary: Get audit logs with optional filtering
 *     description: Retrieve audit logs for an organization with various filtering and pagination options. Authorization is required - users can only access logs for their organization, with limited access to their own records if not authorized at organization level.
 *     tags:
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: Organization ID to filter audit logs for (defaults to user's current organization)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: User ID to filter audit logs for (if not authorized at organization level, will be forced to requester's ID)
 *       - in: query
 *         name: objectTypeID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: Object type ID to filter audit logs for
 *       - in: query
 *         name: actionTypeID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: Action type ID to filter audit logs for
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, user_id, object_type_id, action_type_id]
 *           default: date
 *         required: false
 *         description: Field to sort audit logs by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         required: false
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         default: null
 *         description: Maximum number of audit logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: false
 *         default: 0
 *         description: Number of audit logs to skip for pagination
 *     responses:
 *       200:
 *         description: Successfully retrieved audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Audit log entry ID
 *                   user_id:
 *                     type: string
 *                     description: ID of the user who performed the action
 *                   username:
 *                     type: string
 *                     description: Username of the user who performed the action
 *                   action_id:
 *                     type: integer
 *                     description: ID of the action type that was performed
 *                   action_name:
 *                     type: string
 *                     description: Human-readable name of the action
 *                   action_string_key:
 *                     type: string
 *                     description: String key for the action (e.g., 'read', 'create', 'update', 'delete')
 *                   object_type_id:
 *                     type: integer
 *                     description: ID of the object type that was acted upon
 *                   object_type_name:
 *                     type: string
 *                     description: Human-readable name of the object type
 *                   object_type_string_key:
 *                     type: string
 *                     description: String key for the object type (e.g., 'raesum_user', 'raesum_organization')
 *                   object_id:
 *                     type: integer
 *                     description: ID of the specific object that was acted upon
 *                   event_at:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when the action occurred
 *                   metadata:
 *                     type: object
 *                     nullable: true
 *                     description: Additional metadata about the audit event (can be null)
 *       400:
 *         description: Bad request - invalid parameters
 *       403:
 *         description: Forbidden - not authorized to access audit logs
 *       500:
 *         description: Internal server error
 */
router.get('/get', raesumAuditController.getAuditLogs);

export default router;
