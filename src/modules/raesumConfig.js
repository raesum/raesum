import config from 'config';
import {fileURLToPath} from "url";
import {setNestedObjectValue} from "../utils/jsonUtils.js";
import {cloneRecursively} from "../utils/objectUtils.js";
import {SecretsManagerClient, GetSecretValueCommand} from "@aws-sdk/client-secrets-manager";
import jp from "jsonpath"
import {conditionallyParseJSON} from "../utils/stringUtils.js";
import {buildAWSConfigInitializationOnly} from "../utils/awsUtils.js";

import {raesumLogger} from "./raesumLogger.js";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

const secretCacheTTL = 60 * 60 * 12 * 1000; // 12 Hours

class raesumConfig {
    constructor(){
        
    }

    #cacheObject = {};
    
    #setCache(key,value){
        if(!typeof key == "string"){
            return false;
        }
        const newCacheObj = {
            'timestamp': Date.now(),
            'value':value
        }
        this.#cacheObject[key] = newCacheObj;
        return true;
    }

    #getCache(key){
        if(!typeof key == "string"){
            return null;
        }
        // If key not in cache
        if(!this.#cacheObject.hasOwnProperty(key)){
            return null;
        }
        // If key is in cache but age is older than TTL
        if(this.#cacheObject[key]['timestamp'] < Date.now() - secretCacheTTL){
            return null;
        }

        // Key is present and valid
        return {
            "key":key,
            value: this.#cacheObject[key]['value']
        }
            
    }

    #removeCache(key){
        if(!typeof key == "string"){
            return false;
        }
        delete this.#cacheObject[key];
        return true;
    }

    async getCloudSecretKey(key){

        // Get the cloud based secrets config
        const cloudSecretsStatic = config.get("cloudBasedSecrets");
        logger.verbose(`Cloud Secrets Setting: ${cloudSecretsStatic}`);

        // Turn cloudSecrets into a sortable (mutable) array
        let cloudSecrets = JSON.parse(JSON.stringify(cloudSecretsStatic));

        cloudSecrets.sort((a, b) => (b.split(".").length - 1) - (a.split(".").length - 1))
        // Build array of matching keys
        let outputArray = [];

        // For each secret
        for(let i=0; i < cloudSecrets.length; i++){
            // If they match exactly, return the key as array
            if(cloudSecrets[i]==key){
                logger.verbose(`Cloud Secrets Match: ${cloudSecrets[i]}`);
                return [key];
            }
            // If requested key is a parent key of the cloud key, add the requested key
            if(cloudSecrets[i].indexOf(key) > -1){
                logger.verbose(`Cloud Secrets Partial Match: ${key}`);

                outputArray.push(cloudSecrets[i]);
            }else if(key.indexOf(cloudSecrets[i]) > -1){
                // If the cloud key is a parent of the requested key, add the parent key
                logger.verbose(`Cloud Secrets Partial Match: ${cloudSecrets[i]}`);

                outputArray.push(cloudSecrets[i]);
            }

        }

        // Return output array
        return outputArray;

    }

    async getCloudSecret(key){
        let start = Date.now();
        let cacheValue = this.#getCache(key)
        // This is a stub function. Replace with the code to extract keys from AWS
        // TO-DO: Replace with AWS function
        if(cacheValue){
            logger.debug(`Cloud Secret ${key} fetched from internal cache`, Date.now() - start);

            return cacheValue.value;
        }else{
            // Get the secret value/ID from the config
            const secret = config.get(key);

            try{
                logger.debug(`Fetching cloud secret ${key} fetched from AWS: ${secretValue}`, Date.now() - start);

                // Create the AWS client
                const clientConfig = buildAWSConfigInitializationOnly();
                const client = new SecretsManagerClient(clientConfig);

                // Create the request command to AWS
                const command = new GetSecretValueCommand({SecretId: secret});


                // Await the response from AWS
                const response = await client.send(command);

                // Parse the response from AWS
                const secretValue = conditionallyParseJSON(response.SecretString);

                this.#setCache(key,secretValue);
                logger.verbose(`Cloud secret ${key} fetched from AWS: ${secretValue}`, Date.now() - start);
                return secretValue;

            }catch(e){
                logger.error(`Error fetching cloud secret ${key} from AWS: ${e}. Falling back on value in configuration file`, Date.now() - start);

                // If it fails fall back on the config file's value
                this.#setCache(key,secret);
                return secret;
            }
        }
    }

    async get(key) {
        let cacheValue = this.#getCache(key)
        let outputObj;

        if (cacheValue) {
            return cacheValue.value;

        } else {
            // Value not in cache, retrieve it


        // Check if the key is listed as housed in the cloud vault
        let cloudKeys = await this.getCloudSecretKey(key);
        // If no cloud keys found this is a file-controlled value
        if (cloudKeys.length == 0) {
            logger.verbose(`No cloudKeys found for secret ${key}`);

            outputObj = config.get(key);
        } else {
            // One or more keys must be retrieved from AWS
            logger.verbose(`One or more keys must be retrieved from AWS for secret ${key}`);

            // Sort the keys ascending from biggest to smallest
            cloudKeys.sort((a, b) => (b.split(".").length - 1) - (a.split(".").length - 1))

            // If there is an exact match of the key in the array
            if (cloudKeys.indexOf(key) > -1) {
                // Get the keyValue of the exact match
                logger.verbose(`CloudKey exact match found ${key}`);

                outputObj = await this.getCloudSecret(key);

            } else if (cloudKeys[0].split('.').length < key.split(".").length) {

                // Else If there is a parent key in the array
                logger.verbose(`CloudKey parent match found for key ${key} and parent key ${cloudKeys[0]}`);

                let parentKeyValue = await this.getCloudSecret(cloudKeys[0]);

                // Get the parent keyValue from the cloud
                let childOnlyKeyString = key.substring(cloudKeys[0].length);
                if (childOnlyKeyString.substring(0, 1) == ".") {
                    childOnlyKeyString = childOnlyKeyString.substring(1);
                }
                childOnlyKeyString = "$." + childOnlyKeyString;
                logger.debug(parentKeyValue);
                outputObj = jp.query(parentKeyValue, childOnlyKeyString);
                if (Array.isArray(outputObj) && outputObj.length == 1) {
                    // This is likely originally a single value. Remove from JQ's array
                    outputObj = outputObj[0];
                }
                logger.debug(outputObj);

            } else {
                // Else only child keys
                logger.verbose(`CloudKey children found for key ${key}`);
                // Get the key from the files
                outputObj = JSON.parse(JSON.stringify(config.get(key)))

                // For each cloud key
                for (let i = 0; i < cloudKeys.length; i++) {
                    // Get the cloudkey
                    let cloudKeyValue = await this.getCloudSecret(cloudKeys[i])
                    logger.verbose(`CloudKey children found for key ${key}. Adding child ${cloudKeys[i]}`);

                    // Extract the sub key
                    let stringKey = cloudKeys[i].substr(key.length);
                    if (stringKey.substring(0, 1) == ".") {
                        stringKey = stringKey.substring(1);
                    }
                    const keyArr = stringKey.split(".");

                    // Update the value for that key
                    setNestedObjectValue(outputObj, keyArr, cloudKeyValue);

                }

            }
        }

        // Turn object into mutable object
        outputObj = JSON.parse(JSON.stringify(outputObj))
        // Cache the value
        this.#setCache(key,outputObj);
    }
        return outputObj;

    }

    async has(key){
        return config.has(key);
    }
}

const singleInstance = new raesumConfig();
export default singleInstance;





