import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumAuditController from '../../src/controllers/raesumAudit.js';
import raesumAudit from '../../src/models/raesumAudit.js';
import raesumAuthorization from '../../src/models/raesumAuth.js';
import raesumResponses from '../../src/modules/raesumResponses.js';

// Mock Express req, res, next objects
const createMockReq = () => ({
    method: 'GET',
    url: '/audit/get',
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

describe('Testing Audit Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockReq();
        res = createMockRes();
        next = createMockNext();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /audit/get - Get Audit Logs', () => {
        test('Successfully get audit logs with default parameters', async () => {
            req.query = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([
                    {
                        id: 1,
                        user_id: 1,
                        username: 'testuser',
                        action_id: 1,
                        action_name: 'Log In',
                        action_string_key: 'log_in',
                        object_type_id: 1,
                        object_type_name: 'Users',
                        object_type_string_key: 'raesum_user',
                        object_id: 1,
                        event_at: '2026-05-01T00:00:00.000Z',
                        metadata: null,
                    },
                ]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Success',
                    data: expect.any(Array),
                })
            );

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with organizationId in query', async () => {
            req.query = { organizationId: '123' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with userId filter', async () => {
            req.query = { userId: '5' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with objectTypeID filter', async () => {
            req.query = { objectTypeID: '2' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with actionTypeID filter', async () => {
            req.query = { actionTypeID: '3' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with sortBy parameter', async () => {
            req.query = { sortBy: 'user_id' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with sortOrder ASC', async () => {
            req.query = { sortOrder: 'ASC' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with limit and offset', async () => {
            req.query = { limit: '10', offset: '5' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with all filters', async () => {
            req.query = {
                organizationId: '123',
                userId: '5',
                objectTypeID: '2',
                actionTypeID: '3',
                sortBy: 'date',
                sortOrder: 'DESC',
                limit: '10',
                offset: '0',
            };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with user-specific authorization', async () => {
            req.query = { userId: '5' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid organizationId (NaN)', async () => {
            req.query = { organizationId: 'abc' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid organizationId (negative)', async () => {
            req.query = { organizationId: '-1' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid organizationId (non-integer)', async () => {
            req.query = { organizationId: '1.5' };

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields: organizationId',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid objectTypeID (NaN)', async () => {
            req.query = { objectTypeID: 'abc' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    errors: expect.arrayContaining([
                        'objectTypeID must be a positive integer',
                    ]),
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid objectTypeID (zero)', async () => {
            req.query = { objectTypeID: '0' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid actionTypeID (NaN)', async () => {
            req.query = { actionTypeID: 'xyz' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    errors: expect.arrayContaining([
                        'actionTypeID must be a positive integer',
                    ]),
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid sortBy', async () => {
            req.query = { sortBy: 'invalid_field' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    errors: expect.arrayContaining([
                        expect.stringContaining('sortBy must be one of'),
                    ]),
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs with invalid sortOrder', async () => {
            req.query = { sortOrder: 'INVALID' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    errors: expect.arrayContaining([
                        expect.stringContaining('sortOrder must be one of'),
                    ]),
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs with multiple validation errors', async () => {
            req.query = {
                objectTypeID: 'abc',
                actionTypeID: 'xyz',
                sortBy: 'invalid',
                sortOrder: 'invalid',
            };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request has invalid fields',
                    description: 'The request contains invalid field values.',
                    code: 400,
                    keycode: 5,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    errors: expect.arrayContaining([
                        'objectTypeID must be a positive integer',
                        'actionTypeID must be a positive integer',
                        expect.stringContaining('sortBy must be one of'),
                        expect.stringContaining('sortOrder must be one of'),
                    ]),
                })
            );

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs when not authorized at object or user level', async () => {
            req.query = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(false);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_audit',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs when authorization check throws error', async () => {
            req.query = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockRejectedValue(new Error('Authorization error'));

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Unauthorized',
                    message: 'Not authorized to read raesum_audit',
                    description:
                        'User does not have permission to perform this action.',
                    code: 403,
                    keycode: 3,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);

            authMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs when database error occurs', async () => {
            req.query = {};

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
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

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Fail to get audit logs when user is null', async () => {
            req.user = null;
            req.query = {};

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Bad Request',
                    message: 'The request is missing fields: organizationId',
                    description: 'The request is missing required fields.',
                    code: 400,
                    keycode: 2,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);

            responseMock.mockRestore();
        });

        test('Successfully get audit logs with lowercase sortOrder', async () => {
            req.query = { sortOrder: 'asc' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });

        test('Successfully get audit logs with mixed case sortOrder', async () => {
            req.query = { sortOrder: 'DeSc' };

            const authMock = vi
                .spyOn(raesumAuthorization, 'checkUserPermission')
                .mockResolvedValue(true);

            const getAuditLogsMock = vi
                .spyOn(raesumAudit, 'getAuditLogs')
                .mockResolvedValue([]);

            const responseMock = vi
                .spyOn(raesumResponses, 'get')
                .mockResolvedValue({
                    title: 'Success',
                    message: 'OK',
                    description: 'The request was successful.',
                    code: 200,
                    keycode: 1,
                });

            await raesumAuditController.getAuditLogs(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);

            authMock.mockRestore();
            getAuditLogsMock.mockRestore();
            responseMock.mockRestore();
        });
    });
});
