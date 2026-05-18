import raesumOrganization from '../../src/models/raesumOrganization.js';
import raesumUser from '../../src/models/raesumUser.js';
import config from 'config';
import raesumConfig from '../../src/modules/raesumConfig.js';
import raesumDB from '../../src/modules/raesumDB.js';
import raesumCognito from '../../src/modules/raesumCognito.js';
import raesumCache from '../../src/modules/raesumCache.js';

import {
    vi,
    test,
    expect,
    describe,
    beforeEach,
    afterEach,
    beforeAll,
} from 'vitest';

async function cleanupUsers(id) {
    id = id.toString();

    await raesumDB.query(
        "DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-" +
            id +
            "%';"
    );
    await raesumDB.query(
        "DELETE FROM raesum_user WHERE username LIKE 'test-" + id + "%';"
    );
    await raesumDB.query(
        "DELETE FROM raesum_organization WHERE name LIKE 'test-'"
    );
}

describe('Raesum Organization System', () => {
    const dbTestsEnabled = config.get(
        'developmentAndTesting.integrationTestEnabled.primaryDatabase'
    );
    console.log('DB Tests Enabled: ' + dbTestsEnabled);

    const iftest = dbTestsEnabled ? test : test.skip;

    let rootUserId;

    beforeAll(async () => {
        // Clean up any existing test data
        await raesumDB.query(
            "DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-%'; DELETE FROM raesum_user WHERE username LIKE 'test-%'; DELETE FROM raesum_organization WHERE name LIKE 'test-%'"
        );

        // Get the root user ID from the firstUserUsername setting
        const firstUserUsername = await raesumConfig.get(
            'initialization.firstUserUsername'
        );
        const rootUser = await raesumUser.getUserByUsername(firstUserUsername);
        rootUserId = rootUser.id;
    });

    // afterEach(async () => {
    //     // Clean up test data after each test
    //     await raesumDB.query("DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-%'; DELETE FROM raesum_user WHERE username LIKE 'test-%'; DELETE FROM raesum_organization WHERE name LIKE 'test-%'");
    // });

    describe('create', () => {
        iftest('should create new organization with valid data', async () => {
            const result = await raesumOrganization.create(
                'Test Organization',
                true
            );
            expect(result).toBeGreaterThan(0);

            // Verify the organization was created correctly
            const org = await raesumOrganization.getById(result);
            expect(org).toBeDefined();
            expect(org.name).toBe('Test Organization');
            expect(org.active_status).toBe(true);
        });

        iftest('should create inactive organization', async () => {
            const result = await raesumOrganization.create(
                'Inactive Test Org',
                false
            );
            expect(result).toBeGreaterThan(0);

            const org = await raesumOrganization.getById(result);
            expect(org.active_status).toBe(false);
        });

        iftest('should throw error for non-string name', async () => {
            expect(async () => {
                await raesumOrganization.create(123, true);
            }).rejects.toThrow('Organization name must be a string');
        });

        iftest('should handle database errors during creation', async () => {
            // Mock database to throw error
            const originalQuery = raesumDB.query;
            raesumDB.query = vi
                .fn()
                .mockRejectedValue(new Error('Database connection failed'));

            expect(async () => {
                await raesumOrganization.create('Test Org', true);
            }).rejects.toThrow('Error creating organization');

            // Restore original function
            raesumDB.query = originalQuery;
        });
    });

    describe('getById', () => {
        iftest('should return organization for valid ID', async () => {
            // First create a test organization
            const orgId = await raesumOrganization.create('Get Test Org', true);

            const result = await raesumOrganization.getById(orgId);
            expect(result).toBeDefined();
            expect(result.id).toBe(orgId);
            expect(result.name).toBe('Get Test Org');
            expect(result.active_status).toBe(true);
        });

        iftest('should throw error for non-existent ID', async () => {
            expect(async () => {
                await raesumOrganization.getById(99999);
            }).rejects.toThrow('Organization not found');
        });

        iftest('should throw error for invalid ID types', async () => {
            expect(async () => {
                await raesumOrganization.getById('invalid');
            }).rejects.toThrow('Organization ID must be a number');

            expect(async () => {
                await raesumOrganization.getById(-1);
            }).rejects.toThrow('Organization ID must be greater than 0');
        });
    });

    describe('setActivationStatus', () => {
        iftest('should activate organization', async () => {
            // Create test organization
            const orgId = await raesumOrganization.create(
                'Activation Test Org',
                true
            );

            const result = await raesumOrganization.setActivationStatus(
                orgId,
                true
            );
            expect(result).toBe(true);

            // Verify the status was updated
            const org = await raesumOrganization.getById(orgId);
            expect(org.active_status).toBe(true);
        });

        iftest('should deactivate organization', async () => {
            // Create test organization
            const orgId = await raesumOrganization.create(
                'Deactivation Test Org',
                true
            );

            const result = await raesumOrganization.setActivationStatus(
                orgId,
                false
            );
            expect(result).toBe(false);

            // Verify the status was updated
            const org = await raesumOrganization.getById(orgId);
            expect(org.active_status).toBe(false);
        });

        iftest(
            'should handle boolean conversion for activeStatus',
            async () => {
                const orgId = await raesumOrganization.create(
                    'Boolean Test Org',
                    true
                );

                // Test with string "false" - should be converted to false
                const result = await raesumOrganization.setActivationStatus(
                    orgId,
                    'false'
                );
                expect(result).toBe(false);

                const org = await raesumOrganization.getById(orgId);
                expect(org.active_status).toBe(false);
            }
        );

        iftest('should throw error for invalid ID', async () => {
            expect(async () => {
                await raesumOrganization.setActivationStatus(-1, true);
            }).rejects.toThrow('orgID must be a positive integer');
        });

        iftest(
            'should throw error for an organization that does not exist',
            async () => {
                expect(async () => {
                    await raesumOrganization.setActivationStatus(
                        568711113,
                        true
                    );
                }).rejects.toThrow('Organization not found');
            }
        );
    });

    describe('addUserToOrganization', () => {
        iftest('should add user to organization successfully', async () => {
            await cleanupUsers(45);

            // Create test organization and user
            const orgId = await raesumOrganization.create(
                'User Add Test Org',
                true
            );
            const userId = await raesumDB
                .query(
                    'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    ['test-45user', true, 1, 'test-external-id45']
                )
                .then((result) => parseInt(result.rows[0].id));

            // Manually add user to user_x_org for org 1
            await raesumDB.query(
                'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                [userId, 1]
            );

            const result = await raesumOrganization.addUserToOrganization(
                userId,
                orgId
            );
            expect(result).toBe(true);

            // Verify the user was added to organization
            const membership = await raesumDB.query(
                'SELECT * FROM raesum_organization_x_user WHERE user_id = $1 AND org_id = $2',
                [userId, orgId]
            );
            expect(membership.rows.length).toBe(1);
            expect(parseInt(membership.rows[0].user_id)).toBe(userId);
            expect(parseInt(membership.rows[0].org_id)).toBe(orgId);

            await cleanupUsers(45);
        });

        iftest(
            'should return true if user already exists in organization',
            async () => {
                await cleanupUsers(2);

                // Create test organization and user
                const orgId = await raesumOrganization.create(
                    'Duplicate User Test Org',
                    true
                );
                const userId = await raesumDB
                    .query(
                        'INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        ['test-2user', true, orgId, 'test-external-id2']
                    )
                    .then((result) => parseInt(result.rows[0].id));

                // Manually add user to user_x_org for org 1
                await raesumDB.query(
                    'INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)',
                    [userId, orgId]
                );

                // Try to add again - should return false
                const result = await raesumOrganization.addUserToOrganization(
                    userId,
                    orgId
                );
                expect(result).toBe(true);

                await cleanupUsers(2);
            }
        );

        iftest('should throw error for invalid user ID', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(-1, 1);
            }).rejects.toThrow('userID and orgID must be positive integers');
        });

        iftest('should throw error for invalid org ID', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(rootUserId, -1);
            }).rejects.toThrow('userID and orgID must be positive integers');
        });

        iftest('should throw error if user not found', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(99999, 1);
            }).rejects.toThrow('User not found');
        });

        iftest('should throw error if org not found or inactive', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(
                    rootUserId,
                    99999
                );
            }).rejects.toThrow('Org not found or does not exist');
        });
    });

    describe('User Management During Deactivation', () => {
        iftest(
            'should deactivate users if they have no other organizations',
            async () => {
                await cleanupUsers(33);

                // Create test organization and user
                const orgId = await raesumOrganization.create(
                    'test-33 User Deactivate Test Org',
                    true
                );
                const userId = await raesumDB
                    .query(
                        'INSERT INTO raesum_user (username, active_status, external_id, current_organization_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        [
                            'test-33deactivate-user',
                            true,
                            'test-external-id',
                            orgId,
                        ]
                    )
                    .then((result) => parseInt(result.rows[0].id));

                // Add user to organization manually
                await raesumDB.query(
                    'INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)',
                    [orgId, userId]
                );

                // Mock raesumCognito.setUserEnabledStatus to track calls
                const cognitoMock = vi
                    .spyOn(raesumCognito, 'setUserEnabledStatus')
                    .mockResolvedValue(undefined);

                // Deactivate the organization - user should be deactivated
                const result = await raesumOrganization.setActivationStatus(
                    orgId,
                    false
                );
                expect(result).toBe(false);

                // Verify user was deactivated
                const user = await raesumDB.query(
                    'SELECT active_status FROM raesum_user WHERE id = $1',
                    [userId]
                );
                expect(user.rows[0].active_status).toBe(false);

                // Verify raesumCognito.setUserEnabledStatus was called with correct parameters
                expect(cognitoMock).toHaveBeenCalledWith(
                    'test-33deactivate-user',
                    false
                );

                await cleanupUsers(33);
            }
        );

        iftest(
            'should move users to other organizations when deactivating',
            async () => {
                await cleanupUsers(12);
                await cleanupUsers(13);

                // Create test organizations and users
                const org1Id = await raesumOrganization.create(
                    'test-12 User Move Test Org 1',
                    true
                );
                const org2Id = await raesumOrganization.create(
                    'test-13 User Move Test Org 2',
                    true
                );

                const userId1 = await raesumDB
                    .query(
                        'INSERT INTO raesum_user (username, active_status, external_id, current_organization_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        [
                            'test-12move-user1',
                            true,
                            'test-12external-id1',
                            org1Id,
                        ]
                    )
                    .then((result) => parseInt(result.rows[0].id));

                const userId2 = await raesumDB
                    .query(
                        'INSERT INTO raesum_user (username, active_status, external_id, current_organization_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        [
                            'test-13move-user2',
                            true,
                            'test-13external-id2',
                            org1Id,
                        ]
                    )
                    .then((result) => parseInt(result.rows[0].id));

                // Add users to first organization manually
                await raesumDB.query(
                    'INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)',
                    [org1Id, userId1]
                );
                await raesumDB.query(
                    'INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)',
                    [org1Id, userId2]
                );

                // Add second user to second organization manually
                await raesumDB.query(
                    'INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)',
                    [org2Id, userId2]
                );

                // Mock raesumCognito.setUserEnabledStatus to track calls
                const cognitoMock = vi
                    .spyOn(raesumCognito, 'setUserEnabledStatus')
                    .mockResolvedValue(undefined);

                // Deactivate first organization - should move users to second org
                const result = await raesumOrganization.setActivationStatus(
                    org1Id,
                    false
                );
                expect(result).toBe(false);

                // Verify users were moved
                const user1Orgs = await raesumDB.query(
                    'SELECT current_organization_id, active_status FROM raesum_user WHERE id = $1',
                    [userId1]
                );
                const user2Orgs = await raesumDB.query(
                    'SELECT current_organization_id, active_status FROM raesum_user WHERE id = $1',
                    [userId2]
                );

                expect(parseInt(user1Orgs.rows[0].active_status)).toBeFalsy();
                expect(
                    parseInt(user2Orgs.rows[0].current_organization_id)
                ).toBe(org2Id);

                await cleanupUsers(12);
                await cleanupUsers(13);
            }
        );
    });

    describe('Edge Cases and Error Handling', () => {
        iftest('should handle database connection errors', async () => {
            // Mock database to throw error
            const originalQuery = raesumDB.query;
            raesumDB.query = vi
                .fn()
                .mockRejectedValue(new Error('Database connection failed'));

            expect(async () => {
                await raesumOrganization.getById(1);
            }).rejects.toThrow();

            // Restore original function
            raesumDB.query = originalQuery;
        });

        iftest('should handle null parameters gracefully', async () => {
            expect(async () => {
                await raesumOrganization.getById(null);
            }).rejects.toThrow('Organization ID must be a number');
        });

        iftest('should handle undefined parameters gracefully', async () => {
            expect(async () => {
                await raesumOrganization.getById(undefined);
            }).rejects.toThrow('Organization ID must be a number');
        });

        iftest('should handle concurrent operations safely', async () => {
            // Create test organization
            const orgId = await raesumOrganization.create(
                'Concurrent Test Org',
                true
            );

            // Try multiple concurrent operations
            const promises = [
                raesumOrganization.setActivationStatus(orgId, true),
                raesumOrganization.setActivationStatus(orgId, false),
                raesumOrganization.getById(orgId),
            ];

            // All operations should complete without errors
            const results = await Promise.all(promises);
            results.forEach((result) => {
                expect(result).toBeDefined();
            });
        });
    });

    describe('Organization Metadata Functions', () => {
        describe('getMetadataKeys', () => {
            iftest('should return active metadata keys', async () => {
                // Mock database response
                const mockKeys = [
                    {
                        datakey: 'orgName',
                        active_status: true,
                        description: 'Organization name',
                        displayname: 'Organization Name',
                    },
                    {
                        datakey: 'orgType',
                        active_status: true,
                        description: 'Organization type',
                        displayname: 'Organization Type',
                    },
                ];

                vi.spyOn(raesumDB, 'query').mockResolvedValue({
                    rows: mockKeys,
                });
                vi.spyOn(raesumCache, 'get').mockResolvedValue(null);
                const cacheSetSpy = vi
                    .spyOn(raesumCache, 'set')
                    .mockResolvedValue(true);

                const result = await raesumOrganization.getMetadataKeys(false);

                expect(result).toEqual({
                    orgName: mockKeys[0],
                    orgType: mockKeys[1],
                });
                expect(raesumDB.query).toHaveBeenCalledWith(
                    'SELECT * FROM raesum_organization_metadata_keys WHERE active_status = true'
                );
                expect(cacheSetSpy).toHaveBeenCalled();
            });

            iftest(
                'should return all metadata keys including inactive',
                async () => {
                    const mockKeys = [
                        {
                            datakey: 'orgName',
                            active_status: true,
                            description: 'Organization name',
                            displayname: 'Organization Name',
                        },
                        {
                            datakey: 'oldKey',
                            active_status: false,
                            description: 'Old key',
                            displayname: 'Old Key',
                        },
                    ];

                    vi.spyOn(raesumDB, 'query').mockResolvedValue({
                        rows: mockKeys,
                    });
                    vi.spyOn(raesumCache, 'get').mockResolvedValue(null);
                    vi.spyOn(raesumCache, 'set').mockResolvedValue(true);

                    const result =
                        await raesumOrganization.getMetadataKeys(true);

                    expect(result).toEqual({
                        orgName: mockKeys[0],
                        oldKey: mockKeys[1],
                    });
                    expect(raesumDB.query).toHaveBeenCalledWith(
                        'SELECT * FROM raesum_organization_metadata_keys'
                    );
                }
            );

            iftest('should return cached keys when available', async () => {
                const cachedKeys = {
                    cachedKey: { datakey: 'cachedKey', active_status: true },
                };

                vi.spyOn(raesumCache, 'get').mockResolvedValue(cachedKeys);
                const dbSpy = vi.spyOn(raesumDB, 'query');

                const result = await raesumOrganization.getMetadataKeys(false);

                expect(result).toEqual(cachedKeys);
                expect(dbSpy).not.toHaveBeenCalled();
            });

            iftest('should handle database errors', async () => {
                vi.spyOn(raesumDB, 'query').mockRejectedValue(
                    new Error('Database error')
                );
                vi.spyOn(raesumCache, 'get').mockResolvedValue(null);

                await expect(
                    raesumOrganization.getMetadataKeys()
                ).rejects.toThrow('Database error');
            });
        });

        describe('getMetadataKeyList', () => {
            iftest('should return array of key names', async () => {
                const mockKeys = {
                    orgName: { datakey: 'orgName', active_status: true },
                    orgType: { datakey: 'orgType', active_status: true },
                };

                vi.spyOn(raesumCache, 'get').mockResolvedValue(null);
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeys'
                ).mockResolvedValue(mockKeys);

                const result =
                    await raesumOrganization.getMetadataKeyList(false);

                expect(result).toEqual(['orgName', 'orgType']);
                expect(raesumOrganization.getMetadataKeys).toHaveBeenCalledWith(
                    false
                );
            });

            iftest('should return cached key list when available', async () => {
                const mockCachedKeys = {
                    cachedKey1: { id: 1, datakey: 'cachedKey1' },
                    cachedKey2: { id: 2, datakey: 'cachedKey2' },
                };
                const mockedKeys = ['cachedKey1', 'cachedKey2'];
                vi.spyOn(raesumCache, 'get').mockResolvedValue(mockCachedKeys);
                const getKeysSpy = vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeys'
                );

                const result =
                    await raesumOrganization.getMetadataKeyList(false);

                expect(result).toEqual(['cachedKey1', 'cachedKey2']);
                expect(getKeysSpy).not.toHaveBeenCalled();
            });

            iftest('should handle empty cache response', async () => {
                const mockKeys = {
                    orgName: { datakey: 'orgName', active_status: true },
                };

                vi.spyOn(raesumCache, 'get').mockResolvedValue({});
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeys'
                ).mockResolvedValue(mockKeys);

                const result =
                    await raesumOrganization.getMetadataKeyList(false);

                expect(result).toEqual(['orgName']);
            });
        });

        describe('clearMetadataKeyCache', () => {
            iftest('should clear all metadata cache keys', async () => {
                const cacheDeleteSpy = vi
                    .spyOn(raesumCache, 'delete')
                    .mockResolvedValue(true);

                await raesumOrganization.clearMetadataKeyCache();

                expect(cacheDeleteSpy).toHaveBeenCalledWith(
                    'raesumOrganizationMetadataKeystrue'
                );
                expect(cacheDeleteSpy).toHaveBeenCalledWith(
                    'raesumOrganizationMetadataKeysfalse'
                );
                expect(cacheDeleteSpy).toHaveBeenCalledTimes(2);
            });
        });

        describe('getOrganizationMetadataValues', () => {
            iftest('should return metadata values for valid keys', async () => {
                const orgId = 1;
                const keys = ['orgName', 'orgType'];
                const mockValues = [
                    { datakey: 'orgName', value: 'Test Org' },
                    { datakey: 'orgType', value: 'Company' },
                ];

                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(keys);
                vi.spyOn(raesumDB, 'query').mockResolvedValue({
                    rows: mockValues,
                });

                const result =
                    await raesumOrganization.getOrganizationMetadataValues(
                        orgId,
                        keys
                    );

                expect(result).toEqual({
                    orgName: 'Test Org',
                    orgType: 'Company',
                });
                expect(raesumDB.query).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'SELECT rumk.datakey, ruxm.value as value'
                    ),
                    [orgId, keys]
                );
            });

            iftest('should filter out invalid keys', async () => {
                const orgId = 1;
                const requestedKeys = ['orgName', 'invalidKey'];
                const validKeys = ['orgName'];
                const mockValues = [{ datakey: 'orgName', value: 'Test Org' }];

                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(validKeys);
                vi.spyOn(raesumDB, 'query').mockResolvedValue({
                    rows: mockValues,
                });

                const result =
                    await raesumOrganization.getOrganizationMetadataValues(
                        orgId,
                        requestedKeys
                    );

                expect(result).toEqual({ orgName: 'Test Org' });
                expect(raesumDB.query).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'SELECT rumk.datakey, ruxm.value as value'
                    ),
                    [orgId, ['orgName']]
                );
            });

            iftest('should throw error for invalid org ID', async () => {
                await expect(
                    raesumOrganization.getOrganizationMetadataValues(-1, [
                        'orgName',
                    ])
                ).rejects.toThrow('Organization ID must be a positive integer');
            });

            iftest('should handle database errors', async () => {
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(['orgName']);
                vi.spyOn(raesumDB, 'query').mockRejectedValue(
                    new Error('Database error')
                );

                await expect(
                    raesumOrganization.getOrganizationMetadataValues(1, [
                        'orgName',
                    ])
                ).rejects.toThrow('Error getting organization metadata values');
            });
        });

        describe('setOrganizationMetadataValues', () => {
            iftest('should set new metadata values', async () => {
                const orgId = 1;
                const values = { orgName: 'New Org', orgType: 'Company' };
                const validKeys = ['orgName', 'orgType'];

                vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                    id: orgId,
                    active_status: true,
                });
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(validKeys);
                vi.spyOn(
                    raesumOrganization,
                    'getOrganizationMetadataValues'
                ).mockResolvedValue({});
                vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

                const result =
                    await raesumOrganization.setOrganizationMetadataValues(
                        orgId,
                        values
                    );

                expect(result).toBe(true);
                expect(raesumDB.query).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'INSERT INTO raesum_organization_x_metadata'
                    ),
                    expect.arrayContaining([
                        orgId,
                        'orgName',
                        'New Org',
                        'orgType',
                        'Company',
                    ])
                );
            });

            iftest('should update existing metadata values', async () => {
                const orgId = 1;
                const values = { orgName: 'Updated Org' };
                const validKeys = ['orgName'];
                const existingValues = { orgName: 'Old Org' };

                vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                    id: orgId,
                    active_status: true,
                });
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(validKeys);
                vi.spyOn(
                    raesumOrganization,
                    'getOrganizationMetadataValues'
                ).mockResolvedValue(existingValues);
                vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

                const result =
                    await raesumOrganization.setOrganizationMetadataValues(
                        orgId,
                        values
                    );

                expect(result).toBe(true);
                expect(raesumDB.query).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'UPDATE raesum_organization_x_metadata'
                    ),
                    ['Updated Org', orgId, 'orgName']
                );
            });

            iftest('should filter out invalid value types', async () => {
                const orgId = 1;
                const values = {
                    orgName: 'Valid String',
                    isValid: true,
                    count: 42,
                    invalid: { object: 'value' },
                    alsoInvalid: undefined,
                };
                const validKeys = ['orgName', 'isValid', 'count'];

                vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                    id: orgId,
                    active_status: true,
                });
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(validKeys);
                vi.spyOn(
                    raesumOrganization,
                    'getOrganizationMetadataValues'
                ).mockResolvedValue({});
                vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

                const result =
                    await raesumOrganization.setOrganizationMetadataValues(
                        orgId,
                        values
                    );

                expect(result).toBe(true);
                // Should only include valid types (string, boolean, number)
                expect(raesumDB.query).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'INSERT INTO raesum_organization_x_metadata'
                    ),
                    expect.arrayContaining([
                        orgId,
                        'orgName',
                        'Valid String',
                        'isValid',
                        true,
                        'count',
                        42,
                    ])
                );
            });

            iftest(
                'should throw error for non-existent organization',
                async () => {
                    vi.spyOn(raesumOrganization, 'getById').mockRejectedValue(
                        new Error('Organization not found')
                    );

                    await expect(
                        raesumOrganization.setOrganizationMetadataValues(999, {
                            orgName: 'Test',
                        })
                    ).rejects.toThrow('User not found');
                }
            );
        });

        describe('deleteOrganizationMetadataValues', () => {
            iftest('should delete metadata values', async () => {
                const orgId = 1;
                const keys = ['orgName', 'orgType'];
                const validKeys = ['orgName', 'orgType'];

                vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                    id: orgId,
                    active_status: true,
                });
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(validKeys);
                vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

                const result =
                    await raesumOrganization.deleteOrganizationMetadataValues(
                        orgId,
                        keys
                    );

                expect(result).toBe(true);
                expect(raesumDB.query).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'DELETE FROM raesum_organization_x_metadata'
                    ),
                    [orgId, keys]
                );
            });

            iftest('should filter out invalid keys', async () => {
                const orgId = 1;
                const keys = ['orgName', 'invalidKey', ''];
                const validKeys = ['orgName'];

                vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                    id: orgId,
                    active_status: true,
                });
                vi.spyOn(
                    raesumOrganization,
                    'getMetadataKeyList'
                ).mockResolvedValue(validKeys);
                vi.spyOn(raesumDB, 'query').mockResolvedValue({ rows: [] });

                const result =
                    await raesumOrganization.deleteOrganizationMetadataValues(
                        orgId,
                        keys
                    );

                expect(result).toBe(true);
                expect(raesumDB.query).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'DELETE FROM raesum_organization_x_metadata'
                    ),
                    [orgId, ['orgName']]
                );
            });

            iftest('should throw error for invalid org ID', async () => {
                await expect(
                    raesumOrganization.deleteOrganizationMetadataValues(-1, [
                        'orgName',
                    ])
                ).rejects.toThrow('Organization ID must be a positive integer');
            });

            iftest('should throw error for invalid keys array', async () => {
                await expect(
                    raesumOrganization.deleteOrganizationMetadataValues(
                        1,
                        'notAnArray'
                    )
                ).rejects.toThrow('Keys must be an array');
            });

            iftest(
                'should throw error for non-existent organization',
                async () => {
                    vi.spyOn(raesumOrganization, 'getById').mockRejectedValue(
                        new Error('Organization not found')
                    );

                    await expect(
                        raesumOrganization.deleteOrganizationMetadataValues(
                            999,
                            ['orgName']
                        )
                    ).rejects.toThrow('Organizaztion not found');
                }
            );

            iftest(
                'should return true when no valid keys to delete',
                async () => {
                    const orgId = 1;
                    const keys = ['invalidKey'];
                    const validKeys = [];

                    vi.spyOn(raesumOrganization, 'getById').mockResolvedValue({
                        id: orgId,
                        active_status: true,
                    });
                    vi.spyOn(
                        raesumOrganization,
                        'getMetadataKeyList'
                    ).mockResolvedValue(validKeys);
                    const dbSpy = vi.spyOn(raesumDB, 'query');

                    const result =
                        await raesumOrganization.deleteOrganizationMetadataValues(
                            orgId,
                            keys
                        );

                    expect(result).toBe(true);
                    expect(dbSpy).not.toHaveBeenCalled();
                }
            );
        });
    });
});
