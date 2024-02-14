import pkg from 'pg';
const {Pool} = pkg;
import raesumConfig from "./raesumConfig.js";

import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

class cacheDBPool {

    #dbPoolInstance
    #config

    async #initConfig() {
        const start = Date.now();
        logger.info('Building Cache Database Configuration', Date.now() - start);

        // Create the new config object
        let newConfig = {};

        const settingsObject = raesumConfig.get("connections.cache.psql")

        // Add all non-nested settings
        const singleDepthSettings = ['host', 'port', 'database', 'ssl', 'maxPoolSize'];

        for (let i = 0; i < singleDepthSettings.length; i++) {
            // If the value of the setting is present and not null add it to config
            if (settingsObject.hasOwnProperty(singleDepthSettings[i]) && settingsObject[singleDepthSettings[i]] != null) {
                this.#config[singleDepthSettings[i]] = settingsObject[singleDepthSettings[i]];
            }
        }

        // Add credentials
        if (settingsObject.hasOwnProperty('credentials')){
            if (settingsObject.credentials.hasOwnProperty('username') && settingsObject.credentials.username != null) {
                this.#config.user = settingsObject.credentials.username;
            }

            if (settingsObject.credentials.hasOwnProperty('password') && settingsObject.credentials.password != null) {
                this.#config.password = settingsObject.credentials.password;
            }
        }

        // Add timeouts
        if (settingsObject.hasOwnProperty('timeouts')) {
            if (settingsObject.timeouts.hasOwnProperty('idleTimeout') && settingsObject.timeouts.idleTimeout != null) {
                this.#config.idleTimeoutMillis = settingsObject.timeouts.idleTimeout;
            }else{
                this.#config.idleTimeoutMillis = 1000;
            }

            if (settingsObject.timeouts.hasOwnProperty('connectionTimeout') && settingsObject.timeouts.connectionTimeout != null) {
                this.#config.connectionTimeoutMillis = settingsObject.timeouts.connectionTimeout;
            }else{
                this.#config.connectionTimeoutMillis = 1000;
            }

            if (settingsObject.timeouts.hasOwnProperty('maxUses') && settingsObject.timeouts.maxUses != null) {
                this.#config.max = settingsObject.timeouts.maxUses;
            }else{
                this.#config.max = 7500;
            }

        }
    }

    async #initPool() {
        const start = Date.now();
        if (typeof this.#dbPoolInstance != "object") {
            logger.info('Initializing Cache Database Pool', Date.now() - start);

            // Build config if it hasn't been built yet
            if (typeof this.#config != "object") {
                await this.#initConfig();
            }

            this.#dbPoolInstance = new Pool(this.#config);
        } else {
            logger.verbose('Cache Database Already Initialized', Date.now() - start);
        }
    }

    async query(text, params) {
        const start = Date.now();
        await this.#initPool();

        const res = await this.#dbPoolInstance.query(text, params)
        const duration = Date.now() - start
        logger.verbose(`Executed Query: ${text} with rows: ${res.rowCount}`, Date.now() - start);
        return res
    }

}


const raesumDBCache = new cacheDBPool();

export default raesumDBCache;