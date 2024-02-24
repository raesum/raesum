import raesumConfig from "./raesumConfig.js";
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
import {conditionallyParseJSON} from "../utils/stringUtils";


const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

class raesumeCacheMemory{

    #nodeCacheInstance
    #nodeCacheConfig = {
        "useClones":true,
        "checkperiod": 120,
        "deleteOnExpire":true
    }

    async init(){
        // Get the cache default TTL
        const cacheTTL = raesumConfig.get("cache.ttl");
        logger.info(`Initializing Memory Cache with default TTL: ${cacheTTL}`);
        if(parseInt(cacheTTL) > -1){
            this.#nodeCacheConfig.stdTTL = parseInt(cacheTTL);
        }

        this.#nodeCacheInstance = new NodeCache(this.#nodeCacheConfig);
        return true;
    }

    async reset(){
        return true;
    }

    async get(key){
        const start = Date.now()
        // Get the key and return the value (return undefined if key does not exist)
        const returnVal = await this.#nodeCacheInstance.get(key);
        return returnVal;
    }

    async set(key,value,ttl){
        // Set the key and return true/false on success/fail
        const returnStatus = await this.#nodeCacheInstance.set(key,value,ttl);

        return returnStatus;
    }

    async delete(key){

        // Delete the key and return true/false on success/fail (assume that no keys deleted is a fail)
        const returnStatus = await this.#nodeCacheInstance.del(key);

        if(returnStatus>0){
            return true;
        }else{
            return false;
        }
    }
}
//
class raesumeCacheRedis{

    #redisInstance
    #redisRunning = false;

    async init(){

        const redisConfigSet = await raesumConfig.get("connections.cache.redis");
        if(redisConfigSet == undefined){
            logger.error("Redis Configuration not set");
            return false;
        }else{
            // List of excluded config keys
            const excludedKeys = ["credentials","lazyConnect","retryStrategy","tls"];
            // Create new config object
            // The TLS override exists to allow for self-signed certs (and AWS support)
            let redisConfig = {
                lazyConnect: true,
                tls: {
                    checkServerIdentity: () => undefined,
                }
            };

            // Loop through each config key to build new config object if defined and not null
            for(const key in redisConfigSet){
                if(!excludedKeys.includes(key) && redisConfigSet[key] != undefined && redisConfigSet[key] != null){
                    redisConfig[key] = redisConfigSet[key];
                }
            }
            // Get username and password from config if set
            if(redisConfigSet.credentials != undefined && redisConfigSet.credentials.username != undefined && redisConfigSet.credentials.password != undefined){
                redisConfig.username = redisConfigSet.credentials.username;
                redisConfig.password = redisConfigSet.credentials.password;
            }

            // Create new redis instance with new config object
            this.#redisInstance = new Redis(redisConfig);
            this.#redisRunning = true;

            // On connect log entry and store redis instance in class
            this.#redisInstance.on("connect",()=>{
                logger.info("Redis Connected for Cache");
            });
            // On error log entry and store redis instance in class
            this.#redisInstance.on("error",(err)=>{
                logger.error("Redis Error for Cache: ",err);
                this.#redisRunning = false;
            });

        }

        return true;
    }

    async reset(){
        if(this.#redisRunning){
            // Get the key prefix
            const prefix = raesumConfig.get("cache.prefix");

            // Get all redis keys that start with prefix
            const keys = await this.#redisInstance.keys(prefix+"*");

            // Delete all keys that start with prefix
            for(const key of keys){
                await this.#redisInstance.del(key);
            }
            return true;

        }else{
            await this.init();
            return false;
        }
    }

    async get(key){
        if(this.#redisRunning){
            logger.verbose("Getting Key from Redis Cache: "+key);
            // Get the key and return the value (return undefined if key does not exist)
            let returnVal = await this.#redisInstance.get(key);
            return conditionallyParseJSON(returnVal);
        }else{
            logger.verbose("Unable to find key from Redis Cache: "+key);
            return undefined;
        }
    }

    async set(key,value,ttl){
        if(this.#redisRunning){
            // Set the key and return true/false on success/fail
            const returnVal = await this.#redisInstance.set(key,JSON.stringify(value),"EX",ttl);
            return returnVal;
        }else{
            return undefined;
        }
    }

    async delete(key){
        if(this.#redisRunning){
            // Delete the key and return true/false on success/fail
            const returnVal = await this.#redisInstance.del(key);
            if(returnVal > 0){
                return true;
            }else{
                return false;
            }
        }else{
            return false;
        }
    }
}

