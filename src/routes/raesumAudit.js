import { Router } from 'express';
import raesumAuditController from '../controllers/raesumAudit.js';

const router = Router();

/**
 * GET /api/v1/audit/logs
 * Get audit logs with optional filtering and sorting
 * 
 * Query Parameters:
 * - organizationId (integer, required): Organization ID to filter logs for
 * - userId (integer, optional): Filter logs for specific user ID
 * - objectTypeID (integer, optional): Filter logs for specific object type ID
 * - actionTypeID (integer, optional): Filter logs for specific action type ID
 * - sortBy (string, optional): Sort field - 'date', 'user_id', 'object_type_id', 'action_type_id' (default: 'date')
 * - sortOrder (string, optional): Sort order - 'ASC' or 'DESC' (default: 'DESC')
 * 
 * Authentication: Required
 * Authorization: Required - User must have 'read' permission on 'audit' object type
 */
router.get('/logs', raesumAuditController.getAuditLogs);

export default router;
