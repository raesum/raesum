import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import raesumConfig from "../modules/raesumConfig.js";
import raesumResponses from "../modules/raesumResponses.js";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumServer from "../modules/raesumServer.js";
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);



class raesumRateLimiter {

    limiterInstance
    
    async buildRateLimiter(){
            // Use the rasum config to get the rate limit config
            // Build the initial rate limiter object
            const rateLimitConfig = await raesumConfig.get('ratelimiter');

            let pointsPerSecond = parseInt(rateLimitConfig.pointsPerSecond);

            if(isNaN(pointsPerSecond) || pointsPerSecond <1){
                pointsPerSecond = 100;
            }

            const blockDurationMinutes = parseInt(rateLimitConfig.blockDurationMinutes);
            if(isNaN(blockDurationMinutes) || blockDurationMinutes <1){
                blockDurationMinutes = 5;
            }

            const rateLimiterMemory = new RateLimiterMemory({
                keyPrefix: 'raesumAPI',
                points: pointsPerSecond,
                duration: 1, // per 1 second,
                blockDuration: blockDurationMinutes * 60
            });
            this.limiterInstance = rateLimiterMemory;

            // if the rateLimitConfig is NOT redit, build a memory limiter and return it
            if(rateLimitConfig.type !== 'redis'){
                logger.warning("Rate limiter is not using redis, using memory limiter instead. NOT recommended for production.");
                this.limiterInstance = rateLimiterMemory;
            }

            // Else, attempt to build the redis connection using rateLimitDatabaseConfig and return a redis limiter
            const redisConfigSet = await raesumConfig.get('connections.ratelimiter.redis');

                    const redisConfig = await raesumServer.createRedisConfig(redisConfigSet);

                    if(redisConfig == undefined || !redisConfig.host){
                        logger.error("Redis Configuration not set for sessions, falling back to memory store");
                    }else{
                        try {
                            const redisClient = new Redis(redisConfig);

                            // On connect log entry and store redis instance in class
                            redisClient.on("connect",()=>{
                                logger.info("Redis Connected for Session Cache");
                            });
                            // On error log entry and store redis instance in class
                            redisClient.on("error",(err)=>{
                                logger.error("Redis Error for Session Cache: ",err);
                            });

                            // Add the session store to the session configuration object
                            sessionConfiguration.store = new RedisStore({
                                client: redisClient,
                            });
                            const redisRateLimiter = new RateLimiterRedis({
                                storeClient: redisClient,
                                keyPrefix: 'raesumAPI',
                                points: pointsPerSecond,
                                duration: 1, // per 1 second
                                insuranceLimiter: rateLimiterMemory,
                                blockDuration: blockDurationMinutes * 60
                            });

                            this.limiterInstance = redisRateLimiter;
                            logger.info("Using Redis store for sessions");
                        } catch (redisError) {
                            logger.error(`Failed to create Redis session store: ${redisError.message}, falling back to memory store`);
                            this.limiterInstance = rateLimiterMemory;
                        }
                    }
                
            return true;
    }

    async init() {
        const start = Date.now();

        if(typeof this.limiterInstance == "undefined") {
            logger.info('Initializing Rate Limiter ', Date.now() - start);
            await this.buildRateLimiter(); 
            return true;
        }else{
            logger.debug('Rate Limiter already initialized', Date.now() - start);
            return true;
        }  
    }


    // Used to generate a re-usable key to identify the user.
    keymaker(req) {
        let key= req.ip;

        // If the user is logged in, use their user ID as the key
        if (req.user) {
            key = req.user.id;
        }
        
        return key;
    }


}

   

const raesumLimiterObject = new raesumRateLimiter();
export default raesumLimiterObject;
