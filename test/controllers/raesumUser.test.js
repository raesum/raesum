import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumUserController from '../../src/controllers/raesumUser.js';
import raesumUser from '../../src/models/raesumUser.js';
import raesumAuthorization from '../../src/models/raesumAuth.js';
import raesumAudit from '../../src/models/raesumAudit.js';
import raesumResponses from '../../src/modules/raesumResponses.js';
import { userSchemas } from '../../src/validators/raesumUserValidator.js';

// Mock Express req, res, next objects
const createMockReq = () => ({
    method: 'GET',
    url: '/user',
    headers: {},
    query: {},
    params: {},
    body: {},
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
    return res;
};

const createMockNext = () => vi.fn();

// Helper function to test Joi validation
const testJoiValidation = (req, schema, property) => {
    const { error } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
    });
    return error;
};

describe('Testing User Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockReq();
        res = createMockRes();
        next = createMockNext();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /user/get/:userId - Get User by ID', () => {
        test('Successfully get user by valid ID', async () => {
            req.params = { userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getUserByIdMock = vi
                .spyOn(raesumUser, 'getUserById')
                .mockResolvedValue([
                    {
                        id: 123,
                        username: 'testuser',
                        current_organization_id: 1,
                        external_id: 'uuid',
                        active_status: true,
                        created_at: '2026-05-01T00:00:00.000Z',
                    },
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

            await raesumUserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                    data: expect.any(Array),
                })
            );

            authMock.mockRestore();
            getUserByIdMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get current user when no ID provided', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getUserByIdMock = vi
                .spyOn(raesumUser, 'getUserById')
                .mockResolvedValue([
                    {
                        id: 1,
                        username: 'testuser',
                        current_organization_id: 1,
                        external_id: 'uuid',
                        active_status: true,
                        created_at: '2026-05-01T00:00:00.000Z',
                    },
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

            await raesumUserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getUserByIdMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get user with invalid ID (NaN)', async () => {
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

            await raesumUserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get user with invalid ID (negative)', async () => {
            req.params = { userId: '-1' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: userId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get user when not authorized', async () => {
            req.params = { userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get user when database error occurs', async () => {
            req.params = { userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getUserByIdMock = vi
                .spyOn(raesumUser, 'getUserById')
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

            await raesumUserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getUserByIdMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /user/metadata/get/keys - Get Metadata Keys', () => {
        test('Successfully get metadata keys', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeysMock = vi
                .spyOn(raesumUser, 'getMetadataKeys')
                .mockResolvedValue({
                    premiumuser: {
                        id: 1,
                        datakey: 'premiumuser',
                        cognito_attribute: false,
                        cognito_writable: false,
                        active_status: true,
                        description: 'Premium user status',
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

            await raesumUserController.getMetaDataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeysMock.mockRestore();
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
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.getMetaDataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata keys when database error occurs', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeysMock = vi
                .spyOn(raesumUser, 'getMetadataKeys')
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

            await raesumUserController.getMetaDataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeysMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /user/metadata/get/:userId - Get All User Metadata', () => {
        test('Successfully get all metadata for current user', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser', 'profiledescription']);

            const getUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'getUserMetadataValues')
                .mockResolvedValue({
                    premiumuser: 'true',
                    profiledescription: 'Test description',
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

            await raesumUserController.getAllUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get all metadata for specific user', async () => {
            req.params = { userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const getUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'getUserMetadataValues')
                .mockResolvedValue({
                    premiumuser: 'true',
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

            await raesumUserController.getAllUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get all metadata with invalid user ID', async () => {
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

            await raesumUserController.getAllUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get all metadata when not authorized', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.getAllUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get all metadata when database error occurs', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
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

            await raesumUserController.getAllUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /user/metadata/get/byKey/:key - Get One Metadata Value', () => {
        test('Successfully get one metadata value for current user', async () => {
            req.params = { key: 'premiumuser' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser', 'profiledescription']);

            const getUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'getUserMetadataValues')
                .mockResolvedValue({
                    premiumuser: 'true',
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

            await raesumUserController.getOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get one metadata value with user ID', async () => {
            req.params = { key: 'premiumuser', userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const getUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'getUserMetadataValues')
                .mockResolvedValue({
                    premiumuser: 'true',
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

            await raesumUserController.getOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata value with invalid user ID', async () => {
            req.params = { key: 'premiumuser', userId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: userId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.getOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get metadata value with invalid key', async () => {
            req.params = { key: 'invalidkey' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.getOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata value when not authorized', async () => {
            req.params = { key: 'premiumuser' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.getOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata value when database error occurs', async () => {
            req.params = { key: 'premiumuser' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const getUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'getUserMetadataValues')
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

            await raesumUserController.getOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getUserMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /user/metadata/set/byKey/:key - Set One Metadata Value', () => {
        test('Successfully set metadata value for current user', async () => {
            req.params = { key: 'premiumuser' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const setUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'setUserMetadataValues')
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

            await raesumUserController.setOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            setUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set metadata value with user ID', async () => {
            req.params = { key: 'premiumuser', userId: '123' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const setUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'setUserMetadataValues')
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

            await raesumUserController.setOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            setUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set metadata value with invalid user ID', async () => {
            req.params = { key: 'premiumuser', userId: 'abc' };
            req.body = { value: 'true' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: userId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.setOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to set metadata value with missing key', async () => {
            req.params = {};
            req.body = { value: 'true' };

            // Test Joi validation directly
            const error = testJoiValidation(
                req,
                userSchemas.setOneMetadata,
                'params'
            );
            expect(error).toBeDefined();
            expect(
                error.details.some(
                    (d) => d.type === 'any.required' && d.path[0] === 'key'
                )
            ).toBe(true);
        });

        test('Fail to set metadata value with invalid key', async () => {
            req.params = { key: 'invalidkey' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.setOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set metadata value with missing value', async () => {
            req.params = { key: 'premiumuser' };
            req.body = {};

            // Test Joi validation directly
            const error = testJoiValidation(
                req,
                userSchemas.setOneMetadata,
                'body'
            );
            expect(error).toBeDefined();
            expect(
                error.details.some(
                    (d) => d.type === 'any.required' && d.path[0] === 'value'
                )
            ).toBe(true);
        });

        test('Fail to set metadata value when not authorized', async () => {
            req.params = { key: 'premiumuser' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.setOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set metadata value when database error occurs', async () => {
            req.params = { key: 'premiumuser' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const setUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'setUserMetadataValues')
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

            await raesumUserController.setOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            setUserMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /user/metadata/delete/byKey/:key - Delete One Metadata Value', () => {
        test('Successfully delete metadata value for current user', async () => {
            req.params = { key: 'premiumuser' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const deleteUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'deleteUserMetadataValues')
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

            await raesumUserController.deleteOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            deleteUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully delete metadata value with user ID', async () => {
            req.params = { key: 'premiumuser', userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const deleteUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'deleteUserMetadataValues')
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

            await raesumUserController.deleteOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            deleteUserMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete metadata value with invalid user ID', async () => {
            req.params = { key: 'premiumuser', userId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: userId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.deleteOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to delete metadata value with missing key', async () => {
            req.params = {};

            // Test Joi validation directly
            const error = testJoiValidation(
                req,
                userSchemas.deleteOneMetadata,
                'params'
            );
            expect(error).toBeDefined();
            expect(
                error.details.some(
                    (d) => d.type === 'any.required' && d.path[0] === 'key'
                )
            ).toBe(true);
        });

        test('Fail to delete metadata value with invalid key', async () => {
            req.params = { key: 'invalidkey' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.deleteOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete metadata value when not authorized', async () => {
            req.params = { key: 'premiumuser' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.deleteOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete metadata value when database error occurs', async () => {
            req.params = { key: 'premiumuser' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumUser, 'getMetadataKeyList')
                .mockResolvedValue(['premiumuser']);

            const deleteUserMetadataValuesMock = vi
                .spyOn(raesumUser, 'deleteUserMetadataValues')
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

            await raesumUserController.deleteOneUserMetaData(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            deleteUserMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /user/metadata/resync - Resync User from Cognito', () => {
        test('Successfully resync user from Cognito', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const syncUserFromCognitoToRaesumMock = vi
                .spyOn(raesumUser, 'syncUserFromCognitoToRaesum')
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

            await raesumUserController.resyncUserFromCognito(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            syncUserFromCognitoToRaesumMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to resync user when not authorized', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to update raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.resyncUserFromCognito(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to resync user when Cognito error occurs', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const syncUserFromCognitoToRaesumMock = vi
                .spyOn(raesumUser, 'syncUserFromCognitoToRaesum')
                .mockRejectedValue(new Error('Cognito error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Error',
                    message: 'An error occurred.',
                    description: 'The server encountered an error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumUserController.resyncUserFromCognito(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            syncUserFromCognitoToRaesumMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /user/activation/set - Set User Activation', () => {
        test('Successfully set activation to true for current user', async () => {
            req.params = {};
            req.body = { value: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumUser, 'setActivationStatus')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set activation to false for current user', async () => {
            req.params = {};
            req.body = { value: false };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumUser, 'setActivationStatus')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set activation with user ID', async () => {
            req.params = { userId: '123' };
            req.body = { value: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumUser, 'setActivationStatus')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set activation with invalid user ID', async () => {
            req.params = { userId: 'abc' };
            req.body = { value: true };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: userId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to set activation with invalid value (string)', async () => {
            req.params = {};
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: value',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set activation with invalid value (null)', async () => {
            req.params = {};
            req.body = { value: null };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: value',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set activation when not authorized', async () => {
            req.params = {};
            req.body = { value: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set activation when database error occurs', async () => {
            req.params = {};
            req.body = { value: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumUser, 'setActivationStatus')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Error',
                    message: 'An error occurred.',
                    description: 'The server encountered an error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumUserController.setUserActivation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /user/organization/set - Change User Organization', () => {
        test('Successfully change organization for current user', async () => {
            req.params = {};
            req.body = { organizationId: '2' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockResolvedValue([1, 2, 3]);

            const changeUserOrgMock = vi
                .spyOn(raesumUser, 'changeUserOrg')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            changeUserOrgMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully change organization with user ID', async () => {
            req.params = { userId: '123' };
            req.body = { organizationId: '2' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockResolvedValue([1, 2]);

            const changeUserOrgMock = vi
                .spyOn(raesumUser, 'changeUserOrg')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            changeUserOrgMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to change organization with invalid user ID (string)', async () => {
            req.params = { userId: 'abc' };
            req.body = { organizationId: '2' };

            // Test Joi validation directly - should fail for non-integer userId
            const error = testJoiValidation(
                req,
                userSchemas.changeOrg,
                'params'
            );
            expect(error).toBeDefined();
            expect(
                error.details.some(
                    (d) => d.type === 'number.base' && d.path[0] === 'userId'
                )
            ).toBe(true);
        });

        test('Fail to change organization with non-existent user ID', async () => {
            // Use a high user ID that likely doesn't exist
            const nonExistentUserId = 99999999;

            req.params = { userId: nonExistentUserId.toString() };
            req.body = { organizationId: '2' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            // Mock getAllowedUserOrgs to return empty list (user doesn't exist)
            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: userId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to change organization with missing organizationId', async () => {
            req.params = {};
            req.body = {};

            // Test Joi validation directly
            const error = testJoiValidation(req, userSchemas.changeOrg, 'body');
            expect(error).toBeDefined();
            expect(
                error.details.some(
                    (d) =>
                        d.type === 'any.required' &&
                        d.path[0] === 'organizationId'
                )
            ).toBe(true);
        });

        test('Fail to change organization with invalid organizationId (NaN)', async () => {
            req.params = {};
            req.body = { organizationId: 'abc' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: orgId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to change organization with invalid organizationId (negative)', async () => {
            req.params = {};
            req.body = { organizationId: '-1' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: orgId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to change organization when org not in allowed list', async () => {
            req.params = {};
            req.body = { organizationId: '5' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockResolvedValue([1, 2, 3]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: orgId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to change organization when not authorized', async () => {
            req.params = {};
            req.body = { organizationId: '2' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to update raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to change organization when database error occurs', async () => {
            req.params = {};
            req.body = { organizationId: '2' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockResolvedValue([1, 2]);

            const changeUserOrgMock = vi
                .spyOn(raesumUser, 'changeUserOrg')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Error',
                    message: 'An error occurred.',
                    description: 'The server encountered an error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumUserController.changeUserOrg(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            changeUserOrgMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /user/organization/getAllowed - Get Allowed Organizations', () => {
        test('Successfully get allowed organizations for current user', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockResolvedValue([1, 2, 3]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumUserController.getAllowedOrgs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                    data: [1, 2, 3],
                })
            );

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get allowed organizations for specific user', async () => {
            req.params = { userId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockResolvedValue([1, 2]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumUserController.getAllowedOrgs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get allowed organizations with invalid user ID', async () => {
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

            await raesumUserController.getAllowedOrgs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get allowed organizations when not authorized', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_user',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumUserController.getAllowedOrgs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get allowed organizations when database error occurs', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAllowedUserOrgsMock = vi
                .spyOn(raesumUser, 'getAllowedUserOrgs')
                .mockRejectedValue(new Error('Database error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Error',
                    message: 'An error occurred.',
                    description: 'The server encountered an error.',
                    code: 500,
                    keycode: 4,
                });

            await raesumUserController.getAllowedOrgs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getAllowedUserOrgsMock.mockRestore();
            responseMock.mockRestore();
        });
    });
});
