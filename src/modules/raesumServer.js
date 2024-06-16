import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumConfig from "../modules/raesumConfig.js";
import raesumCache from "./raesumCache.js";
import raesumMetadata from "../models/raesumMetadata.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumServer{

    #cacheObjectType = "raesumServer";
    async buildBaseServerURL(){
        const start = Date.now();

        // Get from cache
        const cacheKey = "serverURL";
        const cacheValue = await raesumCache.get(cacheKey, this.#cacheObjectType);

        if(cacheValue){
            return cacheValue;
        }

        const protocol = await raesumConfig.get('server.protocol');
        const proxyInUse = await raesumConfig.get('server.proxyInUse');
        let port = await raesumConfig.get('server.port');
        const host = await raesumConfig.get('server.host');

        // If a proxy is present, use the proxy port
        if(proxyInUse){
            port = await raesumConfig.get('server.proxyPort');
        }

        // Assemble the URL
        let serverURL = protocol + "://" + host

        // If the protocol does not equal the default port, append the port
        if((protocol == "http" && port != 80) || (protocol == "https" && port != 443)){
            serverURL += ":" + port;
        }

        // Set cache
        await raesumCache.set(cacheKey, serverURL, 86400, this.#cacheObjectType);

        logger.info("Server URL built: " + serverURL, Date.now() - start);

        // Return
        return serverURL;

    }

    async createRedisConfig(redisConfigSet){
        const start = Date.now();

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

        return redisConfig
    }

    async serverSettingsSafetyChecks(){
        const start = Date.now();

        let noErrors = true;

        logger.info("Running server settings safety checks", Date.now() - start);

        // Get the server configuration
        const serverConfig = await raesumConfig.get('server');
        const isProductionDatabase = await raesumMetadata.getByKey("isProductionDatabase");
        const cacheConfig = await raesumConfig.get('cache');
        const sessionConfig = await raesumConfig.get('session');
        const loginConfig = await raesumConfig.get('login');

        // Is the server a production server?
        if(isProductionDatabase){
            // Is the cache using memory mode?
            if(cacheConfig.type == "memory"){
                logger.warn("Cache is using memory mode on a production server", Date.now() - start);
                noErrors = false;

            }

            // Are the sessions using memory mode?
            if(sessionConfig.type == "memory"){
                logger.warn("Sessions are using memory mode on a production server", Date.now() - start);
                noErrors = false;

            }

            // Are the sessions using the default secret?
            if(sessionConfig.secret == "changeThisFromDefault"){
                logger.error("Sessions are using the default secret on a production server", Date.now() - start);
                noErrors = false;

            }

            // Is the protocol http?
            if(serverConfig.protocol == "http"){
                logger.error("Server is using http protocol on a production server", Date.now() - start);
                noErrors = false;

            }

            // Are the cloud secrets keys an empty array?
            const cloudSecrets = await raesumConfig.get('cloudBasedSecrets');
            if(cloudSecrets.length == 0){
                logger.critical("No secrets are stored in AWS secrets manager on a production server.", Date.now() - start);
                noErrors = false;

            }

            // Is the host localhost?
            if(serverConfig.host == "localhost"){
                logger.warn("Server host is localhost", Date.now() - start);
                noErrors = false;

            }

            // Is the session appname set to default?
            if(sessionConfig.appname == "default"){
                logger.warn("Session appname is set to default", Date.now() - start);
                noErrors = false;

            }
        }

        // If the session and cache are using redis and use the same redis instance
        if(cacheConfig.type == "redis" && sessionConfig.type == "redis"){
            const connections = await raesumConfig.get("connections");

            if(connections.cache.redis.host == connections.session.redis.host && connections.cache.redis.port == connections.session.redis.port){
                logger.warning("The session cache and general cache are using the same redis instance. It is recommended to use separate instances for session and general cache.", Date.now() - start);
                noErrors = false;

                // If the session and cache are using the same server number AND host, throw a critical error
                if(connections.cache.redis.databaseNumber == connections.session.redis.databaseNumber){
                    logger.critical("The session cache and general cache are using the same database number AND host. This could lead to instability or security issues.", Date.now() - start);
                    noErrors = false;

                }
            }
            
        }
           
        // Get the login configuration
        if(loginConfig.jwt == false && loginConfig.useSessionCookie == false){
            // If both login types are disabled, throw a critical error
            logger.critical("Both JWT and Session Cookie login are disabled. One of these must be enabled or users will NEVER be able to log in or use authenticated routes", Date.now() - start);
            noErrors = false;
        }

        if(noErrors){
            logger.info("Server settings safety checks passed", Date.now() - start);
        }

        return noErrors;

    }
}

const singleInstance = new raesumServer();
export default singleInstance;