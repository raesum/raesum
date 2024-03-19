// Logger
import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumDB from "./raesumDB.js";
import raesumMigrate from "./raesumMigrate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename, "module");

const migrator = new raesumMigrate();


class raesumSeed {

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
        // Create Users
        const loadUsers = await this.#loadSQLSeed('raesum_users.sql');
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
            'raesum_users',
            'raesum_action_types',
            'raesum_object_types'
        ];

        for(let i=0; i<tableList.length; i++){
            const query = "TRUNCATE TABLE " + tableList[i] + " CASCADE";
            try{
                await raesumDB.query(query);
            }catch(e){
                logger.error(`Error truncating table ${tableList[i]} with error: ${e}`, Date.now() - start);
                return false;
            }
        }

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