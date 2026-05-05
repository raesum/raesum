// Logger
import {raesumLogger} from "./raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import {faker} from '@faker-js/faker';

import raesumMigrate from "./raesumMigrate.js";
import raesumStartup from "../modules/raesumStartup.js";
import raesumMetadata from "../models/raesumMetadata.js";
import raesumDB from "./raesumDB.js";
import raesumAuthorization from "../models/raesumAuth.js";
import raesumConfig from "../modules/raesumConfig.js";
import raesumOrganization from "../models/raesumOrganization.js";
import raesumAudit from "../models/raesumAudit.js";
import raesumUser from "../models/raesumUser.js";
import raesumCognito from "./raesumCognito.js";
import raesumCache from "../modules/raesumCache.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename);

const migrator = new raesumMigrate();

class raesumSeed {

    async canSeed() {
        const start = Date.now();
        logger.info("Checking to see if database can be seeded", Date.now() - start);
        // Check to see if migrations are current
        const migrator = new raesumMigrate();
        const schemaVersion = await migrator.getCurrentSchemaVesion();
        const migrationSet = await migrator.getValidMigrationsAvailableList();
        const mostRecentMigration = migrationSet[migrationSet.length - 1];
        const numberElement = parseInt(mostRecentMigration.replace(/\D/g, ''));
        logger.verbose("Current Schema Version: " + schemaVersion, Date.now() - start);
        logger.verbose("Most Recent Migration Version: " + numberElement, Date.now() - start);

        if (numberElement > schemaVersion) {
            logger.error("Database is not current. Please run the migration script before seeding the database.", Date.now() - start);
            return false;
        }

        const isProductionDatabase = await raesumMetadata.getByKey("isProductionDatabase");
        try {
            if (isProductionDatabase) {
                logger.critical("Database is a production database. Production databases CANNOT be seeded.", Date.now() - start);
                return false;
            }
        } catch (e) {
            logger.info("Database has not yet been tattooed as a production or non-production database. Proceeding with seeding.", Date.now() - start);
        }

        logger.info("Database can be seeded", Date.now() - start);
        return true;
    }

