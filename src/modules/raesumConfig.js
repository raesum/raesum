import config from 'config';
import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");


export const raesumGetCloudSecretKey = async function(key){

    // Get the cloud based secrets config
    let cloudSecrets = config.get("cloudBasedSecrets");
    logger.debug(`Cloud Secrets Setting: ${cloudSecrets}`);

    // Sort by length descending
    cloudSecrets.sort((a, b) => b.length - a.length)

    // Build array of matching keys
    let outputArray = [];

    // For each secret
    for(let i=0; i < cloudSecrets.length; i++){
        // If they match exactly, return the key as array
        if(cloudSecrets[i]==key){
            logger.debug(`Cloud Secrets Match: ${cloudSecrets[i]}`);
            return [key];
        }
        // If requested key is a parent key of the cloud key, add the requested key
        if(cloudSecrets[i].indexOf(key) > -1){
            logger.debug(`Cloud Secrets Partial Match: ${key}`);

            outputArray.push(cloudSecrets[i]);
        }else if(key.indexOf(cloudSecrets[i]) > -1){
            // If the cloud key is a parent of the requested key, add the parent key
            logger.debug(`Cloud Secrets Partial Match: ${cloudSecrets[i]}`);

            outputArray.push(cloudSecrets[i]);
        }

    }

    // Return output array
    return outputArray;

}



// export const raesumConfigGet = async function(key){
//     //
// }