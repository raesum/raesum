import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';

// Mock process.exit to prevent test from exiting
vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit called with ${code}`);
});

// Track cors calls
let corsCalls = [];

// Mock cors module
vi.mock('cors', () => {
    const mockCors = vi.fn((options) => {
        corsCalls.push(options);
        return (req, res, next) => next();
    });
    return {
        default: mockCors,
    };
});

// Mock all the heavy dependencies
vi.mock('../src/modules/raesumDB.js', () => ({
    default: {
        query: vi.fn(),
        end: vi.fn(),
    },
}));

vi.mock('../src/modules/raesumStartup.js', () => {
    return {
        default: class MockRaesumStartup {
            async initialize() {
                return true;
            }
        },
    };
});

vi.mock('../src/modules/raesumCache.js', () => ({
    default: {
        deleteSet: vi.fn().mockResolvedValue(true),
        end: vi.fn(),
    },
}));

vi.mock('../src/modules/raesumCognito.js', () => ({
    default: {
        synchronizeCognitoUserMetadata: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../src/modules/raesumConfig.js', () => ({
    default: {
        get: vi.fn((key) => {
            const mockConfig = {
                'server.proxyInUse': false,
                'ratelimiter.useRateLimiter': false,
                login: { jwt: true, useSessionCookie: true },
                'cors.allowedOrigins': [
                    'https://example.com',
                    'https://test.com',
                ],
            };
            return mockConfig[key];
        }),
    },
}));

vi.mock('../src/modules/raesumServer.js', () => ({
    default: {
        serverSettingsSafetyChecks: vi.fn().mockResolvedValue(true),
        buildBaseServerURL: vi.fn().mockResolvedValue('http://localhost:3000'),
    },
}));

vi.mock('../src/modules/raesumSession.js', () => {
    return {
        default: class MockRaesumSession {
            async createSessionConfig() {
                return {
                    secret: 'test-secret',
                    resave: false,
                    saveUninitialized: false,
                };
            }
        },
    };
});

vi.mock('../src/models/raesumMetadata.js', () => ({
    default: {
        getByKey: vi.fn().mockResolvedValue(false),
    },
}));

vi.mock('../src/middleware/cognitoAuthentication.js', () => ({
    default: {
        cognitoAuth: vi.fn((req, res, next) => next()),
    },
}));

vi.mock('../src/middleware/raesumRateLimiter.js', () => ({
    default: vi.fn((req, res, next) => next()),
}));

vi.mock('../src/middleware/raesumRequestLogger.js', () => ({
    default: vi.fn((req, res, next) => next()),
}));

// Mock the routes
vi.mock('../src/routes/raesumHealth.js', () => ({
    default: () => {},
}));

vi.mock('../src/routes/raesumAuth.js', () => ({
    default: () => {},
}));

vi.mock('../src/routes/raesumAudit.js', () => ({
    default: () => {},
}));

vi.mock('../src/routes/raesumUser.js', () => ({
    default: () => {},
}));

vi.mock('../src/routes/swagger.js', () => ({
    default: () => {},
}));

// Mock session
vi.mock('express-session', () => {
    const mockSessionFn = vi.fn((config) => {
        const middleware = (req, res, next) => next();
        return middleware;
    });
    return {
        default: mockSessionFn,
    };
});

// Mock express-unless
vi.mock('express-unless', () => ({
    unless: (middleware) => {
        return (options) => {
            return (req, res, next) => middleware(req, res, next);
        };
    },
}));

describe('Server CORS Configuration', () => {
    beforeEach(() => {
        // Reset cors calls before each test
        corsCalls = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('CORS middleware is applied when app is created', async () => {
        const { createApp } = await import('../src/server.js');
        await createApp();

        expect(corsCalls.length).toBeGreaterThan(0);
    });

    test('CORS configuration has correct settings', async () => {
        const { createApp } = await import('../src/server.js');
        await createApp();

        const corsOptions = corsCalls[0];

        expect(corsOptions).toBeDefined();
        expect(corsOptions.credentials).toBe(true);
        expect(corsOptions.methods).toEqual([
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS',
        ]);
        expect(corsOptions.allowedHeaders).toEqual([
            'Content-Type',
            'Authorization',
            'X-Requested-With',
        ]);
        expect(corsOptions.optionsSuccessStatus).toBe(204);
        expect(corsOptions.maxAge).toBe(86400);
    });

    test('CORS origin callback allows requests without origin', async () => {
        const { createApp } = await import('../src/server.js');
        await createApp();

        const corsOptions = corsCalls[0];
        const callback = vi.fn();

        // Test with no origin (undefined)
        corsOptions.origin(undefined, callback);
        expect(callback).toHaveBeenCalledWith(null, true);

        // Test with null origin
        callback.mockClear();
        corsOptions.origin(null, callback);
        expect(callback).toHaveBeenCalledWith(null, true);
    });

    test('CORS origin callback allows whitelisted origins', async () => {
        const { createApp } = await import('../src/server.js');
        await createApp();

        const corsOptions = corsCalls[0];
        const callback = vi.fn();

        // Test with whitelisted origin from config
        corsOptions.origin('https://example.com', callback);
        expect(callback).toHaveBeenCalledWith(null, true);

        callback.mockClear();
        corsOptions.origin('https://test.com', callback);
        expect(callback).toHaveBeenCalledWith(null, true);

        // Test with server running URL
        callback.mockClear();
        corsOptions.origin('http://localhost:3000', callback);
        expect(callback).toHaveBeenCalledWith(null, true);
    });

    test('CORS origin callback rejects non-whitelisted origins', async () => {
        const { createApp } = await import('../src/server.js');
        await createApp();

        const corsOptions = corsCalls[0];
        const callback = vi.fn();

        // Test with non-whitelisted origin (should be rejected)
        corsOptions.origin('https://unknown-origin.com', callback);
        expect(callback).toHaveBeenCalledWith(
            new Error({ message: 'Origin not allowed by CORS' })
        );
    });
});
