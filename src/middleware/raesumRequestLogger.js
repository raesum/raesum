import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);


// Middleware to log all responses
export const raesumLoggerRequestFinishMiddleware = function(req,res,next){
    const start = Date.now();

    res.on("finish", () => {
        const end = new Date();
        const duration = end - start;

        let message = '';
        if (res.hasOwnProperty('message')) {
            message = res.message;
        }

        // Set a default user
        let userId = 0;

        // If req is set and there is a userID, log that user ID
        if (typeof req != 'undefined') {
            if (req.hasOwnProperty('user') && req.user.hasOwnProperty('id')) {
                userId = req.user.id;
            }
        }


        const temporary = {
            userId: userId,
            duration: `${duration}`,
            statusCode: res.statusCode,
            message: message,
            urlPath: req.originalUrl
        }

        logger.route(`Finished Request: ${req.originalUrl}`, duration, req.originalUrl, res.statusCode, userId);

    });

    next();
}

export default raesumLoggerRequestFinishMiddleware;