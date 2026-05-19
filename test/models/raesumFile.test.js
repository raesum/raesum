import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumFile from '../../src/models/raesumFile.js';
import raesumDB from '../../src/modules/raesumDB.js';
import raesumConfig from '../../src/modules/raesumConfig.js';
import raesumUser from '../../src/models/raesumUser.js';
import raesumOrganization from '../../src/models/raesumOrganization.js';
import raesumCache from '../../src/modules/raesumCache.js';

describe('Raesum File Model', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createFileEntry', () => {
        test('should create file entry with valid parameters', async () => {
            const fileTypeKey = 'pdf';
            const orgId = 1;
            const userId = 123;
            const originalFileName = 'test.pdf';
            const awsRegion = 'us-east-1';
            const quarantineBucket = 'localhost-quarantine';

            // Mock file type validation
            const fileTypeMock = vi
                .spyOn(raesumFile, 'getOneFileType')
                .mockResolvedValue({ datakey: fileTypeKey });

            // Mock user existence check
            const userMock = vi
                .spyOn(raesumUser, 'getUserById')
                .mockResolvedValue({ id: userId });

            // Mock organization existence check
            const orgMock = vi
                .spyOn(raesumOrganization, 'getById')
                .mockResolvedValue({ id: orgId });

            // Mock config values
            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValueOnce(awsRegion)
                .mockResolvedValueOnce(quarantineBucket);

            // Mock database insert
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [{ id: 456 }],
            });

            const result = await raesumFile.createFileEntry(
                fileTypeKey,
                orgId,
                userId,
                originalFileName
            );

            expect(result).toBe(456);
            expect(fileTypeMock).toHaveBeenCalledWith(fileTypeKey);
            expect(userMock).toHaveBeenCalledWith(userId);
            expect(orgMock).toHaveBeenCalledWith(orgId);
            expect(configMock).toHaveBeenCalledTimes(2);
            expect(configMock).toHaveBeenNthCalledWith(1, 'aws.region');
            expect(configMock).toHaveBeenNthCalledWith(
                2,
                'aws.s3.quarantine.bucketName'
            );
            expect(dbMock).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO raesum_file'),
                [userId, orgId, awsRegion, quarantineBucket, originalFileName]
            );
        });

        test('should create file entry with null originalFileName', async () => {
            const fileTypeKey = 'pdf';
            const orgId = 1;
            const userId = 123;
            const originalFileName = null;

            vi.spyOn(raesumFile, 'getOneFileType').mockResolvedValue({
                datakey: fileTypeKey,
            });
            vi.spyOn(raesumUser, 'getUserById').mockResolvedValue({
                id: userId,
            });
            vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                id: orgId,
            });
            vi.spyOn(raesumConfig, 'get')
                .mockResolvedValueOnce('us-east-1')
                .mockResolvedValueOnce('localhost-quarantine');
            vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [{ id: 456 }],
            });

            const result = await raesumFile.createFileEntry(
                fileTypeKey,
                orgId,
                userId,
                originalFileName
            );

            expect(result).toBe(456);
        });

        test('should create file entry with undefined originalFileName', async () => {
            const fileTypeKey = 'pdf';
            const orgId = 1;
            const userId = 123;
            const originalFileName = undefined;

            vi.spyOn(raesumFile, 'getOneFileType').mockResolvedValue({
                datakey: fileTypeKey,
            });
            vi.spyOn(raesumUser, 'getUserById').mockResolvedValue({
                id: userId,
            });
            vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                id: orgId,
            });
            vi.spyOn(raesumConfig, 'get')
                .mockResolvedValueOnce('us-east-1')
                .mockResolvedValueOnce('localhost-quarantine');
            vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [{ id: 456 }],
            });

            const result = await raesumFile.createFileEntry(
                fileTypeKey,
                orgId,
                userId,
                originalFileName
            );

            expect(result).toBe(456);
        });

        test('should throw error for invalid fileTypeKey', async () => {
            await expect(
                raesumFile.createFileEntry('', 1, 123, 'test.pdf')
            ).rejects.toThrow('File type key must be a non-empty string');
            await expect(
                raesumFile.createFileEntry(null, 1, 123, 'test.pdf')
            ).rejects.toThrow('File type key must be a non-empty string');
            await expect(
                raesumFile.createFileEntry(123, 1, 123, 'test.pdf')
            ).rejects.toThrow('File type key must be a non-empty string');
        });

        test('should throw error for invalid orgId', async () => {
            // Mock user existence check
            vi.spyOn(raesumUser, 'getUserById').mockResolvedValue({ id: 1 });

            await expect(
                raesumFile.createFileEntry('testTextFile', 0, 1, 'test.pdf')
            ).rejects.toThrow('Organization ID must be a positive integer');
            await expect(
                raesumFile.createFileEntry('testTextFile', -1, 1, 'test.pdf')
            ).rejects.toThrow('Organization ID must be a positive integer');
            await expect(
                raesumFile.createFileEntry('testTextFile', 'abc', 1, 'test.pdf')
            ).rejects.toThrow('Organization ID must be a positive integer');
        });

        test('should throw error for invalid userId', async () => {
            await expect(
                raesumFile.createFileEntry('testTextFile', 1, 0, 'test.pdf')
            ).rejects.toThrow('User ID must be a positive integer');
            await expect(
                raesumFile.createFileEntry('testTextFile', 1, -1, 'test.pdf')
            ).rejects.toThrow('User ID must be a positive integer');
            await expect(
                raesumFile.createFileEntry('testTextFile', 1, 'abc', 'test.pdf')
            ).rejects.toThrow('User ID must be a positive integer');
        });

        test('should throw error for invalid originalFileName (non-null/undefined)', async () => {
            await expect(
                raesumFile.createFileEntry('pdf', 1, 123, '')
            ).rejects.toThrow(
                'Original file name must be null, undefined, or a non-empty string'
            );
            await expect(
                raesumFile.createFileEntry('pdf', 1, 123, 123)
            ).rejects.toThrow(
                'Original file name must be null, undefined, or a non-empty string'
            );
        });

        test('should throw error when file type does not exist', async () => {
            vi.spyOn(raesumFile, 'getOneFileType').mockResolvedValue(false);

            await expect(
                raesumFile.createFileEntry('invalid', 1, 123, 'test.pdf')
            ).rejects.toThrow('Invalid file type key');
        });

        test('should throw error when user does not exist', async () => {
            vi.spyOn(raesumFile, 'getOneFileType').mockResolvedValue({
                datakey: 'pdf',
            });
            vi.spyOn(raesumUser, 'getUserById').mockRejectedValue(
                new Error('User not found')
            );

            await expect(
                raesumFile.createFileEntry('pdf', 1, 123, 'test.pdf')
            ).rejects.toThrow('User does not exist');
        });

        test('should throw error when organization does not exist', async () => {
            vi.spyOn(raesumFile, 'getOneFileType').mockResolvedValue({
                datakey: 'pdf',
            });
            vi.spyOn(raesumUser, 'getUserById').mockResolvedValue({ id: 123 });
            vi.spyOn(raesumOrganization, 'getById').mockRejectedValue(
                new Error('Organization not found')
            );

            await expect(
                raesumFile.createFileEntry('pdf', 1, 123, 'test.pdf')
            ).rejects.toThrow('Organization does not exist');
        });

        test('should throw error when database insert fails', async () => {
            vi.spyOn(raesumFile, 'getOneFileType').mockResolvedValue({
                datakey: 'pdf',
            });
            vi.spyOn(raesumUser, 'getUserById').mockResolvedValue({ id: 123 });
            vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                id: 1,
            });
            vi.spyOn(raesumConfig, 'get')
                .mockResolvedValueOnce('us-east-1')
                .mockResolvedValueOnce('localhost-quarantine');
            vi.spyOn(raesumDB, 'query').mockRejectedValue(
                new Error('DB Error')
            );

            await expect(
                raesumFile.createFileEntry('pdf', 1, 123, 'test.pdf')
            ).rejects.toThrow('Unable to create file entry');
        });
    });

    describe('updateFileStatus', () => {
        test('should update file status with valid parameters', async () => {
            const fileId = 456;
            const status = 'approved';
            const reason = 'File validated successfully';
            const statusId = 1;

            // Mock database queries in sequence
            const queryMock = vi
                .spyOn(raesumDB, 'query')
                .mockResolvedValueOnce({ rows: [{ id: fileId }] }) // File existence check
                .mockResolvedValueOnce({ rows: [{ id: statusId }] }) // Status lookup
                .mockResolvedValueOnce({}); // Update operation

            const result = await raesumFile.updateFileStatus(
                fileId,
                status,
                reason
            );

            expect(result).toBe(true);
            expect(queryMock).toHaveBeenCalledTimes(3);
            expect(queryMock).toHaveBeenNthCalledWith(
                1,
                'SELECT * FROM raesum_file WHERE id = $1',
                [fileId]
            );
            expect(queryMock).toHaveBeenNthCalledWith(
                2,
                'SELECT id FROM raesum_file_status WHERE datakey = $1',
                [status]
            );
            expect(queryMock).toHaveBeenNthCalledWith(
                3,
                'UPDATE raesum_file SET status_id = $1 WHERE id = $2',
                [statusId, fileId]
            );

            queryMock.mockRestore();
        });

        test('should throw error for invalid fileId', async () => {
            await expect(
                raesumFile.updateFileStatus(0, 'approved', 'reason')
            ).rejects.toThrow('File ID must be a positive integer');
            await expect(
                raesumFile.updateFileStatus(-1, 'approved', 'reason')
            ).rejects.toThrow('File ID must be a positive integer');
            await expect(
                raesumFile.updateFileStatus('abc', 'approved', 'reason')
            ).rejects.toThrow('File ID must be a positive integer');
        });

        test('should throw error for invalid status', async () => {
            await expect(
                raesumFile.updateFileStatus(456, '', 'reason')
            ).rejects.toThrow('Status must be a non-empty string');
            await expect(
                raesumFile.updateFileStatus(456, null, 'reason')
            ).rejects.toThrow('Status must be a non-empty string');
            await expect(
                raesumFile.updateFileStatus(456, 123, 'reason')
            ).rejects.toThrow('Status must be a non-empty string');
        });

        test('should throw error for invalid reason', async () => {
            await expect(
                raesumFile.updateFileStatus(456, 'approved', null)
            ).rejects.toThrow('Reason must be a string');
            await expect(
                raesumFile.updateFileStatus(456, 'approved', 123)
            ).rejects.toThrow('Reason must be a string');
        });

        test('should throw error when file not found', async () => {
            vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

            await expect(
                raesumFile.updateFileStatus(456, 'approved', 'reason')
            ).rejects.toThrow('File not found');
        });

        test('should throw error when status is invalid', async () => {
            vi.spyOn(raesumDB, 'query')
                .mockResolvedValueOnce({ rows: [{ id: 456 }] }) // File exists
                .mockResolvedValueOnce({ rows: [] }); // Status not found

            await expect(
                raesumFile.updateFileStatus(456, 'invalid_status', 'reason')
            ).rejects.toThrow('Invalid status');
        });

        test('should throw error when database update fails', async () => {
            vi.spyOn(raesumDB, 'query')
                .mockResolvedValueOnce({ rows: [{ id: 456 }] }) // File exists
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Status exists
                .mockRejectedValueOnce(new Error('DB Error')); // Update fails

            await expect(
                raesumFile.updateFileStatus(456, 'approved', 'reason')
            ).rejects.toThrow('Unable to update file status');
        });
    });

    describe('getEntryById', () => {
        test('should get file entry by valid ID', async () => {
            const fileId = 456;
            const mockFile = {
                id: fileId,
                user_id: 123,
                org_id: 1,
                status_id: 1,
                quarantine: true,
                awsregion: 'us-east-1',
                bucket: 'localhost-quarantine',
                path: '',
                original_file_name: 'test.pdf',
            };

            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [mockFile],
            });

            const result = await raesumFile.getEntryById(fileId);

            expect(result).toBeDefined();
            expect(result.id).toBe(fileId);
            expect(result.user_id).toBe(123);
            expect(result.org_id).toBe(1);
            expect(dbMock).toHaveBeenCalledWith(
                'SELECT * FROM raesum_file WHERE id = $1',
                [fileId]
            );
        });

        test('should parse integer fields correctly', async () => {
            const fileId = 456;
            const mockFile = {
                id: '456',
                user_id: '123',
                org_id: '1',
                status_id: '1',
            };

            vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [mockFile],
            });

            const result = await raesumFile.getEntryById(fileId);

            expect(typeof result.id).toBe('number');
            expect(typeof result.user_id).toBe('number');
            expect(typeof result.org_id).toBe('number');
            expect(typeof result.status_id).toBe('number');
        });

        test('should handle null status_id', async () => {
            const fileId = 456;
            const mockFile = {
                id: fileId,
                user_id: 123,
                org_id: 1,
                status_id: null,
            };

            vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [mockFile],
            });

            const result = await raesumFile.getEntryById(fileId);

            expect(result.status_id).toBeNull();
        });

        test('should throw error for invalid ID', async () => {
            await expect(raesumFile.getEntryById(0)).rejects.toThrow(
                'File ID must be a positive integer'
            );
            await expect(raesumFile.getEntryById(-1)).rejects.toThrow(
                'File ID must be a positive integer'
            );
            await expect(raesumFile.getEntryById('abc')).rejects.toThrow(
                'File ID must be a positive integer'
            );
        });

        test('should throw error when file not found', async () => {
            vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

            await expect(raesumFile.getEntryById(456)).rejects.toThrow(
                'Unable to get file entry'
            );
        });

        test('should throw error when database query fails', async () => {
            vi.spyOn(raesumDB, 'query').mockRejectedValue(
                new Error('DB Error')
            );

            await expect(raesumFile.getEntryById(456)).rejects.toThrow(
                'Unable to get file entry'
            );
        });
    });

    describe('getEntriesByUserAndOrg', () => {
        test('should get entries by userId only', async () => {
            const userId = 123;
            const mockFiles = [
                { id: 1, user_id: 123, org_id: 1, status_id: 1 },
                { id: 2, user_id: 123, org_id: 2, status_id: 1 },
            ];

            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: mockFiles,
            });

            const result = await raesumFile.getEntriesByUserAndOrg(
                userId,
                null
            );

            expect(result).toHaveLength(2);
            expect(dbMock).toHaveBeenCalledWith(
                expect.stringContaining(
                    'SELECT * FROM raesum_file WHERE user_id = $1'
                ),
                [userId]
            );
        });

        test('should get entries by orgId only', async () => {
            const orgId = 1;
            const mockFiles = [
                { id: 1, user_id: 123, org_id: 1, status_id: 1 },
                { id: 2, user_id: 124, org_id: 1, status_id: 1 },
            ];

            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: mockFiles,
            });

            const result = await raesumFile.getEntriesByUserAndOrg(null, orgId);

            expect(result).toHaveLength(2);
            expect(dbMock).toHaveBeenCalledWith(
                expect.stringContaining(
                    'SELECT * FROM raesum_file WHERE org_id = $1'
                ),
                [orgId]
            );
        });

        test('should get entries by both userId and orgId', async () => {
            const userId = 123;
            const orgId = 1;
            const mockFiles = [
                { id: 1, user_id: 123, org_id: 1, status_id: 1 },
            ];

            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: mockFiles,
            });

            const result = await raesumFile.getEntriesByUserAndOrg(
                userId,
                orgId
            );

            expect(result).toHaveLength(1);
            expect(dbMock).toHaveBeenCalledWith(
                expect.stringContaining(
                    'SELECT * FROM raesum_file WHERE user_id = $1 AND org_id = $2'
                ),
                [userId, orgId]
            );
        });

        test('should parse integer fields for all results', async () => {
            const userId = 123;
            const mockFiles = [
                { id: '1', user_id: '123', org_id: '1', status_id: '1' },
                { id: '2', user_id: '123', org_id: '2', status_id: null },
            ];

            vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: mockFiles,
            });

            const result = await raesumFile.getEntriesByUserAndOrg(
                userId,
                null
            );

            result.forEach((file) => {
                expect(typeof file.id).toBe('number');
                expect(typeof file.user_id).toBe('number');
                expect(typeof file.org_id).toBe('number');
            });
        });

        test('should throw error when both userId and orgId are null', async () => {
            await expect(
                raesumFile.getEntriesByUserAndOrg(null, null)
            ).rejects.toThrow(
                'At least one of userId or orgId must be provided'
            );
        });

        test('should throw error when both userId and orgId are undefined', async () => {
            await expect(
                raesumFile.getEntriesByUserAndOrg(undefined, undefined)
            ).rejects.toThrow(
                'At least one of userId or orgId must be provided'
            );
        });

        test('should throw error for invalid userId', async () => {
            await expect(
                raesumFile.getEntriesByUserAndOrg(0, null)
            ).rejects.toThrow('User ID must be a positive integer');
            await expect(
                raesumFile.getEntriesByUserAndOrg(-1, null)
            ).rejects.toThrow('User ID must be a positive integer');
            await expect(
                raesumFile.getEntriesByUserAndOrg('abc', null)
            ).rejects.toThrow('User ID must be a positive integer');
        });

        test('should throw error for invalid orgId', async () => {
            await expect(
                raesumFile.getEntriesByUserAndOrg(null, 0)
            ).rejects.toThrow('Organization ID must be a positive integer');
            await expect(
                raesumFile.getEntriesByUserAndOrg(null, -1)
            ).rejects.toThrow('Organization ID must be a positive integer');
            await expect(
                raesumFile.getEntriesByUserAndOrg(null, 'abc')
            ).rejects.toThrow('Organization ID must be a positive integer');
        });

        test('should throw error when database query fails', async () => {
            vi.spyOn(raesumDB, 'query').mockRejectedValue(
                new Error('DB Error')
            );

            await expect(
                raesumFile.getEntriesByUserAndOrg(123, null)
            ).rejects.toThrow('Unable to get file entries');
        });

        test('should return empty array when no files found', async () => {
            vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

            const result = await raesumFile.getEntriesByUserAndOrg(123, null);

            expect(result).toEqual([]);
        });
    });
});
