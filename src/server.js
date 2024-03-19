import CorsOptions from 'cors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import config from "config";
import { fileURLToPath } from 'url';
import { unless } from "express-unless";
import raesumDB from "./modules/raesumDB.js";
import {raesumCognitoAuthRequired} from "./middleware/cognitoAuthentication.js";
// Logger
import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./modules/raesumLogger.js";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

export async function createApp() {
    const start = Date.now();
    logger.info("Starting Raesum", Date.now()-start);

    // Initialize Express
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));


    // Add timing decorator for requests
    app.use((req, res, next) => {
        const start = Date.now();
        res.locals['start'] = start;
        next();
    });


    // Initialize Security




    // Add unless to the logger middleware
    raesumLoggerRequestFinishMiddleware.unless = unless;

    // Log all requests except health
    app.use(
        raesumLoggerRequestFinishMiddleware.unless({
            path: [
                "/health"
                ]
        })
    );

    // Add Authentication Required Middleware
    raesumCognitoAuthRequired.unless = unless;

    app.use(
        raesumCognitoAuthRequired.unless({
            path: [
                "/health",
                "/login"
            ]
        })
    )

    // Routes






    logger.info("Finished Initializing Raesum", Date.now()-start);
    return app;
}

const configPort = parseInt(config.get('server.port'));
const port = configPort ? configPort : 3000;
let start = Date.now();

const app = createApp().then((app) => {
    app.listen(port, () => {
        logger.info(`Server listening at ${port}!`, Date.now() - start);
    });
});

