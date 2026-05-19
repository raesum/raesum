import { vi, test, expect, describe, beforeAll, afterAll } from 'vitest';
import raesumFile from '../../src/models/raesumFile.js';
import raesumDB from '../../src/modules/raesumDB.js';
import raesumConfig from '../../src/modules/raesumConfig.js';
import raesumUser from '../../src/models/raesumUser.js';
import raesumOrganization from '../../src/models/raesumOrganization.js';
import raesumCache from '../../src/modules/raesumCache.js';
import config from 'config';

const s3SendMock = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(() => ({
        send: s3SendMock,
    })),
    PutObjectCommand: vi.fn((input) => ({ input })),
    CopyObjectCommand: vi.fn((input) => ({ input })),
    DeleteObjectCommand: vi.fn((input) => ({ input })),
    HeadObjectCommand: vi.fn((input) => ({ input })),
    GetObjectCommand: vi.fn((input) => ({ input })),
    GetBucketLocationCommand: vi.fn((input) => ({ input })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn(() => 'https://mock-signed-url'),
}));

async function cleanupFiles(id) {
    id = id.toString();

    await raesumDB.query(
        `DELETE FROM raesum_file_x_metadata Fxm USING raesum_file F, raesum_user U WHERE Fxm.file_id = F.id AND F.user_id = U.id AND U.username LIKE 'test-file-${id}%';`
    );

    await raesumDB.query(`DELETE FROM raesum_file WHERE path LIKE '${id}%';`);

    await raesumDB.query(
        `DELETE FROM raesum_file F USING raesum_user U WHERE F.user_id = U.id AND U.username LIKE 'test-file-${id}%';`
    );

    await raesumDB.query(
        `DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-file-${id}%';`
    );
    await raesumDB.query(
        `DELETE FROM raesum_user WHERE username LIKE 'test-file-${id}%';`
    );
}

