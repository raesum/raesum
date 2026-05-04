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
                { org_id: 1 },
                { org_id: 2 }
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

                expect(result).toEqual({
                        "key1":  {
                            "datakey": "key1",
                            "id": 1,
                        },
                        "key2":  {
                            "datakey": "key2",
                            "id": 2,
                        },
                        });
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
                    "UPDATE raesum_user_metadata_keys SET active_status = $2, description = $3, cognito_attribute = $4, cognito_writable = $5 WHERE datakey ILIKE $1",
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
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                vi.spyOn(raesumUser, "getUserMetadataValues").mockResolvedValue({});
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.setUserMetadataValues(userId, values);

                expect(result).toBe(true);
                // Verify that database was called (indicating some processing happened)
                expect(dbMock).toHaveBeenCalled();
            });
        });

        describe("deleteUserMetadataValues", () => {
            test('should delete valid metadata values for user', async () => {
                const userId = 123;
                const keys = ["key1", "key2"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["key1", "key2", "key3"]);
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.deleteUserMetadataValues(userId, keys);

                expect(result).toBe(true);
                expect(dbMock).toHaveBeenCalledWith(
                    expect.stringContaining("DELETE FROM raesum_user_x_metadata"),
                    [userId, ["key1", "key2"]]
                );
            });

            test('should filter out invalid keys (non-strings)', async () => {
                const userId = 123;
                const keys = ["key1", 123, null, undefined, "", "key2"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["key1", "key2"]);
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.deleteUserMetadataValues(userId, keys);

                expect(result).toBe(true);
                // Only key1 and key2 should be deleted (strings with length > 0)
                expect(dbMock).toHaveBeenCalledWith(
                    expect.stringContaining("DELETE FROM raesum_user_x_metadata"),
                    [userId, ["key1", "key2"]]
                );
            });

            test('should not delete email key', async () => {
                const userId = 123;
                const keys = ["email", "EMAIL", "Email", "key1"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["email", "key1"]);
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.deleteUserMetadataValues(userId, keys);

                expect(result).toBe(true);
                // Only key1 should be deleted (email is protected)
                expect(dbMock).toHaveBeenCalledWith(
                    expect.stringContaining("DELETE FROM raesum_user_x_metadata"),
                    [userId,["key1"]]
                );
            });

            test('should delete Cognito writable attributes from both DB and Cognito', async () => {
                const userId = 123;
                const keys = ["custom_key"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["custom_key"]);

                // custom_key is a writable Cognito attribute (true means writable)
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({ custom_key: true });
                vi.spyOn(raesumDB, "query").mockResolvedValue({});
                const cognitoDeleteMock = vi.spyOn(raesumCognito, "deleteCognitoUserAttributes").mockResolvedValue(true);

                const result = await raesumUser.deleteUserMetadataValues(userId, keys, false, true);

                expect(result).toBe(true);
                expect(cognitoDeleteMock).toHaveBeenCalledWith("testuser", ["custom_key"]);
            });

            test('should not delete read-only Cognito attributes', async () => {
                const userId = 123;
                const keys = ["read_only_key", "writable_key"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["read_only_key", "writable_key"]);
                // read_only_key is false (read-only), writable_key is true (writable)
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({ read_only_key: false, writable_key: true });
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});
                const cognitoDeleteMock = vi.spyOn(raesumCognito, "deleteCognitoUserAttributes").mockResolvedValue(true);

                const result = await raesumUser.deleteUserMetadataValues(userId, keys, false, true);

                expect(result).toBe(true);
                // Only writable_key should be in the DB delete (read_only_key is filtered out)
                expect(dbMock).toHaveBeenCalledWith(
                    expect.stringContaining("DELETE FROM raesum_user_x_metadata"),
                    [userId, ["writable_key"]]
                );
                // Only writable_key should be deleted from Cognito
                expect(cognitoDeleteMock).toHaveBeenCalledWith("testuser", ["writable_key"]);
            });

            test('should skip Cognito delete when updateCognito is false', async () => {
                const userId = 123;
                const keys = ["custom_key"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["custom_key"]);
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({ custom_key: true });
                vi.spyOn(raesumDB, "query").mockResolvedValue({});
                const cognitoDeleteMock = vi.spyOn(raesumCognito, "deleteCognitoUserAttributes").mockResolvedValue(true);

                const result = await raesumUser.deleteUserMetadataValues(userId, keys, false, false);

                expect(result).toBe(true);
                expect(cognitoDeleteMock).not.toHaveBeenCalled();
            });

            test('should return true when no valid keys to delete', async () => {
                const userId = 123;
                const keys = ["invalid_key"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["other_key"]);
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

                const result = await raesumUser.deleteUserMetadataValues(userId, keys);

                expect(result).toBe(true);
                // No DB delete should happen since no valid keys
                expect(dbMock).not.toHaveBeenCalled();
            });

            test('should throw error for invalid user ID', async () => {
                await expect(raesumUser.deleteUserMetadataValues(0, ["key1"])).rejects.toThrow("User ID must be a positive integer");
                await expect(raesumUser.deleteUserMetadataValues(-1, ["key1"])).rejects.toThrow("User ID must be a positive integer");
                await expect(raesumUser.deleteUserMetadataValues("abc", ["key1"])).rejects.toThrow("User ID must be a positive integer");
            });

            test('should throw error when user does not exist', async () => {
                vi.spyOn(raesumUser, "getUserById").mockRejectedValue(new Error("User not found"));

                await expect(raesumUser.deleteUserMetadataValues(123, ["key1"])).rejects.toThrow("User not found");
            });

            test('should handle Cognito delete failure gracefully', async () => {
                const userId = 123;
                const keys = ["custom_key"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["custom_key"]);
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({ custom_key: true });
                vi.spyOn(raesumDB, "query").mockResolvedValue({});
                // Mock Cognito delete to fail
                vi.spyOn(raesumCognito, "deleteCognitoUserAttributes").mockRejectedValue(new Error("Cognito error"));

                // Should still return true since DB was updated
                const result = await raesumUser.deleteUserMetadataValues(userId, keys, false, true);

                expect(result).toBe(true);
            });

            test('should handle database error', async () => {
                const userId = 123;
                const keys = ["key1"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["key1"]);
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("DB error"));

                await expect(raesumUser.deleteUserMetadataValues(userId, keys)).rejects.toThrow("Error deleting user metadata values");
            });

            test('should handle non-cognito keys correctly', async () => {
                const userId = 123;
                const keys = ["regular_key"];
                const mockUser = { id: userId, username: "testuser" };

                vi.spyOn(raesumUser, "getUserById").mockResolvedValue(mockUser);
                vi.spyOn(raesumUser, "getMetadataKeyList").mockResolvedValue(["regular_key"]);

                // No Cognito keys
                vi.spyOn(raesumUser, "getMetadataCognitoKeyStatus").mockResolvedValue({});
                const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});
                const cognitoDeleteMock = vi.spyOn(raesumCognito, "deleteCognitoUserAttributes").mockResolvedValue(true);

                const result = await raesumUser.deleteUserMetadataValues(userId, keys, false, true);

                expect(result).toBe(true);
                // DB should be called
                expect(dbMock).toHaveBeenCalled();
                // Cognito should not be called since no cognito keys
                expect(cognitoDeleteMock).not.toHaveBeenCalled();
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
                true,
                false
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

    describe('getMetadataKeyList', () => {
        

        test('should return array of all keys when show_inactive is true', async () => {
            const mockKeys = {
                'key1': { datakey: 'key1', active_status: true },
                'key2': { datakey: 'key2', active_status: true },
                'key3': { datakey: 'key3', active_status: false }
            };

            vi.spyOn(raesumUser, "getMetadataKeys").mockResolvedValue(mockKeys);

            const result = await raesumUser.getMetadataKeyList(true);

            expect(result).toEqual(['key1', 'key2', 'key3']);
            expect(raesumUser.getMetadataKeys).toHaveBeenCalledWith(true);
        });

        test('should return empty array when no keys exist', async () => {
            const mockKeys = {};

            vi.spyOn(raesumUser, "getMetadataKeys").mockResolvedValue(mockKeys);

            const result = await raesumUser.getMetadataKeyList();

            expect(result).toEqual([]);
            expect(raesumUser.getMetadataKeys).toHaveBeenCalledWith(false);
        });


        test('should handle database errors gracefully', async () => {
            vi.spyOn(raesumUser, "getMetadataKeys").mockRejectedValue(new Error("Database error"));

            await expect(raesumUser.getMetadataKeyList()).rejects.toThrow("Database error");
            expect(raesumUser.getMetadataKeys).toHaveBeenCalledWith(false);
        });

        test('should return keys in consistent order', async () => {
            const mockKeys = {
                'zebra': { datakey: 'zebra', active_status: true },
                'apple': { datakey: 'apple', active_status: true },
                'banana': { datakey: 'banana', active_status: true }
            };

            vi.spyOn(raesumUser, "getMetadataKeys").mockResolvedValue(mockKeys);

            const result = await raesumUser.getMetadataKeyList();

            // Should return keys in the order they appear in the object
            expect(result).toEqual(['zebra', 'apple', 'banana']);
        });

        describe('cache scenarios', () => {
            test('should return cached keys when cache exists', async () => {
                const mockCachedKeys = {"cached_key1":{"id":1,"datakey":"cached_key1"},"cached_key2":{"id":2,"datakey":"cached_key2"}};
                
                vi.spyOn(raesumCache, "get").mockResolvedValue(mockCachedKeys);
                const getMetadataKeysSpy = vi.spyOn(raesumUser, "getMetadataKeys");

                const result = await raesumUser.getMetadataKeyList();

                expect(result).toEqual(['cached_key1', 'cached_key2']);
                expect(raesumCache.get).toHaveBeenCalledWith("raesumUserMetadataKeysfalse");
                expect(getMetadataKeysSpy).not.toHaveBeenCalled();
            });

            test('should fetch from database when cache is empty', async () => {
                const mockKeys = {
                    'key1': { datakey: 'key1', active_status: true },
                    'key2': { datakey: 'key2', active_status: true }
                };

                vi.spyOn(raesumCache, "get").mockResolvedValue([]);
                vi.spyOn(raesumUser, "getMetadataKeys").mockResolvedValue(mockKeys);

                const result = await raesumUser.getMetadataKeyList();

                expect(result).toEqual(['key1', 'key2']);
                expect(raesumCache.get).toHaveBeenCalledWith("raesumUserMetadataKeysfalse");
                expect(raesumUser.getMetadataKeys).toHaveBeenCalledWith(false);
            });

            test('should fetch from database when cache returns null', async () => {
                const mockKeys = {
                    'key1': { datakey: 'key1', active_status: true },
                    'key2': { datakey: 'key2', active_status: true }
                };

                vi.spyOn(raesumCache, "get").mockResolvedValue(null);
                vi.spyOn(raesumUser, "getMetadataKeys").mockResolvedValue(mockKeys);

                const result = await raesumUser.getMetadataKeyList();

                expect(result).toEqual(['key1', 'key2']);
                expect(raesumCache.get).toHaveBeenCalledWith("raesumUserMetadataKeysfalse");
                expect(raesumUser.getMetadataKeys).toHaveBeenCalledWith(false);
            });

            test('should fetch from database when cache is undefined', async () => {
                const mockKeys = {
                    'key1': { datakey: 'key1', active_status: true },
                    'key2': { datakey: 'key2', active_status: true }
                };

                vi.spyOn(raesumCache, "get").mockResolvedValue(undefined);
                vi.spyOn(raesumUser, "getMetadataKeys").mockResolvedValue(mockKeys);

                const result = await raesumUser.getMetadataKeyList();

                expect(result).toEqual(['key1', 'key2']);
                expect(raesumCache.get).toHaveBeenCalledWith("raesumUserMetadataKeysfalse");
                expect(raesumUser.getMetadataKeys).toHaveBeenCalledWith(false);
            });

            test('should use correct cache key for active keys', async () => {
                const mockCachedKeys = ['active_key1', 'active_key2'];
                
                vi.spyOn(raesumCache, "get").mockResolvedValue(mockCachedKeys);
                vi.spyOn(raesumUser, "getMetadataKeys");

                await raesumUser.getMetadataKeyList(false);

                expect(raesumCache.get).toHaveBeenCalledWith("raesumUserMetadataKeysfalse");
                expect(raesumUser.getMetadataKeys).not.toHaveBeenCalled();
            });

            test('should use correct cache key for all keys including inactive', async () => {
                const mockCachedKeys = ['active_key1', 'inactive_key1'];
                
                vi.spyOn(raesumCache, "get").mockResolvedValue(mockCachedKeys);
                vi.spyOn(raesumUser, "getMetadataKeys");

                await raesumUser.getMetadataKeyList(true);

                expect(raesumCache.get).toHaveBeenCalledWith("raesumUserMetadataKeystrue");
                expect(raesumUser.getMetadataKeys).not.toHaveBeenCalled();
            });

            test('should handle cache errors and fall back to database', async () => {
                const mockKeys = {
                    'key1': { datakey: 'key1', active_status: true },
                    'key2': { datakey: 'key2', active_status: true }
                };

                vi.spyOn(raesumCache, "get").mockRejectedValue(new Error("Cache error"));
                vi.spyOn(raesumUser, "getMetadataKeys").mockResolvedValue(mockKeys);

                await expect(raesumUser.getMetadataKeyList()).rejects.toThrow("Cache error");
                expect(raesumCache.get).toHaveBeenCalledWith("raesumUserMetadataKeysfalse");
                expect(raesumUser.getMetadataKeys).not.toHaveBeenCalled();
            });
        });
    });
});
