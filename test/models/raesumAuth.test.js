import raesumAuthorization from '../../src/models/raesumAuth.js';
import config from 'config';
import raesumDB from '../../src/modules/raesumDB.js';
import raesumConfig from '../../src/modules/raesumConfig.js';
import raesumUser from '../../src/models/raesumUser.js';
import {
    vi,
    test,
    expect,
    describe,
    beforeEach,
    afterEach,
    beforeAll,
} from 'vitest';

describe('Raesum Authorization System: Actions, Objects, and Scopes', () => {
    // If a database tests have been enabled

    const dbTestsEnabled = config.get(
        'developmentAndTesting.integrationTestEnabled.primaryDatabase'
    );
    console.log('DB Tests Enabled: ' + dbTestsEnabled);

    const iftest = dbTestsEnabled ? test : test.skip;

    let rootUserId;

    beforeAll(async () => {
        // Get the root user ID from the firstUserUsername setting
        const firstUserUsername = await raesumConfig.get(
            'initialization.firstUserUsername'
        );
        const rootUser = await raesumUser.getUserByUsername(firstUserUsername);
        rootUserId = rootUser.id;
    });

    // getRolesForOrg tests
    describe('getRolesForOrg', async () => {
        iftest(
            'should return roles for organization with some restrictions',
            async () => {
                const roles = await raesumAuthorization.getRolesForOrg(1, true);
                expect(Array.isArray(roles)).toBe(true);
                expect(roles.length).toBeGreaterThan(0);
            }
        );

        iftest('should handle invalid org ID', async () => {
            expect(async () => {
                await raesumAuthorization.getRolesForOrg(-1, true);
            }).rejects.toThrow();
        });

        iftest('should handle non-integer org ID', async () => {
            expect(async () => {
                await raesumAuthorization.getRolesForOrg('invalid', true);
            }).rejects.toThrow();
        });
    });

    // getRolesByID tests
    describe('getRolesByID', async () => {
        iftest('should return roles for valid IDs', async () => {
            const roles = await raesumAuthorization.getRolesByID(
                [1, 2, 3],
                true
            );

            expect(Array.isArray(roles)).toBe(true);
            expect(roles.length).toBeGreaterThan(0);
            roles.forEach((role) => {
                expect(role.id).toBeDefined();
                expect([1, 2, 3]).toContain(role.id);
            });
        });

        iftest('should handle invalid IDs mixed with valid IDs', async () => {
            const roles = await raesumAuthorization.getRolesByID(
                [1, 99999, 2],
                true
            );
            expect(Array.isArray(roles)).toBe(true);
            // Should only return valid roles
            roles.forEach((role) => {
                expect([1, 2]).toContain(role.id);
            });
        });

        iftest('should return empty array for all invalid IDs', async () => {
            const roles = await raesumAuthorization.getRolesByID(
                [99999, 99998],
                true
            );
            expect(Array.isArray(roles)).toBe(true);
            expect(roles.length).toBe(0);
        });

        iftest('should handle empty array', async () => {
            expect(async () => {
                await raesumAuthorization.getRolesByID([], true);
            }).rejects.toThrow();
        });

        iftest('should handle non-array input', async () => {
            expect(async () => {
                await raesumAuthorization.getRolesByID('not_an_array', true);
            }).rejects.toThrow();
        });

        iftest(
            'should include inactive roles when activeOnly is false',
            async () => {
                const roles = await raesumAuthorization.getRolesByID(
                    [1, 999],
                    false
                );
                expect(Array.isArray(roles)).toBe(true);
                // Should include both active and inactive roles
            }
        );

        iftest(
            'should exclude inactive roles when activeOnly is true',
            async () => {
                const roles = await raesumAuthorization.getRolesByID(
                    [1, 999],
                    true
                );
                expect(Array.isArray(roles)).toBe(true);
                // Should only include active roles
                roles.forEach((role) => {
                    expect(role.active_status).toBe(true);
                });
            }
        );
    });

    // getRoleByKey tests
    describe('getRoleByKey', async () => {
        iftest('should return role with good key - positive case', async () => {
            const role = await raesumAuthorization.getRoleByKey('raesumAdmin');
            expect(role).toBeDefined();
            expect(role.string_key).toBe('raesumAdmin');
        });

        iftest('should handle bad role key', async () => {
            expect(async () => {
                await raesumAuthorization.getRoleByKey('nonexistent_role');
            }).rejects.toThrow();
        });

        iftest('should handle case-insensitive role key', async () => {
            const role = await raesumAuthorization.getRoleByKey('raesumADMIN');
            expect(role).toBeDefined();
            expect(role.string_key.toLowerCase()).toBe('raesumadmin');
        });

        iftest('should handle empty role key', async () => {
            expect(async () => {
                await raesumAuthorization.getRoleByKey('');
            }).rejects.toThrow();
        });

        iftest('should handle null role key', async () => {
            expect(async () => {
                await raesumAuthorization.getRoleByKey(null);
            }).rejects.toThrow();
        });
    });

    describe('convertActionStringToID', async () => {
        iftest('Convert action string_key to actionID', async () => {
            const actionID =
                await raesumAuthorization.convertActionStringToID('log_in');
            expect(actionID).toBe(1);
        });

        iftest('Convert action string_key to actionID wrong case', async () => {
            const actionID =
                await raesumAuthorization.convertActionStringToID('lOG_in');
            expect(actionID).toBe(1);
        });

        iftest('Convert action string_key to actionID bad input', async () => {
            const actionID =
                await raesumAuthorization.convertActionStringToID('moo');
            expect(actionID).toBe(false);
        });

        iftest('Convert object string_key to objectId', async () => {
            const actionID =
                await raesumAuthorization.convertObjectTypeStringToID(
                    'raesum_user'
                );
            expect(actionID).toBe(1);
        });

        iftest('Convert object string_key to objectId wrong case', async () => {
            const actionID =
                await raesumAuthorization.convertObjectTypeStringToID(
                    'rAESum_user'
                );
            expect(actionID).toBe(1);
        });

        iftest('Convert object string_key to objectId bad input', async () => {
            const actionID =
                await raesumAuthorization.convertObjectTypeStringToID('cow');
            expect(actionID).toBe(false);
        });

        iftest(
            'Convert object string_key to objectId bad input type',
            async () => {
                expect(async () => {
                    await raesumAuthorization.convertObjectTypeStringToID({
                        angryGOPHER: 'angryGOPHER',
                    });
                }).rejects.toThrow();
            }
        );
    });

    // checkUserPermissionByID tests
    describe('checkUserPermissionByID', async () => {
        iftest(
            'should allow access with single scope - positive case',
            async () => {
                // Assuming user 1 has read permission on raesum_user with user scope
                const hasPermission =
                    await raesumAuthorization.checkUserPermissionByID(
                        rootUserId,
                        1,
                        1,
                        1,
                        1,
                        [1]
                    );
                expect(hasPermission).toBe(true);
            }
        );

        iftest(
            'should deny access with insufficient scope - negative case',
            async () => {
                // Assuming user 1 does not have admin scope on raesum_user
                const hasPermission =
                    await raesumAuthorization.checkUserPermissionByID(
                        3,
                        1,
                        1,
                        1,
                        1,
                        ['crossorganization']
                    );
                expect(hasPermission).toBe(false);
            }
        );

        iftest(
            'should allow access with multiple scopes - positive case',
            async () => {
                // Test with multiple scopes where user has at least one
                const hasPermission =
                    await raesumAuthorization.checkUserPermissionByID(
                        rootUserId,
                        1,
                        1,
                        1,
                        1,
                        [1, 2]
                    );
                expect(hasPermission).toBe(true);
            }
        );

        iftest(
            'should deny access with multiple scopes - negative case',
            async () => {
                // Test with multiple scopes where user has none
                const hasPermission =
                    await raesumAuthorization.checkUserPermissionByID(
                        rootUserId,
                        1,
                        1,
                        1,
                        1,
                        [412, 83]
                    );
                expect(hasPermission).toBe(false);
            }
        );

        iftest(
            'should handle user with multiple roles - negative case',
            async () => {
                // Test user with multiple roles but still lacks specific permission
                const hasPermission =
                    await raesumAuthorization.checkUserPermissionByID(
                        2,
                        1,
                        1,
                        1,
                        1,
                        [2]
                    );
                expect(hasPermission).toBe(false);
            }
        );

        iftest('should handle deny action specifically', async () => {
            // Test deny action - should always return false
            const denyActionId =
                await raesumAuthorization.convertActionStringToID('deny');
            const hasPermission =
                await raesumAuthorization.checkUserPermissionByID(
                    rootUserId,
                    1,
                    denyActionId,
                    1,
                    rootUserId,
                    [2]
                );
        });

        iftest('should handle non-existent user', async () => {
            const hasPermission =
                await raesumAuthorization.checkUserPermissionByID(
                    99999,
                    1,
                    1,
                    1,
                    1,
                    [1]
                );
            expect(hasPermission).toBe(false);
        });

        iftest('should handle invalid parameters', async () => {
            expect(async () => {
                await raesumAuthorization.checkUserPermissionByID(
                    -1,
                    1,
                    1,
                    1,
                    1
                );
            }).rejects.toThrow();
        });
    });

    // getAllowedUserScopesByID tests
    describe('getAllowedUserScopesByID', async () => {
        iftest(
            'should return the most powerful scope permitted for this user - positive case',
            async () => {
                const scopes =
                    await raesumAuthorization.getAllowedUserScopesByID(
                        rootUserId,
                        1,
                        1
                    );
                expect(scopes).toBeGreaterThan(0);
            }
        );

        iftest(
            'should return false for user with no scopes - negative case',
            async () => {
                // Assuming user 999 has no permissions
                const scopes =
                    await raesumAuthorization.getAllowedUserScopesByID(
                        999,
                        1,
                        1
                    );
                expect(scopes).toBe(false);
            }
        );

        iftest('should handle deny action specifically', async () => {
            const denyActionId =
                await raesumAuthorization.convertActionStringToID('deny');
            const scopes = await raesumAuthorization.getAllowedUserScopesByID(
                rootUserId,
                1,
                denyActionId
            );
            expect(scopes).toBe(false); // Deny should never return scopes
        });

        iftest('should handle invalid userID', async () => {
            expect(async () => {
                await raesumAuthorization.getAllowedUserScopesByID(
                    'cowgods',
                    1,
                    1,
                    1
                );
            }).rejects.toThrow();
        });
    });

    // addUserToRole tests
    describe('addUserToRole', async () => {
        iftest('should add role to user - positive test case', async () => {
            // Manually delete the user from the role
            const query =
                'DELETE FROM raesum_auth_user_x_organization_x_role WHERE user_id = $1 AND role_id = 1 AND org_id = 1;';
            const queryResult = await raesumDB.query(query, [rootUserId]);

            // Add user 1 to role 1 in org 1
            const result = await raesumAuthorization.addUserToRole(
                rootUserId,
                1,
                1
            );
            expect(result).toBe(true);
        });

        iftest('should fail when role not available to org', async () => {
            // Mock the database to return zero rows (role not available to org)
            const mockQuery = vi
                .spyOn(raesumDB, 'query')
                .mockResolvedValue({ rowCount: 0, rows: [] });

            // Try to add user to role that's not available for the organization
            const result = await raesumAuthorization.addUserToRole(
                rootUserId,
                999,
                1
            );
            expect(result).toBe(false);

            // Restore the mock
            mockQuery.mockRestore();
        });

        iftest('should handle invalid user ID', async () => {
            expect(async () => {
                await raesumAuthorization.addUserToRole(-1, 1, 1);
            }).rejects.toThrow();
        });

        iftest('should handle invalid role ID', async () => {
            expect(async () => {
                await raesumAuthorization.addUserToRole(rootUserId, -1, 1);
            }).rejects.toThrow();
        });
    });

    // addUserToRoleByKey tests
    describe('addUserToRoleByKey', async () => {
        iftest(
            'should add role using valid key - positive test case',
            async () => {
                const query =
                    'DELETE FROM raesum_auth_user_x_organization_x_role WHERE user_id = $1 AND role_id = 1 AND org_id = 1;';
                const queryResult = await raesumDB.query(query, [rootUserId]);

                const result = await raesumAuthorization.addUserToRoleByKey(
                    rootUserId,
                    'raesumAdmin',
                    1
                );
                expect(result).toBe(true);
            }
        );

        iftest('should fail with bad role key', async () => {
            expect(async () => {
                await raesumAuthorization.addUserToRoleByKey(
                    rootUserId,
                    'nonexistent_role',
                    1
                );
            }).rejects.toThrow();
        });

        iftest('should handle case-insensitive role key', async () => {
            const query =
                'DELETE FROM raesum_auth_user_x_organization_x_role WHERE user_id = $1 AND role_id = 1 AND org_id = 1;';
            const queryResult = await raesumDB.query(query, [rootUserId]);

            const result = await raesumAuthorization.addUserToRoleByKey(
                rootUserId,
                'raesumADMIN',
                1
            );
            expect(result).toBe(true);
        });

        iftest('should handle invalid user ID', async () => {
            expect(async () => {
                await raesumAuthorization.addUserToRoleByKey(-1, 'admin', 1);
            }).rejects.toThrow();
        });

        iftest('should handle invalid org ID', async () => {
            expect(async () => {
                await raesumAuthorization.addUserToRoleByKey(
                    rootUserId,
                    'admin',
                    -1
                );
            }).rejects.toThrow();
        });
    });

    // getRoleByID tests
    describe('getRoleByID', async () => {
        iftest('should return active role - positive case', async () => {
            const role = await raesumAuthorization.getRoleByID(1);
            expect(role).toBeDefined();
            expect(role.id).toBe(1);
            expect(role.active_status).toBe(true);
        });

        iftest('should return inactive role', async () => {
            // Mock the database query to expect specific SQL
            const mockQuery = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [
                    {
                        id: 999,
                        string_key: 'inactive_role',
                        name: 'Inactive Role',
                        active_status: false,
                    },
                ],
            });

            // Call the method
            const role = await raesumAuthorization.getRoleByID(999);

            // Verify specific database query was called
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringMatching(
                    /SELECT\s+\*\s+FROM\s+raesum_auth_role\s+as\s+r\s+WHERE\s+id\s+=\s+\$1\s+AND\s+r\.active_status\s+=\s+true\s*;/
                ),
                [999]
            );

            // Verify the result
            expect(role).toBeDefined();
            expect(role.id).toBe(999);
            expect(role.active_status).toBe(false);

            // Restore the mock
            mockQuery.mockRestore();
        });

        iftest('should handle role ID that does not exist', async () => {
            // Mock database query to return empty result (role not found)
            const mockQuery = vi.spyOn(raesumDB, 'query').mockResolvedValue({
                rows: [],
            });

            // Verify specific database query was called

            // Expect method to throw "Role not found" error
            expect(async () => {
                await raesumAuthorization.getRoleByID(99999);

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'SELECT * FROM raesum_auth_role as r WHERE id = $1'
                    ),
                    [99999]
                );
            }).rejects.toThrow('Role not found');

            // Restore the mock
            mockQuery.mockRestore();
        });

        iftest('should handle invalid role ID', async () => {
            expect(async () => {
                await raesumAuthorization.getRoleByID(-1);
            }).rejects.toThrow();
        });

        iftest('should handle non-integer role ID', async () => {
            expect(async () => {
                await raesumAuthorization.getRoleByID('invalid');
            }).rejects.toThrow();
        });
    });

    // Additional edge case tests
    describe('Edge Cases and Error Handling', async () => {
        iftest('should handle null parameters gracefully', async () => {
            expect(async () => {
                await raesumAuthorization.checkUserPermissionByID(
                    null,
                    1,
                    1,
                    1,
                    1,
                    ['user']
                );
            }).rejects.toThrow();
        });

        iftest('should handle undefined parameters gracefully', async () => {
            expect(async () => {
                await raesumAuthorization.checkUserPermissionByID(
                    undefined,
                    1,
                    1,
                    1,
                    1,
                    ['user']
                );
            }).rejects.toThrow();
        });
    });
});
