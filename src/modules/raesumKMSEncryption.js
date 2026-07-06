import {
    KmsKeyringNode,
    NodeCachingMaterialsManager,
    getLocalCryptographicMaterialsCache,
} from '@aws-crypto/client-node';
import {
    KMSClient,
    DecryptCommand,
    GenerateDataKeyCommand,
} from '@aws-sdk/client-kms';
import { createDecipheriv, createCipheriv, randomBytes } from 'crypto';
import raesumConfig from './raesumConfig.js';
import { fileURLToPath } from 'url';
import { buildAWSClientConfig } from '../utils/awsUtils.js';

const __filename = fileURLToPath(import.meta.url);
import { raesumLogger } from './raesumLogger.js';
const logger = raesumLogger(__filename);

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 60 minutes
const CACHE_CAPACITY = 100;

class raesumKMSEncryption {
    #cachingCMM;
    #kmsClient;
    #cache;

    async #getKMSClient() {
        const start = Date.now();

        if (this.#kmsClient) {
            return this.#kmsClient;
        }

        const clientConfig = await buildAWSClientConfig(3);
        this.#kmsClient = new KMSClient(clientConfig);
        logger.info('KMS Client initialized', Date.now() - start);
        return this.#kmsClient;
    }

    async #getMasterKeyARN() {
        const start = Date.now();
        const keyARN = await raesumConfig.get('aws.kms.primaryMasterKeyARN');

        if (!keyARN || keyARN === '' || keyARN === null) {
            logger.critical(
                'AWS KMS primaryMasterKeyARN is not configured or is empty',
                Date.now() - start
            );
            throw new Error(
                'AWS KMS primaryMasterKeyARN is not configured or is empty'
            );
        }

        logger.debug(`Using KMS Master Key ARN: ${keyARN}`, Date.now() - start);
        return keyARN;
    }

    async #initializeCachingCMM() {
        const start = Date.now();

        if (this.#cache) {
            return this.#cache;
        }

        // Create local cache with 60 minute max age using AWS SDK's cache
        this.#cache = getLocalCryptographicMaterialsCache(CACHE_CAPACITY);

        logger.info(
            'Local cryptographic materials cache initialized with 60 minute max age',
            Date.now() - start
        );

        return this.#cache;
    }

    async #decryptDataKey(encryptedKey) {
        const start = Date.now();

        // Initialize cache
        const cache = await this.#initializeCachingCMM();

        // Create a cache key from the encrypted key
        const cacheKey = encryptedKey;

        // Try to get from cache first
        const cachedEntry = cache.get(cacheKey);
        if (cachedEntry) {
            logger.debug(
                'Decrypted data key found in cache',
                Date.now() - start
            );
            return cachedEntry;
        }

        logger.debug('Decrypting data key from KMS', Date.now() - start);

        const client = await this.#getKMSClient();
        const command = new DecryptCommand({
            CiphertextBlob: Buffer.from(encryptedKey, 'base64'),
        });

        try {
            const response = await client.send(command);
            const plaintextKey = response.Plaintext;

            // Put in cache with 60 minute max age
            cache.put(cacheKey, plaintextKey, CACHE_MAX_AGE_MS);

            logger.info(
                'Data key decrypted from KMS and cached for 60 minutes',
                Date.now() - start
            );

            return plaintextKey;
        } catch (error) {
            logger.error(
                `Failed to decrypt data key from KMS: ${error.message}`,
                Date.now() - start
            );
            throw new Error(
                `Failed to decrypt data key from KMS: ${error.message}`
            );
        }
    }

    async #generateDataKey() {
        const start = Date.now();

        const client = await this.#getKMSClient();
        const keyARN = await this.#getMasterKeyARN();

        const command = new GenerateDataKeyCommand({
            KeyId: keyARN,
            KeySpec: 'AES_256',
        });

        try {
            const response = await client.send(command);
            logger.info('Data key generated from KMS', Date.now() - start);
            return {
                plaintextKey: response.Plaintext,
                encryptedKey: response.CiphertextBlob,
            };
        } catch (error) {
            logger.error(
                `Failed to generate data key from KMS: ${error.message}`,
                Date.now() - start
            );
            throw new Error(
                `Failed to generate data key from KMS: ${error.message}`
            );
        }
    }

    /**
     * Decrypts data that was encrypted using AWS KMS envelope encryption
     * @param {Object} input - The encrypted data envelope
     * @param {string} input.encryptedData - The encrypted data (base64 encoded)
     * @param {string} input.encryptedKey - The encrypted data key (base64 encoded)
     * @param {string} input.iv - The initialization vector (base64 encoded)
     * @param {string} input.authTag - The authentication tag (base64 encoded)
     * @returns {Promise<string>} The decrypted plaintext data
     * @throws {Error} If input validation fails or decryption fails
     */
    async decrypt(input) {
        const start = Date.now();
        logger.info('Starting KMS decryption operation', Date.now() - start);

        // Validate input structure
        if (
            !input ||
            typeof input !== 'object' ||
            !input.encryptedData ||
            !input.encryptedKey ||
            !input.iv ||
            !input.authTag
        ) {
            logger.error(
                'Invalid input structure for decrypt operation',
                Date.now() - start
            );
            throw new Error(
                'Invalid input: must be an object with encryptedData, encryptedKey, iv, and authTag'
            );
        }

        if (
            typeof input.encryptedData !== 'string' ||
            typeof input.encryptedKey !== 'string' ||
            typeof input.iv !== 'string' ||
            typeof input.authTag !== 'string'
        ) {
            logger.error(
                'Invalid input types for decrypt operation',
                Date.now() - start
            );
            throw new Error('Invalid input: all fields must be strings');
        }

        try {
            // Initialize cache
            await this.#initializeCachingCMM();

            // Decrypt the data key (with caching)
            const decryptedKey = await this.#decryptDataKey(input.encryptedKey);

            // Decode the encrypted data, IV, and auth tag from base64
            const encryptedDataBuffer = Buffer.from(
                input.encryptedData,
                'base64'
            );
            const ivBuffer = Buffer.from(input.iv, 'base64');
            const authTagBuffer = Buffer.from(input.authTag, 'base64');

            // Create decipher using AES-256-GCM
            const decipher = createDecipheriv(
                'aes-256-gcm',
                decryptedKey,
                ivBuffer
            );

            // Set the authentication tag
            decipher.setAuthTag(authTagBuffer);

            // Decrypt the data
            let decryptedData = decipher.update(encryptedDataBuffer);
            decryptedData = Buffer.concat([decryptedData, decipher.final()]);

            logger.info(
                'Data successfully decrypted using KMS envelope encryption with cached data key',
                Date.now() - start
            );

            return decryptedData.toString('utf8');
        } catch (error) {
            logger.error(
                `Failed to decrypt data: ${error.message}`,
                Date.now() - start
            );
            throw new Error(`Failed to decrypt data: ${error.message}`);
        }
    }

    /**
     * Encrypts data using AWS KMS envelope encryption
     * @param {string} plaintextData - The plaintext data to encrypt
     * @returns {Promise<Object>} The encrypted data envelope
     * @returns {string} return.encryptedData - The encrypted data (base64 encoded)
     * @returns {string} return.encryptedKey - The encrypted data key (base64 encoded)
     * @returns {string} return.iv - The initialization vector (base64 encoded)
     * @returns {string} return.authTag - The authentication tag (base64 encoded)
     * @throws {Error} If encryption fails
     */
    async encrypt(plaintextData) {
        const start = Date.now();
        logger.info('Starting KMS encryption operation', Date.now() - start);

        if (!plaintextData || typeof plaintextData !== 'string') {
            logger.error(
                'Invalid input for encrypt operation: must be a non-empty string',
                Date.now() - start
            );
            throw new Error('Invalid input: must be a non-empty string');
        }

        try {
            // Initialize cache
            await this.#initializeCachingCMM();

            // Generate a data key from KMS
            const { plaintextKey, encryptedKey } =
                await this.#generateDataKey();

            // Generate a cryptographically random 16-byte IV
            const iv = randomBytes(16);

            // Create cipher using AES-256-GCM
            const cipher = createCipheriv('aes-256-gcm', plaintextKey, iv);

            // Encrypt the data
            let encryptedData = cipher.update(plaintextData, 'utf8');
            encryptedData = Buffer.concat([encryptedData, cipher.final()]);

            // Get the authentication tag
            const authTag = cipher.getAuthTag();

            // Zero-fill the plaintext key from memory
            plaintextKey.fill(0);
            logger.debug(
                'Plaintext data key zero-filled from memory',
                Date.now() - start
            );

            const result = {
                encryptedData: encryptedData.toString('base64'),
                encryptedKey: encryptedKey.toString('base64'),
                iv: iv.toString('base64'),
                authTag: authTag.toString('base64'),
            };

            logger.info(
                'Data successfully encrypted using KMS envelope encryption',
                Date.now() - start
            );

            return result;
        } catch (error) {
            logger.error(
                `Failed to encrypt data: ${error.message}`,
                Date.now() - start
            );
            throw new Error(`Failed to encrypt data: ${error.message}`);
        }
    }
}

const singleInstance = new raesumKMSEncryption();
export default singleInstance;
