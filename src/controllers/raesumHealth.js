import raesumDB from '../modules/raesumDB.js';
import raesumConfig from '../modules/raesumConfig.js';
import raesumCache from '../modules/raesumCache.js';
import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

export default async function raesumHealthController(req, res, next) {
    const start = Date.now();

    // Set default value
    let healthy = true;

    // Check Database Connection
    try {
        let dbResponse = await raesumDB.query('SELECT 1 as Healthy;');
        if (
            !Object.prototype.hasOwnProperty.call(dbResponse, 'rows') ||
            dbResponse.rows.length < 1
        ) {
            healthy = false;
            logger.critical(
                `Health Check Fail: Database connected but not returning data.`,
                Date.now() - start
            );
        }
    } catch (e) {
        // Something is wrong, record error and indicate not healthy
        healthy = false;
        logger.critical(
            `Health Check Fail: Unable to connect to database`,
            Date.now() - start
        );
    }

    // If Redis or PSQL Cache, Check Cache Connection
    const cacheType = await raesumConfig.get('cache.type');
    if (cacheType != 'memory' && healthy == true) {
        try {
            const testKey = 'health-check-test';
            const testValue = 'test';
            const setResult = await raesumCache.set(
                testKey,
                testValue,
                60,
                'health'
            );
            if (setResult === undefined) {
                healthy = false;
                logger.critical(
                    `Health Check Fail: Cache set operation failed`,
                    Date.now() - start
                );
            } else {
                const getResult = await raesumCache.get(testKey, 'health');
                if (getResult !== testValue) {
                    healthy = false;
                    logger.critical(
                        `Health Check Fail: Cache get operation failed`,
                        Date.now() - start
                    );
                }
            }
        } catch (e) {
            healthy = false;
            logger.critical(
                `Health Check Fail: Cache health check error: ${e}`,
                Date.now() - start
            );
        }
    }

    if (healthy) {
        logger.debug(`Health Check Passed`, Date.now() - start);
        const returnObject = {
            title: 'Health Check',
            message: 'Passed',
            messageId: 0,
        };
        return res.status(200).send(returnObject);
    } else {
        const returnObject = {
            title: 'Health Check',
            message: 'Failed',
            messageId: 0,
        };
        return res.status(500).send(returnObject);
    }
}
