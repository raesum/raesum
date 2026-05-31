import winston from 'winston';
import fs from 'fs';
import path from 'path';
import config from 'config';
import { fileURLToPath } from 'url';
import {
    CloudWatchLogsClient,
    CreateLogGroupCommand,
    CreateLogStreamCommand,
    DescribeLogGroupsCommand,
    DescribeLogStreamsCommand,
    PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The logger is the only module that should directly call config and not the async raesumConfig module (due to the latter requiring the logger as a dependency)

const consoleLogEnabled = config.get('logging.logsEnabled.console');
const fileLogEnabled = config.get('logging.logsEnabled.file');
const cloudwatchLogEnabled = config.get('logging.logsEnabled.cloudwatch');

let loggerTransports = [];
const logLevel = config.get('logging.level');

// Set up Colors and Levels
const colorSet = {
    critical: 'bold redBG white',
    error: 'red',
    warning: 'yellow',
    route: 'black greenBG',
    info: 'green',
    verbose: 'cyan',
    debug: 'grey',
};
winston.addColors(colorSet);

const levelSet = {
    critical: 0,
    error: 1,
    warning: 2,
    route: 3,
    info: 4,
    verbose: 5,
    debug: 6,
};

// Console Logger
if (consoleLogEnabled) {
    loggerTransports.push(
        new winston.transports.Console({
            level: logLevel,
            format: winston.format.combine(
                winston.format.colorize({
                    all: true,
                }),
                winston.format.simple()
            ),
        })
    );
}

// File Logger
if (fileLogEnabled) {
    // Get file and path configuration
    const filename = config.get('logging.filename');
    let filePath = config.get('logging.filePath');

    // Build the path
    // If the file setting does not being with / then build as a path relative to the root of the project
    if (!filePath.startsWith('/')) {
        filePath = path.join(__dirname, '../../', filePath);
    }

    // Add the file name
    const fullFilePath = path.join(filePath, filename);

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

        if (!fs.existsSync(filePath)) {
            // Create folder
            fs.mkdirSync(filePath, {
                recursive: true,
            });
        }
    } catch (e) {
        // Cannot create the folder. Stop loading of system
        console.log(
            JSON.stringify({
                level: 'critical',
                message: 'Unable to create log folder. Cannot start logger',
                duration: 0,
            })
        );
        process.exit(20);
    }

    try {
        // Create file if it doesn't exist
        if (!fs.existsSync(fullFilePath)) {
            fs.openSync(fullFilePath, 'w');
        }

        fs.accessSync(fullFilePath, fs.constants.R_OK | fs.constants.W_OK);
        console.log(
            JSON.stringify({
                level: 'info',
                message: `${fullFilePath} is writable.`,
                duration: 0,
            })
        );
    } catch (err) {
        // Cannot write to logs. Stop loading of system
        console.error(`!`);
        console.log(
            JSON.stringify({
                level: 'critical',
                message: `${fullFilePath} is not accessible. Cannot start logger`,
                duration: 0,
            })
        );
        process.exit(20);
    }
}

