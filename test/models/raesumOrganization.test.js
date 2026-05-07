import raesumOrganization from "../../src/models/raesumOrganization.js";
import config from 'config';
import raesumDB from "../../src/modules/raesumDB.js";
import raesumCognito from "../../src/modules/raesumCognito.js";

import {vi, test, expect, describe, beforeEach, afterEach, beforeAll} from 'vitest';


async function cleanupUsers(id) {

    id = id.toString();

    await raesumDB.query("DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-" + id + "%';");
    await raesumDB.query("DELETE FROM raesum_user WHERE username LIKE 'test-" + id + "%';");
    await raesumDB.query("DELETE FROM raesum_organization WHERE name LIKE 'test-'");

}

describe("Raesum Organization System", () => {
    const dbTestsEnabled = config.get("developmentAndTesting.integrationTestEnabled.primaryDatabase");
    console.log("DB Tests Enabled: " + dbTestsEnabled);

    const iftest = (dbTestsEnabled) ? test : test.skip;

    beforeAll(async () => {
        // Clean up any existing test data
        await raesumDB.query("DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-%'; DELETE FROM raesum_user WHERE username LIKE 'test-%'; DELETE FROM raesum_organization WHERE name LIKE 'test-%'");
    });

    // afterEach(async () => {
    //     // Clean up test data after each test
    //     await raesumDB.query("DELETE FROM raesum_organization_x_user OxU USING raesum_user U WHERE OxU.user_id = U.id AND U.username LIKE 'test-%'; DELETE FROM raesum_user WHERE username LIKE 'test-%'; DELETE FROM raesum_organization WHERE name LIKE 'test-%'");
    // });

    describe('create', () => {
        iftest('should create new organization with valid data', async () => {
            const result = await raesumOrganization.create("Test Organization", true);
            expect(result).toBeGreaterThan(0);
            
            // Verify the organization was created correctly
            const org = await raesumOrganization.getById(result);
            expect(org).toBeDefined();
            expect(org.name).toBe('Test Organization');
            expect(org.active_status).toBe(true);
        });

        iftest('should create inactive organization', async () => {
            const result = await raesumOrganization.create("Inactive Test Org", false);
            expect(result).toBeGreaterThan(0);
            
            const org = await raesumOrganization.getById(result);
            expect(org.active_status).toBe(false);
        });

        iftest('should throw error for non-string name', async () => {
            expect(async () => {
                await raesumOrganization.create(123, true);
            }).rejects.toThrow("Organization name must be a string");
        });

        iftest('should handle database errors during creation', async () => {
            // Mock database to throw error
            const originalQuery = raesumDB.query;
            raesumDB.query = vi.fn().mockRejectedValue(new Error('Database connection failed'));
            
            expect(async () => {
                await raesumOrganization.create("Test Org", true);
            }).rejects.toThrow("Error creating organization");
            
            // Restore original function
            raesumDB.query = originalQuery;
        });
    });

    describe('getById', () => {
        iftest('should return organization for valid ID', async () => {
            // First create a test organization
            const orgId = await raesumOrganization.create("Get Test Org", true);
            
            const result = await raesumOrganization.getById(orgId);
            expect(result).toBeDefined();
            expect(result.id).toBe(orgId);
            expect(result.name).toBe("Get Test Org");
            expect(result.active_status).toBe(true);
        });

        iftest('should throw error for non-existent ID', async () => {
            expect(async () => {
                await raesumOrganization.getById(99999);
            }).rejects.toThrow("Organization not found");
        });

        iftest('should throw error for invalid ID types', async () => {
            expect(async () => {
                await raesumOrganization.getById("invalid");
            }).rejects.toThrow("Organization ID must be a number");
            
            expect(async () => {
                await raesumOrganization.getById(-1);
            }).rejects.toThrow("Organization ID must be greater than 0");
        });
    });

    describe('setActivationStatus', () => {
        iftest('should activate organization', async () => {
            // Create test organization
            const orgId = await raesumOrganization.create("Activation Test Org", true);
            
            const result = await raesumOrganization.setActivationStatus(orgId, true);
            expect(result).toBe(true);
            
            // Verify the status was updated
            const org = await raesumOrganization.getById(orgId);
            expect(org.active_status).toBe(true);
        });

        iftest('should deactivate organization', async () => {
            // Create test organization
            const orgId = await raesumOrganization.create("Deactivation Test Org", true);
            
            const result = await raesumOrganization.setActivationStatus(orgId, false);
            expect(result).toBe(false);
            
            // Verify the status was updated
            const org = await raesumOrganization.getById(orgId);
            expect(org.active_status).toBe(false);
        });

        iftest('should handle boolean conversion for activeStatus', async () => {
            const orgId = await raesumOrganization.create("Boolean Test Org", true);
            
            // Test with string "false" - should be converted to false
            const result = await raesumOrganization.setActivationStatus(orgId, "false");
            expect(result).toBe(false);
            
            const org = await raesumOrganization.getById(orgId);
            expect(org.active_status).toBe(false);
        });

        iftest('should throw error for invalid ID', async () => {
            expect(async () => {
                await raesumOrganization.setActivationStatus(-1, true);
            }).rejects.toThrow("orgID must be a positive integer");
        });


        iftest('should throw error for an organization that does not exist', async () => {
            expect(async () => {
                await raesumOrganization.setActivationStatus(568711113, true);
            }).rejects.toThrow("Organization not found");
        });

    });

    describe('addUserToOrganization', () => {

        
 
        iftest('should add user to organization successfully', async () => {
            await cleanupUsers(45);

            // Create test organization and user
            const orgId = await raesumOrganization.create("User Add Test Org", true);
            const userId = await raesumDB.query(
                "INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id",
                ["test-45user", true, 1, "test-external-id45"]
            ).then(result => parseInt(result.rows[0].id));

            // Manually add user to user_x_org for org 1
            await raesumDB.query(
                "INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)",
                [userId, 1]
            )
            
            const result = await raesumOrganization.addUserToOrganization(userId, orgId);
            expect(result).toBe(true);
            
            // Verify the user was added to organization
            const membership = await raesumDB.query(
                "SELECT * FROM raesum_organization_x_user WHERE user_id = $1 AND org_id = $2",
                [userId, orgId]
            );
            expect(membership.rows.length).toBe(1);
            expect(parseInt(membership.rows[0].user_id)).toBe(userId);
            expect(parseInt(membership.rows[0].org_id)).toBe(orgId);

            await cleanupUsers(45);
        });

        iftest('should return true if user already exists in organization', async () => {
            await cleanupUsers(2);

            // Create test organization and user
            const orgId = await raesumOrganization.create("Duplicate User Test Org", true);
            const userId = await raesumDB.query(
                "INSERT INTO raesum_user (username, active_status, current_organization_id, external_id) VALUES ($1, $2, $3, $4) RETURNING id",
                ["test-2user", true, orgId, "test-external-id2"]
            ).then(result => parseInt(result.rows[0].id));
            
            // Manually add user to user_x_org for org 1
            await raesumDB.query(
                "INSERT INTO raesum_organization_x_user (user_id, org_id) VALUES ($1, $2)",
                [userId, orgId]
            )

            // Try to add again - should return false
            const result = await raesumOrganization.addUserToOrganization(userId, orgId);
            expect(result).toBe(true);

            await cleanupUsers(2);
        });

        iftest('should throw error for invalid user ID', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(-1, 1);
            }).rejects.toThrow("userID and orgID must be positive integers");
        });

        iftest('should throw error for invalid org ID', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(1, -1);
            }).rejects.toThrow("userID and orgID must be positive integers");
        });

        iftest('should throw error if user not found', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(99999, 1);
            }).rejects.toThrow("User not found");
        });

        iftest('should throw error if org not found or inactive', async () => {
            expect(async () => {
                await raesumOrganization.addUserToOrganization(1, 99999);
            }).rejects.toThrow("Org not found or does not exist");
        });

    });

    describe('User Management During Deactivation', () => {


        iftest('should deactivate users if they have no other organizations', async () => {
            await cleanupUsers(33);

            // Create test organization and user
            const orgId = await raesumOrganization.create("test-33 User Deactivate Test Org", true);
            const userId = await raesumDB.query(
                "INSERT INTO raesum_user (username, active_status, external_id, current_organization_id) VALUES ($1, $2, $3, $4) RETURNING id",
                ["test-33deactivate-user", true, "test-external-id", orgId]
            ).then(result => parseInt(result.rows[0].id));
            
            
            // Add user to organization manually
            await raesumDB.query(
                "INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)",
                [orgId, userId]
            );

            // Mock raesumCognito.setUserEnabledStatus to track calls
            const cognitoMock = vi.spyOn(raesumCognito, "setUserEnabledStatus").mockResolvedValue(undefined);

            // Deactivate the organization - user should be deactivated
            const result = await raesumOrganization.setActivationStatus(orgId, false);
            expect(result).toBe(false);
            
            // Verify user was deactivated
            const user = await raesumDB.query(
                "SELECT active_status FROM raesum_user WHERE id = $1",
                [userId]
            );
            expect(user.rows[0].active_status).toBe(false);

            // Verify raesumCognito.setUserEnabledStatus was called with correct parameters
            expect(cognitoMock).toHaveBeenCalledWith("test-33deactivate-user", false);

            await cleanupUsers(33);
        });

        iftest('should move users to other organizations when deactivating', async () => {
            await cleanupUsers(12);
            await cleanupUsers(13);

            // Create test organizations and users
            const org1Id = await raesumOrganization.create("test-12 User Move Test Org 1", true);
            const org2Id = await raesumOrganization.create("test-13 User Move Test Org 2", true);
            
            const userId1 = await raesumDB.query(
                "INSERT INTO raesum_user (username, active_status, external_id, current_organization_id) VALUES ($1, $2, $3, $4) RETURNING id",
                ["test-12move-user1", true, "test-12external-id1", org1Id]
            ).then(result => parseInt(result.rows[0].id));
            
            const userId2 = await raesumDB.query(
                "INSERT INTO raesum_user (username, active_status, external_id, current_organization_id) VALUES ($1, $2, $3, $4) RETURNING id",
                ["test-13move-user2", true, "test-13external-id2", org1Id]
            ).then(result => parseInt(result.rows[0].id));

            // Add users to first organization manually
            await raesumDB.query(
                "INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)",
                [org1Id, userId1]
            );
            await raesumDB.query(
                "INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)",
                [org1Id, userId2]
            );

            // Add second user to second organization manually
            await raesumDB.query(
                "INSERT INTO raesum_organization_x_user (org_id, user_id) VALUES ($1, $2)",
                [org2Id, userId2]
            );

            // Mock raesumCognito.setUserEnabledStatus to track calls
            const cognitoMock = vi.spyOn(raesumCognito, "setUserEnabledStatus").mockResolvedValue(undefined);

            // Deactivate first organization - should move users to second org
            const result = await raesumOrganization.setActivationStatus(org1Id, false);
            expect(result).toBe(false);
            
            // Verify users were moved
            const user1Orgs = await raesumDB.query(
                "SELECT current_organization_id, active_status FROM raesum_user WHERE id = $1",
                [userId1]
            );
            const user2Orgs = await raesumDB.query(
                "SELECT current_organization_id, active_status FROM raesum_user WHERE id = $1",
                [userId2]
            );

            console.log(userId1, userId2, user1Orgs.rows, user1Orgs.rows)
            expect(parseInt(user1Orgs.rows[0].active_status)).toBeFalsy();
            expect(parseInt(user2Orgs.rows[0].current_organization_id)).toBe(org2Id);

            await cleanupUsers(12);
            await cleanupUsers(13);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        iftest('should handle database connection errors', async () => {
            // Mock database to throw error
            const originalQuery = raesumDB.query;
            raesumDB.query = vi.fn().mockRejectedValue(new Error('Database connection failed'));
            
            expect(async () => {
                await raesumOrganization.getById(1);
            }).rejects.toThrow();
            
            // Restore original function
            raesumDB.query = originalQuery;
        });

        iftest('should handle null parameters gracefully', async () => {
            expect(async () => {
                await raesumOrganization.getById(null);
            }).rejects.toThrow("Organization ID must be a number");
        });

        iftest('should handle undefined parameters gracefully', async () => {
            expect(async () => {
                await raesumOrganization.getById(undefined);
            }).rejects.toThrow("Organization ID must be a number");
        });

        iftest('should handle concurrent operations safely', async () => {
            // Create test organization
            const orgId = await raesumOrganization.create("Concurrent Test Org", true);
            
            // Try multiple concurrent operations
            const promises = [
                raesumOrganization.setActivationStatus(orgId, true),
                raesumOrganization.setActivationStatus(orgId, false),
                raesumOrganization.getById(orgId)
            ];
            
            // All operations should complete without errors
            const results = await Promise.all(promises);
            results.forEach(result => {
                expect(result).toBeDefined();
            });
        });
    });
});
