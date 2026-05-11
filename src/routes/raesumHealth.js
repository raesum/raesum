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
 *                 title:
 *                   type: string
 *                   example: "Health Check"
 *                   description: Response title
 *                 message:
 *                   type: string
 *                   example: "Passed"
 *                   description: Health check result message
 *                 messageId:
 *                   type: integer
 *                   example: 0
 *                   description: Message identifier
 *       500:
 *         description: Application is unhealthy - one or more dependencies are failing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   example: "Health Check"
 *                   description: Response title
 *                 message:
 *                   type: string
 *                   example: "Failed"
 *                   description: Health check result message
 *                 messageId:
 *                   type: integer
 *                   example: 0
 *                   description: Message identifier
 */
raesumHealthRouter.get('/', raesumHealthController);

export default raesumHealthRouter;