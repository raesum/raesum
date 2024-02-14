import raesumConfig from "./raesumConfig.js";
import NodeCache from 'node-cache';

import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");


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
        const returnVal = await this.#cachePoolInstance.delete(key);
        if(returnVal){
            logger.verbose(`Cache Key Deleted: ${key} CacheType: ${this.#cacheType}`, Date.now()-start)
        }else{
            logger.verbose(`Cache Key Delete Fail: ${key} Miss CacheType: ${this.#cacheType}`, Date.now()-start)
        }
        return returnVal;
    }
}

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
        const returnVal = this.#nodeCacheInstance.get(key);
        return returnVal;
    }

    async set(key,value,ttl){
        // Set the key and return true/false on success/fail
        const returnStatus = this.#nodeCacheInstance.set(key,value,ttl);
        return returnStatus;
    }

    async delete(key){
        // Delete the key and return true/false on success/fail (assume that no keys deleted is a fail)
        const returnStatus = this.#nodeCacheInstance.del(key);

        if(returnStatus>0){
            return true;
        }else{
            return false;
        }
    }
}

class raesumeCacheRedis{
    async init(){}

    async reset(){}

    async get(key){}

    async set(key,value,ttl){}

    async delete(key){}
}

const raesumCache = new raesumCachePool();
export default raesumCache;