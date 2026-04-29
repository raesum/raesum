import pkg from 'pg';
const {Pool} = pkg;


import raesumConfig from "./raesumConfig.js";

import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class dbPool {

    #dbPoolInstance
    #config

    async #initConfig() {
        const start = Date.now();
        logger.info('Building Primary Database Configuration', Date.now() - start);

        // Create the new config object
        let newConfig = {};

        const settingsObject = await raesumConfig.get("connections.primaryDatabase")

        // Add all non-nested settings
        const singleDepthSettings = ['host', 'port', 'database', 'ssl', 'maxPoolSize'];

        for (let i = 0; i < singleDepthSettings.length; i++) {
            // If the value of the setting is present and not null add it to config
            if (settingsObject.hasOwnProperty(singleDepthSettings[i]) && settingsObject[singleDepthSettings[i]] != null) {
                logger.debug(`Adding ${singleDepthSettings[i]} to db config`);
                newConfig[singleDepthSettings[i]] = settingsObject[singleDepthSettings[i]];
            }
        }

        // Add credentials
        if (settingsObject.hasOwnProperty('credentials')){
            if (settingsObject.credentials.hasOwnProperty('username') && settingsObject.credentials.username != null) {
                newConfig.user = settingsObject.credentials.username;
            }

            if (settingsObject.credentials.hasOwnProperty('password') && settingsObject.credentials.password != null) {
                newConfig.password = settingsObject.credentials.password;
            }
        }

        // Add timeouts
        if (settingsObject.hasOwnProperty('timeouts')) {
            if (settingsObject.timeouts.hasOwnProperty('idleTimeout') && settingsObject.timeouts.idleTimeout != null) {
                newConfig.idleTimeoutMillis = settingsObject.timeouts.idleTimeout;
            }else{
                newConfig.idleTimeoutMillis = 1000;
            }

            if (settingsObject.timeouts.hasOwnProperty('connectionTimeout') && settingsObject.timeouts.connectionTimeout != null) {
                newConfig.connectionTimeoutMillis = settingsObject.timeouts.connectionTimeout;
            }else{
                newConfig.connectionTimeoutMillis = 1000;
            }

            if (settingsObject.timeouts.hasOwnProperty('maxUses') && settingsObject.timeouts.maxUses != null) {
                newConfig.max = settingsObject.timeouts.maxUses;
            }else{
                newConfig.max = 7500;
            }
        }

        this.#config = newConfig;
        logger.debug('Primary Database Configuration Built', Date.now() - start);

    }

    async #initPool() {
        const start = Date.now();
        if (typeof this.#dbPoolInstance != "object") {
            logger.info('Initializing Primary Database Pool', Date.now() - start);


            // Build config if it hasn't been built yet
            if (typeof this.#config != "object") {
                await this.#initConfig();
            }

            this.#dbPoolInstance = new Pool(this.#config);
        } else {
            logger.debug('Primary Database Already Initialized', Date.now() - start);
        }
    }

    async query(text, params) {
        const start = Date.now();
        await this.#initPool();

        const res = await this.#dbPoolInstance.query(text, params)
        const duration = Date.now() - start
        logger.debug(`Executed Query: ${text} with rows: ${res.rowCount}`, Date.now() - start);
        return res
    }

    // Most of this is slightly modified reference code from https://node-postgres.com/guides/project-structure
    async dbClient() {
        const start = Date.now();
        logger.debug(`Primary Database Manual Client Opened`, Date.now() - start);

        await this.#initPool();

        const client = await this.#dbPoolInstance.connect()
        const query = client.query;
        const release = client.release;
        const clientTimeoutMS = await raesumConfig.get("connections.primaryDatabase.timeouts.clientForceTimeout");
        const clientTimeoutS = Math.round(clientTimeoutMS / 1000)
        // set a timeout of 5 seconds, after which we will log this client's last query
        const timeout = setTimeout(() => {
            logger.warning(`A client has been checked out for more than ${clientTimeoutS} seconds!`, Date.now() - start);
            logger.warning(`The last executed query on this client was: ${client.lastQuery}`, Date.now() - start)
        }, clientTimeoutMS);

        // monkey patch the query method to keep track of the last query executed
        client.query = (...args) => {
            client.lastQuery = args
            return query.apply(client, args)
        }
        client.release = () => {
            // clear our timeout
            clearTimeout(timeout)
            // set the methods back to their old un-monkey-patched version
            client.query = query
            client.release = release
            logger.debug(`Primary Database Manual Client Released`, Date.now() - start);
            return release.apply(client)
        }

        return client
    }

    async end(){
        if (this.#dbPoolInstance) {
            await this.#dbPoolInstance.end();
        }
    }
}


const raesumDB = new dbPool();
export default raesumDB;