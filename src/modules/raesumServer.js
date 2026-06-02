import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumConfig from '../modules/raesumConfig.js';
import raesumCache from './raesumCache.js';
import raesumMetadata from '../models/raesumMetadata.js';
import raesumCognito from './raesumCognito.js';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { buildAWSClientConfig } from '../utils/awsUtils.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumServer {
    #cacheObjectType = 'raesumServer';
    async buildBaseServerURL() {
        const start = Date.now();

        // Get from cache
        const cacheKey = 'serverURL';
        const cacheValue = await raesumCache.get(
            cacheKey,
            this.#cacheObjectType
        );

        if (cacheValue) {
            logger.debug(`Server URL retrieved from cache: ${cacheValue}`);
            return cacheValue;
        }

        const protocol = await raesumConfig.get('server.protocol');
        const proxyInUse = await raesumConfig.get('server.proxyInUse');
        let port = await raesumConfig.get('server.port');
        const host = await raesumConfig.get('server.host');

        // If a proxy is present, use the proxy port
        if (proxyInUse) {
            port = await raesumConfig.get('server.proxyPort');
        }

        // Assemble the URL
        let serverURL = protocol + '://' + host;

        // If the protocol does not equal the default port, append the port
        if (
            (protocol == 'http' && port != 80) ||
            (protocol == 'https' && port != 443)
        ) {
            serverURL += ':' + port;
        }

        // Set cache
        await raesumCache.set(
            cacheKey,
            serverURL,
            86400,
            this.#cacheObjectType
        );

        logger.info('Server URL built: ' + serverURL, Date.now() - start);

        // Return
        return serverURL;
    }

    async createRedisConfig(redisConfigSet) {
        const start = Date.now();

        // List of excluded config keys
        const excludedKeys = ['credentials', 'lazyConnect', 'retryStrategy'];

        // Create new config object
        let redisConfig = {
            lazyConnect: true,
            // tls: {
            //     checkServerIdentity: () => undefined,
            // }
        };

        // Loop through each config key to build new config object if defined and not null
        for (const key in redisConfigSet) {
            if (
                !excludedKeys.includes(key) &&
                redisConfigSet[key] != undefined &&
                redisConfigSet[key] != null
            ) {
                redisConfig[key] = redisConfigSet[key];
            }
        }

        // The TLS override exists to allow for self-signed certs (and AWS support)
        if (redisConfigSet.tls !== false) {
            redisConfig.tls.checkServerIdentity = () => undefined;
        }

        // Get username and password from config if set
        if (
            redisConfigSet.credentials != undefined &&
            redisConfigSet.credentials.username != undefined &&
            redisConfigSet.credentials.password != undefined &&
            redisConfigSet.credentials.username !== null &&
            redisConfigSet.credentials.password !== null
        ) {
            redisConfig.username = redisConfigSet.credentials.username;
            redisConfig.password = redisConfigSet.credentials.password;
        }

        // If the databaseNumber property is present, convert it to db
        if (
            Object.hasOwn(redisConfigSet, 'databaseNumber') &&
            redisConfigSet.databaseNumber !== null &&
            typeof redisConfigSet.databaseNumber == 'number'
        ) {
            redisConfig.db = redisConfigSet.databaseNumber;
        }

        return redisConfig;
    }

    async serverSettingsSafetyChecks() {
        const start = Date.now();

        let noErrors = true;

        logger.info(
            'Running server settings safety checks',
            Date.now() - start
        );

        // Get the server configuration
        const serverConfig = await raesumConfig.get('server');
        const isProductionDatabase = await raesumMetadata.getByKey(
            'isProductionDatabase'
        );
        const cacheConfig = await raesumConfig.get('cache');
        const sessionConfig = await raesumConfig.get('session');
        const loginConfig = await raesumConfig.get('login');

        // Is the server a production server?
        if (isProductionDatabase) {
            // Is the cache using memory mode?
            if (cacheConfig.type == 'memory') {
                logger.warn(
                    'Cache is using memory mode on a production server',
                    Date.now() - start
                );
                noErrors = false;
            }

            // Are the sessions using memory mode?
            if (sessionConfig.type == 'memory') {
                logger.warn(
                    'Sessions are using memory mode on a production server',
                    Date.now() - start
                );
                noErrors = false;
            }

            // Are the sessions using the default secret?
            if (sessionConfig.secret == 'changeThisFromDefault') {
                logger.error(
                    'Sessions are using the default secret on a production server',
                    Date.now() - start
                );
                noErrors = false;
            }

            // Is the protocol http?
            if (serverConfig.protocol == 'http') {
                logger.error(
                    'Server is using http protocol on a production server',
                    Date.now() - start
                );
                noErrors = false;
            }

            // Are the cloud secrets keys an empty array?
            const cloudSecrets = await raesumConfig.get('cloudBasedSecrets');
            if (cloudSecrets.length == 0) {
                logger.critical(
                    'No secrets are stored in AWS secrets manager on a production server.',
                    Date.now() - start
                );
                noErrors = false;
            }

            // Is the host localhost?
            if (serverConfig.host == 'localhost') {
                logger.warn('Server host is localhost', Date.now() - start);
                noErrors = false;
            }

            // Is the session appname set to default?
            if (sessionConfig.appname == 'default') {
                logger.warn(
                    'Session appname is set to default',
                    Date.now() - start
                );
                noErrors = false;
            }
        }

        // If the session and cache are using redis and use the same redis instance
        if (cacheConfig.type == 'redis' && sessionConfig.type == 'redis') {
            const connections = await raesumConfig.get('connections');

            if (
                connections.cache.redis.host ==
                    connections.session.redis.host &&
                connections.cache.redis.port == connections.session.redis.port
            ) {
                logger.warning(
                    'The session cache and general cache are using the same redis instance. It is recommended to use separate instances for session and general cache.',
                    Date.now() - start
                );
                noErrors = false;

                // If the session and cache are using the same server number AND host, throw a critical error
                if (
                    connections.cache.redis.databaseNumber ==
                    connections.session.redis.databaseNumber
                ) {
                    logger.critical(
                        'The session cache and general cache are using the same database number AND host. This could lead to instability or security issues.',
                        Date.now() - start
                    );
                    noErrors = false;
                }
            }
        }

        // Get the login configuration
        if (loginConfig.jwt == false && loginConfig.useSessionCookie == false) {
            // If both login types are disabled, throw a critical error
            logger.critical(
                'Both JWT and Session Cookie login are disabled. One of these must be enabled or users will NEVER be able to log in or use authenticated routes',
                Date.now() - start
            );
            noErrors = false;
        }

        // Check Cognito OAuth scope configuration when token revocation is enabled
        const cognitoConfig = await raesumConfig.get('aws.cognito');
        // Get Cognito client description to check allowed OAuth scopes
        const clientDescription =
            await raesumCognito.getCognitoClientDescription;

        try {
            if (cognitoConfig && cognitoConfig.enableTokenRevocation === true) {
                logger.info(
                    'Token revocation is enabled, checking OAuth scope configuration',
                    Date.now() - start
                );

                try {
                    if (clientDescription && clientDescription.UserPoolClient) {
                        const allowedOAuthScopes =
                            clientDescription.UserPoolClient
                                .AllowedOAuthScopes || [];
                        const adminScope = 'aws.cognito.signin.user.admin';

                        if (!allowedOAuthScopes.includes(adminScope)) {
                            logger.critical(
                                `Token revocation is enabled but required OAuth scope '${adminScope}' is not in the allowed OAuth scopes list in Cognito. This will prevent proper token management and user administration.`,
                                Date.now() - start
                            );
                            logger.critical(
                                `Current allowed OAuth scopes: ${allowedOAuthScopes.join(', ')}`,
                                Date.now() - start
                            );
                            logger.critical(
                                `Please add '${adminScope}' to the allowed OAuth scopes in your Cognito User Pool Client configuration.`,
                                Date.now() - start
                            );
                            noErrors = false;
                        } else {
                            logger.info(
                                `Required OAuth scope '${adminScope}' is properly configured in Cognito`,
                                Date.now() - start
                            );
                        }
                    } else {
                        logger.warning(
                            'Unable to retrieve Cognito client description for OAuth scope validation',
                            Date.now() - start
                        );
                    }
                } catch (cognitoError) {
                    logger.warning(
                        `Failed to validate Cognito OAuth scopes: ${cognitoError.message}`,
                        Date.now() - start
                    );
                    logger.warning(
                        'This may indicate a configuration issue with your Cognito settings',
                        Date.now() - start
                    );
                }
            }
        } catch (configError) {
            logger.warning(
                `Failed to check Cognito configuration for OAuth scope validation: ${configError.message}`,
                Date.now() - start
            );
        }

        // Check Cognito callback URL configuration
        try {
            logger.info(
                'Checking Cognito callback URL configuration',
                Date.now() - start
            );

            // Build the server's callback URL
            const serverCallbackURL = [];

            // get the allowedLogin types from raesumConfig
            const allowedLogin = await raesumConfig.get('login');

            // if session login is allowed, add the session callback to the test list
            if (allowedLogin.session) {
                serverCallbackURL.push(
                    `${serverConfig.protocol}://${serverConfig.host}/api/v1/auth/callbackSession`
                );
            }

            // if JWT login is allowed, add the JWT callback to the test list
            if (allowedLogin.jwt) {
                serverCallbackURL.push(
                    `${serverConfig.protocol}://${serverConfig.host}/`
                );
            }

            try {
                if (clientDescription && clientDescription.UserPoolClient) {
                    const allowedCallbacks =
                        clientDescription.UserPoolClient.CallbackURLs || [];

                    for (const callback of serverCallbackURL) {
                        if (!allowedCallbacks.includes(callback)) {
                            logger.warning(
                                `Server callback URL '${callback}' is not in the allowed callback URLs list in Cognito. Session cookie logins may not work properly.`,
                                Date.now() - start
                            );
                            logger.warning(
                                `Current allowed callback URLs: ${allowedCallbacks.join(', ')}`,
                                Date.now() - start
                            );
                            logger.warning(
                                `Please add '${callback}' to the allowed callback URLs in your Cognito User Pool Client configuration.`,
                                Date.now() - start
                            );
                            // Note: This is a warning, not an error, so noErrors is not set to false
                        } else {
                            logger.info(
                                `Server callback URL '${callback}' is in the allowed callback URLs list in Cognito.`,
                                Date.now() - start
                            );
                        }
                    }
                } else {
                    logger.warning(
                        'Unable to retrieve Cognito client description for callback URL validation',
                        Date.now() - start
                    );
                }
            } catch (cognitoError) {
                logger.warning(
                    `Failed to validate Cognito callback URLs: ${cognitoError.message}`,
                    Date.now() - start
                );
                logger.warning(
                    'This may indicate a configuration issue with your Cognito settings',
                    Date.now() - start
                );
            }
        } catch (configError) {
            logger.warning(
                `Failed to check Cognito callback URL configuration: ${configError.message}`,
                Date.now() - start
            );
        }

        // Test S3 bucket configuration
        try {
            logger.info('Testing S3 bucket configuration', Date.now() - start);

            const s3Config = await raesumConfig.get('aws.s3');
            const awsRegion = await raesumConfig.get('aws.region');
            const accessKey = await raesumConfig.get('aws.accessKeyId');
            const secretKey = await raesumConfig.get('aws.secretAccessKey');

            if (s3Config && accessKey && secretKey) {
                const bucketTypes = ['public', 'quarantine', 'private'];
                const timestamp = Date.now();

                for (const bucketType of bucketTypes) {
                    const bucketConfig = s3Config[bucketType];
                    if (bucketConfig && bucketConfig.bucketName) {
                        try {
                            logger.info(
                                `Testing S3 bucket: ${bucketType} (${bucketConfig.bucketName})`,
                                Date.now() - start
                            );

                            // Create S3 client
                            const awsConfig = await buildAWSClientConfig();
                            const s3Client = new S3Client(awsConfig);

                            // Build test file path with key prefix, raesumStartup, and timestamp
                            const keyPrefix = bucketConfig.keyPrefix || '';
                            const testFileName = `raesumStartup/${timestamp}.txt`;
                            const testFilePath = keyPrefix
                                ? `${keyPrefix}/${testFileName}`
                                : testFileName;

                            // Upload test file
                            const putCommand = new PutObjectCommand({
                                Bucket: bucketConfig.bucketName,
                                Key: testFilePath,
                                Body: 'S3 bucket test file for raesum startup',
                            });

                            await s3Client.send(putCommand);
                            logger.info(
                                `Successfully uploaded test file to S3 bucket: ${bucketType}`,
                                Date.now() - start
                            );

                            // Delete test file
                            const deleteCommand = new DeleteObjectCommand({
                                Bucket: bucketConfig.bucketName,
                                Key: testFilePath,
                            });

                            await s3Client.send(deleteCommand);
                            logger.info(
                                `Successfully deleted test file from S3 bucket: ${bucketType}`,
                                Date.now() - start
                            );
                        } catch (s3Error) {
                            logger.critical(
                                `Failed to test S3 bucket ${bucketType}: ${s3Error.message}`,
                                Date.now() - start
                            );
                            noErrors = false;
                        }
                    }
                }
            } else {
                logger.critical(
                    'S3 configuration is incomplete, skipping S3 bucket tests',
                    Date.now() - start
                );
            }
        } catch (s3ConfigError) {
            logger.critical(
                `Failed to test S3 bucket configuration: ${s3ConfigError.message}`,
                Date.now() - start
            );
        }

        // Check CloudWatch logging configuration
        try {
            const cloudWatcLoggingEnabled = await raesumConfig.get(
                'logging.logsEnabled.cloudwatch'
            );
            if (cloudWatcLoggingEnabled === true) {
                const awsAccessKeyId =
                    await raesumConfig.get('aws.accessKeyId');
                const awsSecretAccessKey = await raesumConfig.get(
                    'aws.secretAccessKey'
                );
                const cloudBasedSecrets =
                    await raesumConfig.get('cloudBasedSecrets');

                if (awsAccessKeyId !== null || awsSecretAccessKey !== null) {
                    if (cloudBasedSecrets && cloudBasedSecrets.length > 0) {
                        if (
                            cloudBasedSecrets.includes('aws.accessKeyId') ||
                            cloudBasedSecrets.includes('aws.secretAccessKey')
                        ) {
                            logger.error(
                                'logging directly to cloudwatch from the application cannot be used with aws.accessKeyId, aws.secretAccessKey being stored as cloud secrets',
                                Date.now() - start
                            );
                            noErrors = false;
                        }
                    }
                }
            }
        } catch (loggingConfigError) {
            logger.warning(
                `Failed to check CloudWatch logging configuration: ${loggingConfigError.message}`,
                Date.now() - start
            );
        }

        if (noErrors) {
            logger.info(
                'Server settings safety checks passed',
                Date.now() - start
            );
        }

        return noErrors;
    }
}

const singleInstance = new raesumServer();
export default singleInstance;