    async seedDB() {
        const start = Date.now();

        const isProductionDatabase = await raesumMetadata.getByKey("isProductionDatabase");
        try {
            if (isProductionDatabase) {
                logger.error("Database is a production database. Production databases CANNOT be seeded.", Date.now() - start);
                return false;
            }
        } catch (e) {
            logger.info("Database has not yet been tattoed as a production or non-production database. Proceeding with seeding.", Date.now() - start);
        }


        logger.info("Starting Seeding", Date.now() - start);

        // Clear Caches
        logger.info("Clearing the caches", Date.now() - start);
        await raesumCache.deleteSet('raesumServer');
        await raesumCache.deleteSet('cognito');
        await raesumCache.deleteSet('cache');

        logger.info("Clearing Caches Finished",Date.now()-start);


        // Truncate Extant Tables
        logger.info("Truncating Tables", Date.now() - start);
        const truncateStatus = await this.#truncateRaesumTables();
        if (!truncateStatus) {
            logger.error("Truncation Failed", Date.now() - start);
            return false;
        }

        // Load static content into tables
        logger.info("Loading Static Content", Date.now() - start);
        const staticContentReturn = await migrator.loadAllStaticContent();
        if (!staticContentReturn) {
            logger.error("Loading Static Content Failed.", Date.now() - start);
            return false;
        }

        // Run Raesum Initialize
        logger.info("Running Raesum Initialize", Date.now() - start);
        const startup = new raesumStartup();
        const firstUserID = await startup.initialize();

        // Create user metadata keys
        const createInCognito = await raesumConfig.get("developmentAndTesting.seed.createInCognito");
        if(createInCognito){
            await raesumCognito.synchronizeCognitoUserMetadata();
        }

        await this.#createUserMetadataKeys();


        // Set up user and org counters
        let userCount = 0;
        let orgCount = 0;


        // Determine How Many Orgs to Create
        const seedScale = await raesumConfig.get("developmentAndTesting.seed.scaleFactor");
        const clientTypeOrgCount = Math.ceil(10 * seedScale);
        const clientTypeOrgList = [];
        const agencyTypeOrgCount = Math.ceil(4 * seedScale);
        const agencyTypeOrgList = [];
        

        // Create 'Client' Type Organizations
        logger.info("Creating Seed Organizations: Client Type", Date.now() - start);
        for (let i = 0; i < clientTypeOrgCount; i++) {
            const orgType = "client";

            const orgName = faker.company.name();
            const orgID = await raesumOrganization.create(orgName + orgCount, true);
            clientTypeOrgList.push(orgID);

            // Create Audit Log Entry
            await raesumAudit.create("create", "raesum_organization", orgID, firstUserID);

            // Create Users for the Organization
            userCount += await this.#createSeedUsersForOrg(orgID, orgType, firstUserID, []);
            orgCount++;
        }
        logger.info("Created " + clientTypeOrgCount + " Client Type Organizations", Date.now() - start)


        // Create 'Agency' Type Organizations
        logger.info("Creating Seed Organizations: Agency Type", Date.now() - start);


        for (let i = 0; i < agencyTypeOrgCount; i++) {
            const orgType = "agency";

            const orgName = faker.company.name();
            const orgID = await raesumOrganization.create(orgName, true);
            agencyTypeOrgList.push(orgID);

            // Create Audit Log Entry
            await raesumAudit.create("create", "raesum_organization", orgID, firstUserID);

            // Chose some clients from the client list
            const numberOfClients = Math.ceil(Math.random() * 5) + 1;
            let clientList = [];

            for (let c = 0; c < numberOfClients; c++) {

                // Choose a random index in the client array
                const clientIndex = Math.floor(Math.random() * clientTypeOrgList.length);
                const candidateClient = clientTypeOrgList[clientIndex];

                // Add to the client list
                if (clientList.indexOf(candidateClient) === -1) {
                    clientList.push(candidateClient);
                }
            }

            logger.verbose(`Created the client list for org: ${orgID} with ${clientList.length} clients. Expected number of clients: ${numberOfClients}`);

            // Create Users for the Organization
            userCount += await this.#createSeedUsersForOrg(orgID, orgType, firstUserID, clientList);
            orgCount++;
        }
        logger.info("Created " + agencyTypeOrgCount + " Agency Type Organizations", Date.now() - start);

        // Randomly Deactivate a client organization
        const deactivateIndex = Math.floor(Math.random() * clientTypeOrgList.length);
        const deactivateOrgID = clientTypeOrgList[deactivateIndex];
        await raesumOrganization.setActivationStatus(deactivateOrgID, false);
        await raesumAudit.create("set_status", "raesum_organization", deactivateOrgID, firstUserID);

        logger.info(`Created ${orgCount} Organizations and ${userCount} Users`, Date.now() - start);

        return true;

    }


    async #createUserMetadataKeys(){
        const start = Date.now();

        logger.verbose("Creating Seed User metadata keys");

        const userMetadataKeys = ['premiumUser','profileDescription','subscriptionDate'];

        // loop through the metadata keys and create them
        for (let i = 0; i < userMetadataKeys.length; i++) {
            const key = userMetadataKeys[i];
            try {
                await raesumUser.setUserMetadataKey(key, faker.lorem.paragraph(2));
            }catch(e){
                logger.error(`Failed to create user metadata key: ${key}`, e);
                throw new Error("Failed to create user metadata key: ${key}");
            }
            
        }

