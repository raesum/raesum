import raesumConfig from "./raesumConfig.js";
import RedisStore from "connect-redis";
import Redis from 'ioredis';
import {raesumLogger} from "./raesumLogger.js";
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);


class raesumSession{
    // Configure sessions
    async createSessionConfig(){
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
        }

        // If server protocol is https, set the secure flag
        if(serverConfig.protocol == "https"){
            sessionConfiguration.cookie.secure = true;
        }



        // If session mode is set to "redis", create a redis store
        if(sessionConfig.mode == "redis"){
            const redisConfigSet = await raesumConfig.get("connections.cache.redis");
            if(redisConfigSet == undefined){
                logger.error("Redis Configuration not set");
            }else{
                const redisConfig = await createRedisConfig.createRedisConfig(redisConfigSet);
                const redisClient = Redis.createClient(redisConfig);

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
            }
        
        }
        return sessionConfiguration;
    }
}


export default raesumSession;
