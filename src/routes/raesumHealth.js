import express from 'express';
import raesumHealthController from "../controllers/raesumHealth.js";
const raesumHealthRouter = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the Raesum application and its dependencies
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   description: Application version
 *       503:
 *         description: Service unavailable - one or more dependencies are unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       service:
 *                         type: string
 *                         example: "database"
 *                       error:
 *                         type: string
 *                         example: "Connection timeout"
 *       500:
 *         description: Internal server error during health check
 */
raesumHealthRouter.get('/', raesumHealthController);

export default raesumHealthRouter;