        logger.info(`Created ${userMetadataKeys.length} User metadata keys`, Date.now() - start);

    }

    async #createSeedUsersForOrg(orgID, orgType, firstUserID, clientOrgs = []) {
        const start = Date.now();

        logger.verbose("Creating Seed Users for Org: " + orgID);


        const seedScale = await raesumConfig.get("developmentAndTesting.seed.scaleFactor");

        // Get the roles for the seeding
        const orgAdmin = await raesumConfig.get("developmentAndTesting.seed.seedRoles.orgAdmin");
        const orgManager = await raesumConfig.get("developmentAndTesting.seed.seedRoles.orgManager");
        const baseUser = await raesumConfig.get("developmentAndTesting.seed.seedRoles.baseUser");

        // Create Users for the Organization
        const userCount = Math.ceil(seedScale * Math.random() * 5) + 3;
        const orgAdminCount = Math.ceil(userCount / 4);
        const usersInOrg = [];

        // Add Org Users
        for (let i = 0; i < userCount; i++) {
            const userName = faker.internet.userName();
            const external_id = "us-east-1:" + faker.string.uuid();

            // TO-DO: Add user to cognito if useCognito has been set to true

            const userID = await raesumUser.createUser(external_id, userName + "_" + orgID + "_" + i, orgID, true);
            usersInOrg.push(userID);
            // Create Audit Log Entry
            await raesumAudit.create("create", "raesum_user", userID, firstUserID);
            await raesumOrganization.addUserToOrganization(userID, orgID);
            await raesumAudit.create("update", "raesum_organization", userID, orgID);

            // Set user meta data keys
            // User is premium user if userId is odd
            const metadataValues = {
                'premiumUser': userID % 2 === 0 ? false : true,
                'profileDescription': faker.lorem.paragraphs(1),
                'subscriptionDate': faker.date.anytime().toString()
            }

            raesumUser.setUserMetadataValues(userID, metadataValues);

            // If i < admin count, then the user is an admin
            if (i < orgAdminCount) {
                await raesumAuthorization.addUserToRoleByKey(userID, orgAdmin, orgID);
                await raesumAudit.create("update", "raesum_user", userID, firstUserID);
            }

            // All users get the minimal user role
            await raesumAuthorization.addUserToRoleByKey(userID, baseUser, orgID);
            await raesumAudit.create("update", "raesum_user", userID, firstUserID);
        }
        logger.verbose("Created " + userCount + " users for org " + orgID + " with orgType " + orgType, Date.now() - start);

        // If org is an agency, add the users to the agency's customers
        if (orgType == "agency") {
            logger.verbose(`Org: ${orgID} is an 'agency' type. Adding agency users to client ${clientOrgs.length} orgs`, Date.now() - start);

            // Choose the clientAdmin Users
            const clientAdminCount = Math.ceil(usersInOrg.length / 2);
            const clientAdmins = usersInOrg.slice(0, clientAdminCount);

            logger.verbose(`Org: ${orgID} will have ${clientAdminCount.length} client administrators for ${clientOrgs.length} clients`, Date.now() - start);

            // For each 'client' org, add the clientAdmins
            for (let i = 0; i < clientOrgs.length; i++) {

                // For each admin user
                for (let a = 0; a < clientAdmins.length; a++) {
                    // Add user to org
                    await raesumOrganization.addUserToOrganization(clientAdmins[a], clientOrgs[i]);

                    // Add org role to user
                    await raesumAuthorization.addUserToRoleByKey(clientAdmins[a], baseUser, clientOrgs[i]);

                }
            }
        }


        logger.info(`Generating Audit Logs for Users in Org: ${orgID}`, Date.now() - start);
        // Create Audit Logs for the Users
        for (let i = 0; i < usersInOrg.length; i++) {
            await this.#generateAuditLogs(usersInOrg[i]);
        }
        logger.info(`Finished Generating Audit Logs for Users in Org: ${orgID}`, Date.now() - start);


        logger.verbose(`Org: ${orgID} Seed Users Created`, Date.now() - start);

        return userCount;
    }


    async #generateAuditLogs(userID) {
        const start = Date.now();
        logger.debug("Seeding User Audit Logs: " + userID, Date.now() - start);

        // Get the User and allowed orgs
        const user = await raesumUser.getUserById(userID);
        const userRoles = await raesumAuthorization.getRolesForOrg(userID);
        const orgUsers = await raesumOrganization.getUsers(user.current_organization_id);

        // Determine number of sessions
        const sessionCount = Math.ceil(Math.random() * 3) + 2;

        // Determine Oldest Date Possible for Audit Log
        const oldestDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        const newestDate = new Date(new Date().setFullYear(new Date().getFullYear()));

        // Create the dates of the sessions
        const sessionDates = faker.date.betweens({from: oldestDate, to: newestDate, count: sessionCount});

        for (let s = 0; s < sessionCount; s++) {
            // Determine the session start and end (1 day total)
            const sessionEnd = new Date(sessionDates[s].getTime + 60 * 60 * 24 * 1000);

            // Determine the number of events in session
            const eventCount = Math.ceil(Math.random() * 36) + 4;


            // Create the dates of session
            const currentSessionDate = faker.date.betweens({from: sessionDates[s], to: sessionEnd, count: eventCount});

            // Start the transaction query
            let query = "BEGIN; INSERT INTO raesum_audit_log (action_id, object_id, object_type_id, user_id, event_at) VALUES \n";
            let valueArray = []

            // Create the events
            for (let e = 0; e < eventCount; e++) {
                // The FIRST event must be login
                const eventDate = currentSessionDate[e].toISOString();
                if (e == 0) {
                    valueArray.push("(1, " + userID + ", 1, " + userID + ", '" + eventDate + "')");
                } else {
                    // Determine the event
                    const eventID = Math.ceil(Math.random() * 7);

                    // Determine the event to create with a case statement
                    switch (eventID) {
                        case 1:
                            // Read Current Organization
                            valueArray.push("(5, " + user.current_organization_id + ", 2, " + userID + ", '" + eventDate + "')");
                            break;
                        case 2:
                            // Update Current Organization
                            valueArray.push("(3, " + user.current_organization_id + ", 2, " + userID + ", '" + eventDate + "')");
                            break;
                        case 3:
                            // Read A Role

                            // Pick a random role from userRoles
                            const roleIndex = Math.abs(Math.floor(Math.random() * userRoles.length - 1));
                            const roleID = userRoles[roleIndex];

                            valueArray.push("(5, " + roleID + ", 3, " + userID + ", '" + eventDate + "')");
                            break;
                        case 4:
                            // Read Audit Log
                            valueArray.push("(5, null, 4, " + userID + ", '" + eventDate + "')");
                            break;
                        case 5:
                            // Read their own user
                            valueArray.push("(5, " + userID + ", 1, " + userID + ", '" + eventDate + "')");
                            break;
                        case 6:
                            // Get another user from their org
                            // Pick a random user from orgUsers
                            const userIndex = Math.floor(Math.random() * orgUsers.length);
                            const userToRead = orgUsers[userIndex].id;

                            valueArray.push("(5, " + userToRead + ", 1, " + userID + ", '" + eventDate + "')");
                            break;
                        case 7:
                            // Update their user
                            valueArray.push("(3, " + userID + ", 1, " + userID + ", '" + eventDate + "')");
                            break;
                    }

                }


            }

            query += valueArray.join(",\n") + "; COMMIT;";

            try {
                const result = await raesumDB.query(query);
                logger.verbose(`Seed User: ${userID} Audit Logs Generated`, Date.now() - start);
                return true;
            } catch (e) {
                logger.error(`Seed User: ${userID} Audit Logs Failed`, Date.now() - start);
                throw new Error(`Seed User: ${userID} Audit Logs Failed`)
            }

        }


        logger.debug(`Seed User: ${userID} Audit Logs Generated`, Date.now() - start);
    }


    async #truncateRaesumTables() {
        const start = Date.now();
        logger.info("Truncating Tables", Date.now() - start);

        const tableList = [
            'raesum_audit_log',
            'raesum_user',
            'raesum_auth_action_type',
            'raesum_auth_object_type',
            'raesum_organization',
            'raesum_organization_x_user',
            'raesum_user_x_metadata',
            'raesum_user_x_metadata',
            'raesum_auth_role',
            'raesum_auth_role_x_permission',
            'raesum_auth_scope_type',
            'raesum_auth_user_x_organization_x_role',
            'raesum_auth_role_x_organization_restriction',
            'raesum_user_metadata_keys',
        ];

        for (let i = 0; i < tableList.length; i++) {
            const query = "TRUNCATE TABLE " + tableList[i] + " RESTART IDENTITY CASCADE;";
            try {
                await raesumDB.query(query);
            } catch (e) {
                logger.error(`Error truncating table ${tableList[i]} with error: ${e}`, Date.now() - start);
                return false;
            }
        }

        // Set initialized to false as user data has been erased
        await raesumMetadata.set("initialized", false);

        logger.info("Tables Truncated", Date.now() - start);

        return true;

    }

    async #loadSQLSeed(filename) {
        const start = Date.now();
        logger.info("Loading SQL Seed " + filename, Date.now() - start);

        const filePath = path.join(__dirname, '..', '..', 'controlledData/seeds', filename);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
            await raesumDB.query(sql);
        } catch (e) {
            logger.error("Error loading SQL Seed " + filename + " with error: " + e, Date.now() - start);
            return false;
        }

        logger.info("SQL Seed " + filename + " loaded", Date.now() - start);
        return true;
    }

}

export default raesumSeed;