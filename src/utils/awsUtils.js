import config from "config";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumConfig from "../modules/raesumConfig.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

export function buildAWSConfigInitializationOnly() {
    const start = Date.now();
// Create the AWS Secrets Manager Configuration
    // Note: this line is one of the VERY few exceptions to the always uses raesum config and never config directly rule (because the raseumConfig.get() relies on the AWS client)
    if(!config.has("aws.region")){
        logger.critical("AWS Region not set. Unable to use AWS Secrets manager", Date.now() - start);
        return {};
    }

    let clientConfig = {region: config.get("aws.region")};

    if(config.has("aws.accessKeyId") && config.has("aws.secretAccessKey")) {

        const accessKeyId = config.get("aws.accessKeyId");
        const secretAccessKey = config.get("aws.secretAccessKey");
        if (accessKeyId && secretAccessKey) {
            // If the accessKeyId and secretAccessKey are present, use them
            clientConfig.accessKeyId = accessKeyId;
            clientConfig.secretAccessKey = secretAccessKey;
        }
        logger.verbose("AWS Access Key and Secret Access Key are set and included in configuration", Date.now() - start);
    }else{
        logger.verbose("AWS Access Key and Secret Access Key are not set and only AWS region is being used", Date.now() - start);
    }


    return clientConfig;

}

export async function buildAWSClientConfig(version=3){
    const start = Date.now();

    if(version != 3 || version != 2){
        version = 3;
    }

    if(!raesumConfig.has("aws.region")){
        logger.critical("AWS Region not set. Unable to use AWS.", Date.now() - start);
        throw new Error("AWS Region not set. Unable to use AWS.");
    }

    let clientConfig = {region: await raesumConfig.get("aws.region")};

    if(raesumConfig.has("aws.accessKeyId") && raesumConfig.has("aws.secretAccessKey")) {

        const accessKeyId = await raesumConfig.get("aws.accessKeyId");
        const secretAccessKey = await raesumConfig.get("aws.secretAccessKey");
        if (accessKeyId && secretAccessKey) {
            // If the accessKeyId and secretAccessKey are present, use them
            if(version == 3) {
                clientConfig.credentials = {
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey
                }
            }else{
                    clientConfig.accessKeyId = accessKeyId;
                    clientConfig.secretAccessKey = secretAccessKey;
                }
        }
        logger.verbose("AWS Access Key and Secret Access Key are set and included in configuration", Date.now() - start);
    }else{
        logger.verbose("AWS Access Key and Secret Access Key are not set and only AWS region is being used", Date.now() - start);
    }


    return clientConfig;


    let awsV3Config = {
        region: awsConfig.region,
        credentials: {
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey
        }
    }
    return awsV3Config;
}