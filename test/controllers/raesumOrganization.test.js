import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumOrganizationController from '../../src/controllers/raesumOrganization.js';
import raesumOrganization from '../../src/models/raesumOrganization.js';
import raesumAuthorization from '../../src/models/raesumAuth.js';
import raesumAudit from '../../src/models/raesumAudit.js';
import raesumResponses from '../../src/modules/raesumResponses.js';

// Mock Express req, res, next objects
const createMockReq = () => ({
    method: 'POST',
    url: '/organization',
    headers: {},
    query: {},
    params: {},
    body: {},
    user: {
        id: 1,
        current_organization_id: 1,
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

describe('Testing Organization Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockReq();
        res = createMockRes();
        next = createMockNext();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('POST /organization/create - Create Organization', () => {
        test('Successfully create organization with valid name', async () => {
            req.body = { name: 'Test Organization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const createMock = vi
                .spyOn(raesumOrganization, 'create')
                .mockResolvedValue(123);

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

            await raesumOrganizationController.create(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                    data: { id: 123 },
                })
            );

            authMock.mockRestore();
            createMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to create organization with missing name', async () => {
            req.body = {};

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request is missing fields: name',
                    description: 'The request is missing required fields.',
                    code: 400,
                    keycode: 2,
                });

            await raesumOrganizationController.create(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Bad Request',
                })
            );

            responseMock.mockRestore();
        });

        test('Fail to create organization with non-string name', async () => {
            req.body = { name: 123 };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request is missing fields: name',
                    description: 'The request is missing required fields.',
                    code: 400,
                    keycode: 2,
                });

            await raesumOrganizationController.create(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Bad Request',
                })
            );

            responseMock.mockRestore();
        });

        test('Fail to create organization when not authorized', async () => {
            req.body = { name: 'Test Organization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to create raesum_organization',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.create(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Unauthorized',
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to create organization when database error occurs', async () => {
            req.body = { name: 'Test Organization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const createMock = vi
                .spyOn(raesumOrganization, 'create')
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

            await raesumOrganizationController.create(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Internal Server Error',
                })
            );

            authMock.mockRestore();
            createMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /organization/get/:organizationId - Get Organization by ID', () => {
        test('Successfully get organization by valid ID', async () => {
            req.params = { organizationId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getByIdMock = vi
                .spyOn(raesumOrganization, 'getById')
                .mockResolvedValue({
                    id: 123,
                    name: 'Test Organization',
                    active_status: true,
                    created_at: '2026-05-01T00:00:00.000Z',
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

            await raesumOrganizationController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                    data: expect.objectContaining({
                        id: 123,
                        name: 'Test Organization',
                    }),
                })
            );

            authMock.mockRestore();
            getByIdMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get current organization when no ID provided', async () => {
            req.params = {};
            req.user.current_organization_id = 1;

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getByIdMock = vi
                .spyOn(raesumOrganization, 'getById')
                .mockResolvedValue({
                    id: 1,
                    name: 'Current Organization',
                    active_status: true,
                    created_at: '2026-05-01T00:00:00.000Z',
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

            await raesumOrganizationController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                })
            );

            authMock.mockRestore();
            getByIdMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get organization with invalid ID (NaN)', async () => {
            req.params = { organizationId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Bad Request',
                })
            );

            responseMock.mockRestore();
        });

        test('Fail to get organization with invalid ID (negative)', async () => {
            req.params = { organizationId: '-1' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Bad Request',
                })
            );

            responseMock.mockRestore();
        });

        test('Fail to get organization when not authorized', async () => {
            req.params = { organizationId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_organization',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Unauthorized',
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get organization when database error occurs', async () => {
            req.params = { organizationId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getByIdMock = vi
                .spyOn(raesumOrganization, 'getById')
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

            await raesumOrganizationController.getById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Internal Server Error',
                })
            );

            authMock.mockRestore();
            getByIdMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /organization/metadata/get/keys - Get Metadata Keys', () => {
        test('Successfully get metadata keys', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeysMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeys')
                .mockResolvedValue({
                    premiumorganization: {
                        id: 1,
                        datakey: 'premiumorganization',
                        cognito_attribute: false,
                        cognito_writable: false,
                        active_status: true,
                        description: 'Premium organization status',
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

            await raesumOrganizationController.getMetaDataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                    data: expect.objectContaining({
                        premiumorganization: expect.any(Object),
                    }),
                })
            );

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
                    message:
                        'Not authorized to read raesum_organization_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.getMetaDataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Unauthorized',
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata keys when database error occurs', async () => {
            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeysMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeys')
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

            await raesumOrganizationController.getMetaDataKeys(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Internal Server Error',
                })
            );

            authMock.mockRestore();
            getMetadataKeysMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /organization/metadata/get/byKey/:key - Get One Metadata Value', () => {
        test('Successfully get one metadata value by key', async () => {
            req.params = { key: 'premiumorganization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue([
                    'premiumorganization',
                    'profiledescription',
                ]);

            const getMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'getOrganizationMetadataValues')
                .mockResolvedValue({
                    premiumorganization: 'true',
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

            await raesumOrganizationController.getOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                })
            );

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get one metadata value with organization ID', async () => {
            req.params = { key: 'premiumorganization', organizationId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const getMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'getOrganizationMetadataValues')
                .mockResolvedValue({
                    premiumorganization: 'true',
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

            await raesumOrganizationController.getOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata value with invalid organization ID', async () => {
            req.params = { key: 'premiumorganization', organizationId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.getOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get metadata value with invalid key', async () => {
            req.params = { key: 'invalidkey' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.getOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata value when not authorized', async () => {
            req.params = { key: 'premiumorganization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message:
                        'Not authorized to read raesum_organization_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.getOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get metadata value when database error occurs', async () => {
            req.params = { key: 'premiumorganization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const getMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'getOrganizationMetadataValues')
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

            await raesumOrganizationController.getOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('GET /organization/metadata/get - Get All Metadata Values', () => {
        test('Successfully get all metadata values for current organization', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue([
                    'premiumorganization',
                    'profiledescription',
                ]);

            const getMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'getOrganizationMetadataValues')
                .mockResolvedValue({
                    premiumorganization: 'true',
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

            await raesumOrganizationController.getAllOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get all metadata values for specific organization', async () => {
            req.params = { organizationId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const getMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'getOrganizationMetadataValues')
                .mockResolvedValue({
                    premiumorganization: 'true',
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

            await raesumOrganizationController.getAllOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get all metadata values with invalid organization ID', async () => {
            req.params = { organizationId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.getAllOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get all metadata values when not authorized', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message:
                        'Not authorized to read raesum_organization_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.getAllOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get all metadata values when database error occurs', async () => {
            req.params = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const getMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'getOrganizationMetadataValues')
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

            await raesumOrganizationController.getAllOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            getMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /organization/metadata/set/byKey/:key - Set One Metadata Value', () => {
        test('Successfully set metadata value with string', async () => {
            req.params = { key: 'premiumorganization' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const setMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'setOrganizationMetadataValues')
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

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            setMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set metadata value with boolean', async () => {
            req.params = { key: 'premiumorganization' };
            req.body = { value: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const setMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'setOrganizationMetadataValues')
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

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            setMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set metadata value with number', async () => {
            req.params = { key: 'premiumorganization' };
            req.body = { value: 42 };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const setMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'setOrganizationMetadataValues')
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

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            setMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set metadata value with invalid organization ID', async () => {
            req.params = { key: 'premiumorganization', organizationId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to set metadata value with invalid key', async () => {
            req.params = { key: 'invalidkey' };
            req.body = { value: 'test' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set metadata value with invalid value type', async () => {
            req.params = { key: 'premiumorganization' };
            req.body = { value: { invalid: 'object' } };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: value',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set metadata value when not authorized', async () => {
            req.params = { key: 'premiumorganization' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message:
                        'Not authorized to write raesum_organization_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set metadata value when database error occurs', async () => {
            req.params = { key: 'premiumorganization' };
            req.body = { value: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const setMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'setOrganizationMetadataValues')
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

            await raesumOrganizationController.setOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            setMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /organization/metadata/delete/byKey/:key - Delete One Metadata Value', () => {
        test('Successfully delete metadata value', async () => {
            req.params = { key: 'premiumorganization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const deleteMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'deleteOrganizationMetadataValues')
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

            await raesumOrganizationController.deleteOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            deleteMetadataValuesMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete metadata value with invalid organization ID', async () => {
            req.params = { key: 'premiumorganization', organizationId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.deleteOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to delete metadata value with invalid key', async () => {
            req.params = { key: 'invalidkey' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: key',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.deleteOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete metadata value when not authorized', async () => {
            req.params = { key: 'premiumorganization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message:
                        'Not authorized to delete raesum_organization_metadata',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.deleteOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to delete metadata value when database error occurs', async () => {
            req.params = { key: 'premiumorganization' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getMetadataKeyListMock = vi
                .spyOn(raesumOrganization, 'getMetadataKeyList')
                .mockResolvedValue(['premiumorganization']);

            const deleteMetadataValuesMock = vi
                .spyOn(raesumOrganization, 'deleteOrganizationMetadataValues')
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

            await raesumOrganizationController.deleteOneOrganizationMetaData(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getMetadataKeyListMock.mockRestore();
            deleteMetadataValuesMock.mockRestore();
            responseMock.mockRestore();
        });
    });

    describe('POST /organization/activation/set - Set Organization Activation', () => {
        test('Successfully set activation status to true', async () => {
            req.params = {};
            req.body = { activeStatus: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumOrganization, 'setActivationStatus')
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

            await raesumOrganizationController.setOrganizationActivation(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set activation status to false', async () => {
            req.params = {};
            req.body = { activeStatus: false };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumOrganization, 'setActivationStatus')
                .mockResolvedValue(false);

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

            await raesumOrganizationController.setOrganizationActivation(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set activation status with string "true"', async () => {
            req.params = {};
            req.body = { activeStatus: 'true' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumOrganization, 'setActivationStatus')
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

            await raesumOrganizationController.setOrganizationActivation(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully set activation status with organization ID', async () => {
            req.params = { organizationId: '123' };
            req.body = { activeStatus: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumOrganization, 'setActivationStatus')
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

            await raesumOrganizationController.setOrganizationActivation(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            auditMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set activation status with invalid organization ID', async () => {
            req.params = { organizationId: 'abc' };
            req.body = { activeStatus: true };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumOrganizationController.setOrganizationActivation(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to set activation status when not authorized', async () => {
            req.params = {};
            req.body = { activeStatus: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to write raesum_organization',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumOrganizationController.setOrganizationActivation(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to set activation status when database error occurs', async () => {
            req.params = {};
            req.body = { activeStatus: true };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const setActivationStatusMock = vi
                .spyOn(raesumOrganization, 'setActivationStatus')
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

            await raesumOrganizationController.setOrganizationActivation(
                req,
                res,
                next
            );

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            setActivationStatusMock.mockRestore();
            responseMock.mockRestore();
        });
    });
});