class raesumCachePool{

    #cachePoolInstance
    #config
    #cacheType = "memory"
    #allowedCacheTypes = ["memory","redis"];

    // Primarily used for testing - this destroys the cache pool instance and forces a re-init
    async reset(){

        if(typeof this.#cachePoolInstance != "undefined") {
            await this.#cachePoolInstance.reset(); // Clear the cache
        }
        this.#cachePoolInstance = undefined;
        this.#config = undefined;
        this.#cacheType = "memory"
    }

    async #init() {

        if(typeof this.#cachePoolInstance == "undefined") {
            const start = Date.now();
            logger.info('Building Cache Configuration', Date.now() - start);

            // Get the type of cache to use
            const candidateType = raesumConfig.get("cache.type");

            // If the cache type is in the allowed types, set the type
            if(this.#allowedCacheTypes.includes(candidateType)) {
                this.#cacheType = candidateType;
            }
            logger.info(`Cache Type: ${this.#cacheType}`, Date.now() - start);

            // If type is redis, create new instance of redis cache object
            if(this.#cacheType == "redis"){
                this.#cachePoolInstance = await new raesumeCacheRedis();
            }else{
                // else if type is memory, create new instance of memory cache object
                this.#cachePoolInstance = await new raesumeCacheMemory();
            }

            // Run the init of the object
            logger.info(`Initializing Cache Type: ${this.#cacheType}`, Date.now() - start);
            const cacheInitSuccess = await this.#cachePoolInstance.init();

            // If cache init fails and type is not memory, switch to memory and re-init
            if(!cacheInitSuccess && this.#cacheType != "memory"){
                logger.warning(`Cache Type: ${this.#cacheType} failed to initialize, switching to memory`, Date.now() - start);
                this.#cacheType = "memory";
                this.#cachePoolInstance = new raesumeCacheMemory();
                return await this.#cachePoolInstance.init();
            }else if(!cacheInitSuccess && this.#cacheType == "memory"){
                // If cache init fails and type is memory, return false
                logger.error(`Cache Type: ${this.#cacheType} failed to initialize`, Date.now() - start);
                return false;
            }else{
                return true;
            }
        }else{
            return true;
        }
    }

    async get(key){
        const start = Date.now();
        const cacheFunctioning = await this.#init();

        if(!cacheFunctioning){return undefined;}

        // If key is not set return undefined
        if(typeof key == "undefined"){return undefined;}

        // Add prefix to key
        key = await this.prefixKey(key);

        const returnVal= await this.#cachePoolInstance.get(key);
        if(returnVal == undefined){
            logger.verbose(`Cache Key Miss: ${key} CacheType: ${this.#cacheType}`, Date.now()-start)
        }else{
            logger.verbose(`Cache Key Hit: ${key} Miss CacheType: ${this.#cacheType}`, Date.now()-start)
        }
        return returnVal;

    }

    async set(key,value,ttl){
        const start = Date.now();
        const cacheFunctioning = await this.#init();
        if(!cacheFunctioning){return undefined;}

        // If key is not set return undefined
        if(typeof key == "undefined"){return undefined;}

        // Add prefix to key
        key = await this.prefixKey(key);

        const returnVal = await this.#cachePoolInstance.set(key,value,ttl);
        if(returnVal == undefined){
            logger.verbose(`Cache Key Failed: ${key} CacheType: ${this.#cacheType}`, Date.now()-start)
        }else{
            logger.verbose(`Cache Key Set: ${key} Miss CacheType: ${this.#cacheType}`, Date.now()-start)
        }
        return returnVal;

    }

    async delete(key){
        const start = Date.now();
        const cacheFunctioning = await this.#init();
        if(!cacheFunctioning){return undefined;}
        key = await this.prefixKey(key);

        const returnVal = await this.#cachePoolInstance.delete(key);
        if(returnVal){
            logger.verbose(`Cache Key Deleted: ${key} CacheType: ${this.#cacheType}`, Date.now()-start)
        }else{
            logger.verbose(`Cache Key Delete Fail: ${key} Miss CacheType: ${this.#cacheType}`, Date.now()-start)
        }
        return returnVal;
    }

    async prefixKey(key){
        // Get the prefix from the config
        const prefix = await raesumConfig.get("cache.prefix");

        // If the key starts with the prefix, return the key
        if(!prefix || key.startsWith(prefix)){
            return key;
        }else{
            return prefix+key;
        }
    }

}


const raesumCache = new raesumCachePool();
export default raesumCache;