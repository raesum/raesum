import winston, { addColors, createLogger, format, transports } from 'winston';
import fs from 'fs';
import path from 'path';
import config from 'config';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The logger is the only module that should directly call config and not the async raesirConfig module (due to the latter requiring the logger as a dependency)

const consoleLogEnabled = config.get('logging.logsEnabled.console');
const fileLogEnabled = config.get('logging.logsEnabled.file');

let loggerTransports = [];
const logLevel = config.get("logging.level");

// Set up Colors and Levels
const colorSet = {
    critical: "bold redBG white",
    error: "red",
    warning: "yellow",
    info: "green",
    debug: "cyan",
    verbose: "grey",
}
winston.addColors(colorSet);

const levelSet ={
        critical: 0,
        error: 1,
        warning: 2,
        info: 3,
        debug: 4,
        verbose: 5,
}

// Console Logger
if(consoleLogEnabled){
    loggerTransports.push(new winston.transports.Console(
        {
            level: logLevel,
            format: winston.format.combine(
                winston.format.colorize({
                    all: true
                }),
                winston.format.simple()
            )
        }));
}


// File Logger
if(fileLogEnabled){

    // Get file and path configuration
    const filename = config.get("logging.filename");
    let filePath = config.get("logging.filePath");

    // Build the path
        // If the file setting does not being with / then build as a path relative to the root of the project
        if (!filePath.startsWith('/')) {
            filePath = path.join(__dirname, '../../', filePath);
        }

        // Add the file name
        const fullFilePath = path.join(filePath,filename);

        loggerTransports.push(
            new winston.transports.File({
                filename: fullFilePath,
                level: logLevel,
                format: winston.format.json(),
            })
        );

        // Test to see if log folder and file is writable
    try {
        // Does folder exist?
        console.log(`Testing ${filePath}`)
        if (!fs.existsSync(filePath)) {
            console.log(`Making ${filePath}`)
            // Create folder
            fs.mkdirSync(filePath, {
                recursive: true,
            });
        }


    }catch(e){
        // Cannot create the folder. Stop loading of system
        console.log(JSON.stringify({
            "level": "critical",
            "message": "Unable to create log folder. Cannot start logger",
            "duration": 0
        }));
        process.exit(20);
    }

    try {
        // Create file if it doesn't exist
        if (!fs.existsSync(fullFilePath)) {
            fs.openSync(fullFilePath, 'w');
        }

        fs.accessSync(fullFilePath, fs.constants.R_OK | fs.constants.W_OK)
        console.log(JSON.stringify({
            "level": "info",
            "message": `${fullFilePath} is writable.`,
            "duration": 0
        }));
    } catch (err) {
        // Cannot write to logs. Stop loading of system
        console.error(`!`)
        console.log(JSON.stringify({
            "level": "critical",
            "message": `${fullFilePath} is not accessible. Cannot start logger`,
            "duration": 0
        }));
        process.exit(20);
    }

}


// Start the logging system
const logger = winston.createLogger({
    levels: levelSet,

    format: winston.format.combine(
        winston.format.timestamp(),
        ),
    transports: loggerTransports,
});

// Middleware to log all responses
export const raesirLoggerRequestFinishMiddleware = function(req,res,next){
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

        logger.info({
            userId: userId,
            duration: `${duration}`,
            statusCode: res.statusCode,
            message: message,
            urlPath: req.originalUrl
        });

    });

    next();
}

// Standard intra-module and intra-function logger
export const raesirLogger = function(fileName){
    const originFile = path.basename(fileName);

    function log ( level, message, duration, type, statusCode,
    ) {
        // Set a default user
        let userId = 0;

        // If req is set and there is a userID, log that user ID
        if (typeof req != 'undefined') {
            if (req.hasOwnProperty('user') && req.user.hasOwnProperty('id')) {
                userId = req.user.id;
            }
        }

        const logEntry = {
            level: level,
            message: message,
            duration: duration,
            userId: userId,
            originFile: originFile,
            statusCode: statusCode,
        };
        logger.log(logEntry);
    };

    return {
        critical: (
            message = '',
            duration = 0,
            statusCode = 0
        ) => {
            log(
                'critical',
                message,
                duration,
                statusCode
            );
        },
        error: (
            message = '',
            duration = 0,
            statusCode = 0
        ) => {
            log(
                'error',
                message,
                duration,
                statusCode
            );
        },
        warning: (
            message = '',
            duration = 0,
            statusCode = 0
        ) => {
            log(
                'warning',
                message,
                duration,
                statusCode
            );
        },
        info: (
            message = '',
            duration = 0,
            statusCode = 0
        ) => {
            log(
                'info',
                message,
                duration,
                statusCode
            );
        },
        debug: (
            message = '',
            duration = 0,
            statusCode = 0
        ) => {
            log(
                'debug',
                message,
                duration,
                statusCode
            );
        },
        verbose: (
            message = '',
            duration = 0,
            statusCode = 0
        ) => {
            log(
                'verbose',
                message,
                duration,
                statusCode
            );
        },
    }

}
