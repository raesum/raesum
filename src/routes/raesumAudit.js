import { Router } from 'express';
import raesumAuditController from '../controllers/raesumAudit.js';
import validate from '../middleware/joiValidator.js';
import { auditSchemas } from '../validators/raesumAuditValidator.js';

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
 *                   description: Array of audit log entries
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Audit log entry ID
 *                         example: "2237"
 *                       user_id:
 *                         type: string
 *                         description: ID of the user who performed the action
 *                         example: "1"
 *                       username:
 *                         type: string
 *                         description: Username of the user who performed the action
 *                         example: "odin"
 *                       action_id:
 *                         type: integer
 *                         description: ID of the action type that was performed
 *                         example: 1
 *                       action_name:
 *                         type: string
 *                         description: Human-readable name of the action
 *                         example: "Log In"
 *                       action_string_key:
 *                         type: string
 *                         description: String key for the action
 *                         example: "log_in"
 *                       object_type_id:
 *                         type: integer
 *                         description: ID of the object type that was acted upon
 *                         example: 1
 *                       object_type_name:
 *                         type: string
 *                         description: Human-readable name of the object type
 *                         example: "Users"
 *                       object_type_string_key:
 *                         type: string
 *                         description: String key for the object type
 *                         example: "raesum_user"
 *                       object_id:
 *                         type: integer
 *                         description: ID of the specific object that was acted upon
 *                         example: 1
 *                       event_at:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp when the action occurred
 *                         example: "2026-05-03T20:43:31.797Z"
 *                       metadata:
 *                         type: object
 *                         nullable: true
 *                         description: Additional metadata about the audit event (can be null)
 *                         example: null
 */
router.get(
    '/get',
    validate(auditSchemas.getAuditLogs, 'query'),
    raesumAuditController.getAuditLogs
);

export default router;
