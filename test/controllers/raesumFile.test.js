import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumFileController from '../../src/controllers/raesumFile.js';
import raesumFile from '../../src/models/raesumFile.js';
import raesumAuthorization from '../../src/models/raesumAuth.js';
import raesumAudit from '../../src/models/raesumAudit.js';
import raesumResponses from '../../src/modules/raesumResponses.js';

// Mock Express req, res, next objects
const createMockReq = () => ({
    method: 'GET',
    url: '/file',
    headers: {},
    query: {},
    params: {},
    body: {},
    file: {
        buffer: Buffer.from('test file content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
    },
    user: {
        id: 1,
        current_organization_id: 1,
        external_id: 'test-uuid',
        username: 'testuser',
        active_status: true,
        created_at: '2026-05-01T00:00:00.000Z',
    },
});

const createMockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnThis();
    res.send = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();
    res.end = vi.fn().mockReturnThis();
    res.redirect = vi.fn().mockReturnThis();
    return res;
};

const createMockNext = () => vi.fn();

describe('Testing File Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockReq();
        res = createMockRes();
        next = createMockNext();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('POST /file/upload - Upload File', () => {
        test('Successfully upload new file', async () => {
            req.params = {};
            req.body = { fileType: 'testTextFile' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const createFileEntryMock = vi
                .spyOn(raesumFile, 'createFileEntry')
                .mockResolvedValue({
                    id: 123,
                    path: 'uploads/test.txt',
                });

            const uploadMock = vi
                .spyOn(raesumFile, 'upload')
                .mockResolvedValue(true);

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                    data: { fileId: 123 },
                })
            );

            authMock.mockRestore();
            createFileEntryMock.mockRestore();
            uploadMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully upload to existing file entry', async () => {
            req.params = { fileId: '123' };
            req.body = { fileType: 'testTextFile' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    path: 'uploads/test.txt',
                });

            const uploadMock = vi
                .spyOn(raesumFile, 'upload')
                .mockResolvedValue(true);

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getEntryByIdMock.mockRestore();
            uploadMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to upload with invalid fileId (NaN)', async () => {
            req.params = { fileId: 'abc' };
            req.body = { fileType: 'testTextFile' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to upload with invalid fileId (negative)', async () => {
            req.params = { fileId: '-1' };
            req.body = { fileType: 'testTextFile' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to upload to existing file when file not found', async () => {
            req.params = { fileId: '123' };
            req.body = { fileType: 'testTextFile' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockRejectedValue(new Error('File not found'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Not Found',
                    message: 'Resource not found',
                    description: 'The requested resource was not found.',
                    code: 404,
                    keycode: 6,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);

            getEntryByIdMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to upload to existing file when user IDs do not match', async () => {
            req.params = { fileId: '123' };
            req.body = { fileType: 'testTextFile' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 999,
                    file_type_key: 'testTextFile',
                    path: 'uploads/test.txt',
                });

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to upload raesum_file',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to upload to existing file when file types do not match', async () => {
            req.params = { fileId: '123' };
            req.body = { fileType: 'testTextFile' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'differentType',
                    path: 'uploads/test.txt',
                });

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'File type not allowed',
                    description:
                        'The file type is not allowed for this operation.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            getEntryByIdMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to upload new file when not authorized', async () => {
            req.params = {};
            req.body = { fileType: 'testTextFile' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to create raesum_file',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to upload when database error occurs', async () => {
            req.params = {};
            req.body = { fileType: 'testTextFile' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const createFileEntryMock = vi
                .spyOn(raesumFile, 'createFileEntry')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.upload(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            createFileEntryMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /file/get/byUser - Get File List', () => {
        test('Successfully get file list for current user', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getEntriesByUserAndOrgMock = vi
                .spyOn(raesumFile, 'getEntriesByUserAndOrg')
                .mockResolvedValue([
                    { id: 1, file_type_key: 'testTextFile' },
                    { id: 2, file_type_key: 'testTextFile' },
                ]);

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.getList(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getEntriesByUserAndOrgMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get file list for specific user', async () => {
            req.params = { userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getEntriesByUserAndOrgMock = vi
                .spyOn(raesumFile, 'getEntriesByUserAndOrg')
                .mockResolvedValue([{ id: 1, file_type_key: 'testTextFile' }]);

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.getList(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getEntriesByUserAndOrgMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file list with invalid user ID', async () => {
            req.params = { userId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: userId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.getList(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get file list when not authorized', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_file',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.getList(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file list when database error occurs', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getEntriesByUserAndOrgMock = vi
                .spyOn(raesumFile, 'getEntriesByUserAndOrg')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.getList(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getEntriesByUserAndOrgMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /file/get/:fileId - Get File by ID', () => {
        test('Successfully get file by ID', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 3,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getOneFileTypeMock = vi
                .spyOn(raesumFile, 'getOneFileType')
                .mockResolvedValue({
                    publicByDefault: false,
                });

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getOneFileTypeMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get file with public URL', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 3,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getOneFileTypeMock = vi
                .spyOn(raesumFile, 'getOneFileType')
                .mockResolvedValue({
                    publicByDefault: true,
                });

            const getPublicURLMock = vi
                .spyOn(raesumFile, 'getPublicURL')
                .mockResolvedValue('https://example.com/file.txt');

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getOneFileTypeMock.mockRestore();
            getPublicURLMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file with invalid fileId', async () => {
            req.params = { fileId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get file when not authorized', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_file',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file when database error occurs', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            getEntryByIdMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /file/data/:fileId - Get File Data', () => {
        test('Successfully get file data with signed URL', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 3,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getOneFileTypeMock = vi
                .spyOn(raesumFile, 'getOneFileType')
                .mockResolvedValue({
                    publicByDefault: false,
                });

            const getSignedURLMock = vi
                .spyOn(raesumFile, 'getSignedURL')
                .mockResolvedValue(
                    'https://example.s3.amazonaws.com/file.txt?signature=...'
                );

            await raesumFileController.getFileById(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith(
                'https://example.s3.amazonaws.com/file.txt?signature=...'
            );

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getOneFileTypeMock.mockRestore();
            getSignedURLMock.mockRestore();
        });

        test('Successfully get file data with public URL redirect', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 3,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getOneFileTypeMock = vi
                .spyOn(raesumFile, 'getOneFileType')
                .mockResolvedValue({
                    publicByDefault: true,
                });

            const getPublicURLMock = vi
                .spyOn(raesumFile, 'getPublicURL')
                .mockResolvedValue('https://example.com/file.txt');

            await raesumFileController.getFileById(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith(
                'https://example.com/file.txt'
            );

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getOneFileTypeMock.mockRestore();
            getPublicURLMock.mockRestore();
        });

        test('Fail to get file data when file is deleted', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 7,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'File Deleted',
                    message: 'The file has been deleted',
                    description: 'The requested file has been deleted.',
                    code: 404,
                    keycode: 6,
                });

            await raesumFileController.getFileById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file data when file failed', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 5,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'File Failed',
                    message: 'The file upload failed',
                    description: 'The requested file upload failed.',
                    code: 404,
                    keycode: 6,
                });

            await raesumFileController.getFileById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file data when file in quarantine', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 2,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'File in Quarantine',
                    message: 'The file is in quarantine',
                    description: 'The requested file is in quarantine.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.getFileById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file data with invalid fileId', async () => {
            req.params = { fileId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.getFileById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get file data when not authorized', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                    file_type_key: 'testTextFile',
                    status_id: 3,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_file',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.getFileById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get file data when database error occurs', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.getFileById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            getEntryByIdMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /file/delete/:fileId - Delete File', () => {
        test('Successfully delete file', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const deleteMock = vi
                .spyOn(raesumFile, 'delete')
                .mockResolvedValue(true);

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.delete(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            deleteMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete file with invalid fileId', async () => {
            req.params = { fileId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.delete(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to delete file when not authorized', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to delete raesum_file',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.delete(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete file due to foreign key constraints', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const deleteMock = vi
                .spyOn(raesumFile, 'delete')
                .mockRejectedValue(
                    new Error('foreign key constraints violation')
                );

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Delete Failed',
                    message: 'The file cannot be deleted due to dependencies.',
                    description:
                        'The file has dependencies that prevent deletion.',
                    code: 400,
                    keycode: 25,
                });

            await raesumFileController.delete(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            deleteMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete file when database error occurs', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const deleteMock = vi
                .spyOn(raesumFile, 'delete')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.delete(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            deleteMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /file/metadata/get/keys - Get Metadata Keys', () => {
        test('Successfully get metadata keys', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: {
                        id: 1,
                        datakey: 'documentauthor',
                        active_status: true,
                        description: 'Document author',
                    },
                });

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.getMetadataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata keys when not authorized', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_file_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.getMetadataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata keys when database error occurs', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.getMetadataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /file/metadata/get/:fileId - Get All File Metadata', () => {
        test('Successfully get all file metadata', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const getFileMetadataValuesMock = vi
                .spyOn(raesumFile, 'getFileMetadataValues')
                .mockResolvedValue({
                    documentauthor: 'John Doe',
                });

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.getAllFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            getFileMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get all file metadata with invalid fileId', async () => {
            req.params = { fileId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.getAllFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get all file metadata when not authorized', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_file_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.getAllFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get all file metadata when database error occurs', async () => {
            req.params = { fileId: '123' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.getAllFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            getEntryByIdMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /file/metadata/get/byKey/:key/:fileId - Get One File Metadata', () => {
        test('Successfully get one file metadata value', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const getFileMetadataValuesMock = vi
                .spyOn(raesumFile, 'getFileMetadataValues')
                .mockResolvedValue({
                    documentauthor: 'John Doe',
                });

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.getOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            getFileMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get one file metadata with invalid fileId', async () => {
            req.params = { fileId: 'abc', key: 'documentauthor' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.getOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get one file metadata with invalid key', async () => {
            req.params = { fileId: '123', key: 'invalidkey' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.getOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get one file metadata when not authorized', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_file_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.getOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get one file metadata when database error occurs', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.getOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            getEntryByIdMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /file/metadata/set/byKey/:key/:fileId - Set One File Metadata', () => {
        test('Successfully set one file metadata value', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };
            req.body = { value: 'John Doe' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const setFileMetadataValuesMock = vi
                .spyOn(raesumFile, 'setFileMetadataValues')
                .mockResolvedValue(true);

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.setOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            setFileMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set one file metadata with invalid fileId', async () => {
            req.params = { fileId: 'abc', key: 'documentauthor' };
            req.body = { value: 'John Doe' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.setOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to set one file metadata with invalid key', async () => {
            req.params = { fileId: '123', key: 'invalidkey' };
            req.body = { value: 'John Doe' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.setOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set one file metadata with missing value', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };
            req.body = {};

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request is missing fields: value',
                    description: 'The request is missing required fields.',
                    code: 400,
                    keycode: 2,
                });

            await raesumFileController.setOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set one file metadata when not authorized', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };
            req.body = { value: 'John Doe' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to update raesum_file_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.setOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set one file metadata when database error occurs', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };
            req.body = { value: 'John Doe' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const setFileMetadataValuesMock = vi
                .spyOn(raesumFile, 'setFileMetadataValues')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.setOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            setFileMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /file/metadata/delete/byKey/:key/:fileId - Delete One File Metadata', () => {
        test('Successfully delete one file metadata value', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const deleteFileMetadataValuesMock = vi
                .spyOn(raesumFile, 'deleteFileMetadataValues')
                .mockResolvedValue(true);

            const auditMock = vi
                .spyOn(raesumAudit, 'create')
                .mockResolvedValue(1);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumFileController.deleteOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            deleteFileMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete one file metadata with invalid fileId', async () => {
            req.params = { fileId: 'abc', key: 'documentauthor' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: fileId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.deleteOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to delete one file metadata with invalid key', async () => {
            req.params = { fileId: '123', key: 'invalidkey' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumFileController.deleteOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete one file metadata when not authorized', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to delete raesum_file_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumFileController.deleteOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete one file metadata when database error occurs', async () => {
            req.params = { fileId: '123', key: 'documentauthor' };

            const getEntryByIdMock = vi
                .spyOn(raesumFile, 'getEntryById')
                .mockResolvedValue({
                    id: 123,
                    user_id: 1,
                });

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetaDataKeysMock = vi
                .spyOn(raesumFile, 'getMetaDataKeys')
                .mockResolvedValue({
                    documentauthor: { id: 1, datakey: 'documentauthor' },
                });

            const deleteFileMetadataValuesMock = vi
                .spyOn(raesumFile, 'deleteFileMetadataValues')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Internal Server Error',
                    message: 'An internal server error occurred.',
                    description: 'The server encountered an unexpected error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumFileController.deleteOneFileMetadata(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            getEntryByIdMock.mockRestore();
            authMock.mockRestore();
            getMetaDataKeysMock.mockRestore();
            deleteFileMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });
});