describe('Raesum File Model', () => {
    const dbTestsEnabled = config.get(
        'developmentAndTesting.integrationTestEnabled.primaryDatabase'
    );
    console.log('DB Tests Enabled: ' + dbTestsEnabled);

    const iftest = dbTestsEnabled ? test : test.skip;

    let rootUserId;

    beforeAll(async () => {
        // Clean up any existing test data
        await raesumDB.query(
            `DELETE FROM raesum_file_x_metadata Fxm USING raesum_file F WHERE Fxm.file_id = F.id AND F.path LIKE 'test-file-%'; DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-file-%'; DELETE FROM raesum_file_x_metadata Fxm USING raesum_file F, raesum_user U WHERE Fxm.file_id = F.id AND F.user_id = U.id AND U.username LIKE 'test-file-%'; DELETE FROM raesum_file F USING  raesum_user U WHERE F.user_id = U.id AND U.username LIKE 'test-file-%'; DELETE FROM raesum_file WHERE path LIKE 'test-file-%'; DELETE FROM raesum_user WHERE username LIKE 'test-file-%';`
        );

        // Get the root user ID from the firstUserUsername setting
        const firstUserUsername = await raesumConfig.get(
            'initialization.firstUserUsername'
        );
        const rootUser = await raesumUser.getUserByUsername(firstUserUsername);
        rootUserId = rootUser.id;
    });

    afterAll(async () => {
        // Final cleanup
        await raesumDB.query(
            `DELETE FROM raesum_file_x_metadata Fxm USING raesum_file F WHERE Fxm.file_id = F.id AND F.path LIKE 'test-file-%'; DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-file-%'; DELETE FROM raesum_file_x_metadata Fxm USING raesum_file F, raesum_user U WHERE Fxm.file_id = F.id AND F.user_id = U.id AND U.username LIKE 'test-file-%'; DELETE FROM raesum_file F USING  raesum_user U WHERE F.user_id = U.id AND U.username LIKE 'test-file-%'; DELETE FROM raesum_file WHERE path LIKE 'test-file-%'; DELETE FROM raesum_user WHERE username LIKE 'test-file-%'; `
        );
    });

    describe('getFileTypes', () => {
        iftest('should return file types from controlled data', async () => {
            const fileTypes = await raesumFile.getFileTypes();
            expect(fileTypes).toBeDefined();
            expect(typeof fileTypes).toBe('object');
            expect(Object.keys(fileTypes).length).toBeGreaterThan(0);
        });

        iftest('should return file types with datakey property', async () => {
            const fileTypes = await raesumFile.getFileTypes();
            const firstType = Object.values(fileTypes)[0];
            expect(firstType).toHaveProperty('datakey');
        });
    });

    describe('getOneFileType', () => {
        iftest('should return file type for valid key', async () => {
            const fileType = await raesumFile.getOneFileType('testTextFile');
            expect(fileType).toBeDefined();
            expect(fileType.datakey).toBe('testTextFile');
        });

        iftest('should return false for invalid file type key', async () => {
            const fileType = await raesumFile.getOneFileType('invalidFileType');
            expect(fileType).toBe(false);
        });

        iftest('should throw error for empty file type key', async () => {
            await expect(raesumFile.getOneFileType('')).rejects.toThrow(
                'File type key must be a non-empty string'
            );
        });
    });

    describe('createFileEntry', () => {
        iftest('should create file entry with valid parameters', async () => {
            await cleanupFiles(1);

            const testId = 101;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const result = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            expect(result).toBeDefined();
            expect(result.id).toBeGreaterThan(0);
            expect(parseInt(result.user_id)).toBe(userId);
            expect(result.org_id).toBe(orgId);
            expect(result.file_type_key).toBe('testTextFile');
            expect(result.quarantine).toBe(true);

            await cleanupFiles(1);
        });

        iftest(
            'should create file entry with null originalFileName',
            async () => {
                await cleanupFiles(2);

                const testId = 102;
                const orgId = await raesumOrganization.create(
                    `test-file-${testId} Org`,
                    true
                );
                const userId = await raesumDB
                    .query(
                        'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        [
                            `test-file-${testId}user`,
                            true,
                            1,
                            `test-file-${testId}external`,
                        ]
                    )
                    .then((result) => parseInt(result.rows[0].id));

                await raesumDB.query(
                    'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                    [userId, orgId]
                );

                const result = await raesumFile.createFileEntry(
                    'testTextFile',
                    orgId,
                    userId,
                    null
                );

                expect(result).toBeDefined();
                expect(result.id).toBeGreaterThan(0);
                expect(result.original_file_name).toBeNull();

                await cleanupFiles(2);
            }
        );

        iftest('should throw error for invalid fileTypeKey', async () => {
            await expect(
                raesumFile.createFileEntry('', 1, 123, 'test.pdf')
            ).rejects.toThrow('File type key must be a non-empty string');
        });

        iftest('should throw error for invalid orgId', async () => {
            await expect(
                raesumFile.createFileEntry('testTextFile', 0, 1, 'test.pdf')
            ).rejects.toThrow('Organization ID must be a positive integer');
        });

        iftest('should throw error for invalid userId', async () => {
            await expect(
                raesumFile.createFileEntry('testTextFile', 1, 0, 'test.pdf')
            ).rejects.toThrow('User ID must be a positive integer');
        });
    });

    describe('getEntryById', () => {
        iftest('should get file entry by valid ID', async () => {
            await cleanupFiles(3);

            const testId = 103;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            const result = await raesumFile.getEntryById(fileRecord.id);

            expect(result).toBeDefined();
            expect(result.id).toBe(fileRecord.id);
            expect(result.user_id).toBe(userId);
            expect(result.org_id).toBe(orgId);

            await cleanupFiles(3);
        });

        iftest('should throw error for invalid ID', async () => {
            await expect(raesumFile.getEntryById(0)).rejects.toThrow(
                'File ID must be a positive integer'
            );
            await expect(raesumFile.getEntryById(-1)).rejects.toThrow(
                'File ID must be a positive integer'
            );
        });

        iftest('should throw error when file not found', async () => {
            await expect(raesumFile.getEntryById(999999)).rejects.toThrow(
                'Unable to get file entry'
            );
        });
    });

    describe('getEntriesByUserAndOrg', () => {
        iftest('should get entries by userId', async () => {
            await cleanupFiles(4);

            const testId = 104;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test1.txt'
            );
            await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test2.txt'
            );

            const result = await raesumFile.getEntriesByUserAndOrg(
                userId,
                null
            );

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThanOrEqual(2);

            await cleanupFiles(4);
        });

        iftest('should get entries by orgId', async () => {
            await cleanupFiles(5);

            const testId = 105;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId1 = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user1`,
                        true,
                        1,
                        `test-file-${testId}external1`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            const userId2 = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user2`,
                        true,
                        1,
                        `test-file-${testId}external2`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId1, orgId]
            );
            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId2, orgId]
            );

            await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId1,
                'test1.txt'
            );
            await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId2,
                'test2.txt'
            );

            const result = await raesumFile.getEntriesByUserAndOrg(null, orgId);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThanOrEqual(2);

            await cleanupFiles(5);
        });

        iftest(
            'should throw error when both userId and orgId are null',
            async () => {
                await expect(
                    raesumFile.getEntriesByUserAndOrg(null, null)
                ).rejects.toThrow(
                    'At least one of userId or orgId must be provided'
                );
            }
        );
    });

    describe('updateFileStatus', () => {
        iftest('should update file status with valid parameters', async () => {
            await cleanupFiles(6);

            const testId = 106;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            const result = await raesumFile.updateFileStatus(
                fileRecord.id,
                'accepted',
                'Test approval'
            );

            expect(result).toBe(true);

            const updatedFile = await raesumFile.getEntryById(fileRecord.id);
            expect(updatedFile.status_id).not.toBe(1); // Should no longer be uploading

            await cleanupFiles(6);
        });

        iftest('should throw error for invalid fileId', async () => {
            await expect(
                raesumFile.updateFileStatus(0, 'accepted', 'reason')
            ).rejects.toThrow('File ID must be a positive integer');
        });

        iftest('should throw error for invalid status', async () => {
            await expect(
                raesumFile.updateFileStatus(456, '', 'reason')
            ).rejects.toThrow('Status must be a non-empty string');
        });
    });

    describe('getSignedURL', () => {
        iftest('should return signed URL for valid file', async () => {
            await cleanupFiles(7);

            const testId = 107;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            // Update file to have a path
            await raesumDB.query(
                'UPDATE raesum_file SET path = $1 WHERE id = $2',
                ['test-path/test.txt', fileRecord.id]
            );

            // Mock AWS config values for S3Client
            const configSpy = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValueOnce('test-access-key')
                .mockResolvedValueOnce('test-secret-key');

            const signedURL = await raesumFile.getSignedURL(fileRecord.id);

            expect(signedURL).toBeDefined();
            expect(typeof signedURL).toBe('string');

            // Restore mock
            configSpy.mockRestore();

            await cleanupFiles(7);
        });

        iftest('should throw error for invalid fileId', async () => {
            await expect(raesumFile.getSignedURL(0)).rejects.toThrow(
                'File ID must be a positive integer'
            );
        });
    });

    describe('getPublicURL', () => {
        iftest('should return public URL for public file type', async () => {
            await cleanupFiles(8);

            const testId = 108;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'standardImage',
                orgId,
                userId,
                'test.jpg'
            );

            // Update file to have a path and be in public bucket
            await raesumDB.query(
                'UPDATE raesum_file SET path = $1, bucket = $2, quarantine = false WHERE id = $3',
                ['test-path/test.jpg', 'localhost-public', fileRecord.id]
            );

            // Mock the public bucket config and AWS credentials
            const configSpy = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValueOnce('localhost-public') // public bucket
                .mockResolvedValueOnce('test-access-key') // accessKeyId
                .mockResolvedValueOnce('test-secret-key'); // secretAccessKey

            // Mock the file type as public by default
            const fileTypeSpy = vi
                .spyOn(raesumFile, 'getOneFileType')
                .mockResolvedValueOnce({
                    datakey: 'standardImage',
                    publicByDefault: true,
                });

            // Mock the S3Client send to return HeadBucket response with region
            s3SendMock.mockResolvedValueOnce({
                $metadata: {
                    httpHeaders: {
                        'x-amz-bucket-region': 'us-east-1',
                    },
                },
            });

            const publicURL = await raesumFile.getPublicURL(fileRecord.id);

            expect(publicURL).toBeDefined();
            expect(typeof publicURL).toBe('string');

            // Restore mocks
            configSpy.mockRestore();
            fileTypeSpy.mockRestore();
            s3SendMock.mockReset();

            await cleanupFiles(8);
        });

        iftest('should return false for private file type', async () => {
            await cleanupFiles(9);

            const testId = 109;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            const publicURL = await raesumFile.getPublicURL(fileRecord.id);

            expect(publicURL).toBe(false);

            await cleanupFiles(9);
        });
    });

    describe('getMetaDataKeys', () => {
        iftest('should return metadata keys', async () => {
            const keys = await raesumFile.getMetaDataKeys();
            expect(keys).toBeDefined();
            expect(typeof keys).toBe('object');
        });

        iftest('should return inactive keys when requested', async () => {
            const keys = await raesumFile.getMetaDataKeys(true);
            expect(keys).toBeDefined();
            expect(typeof keys).toBe('object');
        });
    });

    describe('clearMetadataKeyCache', () => {
        iftest('should clear metadata key cache', async () => {
            const result = await raesumFile.clearMetadataKeyCache();
            expect(result).toBe(true);
        });
    });

    describe('getFileMetadataValues', () => {
        iftest('should return metadata values for file', async () => {
            await cleanupFiles(10);

            const testId = 110;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            // First, get valid metadata keys
            const metadataKeys = await raesumFile.getMetaDataKeys();
            const validKeys = Object.keys(metadataKeys);

            if (validKeys.length > 0) {
                const result = await raesumFile.getFileMetadataValues(
                    fileRecord.id,
                    validKeys
                );
                expect(result).toBeDefined();
                expect(typeof result).toBe('object');
            }

            await cleanupFiles(10);
        });

        iftest('should throw error for invalid fileId', async () => {
            await expect(
                raesumFile.getFileMetadataValues(0, ['testKey'])
            ).rejects.toThrow('File ID must be a positive integer');
        });
    });

    describe('setFileMetadataValues', () => {
        iftest('should set metadata values for file', async () => {
            await cleanupFiles(11);

            const testId = 112;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            // Get valid metadata keys
            const metadataKeys = await raesumFile.getMetaDataKeys();
            const validKeys = Object.keys(metadataKeys);

            if (validKeys.length > 0) {
                const values = {};
                values[validKeys[0]] = 'test value';

                const result = await raesumFile.setFileMetadataValues(
                    fileRecord.id,
                    values
                );
                expect(result).toBe(true);
            }

            await cleanupFiles(11);
        });

        iftest('should throw error for invalid fileId', async () => {
            await expect(
                raesumFile.setFileMetadataValues(0, { testKey: 'value' })
            ).rejects.toThrow('File ID must be a positive integer');
        });
    });

    describe('deleteFileMetadataValues', () => {
        iftest('should delete metadata values for file', async () => {
            await cleanupFiles(12);

            const testId = 113;
            const orgId = await raesumOrganization.create(
                `test-file-${testId} Org`,
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [
                        `test-file-${testId}user`,
                        true,
                        1,
                        `test-file-${testId}external`,
                    ]
                )
                .then((result) => parseInt(result.rows[0].id));

            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, orgId]
            );

            const fileRecord = await raesumFile.createFileEntry(
                'testTextFile',
                orgId,
                userId,
                'test.txt'
            );

            // Get valid metadata keys
            const metadataKeys = await raesumFile.getMetaDataKeys();
            const validKeys = Object.keys(metadataKeys);

            if (validKeys.length > 0) {
                const result = await raesumFile.deleteFileMetadataValues(
                    fileRecord.id,
                    [validKeys[0]]
                );
                expect(result).toBe(true);
            }

            await cleanupFiles(12);
        });

        iftest('should throw error for invalid fileId', async () => {
            await expect(
                raesumFile.deleteFileMetadataValues(0, ['testKey'])
            ).rejects.toThrow('File ID must be a positive integer');
        });
    });
});
