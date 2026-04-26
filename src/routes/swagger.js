import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerDefinition from '../../swagger/definition.js';
import raesumMetadata from '../models/raesumMetadata.js';
import raesumResponses from '../modules/raesumResponses.js';
import {raesumLogger} from '../modules/raesumLogger.js';
import raesumServer from '../modules/raesumServer.js';

const __filename = import.meta.url;
const logger = raesumLogger(__filename);

const swaggerRouter = express.Router();

// Generate Swagger specification
const generateSwaggerSpec = async () => {
    const serverURL = await raesumServer.buildBaseServerURL();
    
    const options = {
        definition: {
            ...swaggerDefinition,
            servers: [
                {
                    url: `${serverURL}/api/v1`,
                    description: 'Raesum API Server'
                }
            ]
        },
        apis: [
            './src/routes/*.js',
            './src/controllers/*.js',
            './src/models/*.js'
        ]
    };
    
    return swaggerJsdoc(options);
};

/**
 * @swagger
 * /api/swagger:
 *   get:
 *     summary: Serve OpenAPI/Swagger documentation
 *     description: Returns the OpenAPI 3.0 specification for the Raesum API
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: OpenAPI specification in JSON format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0 specification
 *       404:
 *         description: API documentation not available in production
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API documentation is not available on production servers"
 */
swaggerRouter.get('/', async (req, res) => {
    const start = Date.now();
    
    try {
        logger.info("Serving API documentation", Date.now() - start);
        
        const swaggerSpec = await generateSwaggerSpec();
        res.json(swaggerSpec);
        
    } catch (error) {
        logger.error(`Error serving API documentation: ${error.message}`, Date.now() - start);
        
        const message = await raesumResponses.get("internalServerError");
        res.status(message.code).json({
            ...message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve Swagger UI with proper middleware order
const swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Raesum API Documentation'
};

// Serve Swagger UI assets first
swaggerRouter.use('/docs', swaggerUi.serve);

// Setup Swagger UI with dynamic spec
swaggerRouter.get('/docs', async (req, res, next) => {
    try {
        const swaggerSpec = await generateSwaggerSpec();
        return swaggerUi.setup(swaggerSpec, swaggerUiOptions)(req, res, next);
    } catch (error) {
        logger.error(`Error serving Swagger UI: ${error.message}`);
        next(error);
    }
});

export default swaggerRouter;
