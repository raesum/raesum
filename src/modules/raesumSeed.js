// Logger
import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumDB from "./raesumDB.js";
import raesumMigrate from "./raesumMigrate.js";
import raesumStartup from "../modules/raesumStartup.js";
import raesumMetadata from "../models/raesumMetadata.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename, "module");

const migrator = new raesumMigrate();
const metadata = new raesumMetadata();

class raesumSeed {

    async canSeed(){
        const start = Date.now();
        logger.info("Checking to see if database can be seeded", Date.now() - start);
        // Check to see if migrations are current
        const migrator = new raesumMigrate();
        const schemaVersion = await migrator.getCurrentSchemaVesion();
        const migrationSet = await migrator.getValidMigrationsAvailableList();
        const mostRecentMigration = migrationSet[migrationSet.length-1];
        const numberElement = parseInt(mostRecentMigration.replace(/\D/g, ''));
        logger.debug("Current Schema Version: " + schemaVersion, Date.now() - start);
        logger.debug("Most Recent Migration Version: " + numberElement, Date.now() - start);

        if (numberElement > schemaVersion) {
            logger.error("Database is not current. Please run the migration script before seeding the database.", Date.now() - start);
            return false;
        }

        logger.info("Database can be seeded", Date.now() - start);
        return true;
    }
    async seedDB(){
        const start = Date.now();
        logger.info("Starting Seeding", Date.now() - start);

        // Truncate Extant Tables
        logger.info("Truncating Tables", Date.now() - start);
        const truncateStatus = await this.#truncateRaesumTables();
        if(!truncateStatus){
            logger.error("Truncation Failed", Date.now() - start);
            return false;
        }

        // Load static content into tables
        logger.info("Loading Static Content", Date.now() - start);
        const staticContentReturn = await migrator.loadAllStaticContent();
        if(!staticContentReturn){
            logger.error("Loading Static Content Failed.", Date.now() - start);
            return false;
        }

        // Run Raesum Initialize
        logger.info("Running Raesum Initialize", Date.now() - start);
        const startup = new raesumStartup();
        await startup.initialize();


        // Create Users
        const loadUsers = await this.#loadSQLSeed('raesum_user.sql');
        if(!loadUsers){
            logger.error("Creating Users Failed.", Date.now() - start);
            return false;
        }
        // Create Audit Log Entries
        const loadAuditLog = await this.#loadSQLSeed('raesum_audit_log.sql');
        if(!loadAuditLog){
            logger.error("Creating Audit Log Entries Failed.", Date.now() - start);
            return false;
        }

        return true;

    }

    async #truncateRaesumTables(){
        const start = Date.now();
        logger.info("Truncating Tables", Date.now() - start);

        const tableList = [
            'raesum_audit_log',
            'raesum_user',
            'raesum_auth_action_type',
            'raesum_auth_object_type',
            'raesum_organization'
        ];

        for(let i=0; i<tableList.length; i++){
            const query = "TRUNCATE TABLE " + tableList[i] + " RESTART IDENTITY CASCADE;";
            try{
                await raesumDB.query(query);
            }catch(e){
                logger.error(`Error truncating table ${tableList[i]} with error: ${e}`, Date.now() - start);
                return false;
            }
        }

        // Set initialized to false as user data has been erased
        await metadata.set("initialized", false);

        logger.info("Tables Truncated", Date.now() - start);

        return true;

    }

    async #loadSQLSeed(filename){
        const start = Date.now();
        logger.info("Loading SQL Seed " + filename, Date.now() - start);

        const filePath = path.join(__dirname, '..', '..', 'controlledData/seeds', filename);
        const sql = fs.readFileSync(filePath, 'utf8');

        try{
            await raesumDB.query(sql);
        }catch(e){
            logger.error("Error loading SQL Seed " + filename + " with error: " + e, Date.now() - start);
            return false;
        }

        logger.info("SQL Seed " + filename + " loaded", Date.now() - start);
        return true;
    }

}

export default raesumSeed;