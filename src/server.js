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
import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./modules/raesumLogger.js";
import raesumStartup from "./modules/raesumStartup.js";


const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

export async function createApp() {
    const start = Date.now();
    logger.info(`Starting Raesum Environment ${process.env.NODE_ENV}`, Date.now()-start);

    // Initialize Express
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));


    // Run startup tasks
    logger.info("Running Raesum startup tasks", Date.now()-start);
    const startup = new raesumStartup();
    try{
        await startup.initialize();
    }catch(e){
        logger.critical(`Raesum failed critical startup task to initialize: ${e}`, Date.now() - start);
        // Critical failure, exit Raesum
        process.exit(1);
    }

    logger.info("Running Raesum startup tasks complete. Proceeding to security initialization", Date.now()-start);



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

    // Add unless to the Cognito required middleware
    raesumCognitoAuthRequired.unless = unless;

    // Add Authentication Required Middleware
    app.use(
        raesumCognitoAuthRequired.unless({
            path: [
                "/health",
                "/login"
            ]
        })
    )

    // Routes






    logger.info("Finished initializing Raesum", Date.now()-start);
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

