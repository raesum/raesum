import raesumConfig from "./raesumConfig.js";
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
import {conditionallyParseJSON} from "../utils/stringUtils.js";


const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumeCacheMemory{

    #nodeCacheInstance
    #nodeCacheConfig = {
        "useClones":true,
        "checkperiod": 120,
        "deleteOnExpire":true
    }

    async init(){
        // Get the cache default TTL
        const cacheTTL = await raesumConfig.get("cache.ttl");
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

        // Get the key and return the value (return undefined if key does not exist)
        const returnVal = await this.#nodeCacheInstance.get(key);
        return returnVal;
    }

    async set(key, value,ttl){


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


    async deleteKeysStartingWith(partialKey){
        // Get all keys that start with the partialKey
        let keys = await this.#nodeCacheInstance.keys();

        //Filter the key list where the key starts with the partial key
        keys = keys.filter((key) => key.startsWith(partialKey));

        // Delete all keys that start with the partial key
        for(const key of keys){
            await this.#nodeCacheInstance.del(key);
        }
        return true;
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
            logger.debug("Getting Key from Redis Cache: "+key);
            // Get the key and return the value (return undefined if key does not exist)
            let returnVal = await this.#redisInstance.get(key);
            return conditionallyParseJSON(returnVal);
        }else{
            logger.debug("Unable to find key from Redis Cache: "+key);
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

    async deleteKeysStartingWith(partialKey){
        if(this.#redisRunning){
            // Get all keys that start with the partialKey
            let keys = await this.#redisInstance.keys(partialKey+"*");

            // Delete all keys that start with the partialKey
            await this.#redisInstance.del(keys);
            return true;
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

    async get(key, objectType, orgId=null,userID=null){
        const start = Date.now();
        const cacheFunctioning = await this.#init();

        if(!cacheFunctioning){return undefined;}


        // Create the key
        let cacheKey;
        try{
            cacheKey = this.#keymaker(key, objectType,orgId,userID);
        }catch (e){
            logger.error(`Error creating cache key: ${e}`, Date.now() - start);
            return e;
        }

        // Add prefix to key
        cacheKey = await this.prefixKey(cacheKey);

        const returnVal= await this.#cachePoolInstance.get(cacheKey);
        if(returnVal == undefined){
            logger.debug(`Cache Key Miss: ${cacheKey} CacheType: ${this.#cacheType}`, Date.now()-start)
        }else{
            logger.debug(`Cache Key Hit: ${cacheKey} Miss CacheType: ${this.#cacheType}`, Date.now()-start)
        }
        return returnVal;

    }

    async set(key,value,ttl, objectType,orgId=null,userID=null){
        const start = Date.now();
        const cacheFunctioning = await this.#init();
        if(!cacheFunctioning){return undefined;}

        // Create the key
        let cacheKey;
        try{
            cacheKey = this.#keymaker(key, objectType,orgId,userID);
        }catch (e){
            logger.error(`Error creating cache key: ${e}`, Date.now() - start);
            return e;
        }

        // Add prefix to key
        cacheKey = await this.prefixKey(cacheKey);

        const returnVal = await this.#cachePoolInstance.set(cacheKey,value,ttl);
        if(returnVal == undefined){
            logger.debug(`Cache Key Failed: ${cacheKey} CacheType: ${this.#cacheType}`, Date.now()-start)
        }else{
            logger.debug(`Cache Key Set: ${cacheKey} Miss CacheType: ${this.#cacheType}`, Date.now()-start)
        }
        return returnVal;

    }

    async delete(key, objectType,orgId=null,userID=null){
        const start = Date.now();
        const cacheFunctioning = await this.#init();
        if(!cacheFunctioning){return undefined;}

        // Create the key
        let cacheKey;
        try{
            cacheKey = this.#keymaker(key, objectType,orgId,userID);
        }catch (e){
            logger.error(`Error creating cache key: ${e}`, Date.now() - start);
            return e;
        }

        cacheKey = await this.prefixKey(cacheKey);

        const returnVal = await this.#cachePoolInstance.delete(cacheKey);
        if(returnVal){
            logger.debug(`Cache Key Deleted: ${cacheKey} CacheType: ${this.#cacheType}`, Date.now()-start)
        }else{
            logger.debug(`Cache Key Delete Fail: ${cacheKey} Miss CacheType: ${this.#cacheType}`, Date.now()-start)
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

    /**
     * Creates the key actually stored in redis
     * @param  {String} objectType The object type / name of model storing a cached key.
     * @param  {Number} orgId The id of the organization type
     * @param  {Number} userID The id of the user
     * @param  {String} key The key to store. Cannot contain : or be empty
     * @return {String} The key to store in redis
     * @throws {Error} If the user ID is not a positive int or null
     * @throws {Error} If the org ID is not a positive int or null
     * @throws {Error} If the object type string is not an string
     * @throws {Error} If key is not a string
     */
    #keymaker(key, objectType="cache",orgId=null,userId=null){
        const start = Date.now();

        // If the user ID is not a positive int or null, throw an error
        if(userId != null && (isNaN(userId) || userId < 1)){
            throw new Error("Invalid format for userID");
        }

        // If the org ID is not a positive int or null, throw an error
        if(orgId != null && (isNaN(orgId) || orgId < 1)){
            throw new Error("Invalid format for orgId");
        }

        // If the object type string is not an string, throw an error
        if(typeof objectType != "string"){
            throw new Error("Invalid format for objectType");
        }

        // If key is not a string, or empty , or contains a :, throw an error
        if(typeof key != "string" || key == "" || key.includes(":")){
            throw new Error("Invalid format for key");
        }

        // Set default values if no org or userID supplied
        if(orgId == null){
            orgId = "";
        }

        if(userId == null){
            userId = "";
        }


        // Create the key
        const keyString = `${objectType}:${orgId}:${userId}:${key}`;
        logger.debug("Created Un-prefixed Cache Key: " + keyString, Date.now() - start)

        return keyString;

    }


    /**
     * Deletes keys based on a pattern
     * @param  {String} objectType The object type / name of model storing a cached key.
     * @param  {Number} orgId The id of the organization type
     * @param  {Number} userID The id of the user
     * @return {boolean} Whether the operation was successful or not
     * @throws {Error} If the user ID is not a positive int or null
     * @throws {Error} If the org ID is not a positive int or null
     * @throws {Error} If the object type is not an string
     */
    async deleteSet(objectType,orgId=null, userID=null){
        const start = Date.now();
        const cacheFunctioning = await this.#init();

        if(!cacheFunctioning){return undefined;}

        // If the user ID is not a positive int or null, throw an error
        if(userID != null && (isNaN(userID) || userID < 1)){
            throw new Error("Invalid format for userID");
        }

        // If the org ID is not a positive int or null, throw an error
        if(orgId != null && (isNaN(orgId) || orgId < 1)){
            throw new Error("Invalid format for orgId");
        }

        // If the object type is not an string, throw an error
        if(typeof objectType != "string"){
            throw new Error("Invalid format for objectType");
        }

        // Create the key
        const cacheKey =  `${objectType}:${orgId}:${userID}`;

        const result = await this.#cachePoolInstance.deleteKeysStartingWith(cacheKey);
        if(result){
            logger.debug(`Cache Key Set Deleted: ${cacheKey} CacheType: ${this.#cacheType}`, Date.now()-start);
            return true;
        }else{
            logger.error(`Cache Key Set Delete Fail: ${cacheKey} CacheType: ${this.#cacheType}`, Date.now()-start);
            return false;
        }

    }


}


const raesumCache = new raesumCachePool();
export default raesumCache;