// CloudWatch Logger
if (cloudwatchLogEnabled) {
    try {
        // Get CloudWatch configuration
        let logGroup = config.get('logging.cloudwatch.logGroup');
        let logStream = config.get('logging.cloudwatch.logStream');
        const awsRegion = config.get('aws.region');
        const awsAccessKeyId = config.get('aws.accessKeyId');
        const awsSecretAccessKey = config.get('aws.secretAccessKey');

        // Validate and set defaults for logGroup
        if (
            !logGroup ||
            typeof logGroup !== 'string' ||
            logGroup.trim() === ''
        ) {
            logGroup = 'raesum-logs';
            console.log(
                JSON.stringify({
                    level: 'info',
                    message: `CloudWatch logGroup not set or invalid, using default: ${logGroup}`,
                    duration: 0,
                })
            );
        }

        // Validate and set defaults for logStream
        if (
            !logStream ||
            typeof logStream !== 'string' ||
            logStream.trim() === ''
        ) {
            logStream = 'raesum-app';
            console.log(
                JSON.stringify({
                    level: 'info',
                    message: `CloudWatch logStream not set or invalid, using default: ${logStream}`,
                    duration: 0,
                })
            );
        }

        // Configure AWS CloudWatch Logs v3 client
        const cloudwatchConfig = {
            region: awsRegion,
        };

        // Only add credentials if they're not null
        if (awsAccessKeyId && awsSecretAccessKey) {
            cloudwatchConfig.credentials = {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            };
        }

        const cloudwatchLogs = new CloudWatchLogsClient(cloudwatchConfig);

        // Create a custom Winston transport for CloudWatch
        class CloudWatchTransport extends winston.Transport {
            constructor(opts) {
                super(opts);
                this.logGroup = opts.logGroup;
                this.logStream = opts.logStream;
                this.cloudwatchLogs = opts.cloudwatchLogs;
                this.sequenceToken = null;
                this.logEvents = [];
                this.flushInterval = opts.flushInterval || 1000;
                this.maxBatchSize = opts.maxBatchSize || 100;
                this.maxMessageSize = opts.maxMessageSize || 256000;

                // Ensure log group and stream exist
                this.ensureLogGroupAndStream();

                // Set up periodic flush
                this.flushTimer = setInterval(
                    () => this.flush(),
                    this.flushInterval
                );
            }

            async ensureLogGroupAndStream() {
                try {
                    // Check if log group exists
                    try {
                        await this.cloudwatchLogs.send(
                            new DescribeLogGroupsCommand({
                                logGroupNamePrefix: this.logGroup,
                            })
                        );
                    } catch (err) {
                        // Create log group if it doesn't exist
                        await this.cloudwatchLogs.send(
                            new CreateLogGroupCommand({
                                logGroupName: this.logGroup,
                            })
                        );
                    }

                    // Check if log stream exists
                    try {
                        const streams = await this.cloudwatchLogs.send(
                            new DescribeLogStreamsCommand({
                                logGroupName: this.logGroup,
                                logStreamNamePrefix: this.logStream,
                            })
                        );

                        if (
                            !streams.logStreams ||
                            streams.logStreams.length === 0
                        ) {
                            // Create log stream if it doesn't exist
                            await this.cloudwatchLogs.send(
                                new CreateLogStreamCommand({
                                    logGroupName: this.logGroup,
                                    logStreamName: this.logStream,
                                })
                            );
                        } else {
                            // Get sequence token from existing stream
                            this.sequenceToken =
                                streams.logStreams[0].uploadSequenceToken;
                        }
                    } catch (err) {
                        // Create log stream if describe fails
                        await this.cloudwatchLogs.send(
                            new CreateLogStreamCommand({
                                logGroupName: this.logGroup,
                                logStreamName: this.logStream,
                            })
                        );
                    }
                } catch (err) {
                    console.error(
                        JSON.stringify({
                            level: 'error',
                            message: `Failed to ensure CloudWatch log group/stream: ${err.message}`,
                            duration: 0,
                        })
                    );
                }
            }

            log(info, callback) {
                setImmediate(() => {
                    this.emit('logged', info);
                });

                const message = JSON.stringify(info);

                // Truncate message if it's too large
                const truncatedMessage =
                    message.length > this.maxMessageSize
                        ? message.substring(0, this.maxMessageSize)
                        : message;

                this.logEvents.push({
                    message: truncatedMessage,
                    timestamp: Date.now(),
                });

                // Flush if we've reached max batch size
                if (this.logEvents.length >= this.maxBatchSize) {
                    this.flush();
                }

                callback();
            }

            async flush() {
                if (this.logEvents.length === 0) return;

                const eventsToSend = [...this.logEvents];
                this.logEvents = [];

                try {
                    const params = {
                        logGroupName: this.logGroup,
                        logStreamName: this.logStream,
                        logEvents: eventsToSend,
                    };

                    if (this.sequenceToken) {
                        params.sequenceToken = this.sequenceToken;
                    }

                    const result = await this.cloudwatchLogs.send(
                        new PutLogEventsCommand(params)
                    );

                    this.sequenceToken = result.nextSequenceToken;
                } catch (err) {
                    console.error(
                        JSON.stringify({
                            level: 'error',
                            message: `Failed to send logs to CloudWatch: ${err.message}`,
                            duration: 0,
                        })
                    );
                    // Re-add failed events to try again
                    this.logEvents.unshift(...eventsToSend);
                }
            }
        }

        loggerTransports.push(
            new CloudWatchTransport({
                logGroup: logGroup,
                logStream: logStream,
                cloudwatchLogs: cloudwatchLogs,
                level: logLevel,
                format: winston.format.json(),
            })
        );

        console.log(
            JSON.stringify({
                level: 'info',
                message: `CloudWatch logging enabled for group: ${logGroup}, stream: ${logStream}`,
                duration: 0,
            })
        );
    } catch (cloudwatchError) {
        console.error(
            JSON.stringify({
                level: 'critical',
                message: `Failed to initialize CloudWatch logging: ${cloudwatchError.message}`,
                duration: 0,
            })
        );
        process.exit(20);
    }
}

// Start the logging system
const logger = winston.createLogger({
    levels: levelSet,

    format: winston.format.combine(winston.format.timestamp()),
    transports: loggerTransports,
});

// Standard intra-module and intra-function logger
export const raesumLogger = function (fileName) {
    const originFile = path.basename(fileName);

    function log(level, message, duration, statusCode, route, userId) {
        // Set a default user
        if (typeof usesrID === 'undefined') {
            userId = 0;
        }

        // If req is set and there is a userID, log that user ID
        if (typeof req != 'undefined') {
            // eslint-disable-next-line no-undef
            if (Object.hasOwn(req, 'user') && Object.hasOwn(req.user, 'id')) {
                // eslint-disable-next-line no-undef
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
            route: route,
        };

        logger.log(logEntry);
    }

    return {
        route: (
            message = '',
            duration = 0,
            route = '',
            statusCode = 0,
            userId = 0
        ) => {
            log('route', message, duration, statusCode, route, userId);
        },
        critical: (message = '', duration = 0, statusCode = 0) => {
            log('critical', message, duration, statusCode);
        },
        error: (message = '', duration = 0, statusCode = 0) => {
            log('error', message, duration, statusCode);
        },
        warning: (message = '', duration = 0, statusCode = 0) => {
            log('warning', message, duration, statusCode);
        },
        info: (message = '', duration = 0, statusCode = 0) => {
            log('info', message, duration, statusCode);
        },

        debug: (message = '', duration = 0, statusCode = 0) => {
            log('debug', message, duration, statusCode);
        },
        verbose: (message = '', duration = 0, statusCode = 0) => {
            log('verbose', message, duration, statusCode);
        },
    };
};
