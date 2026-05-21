import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumHealthController from '../../src/controllers/raesumHealth.js';
import raesumDB from '../../src/modules/raesumDB.js';
import raesumCache from '../../src/modules/raesumCache.js';
import raesumConfig from '../../src/modules/raesumConfig.js';

// Mock Express req, res, next objects
const createMockReq = () => ({
    method: 'GET',
    url: '/health',
    headers: {},
    query: {},
    params: {},
    body: {},
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

describe('Testing Health Check Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockReq();
        res = createMockRes();
        next = createMockNext();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Everything working normally', () => {
        test('System is healthy with memory cache', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [
                    {
                        Healthy: 1,
                    },
                ],
            });

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('memory');

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Passed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
        });

        test('System is healthy with redis cache', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [
                    {
                        Healthy: 1,
                    },
                ],
            });

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('redis');

            const cacheSetMock = vi
                .spyOn(raesumCache, 'set')
                .mockResolvedValue('OK');

            const cacheGetMock = vi
                .spyOn(raesumCache, 'get')
                .mockResolvedValue('test');

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Passed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
            cacheSetMock.mockRestore();
            cacheGetMock.mockRestore();
        });
    });

    describe('Postgres database fails', () => {
        test('System fails to connect to database', async () => {
            const dbMock = vi
                .spyOn(raesumDB, 'query')
                .mockRejectedValue(new Error('Simulating DB Fail'));

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('memory');

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Failed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
        });

        test('Database connected but not returning data - no rows property', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({});

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('memory');

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Failed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
        });

        test('Database connected but returning empty rows', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [],
            });

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('memory');

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Failed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
        });
    });

    describe('Cache fails', () => {
        test('Cache set operation fails', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [
                    {
                        Healthy: 1,
                    },
                ],
            });

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('redis');

            const cacheSetMock = vi
                .spyOn(raesumCache, 'set')
                .mockResolvedValue(undefined);

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Failed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
            cacheSetMock.mockRestore();
        });

        test('Cache get operation fails', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [
                    {
                        Healthy: 1,
                    },
                ],
            });

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('redis');

            const cacheSetMock = vi
                .spyOn(raesumCache, 'set')
                .mockResolvedValue('OK');

            const cacheGetMock = vi
                .spyOn(raesumCache, 'get')
                .mockResolvedValue('wrong_value');

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Failed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
            cacheSetMock.mockRestore();
            cacheGetMock.mockRestore();
        });

        test('Cache operation throws error', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [
                    {
                        Healthy: 1,
                    },
                ],
            });

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('redis');

            const cacheSetMock = vi
                .spyOn(raesumCache, 'set')
                .mockRejectedValue(new Error('Cache connection error'));

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Failed',
                messageId: 0,
            });

            dbMock.mockRestore();
            configMock.mockRestore();
            cacheSetMock.mockRestore();
        });

        test('Cache check skipped when cache type is memory', async () => {
            const dbMock = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [
                    {
                        Healthy: 1,
                    },
                ],
            });

            const configMock = vi
                .spyOn(raesumConfig, 'get')
                .mockResolvedValue('memory');

            const cacheSetMock = vi.spyOn(raesumCache, 'set');
            const cacheGetMock = vi.spyOn(raesumCache, 'get');

            await raesumHealthController(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                title: 'Health Check',
                message: 'Passed',
                messageId: 0,
            });

            // Cache operations should not be called when cache type is memory
            expect(cacheSetMock).not.toHaveBeenCalled();
            expect(cacheGetMock).not.toHaveBeenCalled();

            dbMock.mockRestore();
            configMock.mockRestore();
            cacheSetMock.mockRestore();
            cacheGetMock.mockRestore();
        });
    });
});
