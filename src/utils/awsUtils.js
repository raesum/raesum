import config from "config";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");

export function buildAWSConfig() {
    const start = Date.now();
// Create the AWS Secrets Manager Configuration
    // Note: this line is one of the VERY few exceptions to the always uses raesum config and never config directly rule (because the raseumConfig.get() relies on the AWS client)
    if(!config.has("aws.region")){
        logger.critical("AWS Region not set. Unable to use AWS Secrets manager", Date.now() - start);
        return {};
    }

    let clientConfig = {region: config.get("aws.region")};

    if(config.has("aws.acceddKeyId") && config.has("aws.secretAccessKey")) {

        const accessKeyId = config.get("aws.accessKeyId");
        const secretAccessKey = config.get("aws.secretAccessKey");
        if (accessKeyId && secretAccessKey) {
            // If the accessKeyId and secretAccessKey are present, use them
            clientConfig.accessKeyId = accessKeyId;
            clientConfig.secretAccessKey = secretAccessKey;
        }
        logger.debug("AWS Access Key and Secret Access Key are set and included in configuration", Date.now() - start);
    }else{
        logger.debug("AWS Access Key and Secret Access Key are not set and only AWS region is being used", Date.now() - start);
    }


    return clientConfig;

}