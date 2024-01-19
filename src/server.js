import CorsOptions from 'cors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import config from "config";
import {raesirLogger} from "./modules/raesirLogger.js"
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const logger = raesirLogger(__filename, "module");

export async function createApp() {
    const start = Date.now();

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

    return app;
}

const configPort = parseInt(config.get('server.port'));
const port = configPort ? configPort : 3000;
let start = Date.now();

const app = createApp().then((app) => {
    app.listen(port, () => {
        //logger.notice(`Server listening at ${port}!`, Date.now() - start);
    });
});

