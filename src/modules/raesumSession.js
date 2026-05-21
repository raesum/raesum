import raesumConfig from './raesumConfig.js';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';
import { raesumLogger } from './raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumServer from './raesumServer.js';
import raesumMetadata from '../models/raesumMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumSession {
    // Configure sessions
    async createSessionConfig() {
        // Get session configuration
        const sessionConfig = await raesumConfig.get('session');
        const serverConfig = await raesumConfig.get('server');

        // Build the session configuration object
        const sessionConfiguration = {
            resave: false, // required: force lightweight session keep alive (touch)
            saveUninitialized: false, // recommended: only save session when data exists
            secret: sessionConfig.secret,
            store: undefined,
            cookie: {
                httpOnly: true,
                secure: false,
                maxAge: sessionConfig.sessionMaximumAgeSeconds * 1000,
            },
            unset: 'destroy',
        };

        // If development mode is enabled, set the secure flag to false
        // Get the server's database metadata tattoo on whether it can be used for development
        let isProdDb = true;
        try {
            isProdDb = await raesumMetadata.getByKey('isProductionDatabase');
        } catch (e) {
            logger.error(
                'Could not get isProductionDatabase. Assuming that this is a production system for safety.'
            );
        }

        if (await raesumConfig.get('developmentAndTesting.developmentMode')) {
            if (!isProdDb) {
                logger.warning(
                    'Development mode enabled, setting session secure flag to false'
                );
                sessionConfiguration.cookie.secure = false;
            } else {
                logger.critical(
                    'Server has been marked as a produciton database. CANNOT set the session cookie to insecure mode.'
                );
            }
        } else if (
            serverConfig.protocol == 'https' &&
            serverConfig.host !== 'localhost'
        ) {
            sessionConfiguration.cookie.secure = true;
        } else {
            sessionConfiguration.cookie.secure = false;
        }

        // If session type is set to "redis", create a redis store
        if (sessionConfig.type == 'redis') {
            const redisConfigSet = await raesumConfig.get(
                'connections.session.redis'
            );
            const redisConfig =
                await raesumServer.createRedisConfig(redisConfigSet);

            if (redisConfig == undefined || !redisConfig.host) {
                logger.error(
                    'Redis Configuration not set for sessions, falling back to memory store'
                );
            } else {
                try {
                    const redisClient = new Redis(redisConfig);

                    // On connect log entry and store redis instance in class
                    redisClient.on('connect', () => {
                        logger.info('Redis Connected for Session Cache');
                    });
                    // On error log entry and store redis instance in class
                    redisClient.on('error', (err) => {
                        logger.error('Redis Error for Session Cache: ', err);
                    });

                    // Add the session store to the session configuration object
                    sessionConfiguration.store = new RedisStore({
                        client: redisClient,
                    });
                    logger.info('Using Redis store for sessions');
                } catch (redisError) {
                    logger.error(
                        `Failed to create Redis session store: ${redisError.message}, falling back to memory store`
                    );
                }
            }
        } else {
            logger.info('Using memory store for sessions');
        }
        return sessionConfiguration;
    }
}

export default raesumSession;
