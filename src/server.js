import CorsOptions from 'cors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import config from 'config';
import { fileURLToPath } from 'url';
import { unless } from 'express-unless';
import raesumDB from './modules/raesumDB.js';
import raesumAuth from './middleware/cognitoAuthentication.js';
import { raesumLogger } from './modules/raesumLogger.js';
import raesumStartup from './modules/raesumStartup.js';
import raesumLoggerRequestFinishMiddleware from './middleware/raesumRequestLogger.js';
import raesumHealthRouter from './routes/raesumHealth.js';
import raesumAuthRouter from './routes/raesumAuth.js';
import raesumAuditRouter from './routes/raesumAudit.js';
import raesumUserRouter from './routes/raesumUser.js';
import swaggerRouter from './routes/swagger.js';
import raesumCache from './modules/raesumCache.js';
import raesumCognito from './modules/raesumCognito.js';
import raesumConfig from './modules/raesumConfig.js';
import raesumServer from './modules/raesumServer.js';
import raesumSession from './modules/raesumSession.js';
import raesumMetadata from './models/raesumMetadata.js';
import session from 'express-session';
import raesumLimiterMiddleware from './middleware/raesumRateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

export async function createApp() {
    const start = Date.now();
    logger.info(
        `Starting Raesum Environment ${process.env.NODE_ENV}`,
        Date.now() - start
    );

    // Initialize Express
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Run startup tasks
    logger.info('Running Raesum startup tasks', Date.now() - start);
    const startup = new raesumStartup();
    try {
        await startup.initialize();
    } catch (e) {
        logger.critical(
            `Raesum failed critical startup task to initialize: ${e}`,
            Date.now() - start
        );
        // Critical failure, exit Raesum
        process.exit(1);
    }

    logger.info(
        'Running Raesum startup tasks complete. Proceeding to security initialization',
        Date.now() - start
    );

    // Check configuration for potential security or stability issues
    const configCheck = await raesumServer.serverSettingsSafetyChecks();
    if (!configCheck) {
        logger.warning(
            'Raesum configuration failed safety checks.',
            Date.now() - start
        );
    }

    // Clear caches
    logger.info('Clearing Caches', Date.now() - start);
    await raesumCache.deleteSet('raesumServer');
    await raesumCache.deleteSet('cognito');
    await raesumCache.deleteSet('cache');

    logger.info('Clearing Caches Finished', Date.now() - start);

    // Test cognito connection and update list of user metadata keys
    try {
        await raesumCognito.synchronizeCognitoUserMetadata();
    } catch (e) {
        logger.critical(
            `Failed to connect to Cognito or synchronize Cognito User Metadata: ${e}`,
            Date.now() - start
        );
    }

    // Initialize Sessions

    // If proxy in use set the trust proxy flag
    const proxyPortInUse = await raesumConfig.get('server.proxyInUse');
    if (proxyPortInUse) {
        app.set('trust proxy', 1);
    }

    // Start the session and exclude paths
    const raesumSessionInstance = new raesumSession();
    const raesumSessionConfig =
        await raesumSessionInstance.createSessionConfig();

    const theSession = session(raesumSessionConfig);
    theSession.unless = unless;

    // Start session and exclude certain urls
    app.use(
        theSession.unless({
            path: ['/api/v1/health'],
        })
    );

    // Configure CORS

    let allowedOrigins = [];

    // Add the server's base URL to CORS
    const serverBaseUrl = await raesumServer.buildBaseServerURL();
    allowedOrigins.push(serverBaseUrl);

    // Add the server's running URL to CORS
    const configPort = parseInt(config.get('server.port'));
    const port = configPort ? configPort : 3000;
    const serverRunningUrl = `http://localhost:${port}`;
    allowedOrigins.push(serverRunningUrl);

    // Add any allowed origins from configuration
    const allowedOriginsConfig = await raesumConfig.get('cors.allowedOrigins');
    if (allowedOriginsConfig) {
        allowedOrigins.push(...allowedOriginsConfig);
    }

    logger.info(
        `CORS configured with these origins: ${allowedOrigins}`,
        Date.now() - start
    );

    // Initialize Security with Helmet
    app.use(helmet());

    // Configure CORS with best practices
    const corsOptions = {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
            if (!origin) return callback(null, true);

            // Check if the origin is in our allowed list
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // In production, you should whitelist specific origins
            // For now, allowing all origins for development
            // TODO: Configure allowed origins from config for production

            logger.warning(`Origin not allowed by CORS: ${origin}`);

            callback(
                new Error({
                    message: 'Origin not allowed by CORS',
                })
            );
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        optionsSuccessStatus: 204,
        maxAge: 86400, // 24 hours
    };

    // Add CORS middleware
    const corsExcludedPaths = [
        '/api/v1/auth/login',
        '/api/v1/auth/callbackSession',
        '/api/v1/auth/callbackJWT',
    ];
    app.use(cors(corsOptions).unless(corsExcludedPaths));

    // Add timing decorator for requests
    app.use((req, res, next) => {
        const start = Date.now();
        res.locals['start'] = start;
        next();
    });

    // Add unless to the logger middleware
    raesumLoggerRequestFinishMiddleware.unless = unless;

    // Log all requests except health
    app.use(
        raesumLoggerRequestFinishMiddleware.unless({
            path: ['/api/v1/health'],
        })
    );

    // Rate limiter
    const useRateLimitConfig = await raesumConfig.get(
        'ratelimiter.useRateLimiter'
    );

    if (useRateLimitConfig) {
        app.use(raesumLimiterMiddleware);
    }

    // List of paths to exclude from authentication
    const excludePaths = {
        path: [
            '/api/v1/health',
            '/api/v1/auth/login',
            '/api/v1/auth/callbackSession',
            '/api/v1/auth/callbackJWT',
            '/api/swagger',
            /\/api\/swagger\/.*/,
        ],
    };

    // Check login methods
    const loginMethods = await raesumConfig.get('login');

    if (loginMethods.jwt == true) {
        logger.info('JWT Authentication is enabled', Date.now() - start);
    } else {
        logger.info('JWT Authentication is disabled', Date.now() - start);
    }
    if (loginMethods.useSessionCookie == true) {
        logger.info(
            'Session Cookie Authentication is enabled',
            Date.now() - start
        );
    } else {
        logger.info(
            'Session Cookie Authentication is disabled',
            Date.now() - start
        );
    }

    // Add unless to the Cognito required middleware
    raesumAuth.cognitoAuth.unless = unless;

    // Add Authentication Required Middleware
    app.use(raesumAuth.cognitoAuth.unless(excludePaths));

    // Routes
    app.use('/api/v1/health', raesumHealthRouter);
    app.use('/api/v1/auth', raesumAuthRouter);
    app.use('/api/v1/audit', raesumAuditRouter);
    app.use('/api/v1/user', raesumUserRouter);

    // If the system is not a production environment add a swagger/openapi route
    const isProductionDatabase = await raesumMetadata.getByKey(
        'isProductionDatabase'
    );

    if (!isProductionDatabase) {
        logger.info(
            'Swagger/OpenAPI documentation is enabled',
            Date.now() - start
        );
        app.use('/api/swagger', swaggerRouter);
    } else {
        logger.info(
            'Swagger/OpenAPI documentation is disabled in production environment for security reasons.',
            Date.now() - start
        );
    }

    logger.info('Finished initializing Raesum', Date.now() - start);
    return app;
}

const configPort = parseInt(config.get('server.port'));
const port = configPort ? configPort : 3000;

const app = createApp().then((app) => {
    let start = Date.now();

    app.listen(port, () => {
        logger.info(`Server listening at port: ${port}!`, Date.now() - start);
    });
});
