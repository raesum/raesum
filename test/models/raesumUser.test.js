import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumUser from "../../src/models/raesumUser.js";
import raesumDB from "../../src/modules/raesumDB.js";
import raesumOrganization from "../../src/models/raesumOrganization.js";
import raesumConfig from "../../src/modules/raesumConfig.js";
import raesumCache from "../../src/modules/raesumCache.js";
import raesumCognito from "../../src/modules/raesumCognito.js";
import raesumAuthorization from "../../src/models/raesumAuthorization.js";

describe("Raesum User Model", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createUser", () => {
        test('should create a user with valid parameters', async () => {
            const external_id = "ext123";
            const username = "testuser";
            const orgId = 1;
            const activeStatus = true;

            // Mock organization validation
            const orgMock = vi.spyOn(raesumOrganization, "getById").mockResolvedValue({ id: orgId, name: "Test Org" });
            
            // Mock username uniqueness check
            const usernameMock = vi.spyOn(raesumUser, "getUserByUsername").mockRejectedValue(new Error("User not found"));
            
            // Mock external_id uniqueness check
            const externalIdMock = vi.spyOn(raesumUser, "getUserByExternalID").mockRejectedValue(new Error("User not found"));
            
            // Mock database insert
            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValueOnce({
                rows: [{ id: 123 }]
            });
            
            // Mock organization add user
            const addUserMock = vi.spyOn(raesumOrganization, "addUserToOrganization").mockResolvedValue(true);

            const result = await raesumUser.createUser(external_id, username, orgId, activeStatus);

            expect(result).toBe(123);
            expect(orgMock).toHaveBeenCalledWith(orgId);
            expect(usernameMock).toHaveBeenCalledWith(username);
            expect(externalIdMock).toHaveBeenCalledWith(external_id);
            expect(dbMock).toHaveBeenCalledWith(
                "INSERT INTO raesum_user (external_id, username, current_organization_id, active_status) VALUES ($1, $2, $3, $4) RETURNING id",
                [external_id, username, orgId, activeStatus]
            );
            expect(addUserMock).toHaveBeenCalledWith(123, orgId);
        });

        test('should default activeStatus to true when not provided', async () => {
            const external_id = "ext123";
            const username = "testuser";
            const orgId = 1;

            const orgMock = vi.spyOn(raesumOrganization, "getById").mockResolvedValue({ id: orgId });
            const usernameMock = vi.spyOn(raesumUser, "getUserByUsername").mockRejectedValue(new Error("User not found"));
            const externalIdMock = vi.spyOn(raesumUser, "getUserByExternalID").mockRejectedValue(new Error("User not found"));
            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({ rows: [{ id: 123 }] });
            const addUserMock = vi.spyOn(raesumOrganization, "addUserToOrganization").mockResolvedValue(true);

            const result = await raesumUser.createUser(external_id, username, orgId);

            expect(result).toBe(123);
            expect(dbMock).toHaveBeenCalledWith(
                "INSERT INTO raesum_user (external_id, username, current_organization_id, active_status) VALUES ($1, $2, $3, $4) RETURNING id",
                [external_id, username, orgId, true]
            );
        });

        test('should throw error for invalid external_id', async () => {
            await expect(raesumUser.createUser("", "testuser", 1)).rejects.toThrow("External ID must be a non-empty string");
            await expect(raesumUser.createUser(null, "testuser", 1)).rejects.toThrow("External ID must be a non-empty string");
            await expect(raesumUser.createUser(123, "testuser", 1)).rejects.toThrow("External ID must be a non-empty string");
        });

        test('should throw error for invalid username', async () => {
            await expect(raesumUser.createUser("ext123", "", 1)).rejects.toThrow("Username must be a non-empty string");
            await expect(raesumUser.createUser("ext123", null, 1)).rejects.toThrow("Username must be a non-empty string");
            await expect(raesumUser.createUser("ext123", 123, 1)).rejects.toThrow("Username must be a non-empty string");
        });

        test('should throw error for invalid organization ID', async () => {
            await expect(raesumUser.createUser("ext123", "testuser", 0)).rejects.toThrow("Organization ID must be a positive integer");
            await expect(raesumUser.createUser("ext123", "testuser", -1)).rejects.toThrow("Organization ID must be a positive integer");
            await expect(raesumUser.createUser("ext123", "testuser", 1.5)).rejects.toThrow("Organization ID must be a positive integer");
            await expect(raesumUser.createUser("ext123", "testuser", "abc")).rejects.toThrow("Organization ID must be a positive integer");
        });

        test('should throw error when organization does not exist', async () => {
            vi.spyOn(raesumOrganization, "getById").mockResolvedValue(null);

            await expect(raesumUser.createUser("ext123", "testuser", 1)).rejects.toThrow("Organization does not exist");
        });

        test('should throw error when username is not unique', async () => {
            vi.spyOn(raesumOrganization, "getById").mockResolvedValue({ id: 1 });
            vi.spyOn(raesumUser, "getUserByUsername").mockResolvedValue({ id: 123 });

            await expect(raesumUser.createUser("ext123", "testuser", 1)).rejects.toThrow("Username is not unique");
        });

        test('should throw error when external_id is not unique', async () => {
            vi.spyOn(raesumOrganization, "getById").mockResolvedValue({ id: 1 });
            vi.spyOn(raesumUser, "getUserByUsername").mockRejectedValue(new Error("User not found"));
            vi.spyOn(raesumUser, "getUserByExternalID").mockResolvedValue({ id: 456 });

            await expect(raesumUser.createUser("ext123", "testuser", 1)).rejects.toThrow("ExternalID is not unique");
        });
    });

    describe("getUserById", () => {
        test('should get user by valid ID', async () => {
            const userId = 123;
            const mockUser = { id: userId, username: "testuser" };

            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({
                rows: [mockUser]
            });

            const result = await raesumUser.getUserById(userId);

            expect(result).toBe(mockUser);
            expect(dbMock).toHaveBeenCalledWith("SELECT * FROM raesum_user WHERE id = $1", [userId]);
        });

        test('should throw error for invalid ID', async () => {
            await expect(raesumUser.getUserById(0)).rejects.toThrow("User ID must be a positive integer");
            await expect(raesumUser.getUserById(-1)).rejects.toThrow("User ID must be a positive integer");
            await expect(raesumUser.getUserById("abc")).rejects.toThrow("User ID must be a positive integer");
        });

        test('should throw error when user not found', async () => {
            vi.spyOn(raesumDB, "query").mockResolvedValue({ rows: [] });

            await expect(raesumUser.getUserById(123)).rejects.toThrow("User not found");
        });

        test('should throw error when database query fails', async () => {
            vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("DB Error"));

            await expect(raesumUser.getUserById(123)).rejects.toThrow("Error getting user by ID");
        });
    });

    describe("getUserByUsername", () => {
        test('should get user by valid username', async () => {
            const username = "testuser";
            const userId = 123;
            const mockUser = { id: userId, username: username };

            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValueOnce({
                rows: [{ id: userId }]
            });

            const getUserByIdMock = vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);

            const result = await raesumUser.getUserByUsername(username);

            expect(result).toBe(mockUser);
            expect(dbMock).toHaveBeenCalledWith("SELECT id FROM raesum_user WHERE username = $1", [username]);
            expect(getUserByIdMock).toHaveBeenCalledWith(userId);
        });

        test('should throw error for invalid username', async () => {
            await expect(raesumUser.getUserByUsername("")).rejects.toThrow("Username must be a non-empty string");
            await expect(raesumUser.getUserByUsername(null)).rejects.toThrow("Username must be a non-empty string");
            await expect(raesumUser.getUserByUsername(123)).rejects.toThrow("Username must be a non-empty string");
        });

        test('should throw error when user not found', async () => {
            vi.spyOn(raesumDB, "query").mockResolvedValue({ rows: [] });

            await expect(raesumUser.getUserByUsername("nonexistent")).rejects.toThrow("User not found");
        });
    });

    describe("getUserByExternalID", () => {
        test('should get user by valid external ID', async () => {
            const externalId = "ext123";
            const userId = 123;
            const mockUser = { id: userId, external_id: externalId };

            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValueOnce({
                rows: [{ id: userId }]
            });

            const getUserByIdMock = vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);

            const result = await raesumUser.getUserByExternalID(externalId);

            expect(result).toBe(mockUser);
            expect(dbMock).toHaveBeenCalledWith("SELECT id FROM raesum_user WHERE external_id = $1", [externalId]);
            expect(getUserByIdMock).toHaveBeenCalledWith(userId);
        });

        test('should throw error for invalid external ID', async () => {
            await expect(raesumUser.getUserByExternalID("")).rejects.toThrow("external_id must be a non-empty string");
            await expect(raesumUser.getUserByExternalID(null)).rejects.toThrow("external_id must be a non-empty string");
            await expect(raesumUser.getUserByExternalID(123)).rejects.toThrow("external_id must be a non-empty string");
        });

        test('should throw error when user not found', async () => {
            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({ rows: [] });

            await expect(raesumUser.getUserByExternalID("nonexistent")).rejects.toThrow("Error getting user by external_id");
        });
    });

    describe("setActivationStatus", () => {
        test('should set activation status for valid user', async () => {
            const userId = 123;
            const activeStatus = true;
            const mockUser = { id: userId, active_status: false, username: "testuser" };

            const getUserMock = vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});
            const cognitoMock = vi.spyOn(raesumCognito, "setUserEnabledStatus").mockResolvedValue(true);

            const result = await raesumUser.setActivationStatus(userId, activeStatus);

            expect(result).toBe(true);
            expect(getUserMock).toHaveBeenCalledWith(userId);
            expect(dbMock).toHaveBeenCalledWith(
                "UPDATE raesum_user SET active_status = $1 WHERE id = $2",
                [activeStatus, userId]
            );
            expect(cognitoMock).toHaveBeenCalledWith("testuser", activeStatus);
        });

        test('should set activation status for valid user with Cognito integration', async () => {
            const userId = 123;
            const activeStatus = true;
            const mockUser = { id: userId, active_status: false, username: "testuser" };

            const getUserMock = vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});
            const cognitoMock = vi.spyOn(raesumCognito, "setUserEnabledStatus").mockResolvedValue(true);

            const result = await raesumUser.setActivationStatus(userId, activeStatus);

            expect(result).toBe(true);
            expect(getUserMock).toHaveBeenCalledWith(userId);
            expect(dbMock).toHaveBeenCalledWith(
                "UPDATE raesum_user SET active_status = $1 WHERE id = $2",
                [activeStatus, userId]
            );
            expect(cognitoMock).toHaveBeenCalledWith("testuser", activeStatus);
        });

        test('should set activation status to false with Cognito integration', async () => {
            const userId = 123;
            const activeStatus = false;
            const mockUser = { id: userId, active_status: true, username: "testuser" };

            const getUserMock = vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});
            const cognitoMock = vi.spyOn(raesumCognito, "setUserEnabledStatus").mockResolvedValue(true);

            const result = await raesumUser.setActivationStatus(userId, activeStatus);

            expect(result).toBe(true);
            expect(getUserMock).toHaveBeenCalledWith(userId);
            expect(dbMock).toHaveBeenCalledWith(
                "UPDATE raesum_user SET active_status = $1 WHERE id = $2",
                [activeStatus, userId]
            );
            expect(cognitoMock).toHaveBeenCalledWith("testuser", activeStatus);
        });

        test('should rollback database change when Cognito update fails', async () => {
            const userId = 123;
            const activeStatus = true;
            const mockUser = { id: userId, active_status: false, username: "testuser" };

            const getUserMock = vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
            const dbMock = vi.spyOn(raesumDB, "query")
                .mockResolvedValueOnce({}) // First call: update user
                .mockResolvedValueOnce({}); // Second call: rollback
            const cognitoMock = vi.spyOn(raesumCognito, "setUserEnabledStatus").mockRejectedValue(new Error("Cognito error"));

            await expect(raesumUser.setActivationStatus(userId, activeStatus)).rejects.toThrow("Failed to update user status in Cognito: Cognito error");

            expect(getUserMock).toHaveBeenCalledWith(userId);
            expect(dbMock).toHaveBeenCalledTimes(2);
            expect(cognitoMock).toHaveBeenCalledWith("testuser", activeStatus);
        });

        test('should handle rollback failure when Cognito update fails', async () => {
            const userId = 123;
            const activeStatus = true;
            const mockUser = { id: userId, active_status: false, username: "testuser" };

            const getUserMock = vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
            const dbMock = vi.spyOn(raesumDB, "query")
                .mockResolvedValueOnce({}) // First call: update user
                .mockRejectedValueOnce(new Error("Rollback error")); // Second call: rollback fails
            const cognitoMock = vi.spyOn(raesumCognito, "setUserEnabledStatus").mockRejectedValue(new Error("Cognito error"));

            await expect(raesumUser.setActivationStatus(userId, activeStatus)).rejects.toThrow("Failed to update user status in Cognito: Cognito error");

            expect(getUserMock).toHaveBeenCalledWith(userId);
            expect(dbMock).toHaveBeenCalledTimes(2);
            expect(cognitoMock).toHaveBeenCalledWith("testuser", activeStatus);
        });

        test('should throw error for invalid activeStatus', async () => {
            await expect(raesumUser.setActivationStatus(123, "true")).rejects.toThrow("Activation status must be a boolean");
            await expect(raesumUser.setActivationStatus(123, 1)).rejects.toThrow("Activation status must be a boolean");
            await expect(raesumUser.setActivationStatus(123, null)).rejects.toThrow("Activation status must be a boolean");
        });

        test('should throw error for invalid user ID', async () => {
            await expect(raesumUser.setActivationStatus(0, true)).rejects.toThrow("User ID must be a positive integer");
            await expect(raesumUser.setActivationStatus(-1, true)).rejects.toThrow("User ID must be a positive integer");
        });

        test('should throw error when user not found', async () => {
            vi.spyOn(raesumUser, "getUserById").mockRejectedValue(new Error("User not found"));

            await expect(raesumUser.setActivationStatus(123, true)).rejects.toThrow("User not found");
        });

        test('should throw error when database update fails', async () => {
            vi.spyOn(raesumUser, "getUserById").mockResolvedValue({ id: 123 });
            vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("DB Error"));

            await expect(raesumUser.setActivationStatus(123, true)).rejects.toThrow("Error updating user");
        });
    });

    describe("getAllowedUserOrgs", () => {
        test('should get allowed organizations for valid user', async () => {
            const userId = 123;
            const mockOrgs = [
                { organization_id: 1 },
                { organization_id: 2 }
            ];

            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({
                rows: mockOrgs
            });

            const result = await raesumUser.getAllowedUserOrgs(userId);

            expect(result).toEqual([1, 2]);
            expect(dbMock).toHaveBeenCalledWith(
                expect.stringContaining("SELECT org_id"),
                [userId]
            );
        });

        test('should throw error for invalid user ID', async () => {
            await expect(raesumUser.getAllowedUserOrgs(0)).rejects.toThrow("User ID must be a positive integer");
            await expect(raesumUser.getAllowedUserOrgs(-1)).rejects.toThrow("User ID must be a positive integer");
        });

        test('should throw error when database query fails', async () => {
            vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("DB Error"));

            await expect(raesumUser.getAllowedUserOrgs(123)).rejects.toThrow("Error getting allowed organizations");
        });
    });

    describe("changeUserOrg", () => {
        test('should change user organization successfully', async () => {
            const userId = 123;
            const orgId = 2;
            const allowedOrgs = [1, 2];

            const getAllowedMock = vi.spyOn(raesumUser, "getAllowedUserOrgs").mockResolvedValue(allowedOrgs);
            const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

            const result = await raesumUser.changeUserOrg(userId, orgId);

            expect(result).toBe(true);
            expect(getAllowedMock).toHaveBeenCalledWith(userId);
            expect(dbMock).toHaveBeenCalledWith(
                "UPDATE raesum_user SET current_organization_id = $1 WHERE id = $2",
                [orgId, userId]
            );
        });

        test('should throw error for invalid user ID', async () => {
            await expect(raesumUser.changeUserOrg(0, 1)).rejects.toThrow("User ID must be a positive integer");
            await expect(raesumUser.changeUserOrg(-1, 1)).rejects.toThrow("User ID must be a positive integer");
        });

        test('should throw error for invalid organization ID', async () => {
            await expect(raesumUser.changeUserOrg(123, 0)).rejects.toThrow("Organization ID must be a positive integer");
            await expect(raesumUser.changeUserOrg(123, -1)).rejects.toThrow("Organization ID must be a positive integer");
        });

        test('should throw error when user not allowed to switch to organization', async () => {
            vi.spyOn(raesumUser, "getAllowedUserOrgs").mockResolvedValue([1, 3]);

            await expect(raesumUser.changeUserOrg(123, 2)).rejects.toThrow("User not allowed to switch to organization");
        });

        test('should throw error when database update fails', async () => {
            vi.spyOn(raesumUser, "getAllowedUserOrgs").mockResolvedValue([1, 2]);
            vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("DB Error"));

            await expect(raesumUser.changeUserOrg(123, 2)).rejects.toThrow("Error updating user");
        });
    });

    describe("Metadata Methods", () => {
        describe("getMetadataKeys", () => {
            test('should get metadata keys from cache', async () => {
                const cacheKey = "raesumUserMetadataKeysfalse";
                const cachedKeys = ["key1", "key2"];

                const cacheMock = vi.spyOn(raesumCache, "get").mockResolvedValue(cachedKeys);

                const result = await raesumUser.getMetadataKeys(false);

                expect(result).toEqual(["key1", "key2"]);
                expect(cacheMock).toHaveBeenCalledWith(cacheKey);
            });

            test('should get metadata keys from database when not cached', async () => {
                const cacheKey = "raesumUserMetadataKeysfalse";
                const dbResponse = {
                    rows: [
                        { datakey: "key1", id: 1 },
                        { datakey: "key2", id: 2 }
                    ]
                };

                vi.spyOn(raesumCache, "get").mockResolvedValue(null);
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue(dbResponse);
                const cacheSetMock = vi.spyOn(raesumCache, "set").mockResolvedValue(true);

                const result = await raesumUser.getMetadataKeys(false);

                expect(result).toEqual(["key1", "key2"]);
                expect(dbMock).toHaveBeenCalledWith("SELECT * FROM raesum_user_metadata_keys WHERE active_status = true");
                expect(cacheSetMock).toHaveBeenCalledWith(cacheKey, { key1: { datakey: "key1", id: 1 }, key2: { datakey: "key2", id: 2 } });
            });
        });

        describe("setUserMetadataKey", () => {
            test('should create new metadata key', async () => {
                const key = "newkey";
                const description = "Test key";

                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["existingkey"]);
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.setUserMetadataKey(key, description);

                expect(result).toBe(true);
                expect(dbMock).toHaveBeenCalledWith(
                    "INSERT INTO raesum_user_metadata_keys (datakey, active_status, description, cognito_attribute, cognito_writable) VALUES ($1, true, $2, false, false)",
                    [key, description]
                );
            });

            test('should update existing metadata key', async () => {
                const key = "existingkey";
                const description = "Updated key";

                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["existingkey"]);
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.setUserMetadataKey(key, description, true, true, true);

                expect(result).toBe(true);
                expect(dbMock).toHaveBeenCalledWith(
                    "UPDATE raesum_user_metadata_keys SET active_status = $2, description = $3, cognito_attribute = $4, cognito_writable = $5 WHERE datakey = $1",
                    [key, true, description, true, true]
                );
            });

            test('should throw error for invalid key characters', async () => {
                await expect(raesumUser.setUserMetadataKey("invalid key")).rejects.toThrow("Key contains invalid characters");
                await expect(raesumUser.setUserMetadataKey("invalid@key")).rejects.toThrow("Key contains invalid characters");
            });

            test('should throw error when database operation fails', async () => {
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["existingkey"]);
                vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("DB Error"));

                await expect(raesumUser.setUserMetadataKey("existingkey")).rejects.toThrow("Error creating user metadata key");
            });
        });

        describe("deleteUserMetadataKey", () => {
            test('should delete unused metadata key', async () => {
                const key = "unusedkey";

                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["unusedkey"]);
                const dbMock = vi.spyOn(raesumDB, "query")
                    .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // First call: count query
                    .mockResolvedValueOnce({}); // Second call: delete query

                const result = await raesumUser.deleteUserMetadataKey(key);

                expect(result).toBe(true);
                expect(dbMock).toHaveBeenCalledTimes(2);
            });

            test('should return false for metadata key in use', async () => {
                const key = "usedkey";

                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["usedkey"]);
                vi.spyOn(raesumDB, "query").mockResolvedValue({ rows: [{ count: 5 }] });

                const result = await raesumUser.deleteUserMetadataKey(key);

                expect(result).toBe(false);
            });

            test('should throw error when key does not exist', async () => {
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["otherkey"]);

                await expect(raesumUser.deleteUserMetadataKey("nonexistent")).rejects.toThrow("Key not found");
            });
        });

        describe("getUserMetadataValues", () => {
            test('should get metadata values for valid user', async () => {
                const userId = 123;
                const keys = ["key1", "key2"];
                const mockValues = { key1: "value1", key2: "value2" };

                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(keys);
                vi.spyOn(raesumUser, "getMetadataKeyIndex").mockResolvedValue({ key1: 1, key2: 2 });
                vi.spyOn(raesumDB, "query").mockResolvedValue({
                    rows: [
                        { datakey: "key1", value: "value1" },
                        { datakey: "key2", value: "value2" }
                    ]
                });

                const result = await raesumUser.getUserMetadataValues(userId, keys);

                expect(result).toEqual(mockValues);
            });

            test('should throw error for invalid user ID', async () => {
                await expect(raesumUser.getUserMetadataValues(0, ["key1"])).rejects.toThrow("User ID must be a positive integer");
                await expect(raesumUser.getUserMetadataValues(-1, ["key1"])).rejects.toThrow("User ID must be a positive integer");
            });

            test('should throw error when database query fails', async () => {
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["key1"]);
                vi.spyOn(raesumUser, "getMetadataKeyIndex").mockResolvedValue({ key1: 1 });
                vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("DB Error"));

                await expect(raesumUser.getUserMetadataValues(123, ["key1"])).rejects.toThrow("Error getting user metadata values");
            });
        });

        describe("setUserMetadataValues", () => {
            test('should set metadata values for valid user', async () => {
                const userId = 123;
                const values = { key1: "value1", key2: "value2" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue({ id: userId });
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["key1", "key2"]);
                vi.spyOn(raesumUser, "getMetadataKeyIndex").mockResolvedValue({ key1: 1, key2: 2 });
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                vi.spyOn(raesumUser, "getUserMetadataValues").mockResolvedValue({});
                vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.setUserMetadataValues(userId, values);

                expect(result).toBe(true);
            });

            test('should throw error when user does not exist', async () => {
                vi.spyOn(raesumUser, "getUserById").mockRejectedValue(new Error("User not found"));

                await expect(raesumUser.setUserMetadataValues(123, { key1: "value1" })).rejects.toThrow("User not found");
            });

            test('should filter out invalid value types', async () => {
                const userId = 123;
                const values = { 
                    key1: "valid_string", 
                    key2: 123, 
                    key3: true, 
                    key4: { invalid: "object" },
                    key5: ["invalid", "array"]
                };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue({ id: userId });
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["key1", "key2", "key3"]);
                vi.spyOn(raesumUser, "getMetadataKeyIndex").mockResolvedValue({ key1: 1, key2: 2, key3: 3 });
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                vi.spyOn(raesumUser, "getUserMetadataValues").mockResolvedValue({});
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.setUserMetadataValues(userId, values);

                expect(result).toBe(true);
                // Verify that database was called (indicating some processing happened)
                expect(dbMock).toHaveBeenCalled();
            });
        });
    });

    describe("initRaesum", () => {
        test('should initialize raesum with default user', async () => {
            const orgId = 1;
            const externalId = "default_ext_id";
            const username = "default_user";

            vi.spyOn(raesumConfig, "get").mockImplementation((key) => {
                if (key === "initialization.firstUserUsername") return username;
                if (key === "initialization.firstUserRole") return "admin";
                if (key === "initialization.firstUserEmail") return "admin@test.com";
                return null;
            });

            vi.spyOn(raesumCognito, "createCognitoUser").mockReturnValue(externalId);

            vi.spyOn(raesumAuthorization, "addUserToRoleByKey").mockResolvedValue(true);

            const createUserMock = vi.spyOn(raesumUser, "createUser").mockResolvedValue(123);

            const result = await raesumUser.initRaesum(orgId);

            expect(result).toBe(123);
            expect(createUserMock).toHaveBeenCalledWith(externalId, username, orgId, true);
        });

        test('should default to organization ID 1 when not provided', async () => {
            const configMock = vi.spyOn(raesumConfig, "get").mockImplementation((key) => {
                if (key === "initialization.firstUserUsername") return "default_user";
                if (key === "initialization.firstUserRole") return "admin";
                if (key === "initialization.firstUserEmail") return "admin@test.com";
                return null;
            });

            vi.spyOn(raesumCognito, "createCognitoUser").mockReturnValue("default_ext_id");

            vi.spyOn(raesumAuthorization, "addUserToRoleByKey").mockResolvedValue(true);

            const createUserMock = vi.spyOn(raesumUser, "createUser").mockResolvedValue(123);

            const result = await raesumUser.initRaesum();

            expect(result).toBe(123);
            expect(createUserMock).toHaveBeenCalledWith("default_ext_id", "default_user", 1, true);
        });
    });

    describe("syncUserFromCognitoToRaesum", () => {
        const mockExternalId = '123e4567-e89b-12d3-a456-426614174000';
        const mockUsername = 'testuser';
        const mockUserId = 42;

        test('should throw error if external_id is not a string', async () => {
            await expect(raesumUser.syncUserFromCognitoToRaesum(123)).rejects.toThrow('External ID must be a non-empty string');
            await expect(raesumUser.syncUserFromCognitoToRaesum(null)).rejects.toThrow('External ID must be a non-empty string');
            await expect(raesumUser.syncUserFromCognitoToRaesum('')).rejects.toThrow('External ID must be a non-empty string');
        });

        test('should throw error if user not found in Cognito', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockRejectedValue(new Error('User not found'));

            await expect(raesumUser.syncUserFromCognitoToRaesum(mockExternalId))
                .rejects.toThrow('User not found in AWS Cognito');
        });

        test('should return existing user ID if user already exists in Raesum', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockResolvedValue({
                UserAttributes: [
                    { Name: 'sub', Value: mockExternalId },
                    { Name: 'cognito:username', Value: mockUsername },
                    { Name: 'custom_department', Value: 'Engineering' }
                ]
            });

            vi.spyOn(raesumUser, "getUserByExternalID").mockResolvedValue({
                id: mockUserId,
                external_id: mockExternalId,
                username: mockUsername
            });

            vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(['custom_department']);
            vi.spyOn(raesumUser, "setUserMetadataValues").mockResolvedValue(true);

            const result = await raesumUser.syncUserFromCognitoToRaesum(mockExternalId);

            expect(result).toBe(mockUserId);
            expect(raesumCognito.getCognitoUser).toHaveBeenCalledWith(mockExternalId);
        });

        test('should create new user if not found in Raesum', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockResolvedValue({
                UserAttributes: [
                    { Name: 'sub', Value: mockExternalId },
                    { Name: 'cognito:username', Value: mockUsername }
                ]
            });

            vi.spyOn(raesumUser, "getUserByExternalID").mockRejectedValue(new Error("User not found"));

            vi.spyOn(raesumConfig, "get").mockImplementation((key) => {
                if (key === "newUserDefaults") {
                    return {
                        currentOrganizationId: 1,
                        activeStatus: true
                    };
                }
                return null;
            });

            vi.spyOn(raesumOrganization, "getById").mockResolvedValue({ id: 1, name: "Test Org" });

            const createUserMock = vi.spyOn(raesumUser, "createUser").mockResolvedValue(mockUserId);
            vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue([]);

            const result = await raesumUser.syncUserFromCognitoToRaesum(mockExternalId);

            expect(result).toBe(mockUserId);
            expect(createUserMock).toHaveBeenCalledWith(mockExternalId, mockUsername, 1, true);
        });

        test('should use external_id as username fallback if username not found in Cognito', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockResolvedValue({
                UserAttributes: [
                    { Name: 'sub', Value: mockExternalId }
                ]
            });

            vi.spyOn(raesumUser, "getUserByExternalID").mockRejectedValue(new Error("User not found"));

            vi.spyOn(raesumConfig, "get").mockImplementation((key) => {
                if (key === "newUserDefaults") {
                    return {
                        currentOrganizationId: 1,
                        activeStatus: true
                    };
                }
                return null;
            });

            vi.spyOn(raesumOrganization, "getById").mockResolvedValue({ id: 1 });

            const createUserMock = vi.spyOn(raesumUser, "createUser").mockResolvedValue(mockUserId);
            vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue([]);

            await raesumUser.syncUserFromCognitoToRaesum(mockExternalId);

            expect(createUserMock).toHaveBeenCalledWith(mockExternalId, mockExternalId, 1, true);
        });

        test('should sync metadata from Cognito to Raesum for active keys only', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockResolvedValue({
                UserAttributes: [
                    { Name: 'sub', Value: mockExternalId },
                    { Name: 'cognito:username', Value: mockUsername },
                    { Name: 'custom_department', Value: 'Engineering' },
                    { Name: 'custom_inactive_key', Value: 'should_not_sync' },
                    { Name: 'custom_valid_key', Value: 'should_sync' }
                ]
            });

            vi.spyOn(raesumUser, "getUserByExternalID").mockResolvedValue({
                id: mockUserId,
                external_id: mockExternalId,
                username: mockUsername
            });

            vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue([
                'custom_department',
                'custom_valid_key'
            ]);

            const setMetadataMock = vi.spyOn(raesumUser, "setUserMetadataValues").mockResolvedValue(true);

            const result = await raesumUser.syncUserFromCognitoToRaesum(mockExternalId);

            expect(result).toBe(mockUserId);
            expect(setMetadataMock).toHaveBeenCalledWith(
                mockUserId,
                {
                    custom_department: 'Engineering',
                    custom_valid_key: 'should_sync'
                },
                true
            );
        });

        test('should handle metadata sync failure gracefully', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockResolvedValue({
                UserAttributes: [
                    { Name: 'sub', Value: mockExternalId },
                    { Name: 'cognito:username', Value: mockUsername },
                    { Name: 'custom_key', Value: 'value' }
                ]
            });

            vi.spyOn(raesumUser, "getUserByExternalID").mockResolvedValue({
                id: mockUserId,
                external_id: mockExternalId,
                username: mockUsername
            });

            vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(['custom_key']);
            vi.spyOn(raesumUser, "setUserMetadataValues").mockRejectedValue(new Error('Database error'));

            const result = await raesumUser.syncUserFromCognitoToRaesum(mockExternalId);

            expect(result).toBe(mockUserId);
        });

        test('should throw error if user creation fails', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockResolvedValue({
                UserAttributes: [
                    { Name: 'sub', Value: mockExternalId },
                    { Name: 'cognito:username', Value: mockUsername }
                ]
            });

            vi.spyOn(raesumUser, "getUserByExternalID").mockRejectedValue(new Error("User not found"));

            vi.spyOn(raesumConfig, "get").mockImplementation((key) => {
                if (key === "newUserDefaults") {
                    return {
                        currentOrganizationId: 1,
                        activeStatus: true
                    };
                }
                return null;
            });

            vi.spyOn(raesumOrganization, "getById").mockResolvedValue({ id: 1 });
            vi.spyOn(raesumUser, "createUser").mockRejectedValue(new Error('Database constraint violation'));

            await expect(raesumUser.syncUserFromCognitoToRaesum(mockExternalId))
                .rejects.toThrow('Failed to create user in Raesum');
        });

        test('should skip metadata sync if no matching active keys', async () => {
            vi.spyOn(raesumCognito, "getCognitoUser").mockResolvedValue({
                UserAttributes: [
                    { Name: 'sub', Value: mockExternalId },
                    { Name: 'cognito:username', Value: mockUsername },
                    { Name: 'custom_key_from_cognito', Value: 'value' }
                ]
            });

            vi.spyOn(raesumUser, "getUserByExternalID").mockResolvedValue({
                id: mockUserId,
                external_id: mockExternalId,
                username: mockUsername
            });

            vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(['different_key']);

            const setMetadataMock = vi.spyOn(raesumUser, "setUserMetadataValues");

            const result = await raesumUser.syncUserFromCognitoToRaesum(mockExternalId);

            expect(result).toBe(mockUserId);
            expect(setMetadataMock).not.toHaveBeenCalled();
        });
    });
});
