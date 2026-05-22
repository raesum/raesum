import config from 'config';
import { raesumLogger } from '../modules/raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumConfig from '../modules/raesumConfig.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

export async function buildAWSClientConfig(version = 3) {
    const start = Date.now();

    if (version != 3 || version != 2) {
        version = 3;
    }
    logger.debug(
        `buildAWSClientConfig Building an aws client configuration using version ${version}`
    );

    if (!raesumConfig.has('aws.region')) {
        logger.critical(
            'AWS Region not set. Unable to use AWS.',
            Date.now() - start
        );
        throw new Error('AWS Region not set. Unable to use AWS.');
    }

    let clientConfig = { region: await raesumConfig.get('aws.region') };

    if (
        raesumConfig.has('aws.accessKeyId') &&
        raesumConfig.has('aws.secretAccessKey')
    ) {
        const accessKeyId = await raesumConfig.get('aws.accessKeyId');
        const secretAccessKey = await raesumConfig.get('aws.secretAccessKey');

        logger.debug(
            `buildAWSClientConfig AWS Access Key and Secret Access Key are set`,
            Date.now() - start
        );
        if (accessKeyId && secretAccessKey) {
            // If the accessKeyId and secretAccessKey are present, use them
            if (version == 3) {
                clientConfig.credentials = {
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey,
                };
            } else {
                clientConfig.accessKeyId = accessKeyId;
                clientConfig.secretAccessKey = secretAccessKey;
            }
        }
        logger.verbose(
            'AWS Access Key and Secret Access Key are set and included in configuration',
            Date.now() - start
        );
    } else {
        logger.verbose(
            'AWS Access Key and Secret Access Key are not set and only AWS region is being used',
            Date.now() - start
        );
    }

    return clientConfig;

    // let awsV3Config = {
    //     region: awsConfig.region,
    //     credentials: {
    //         accessKeyId: awsConfig.accessKeyId,
    //         secretAccessKey: awsConfig.secretAccessKey,
    //     },
    // };
    // return awsV3Config;
}

export default buildAWSClientConfig();
