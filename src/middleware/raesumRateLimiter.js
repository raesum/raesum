import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import raesumConfig from "../modules/raesumConfig.js";
import raesumResponses from "../modules/raesumResponses.js";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumRateLimiter from "../modules/raesumRateLimiter.js"
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);




    const raesumLimiterMiddleware = async(req, res, next) => {
        const start = Date.now();

        const limiterInitialized = await raesumRateLimiter.init();

        if(!limiterInitialized){
            logger.error(`Cache is not functioning, returning undefined`, Date.now() - start);
            return next();
        }

        const key = raesumRateLimiter.keymaker(req);
        let pointsToConsume = 51;

        logger.verbose(`Rate limit consuming ${pointsToConsume} points) for ${key} on path ${req.path}`,Date.now() - start);

        try {
            await raesumRateLimiter.limiterInstance.consume(key,pointsToConsume);
            return next();
        }catch(rejected){
            logger.error(`Rate limit error: ${rejected}`, Date.now() - start);
            // Get raesumResponse that limit has been exceeded
            const response = await raesumResponses.get("rateLimitExceeded");
            return res.status(response.code).json(response);
        }
    }

export default raesumLimiterMiddleware;
