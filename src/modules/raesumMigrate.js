// Logger
import {raesumLogger} from "./raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumDB from "./raesumDB.js";
import raesumConfig from "./raesumConfig.js";
import raesumAuthorization from "../models/raesumAuthorization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename);

class raesumMigrate {

    getMigrationsFileList(){
        // Get the folder where the migrations are stored
        const dirPath = path.join(__dirname, '..','..', 'schema');

        // Get the list of files ending in .sql
        const sqlFiles = fs.readdirSync(dirPath).filter((el) => path.extname(el) === '.sql');

        return sqlFiles;
    }
    // Get list of Migration files to run
    // Files should ONLY be named ##.sql
    // Throw error if the files are not named correctly or there are gaps in the numbering sequence
    getValidMigrationsAvailableList(){

        // Get the unfiltered file list
        const sqlFiles = this.getMigrationsFileList();

        let validSqlFiles = [];
        // Name Verification Loop:
        for(let i=0; i < sqlFiles.length; i++){

            // Check each file's name to ensure that it only is a number in the filename
            if(!/^([0-9]*\.sql)$/.test(sqlFiles[i])){
                const errorText = sqlFiles[i] + ' is not a valid filename';
                logger.error(errorText)
                throw new Error(errorText);
            }

            // Extract number from filename
            const fileNumber = parseInt(sqlFiles[i].replace(/\D/g, ''));

            // If current file number is not == file number counter, there is a gap in the sequence
            if(fileNumber != i+1){
                // Throw error
                const errorText = sqlFiles[i] + ' skips a migration number';
                logger.error(errorText)
                throw new Error(errorText);
            }

            validSqlFiles.push(sqlFiles[i]);
        }

        // Return the list
        return validSqlFiles;
    }

    async getCurrentSchemaVesion(){
        const start = Date.now();
        // Does the meta data table exist
            // Get database name from config
        const databaseName = await raesumConfig.get("connections.primaryDatabase.database")

        const query1 = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE  table_catalog = $1 AND table_name  = $2) exists;";
        const params1 = [databaseName,'raesum_metadata']
        let dbResponse = await raesumDB.query(query1,params1);

        if(dbResponse.rows[0]['exists']!=true){
            // If no, version == 0
            logger.info("No extant raesum_metadata table.")
            return 0;
        }

        // Get the current version from the meta
        const query2 = "SELECT datavalue FROM raesum_metadata WHERE datakey='schemaVersion' LIMIT 1;";
        let dbResponse2 = await raesumDB.query(query2);

        const currentSchemaVersion = parseInt(dbResponse2.rows[0]['datavalue']);

        logger.info("Current schema version: " + currentSchemaVersion, Date.now() - start);

        // Return the value
        return currentSchemaVersion;
    }

    async loadUpdateStaticContent(filename,targetTable){
        const start = Date.now();

        logger.info("Loading static content from " + filename + " into " + targetTable, Date.now() - start);

        // Load the json file into memory from the controlledData folder
        const dirPath = path.join(__dirname, '..','..', 'controlledData');
        const jsonFile = fs.readFileSync(path.join(dirPath, filename), 'utf8');
        const jsonData = JSON.parse(jsonFile);


        // For each entry in the JSON file
        for (let i = 0; i < jsonData.length; i++) {
            // If there is at least one field
            if (Object.keys(jsonData[i]).length > 0) {
                // Get a list of the fields
                const fields = Object.keys(jsonData[i]);
                let placeholders = [];
                for (let j = 0; j < fields.length; j++) {
                    placeholders.push("$" + (j + 1));
                }

                // create an insert statement with on conflict update
                const insertStatement = "INSERT INTO " + targetTable + " (" + fields.join(',') + ") VALUES (" + placeholders.join(',') + ") ON CONFLICT (id) DO UPDATE SET " + fields.map((el) => el + " = EXCLUDED." + el).join(',');

                // Run the query
                const params = fields.map((el) => jsonData[i][el]);
                try {
                    await raesumDB.query(insertStatement, params);
                }catch(e){
                    // Halt on errors
                    logger.critical("Error loading static content into " + targetTable + " with error: " + e, Date.now() - start);
                    return false;
                }
            }

        }

        logger.info("Static content load " + filename + " into " + targetTable + " complete ", Date.now() - start);
        return true;
    }

    async loadAllStaticContent(){
        const start = Date.now();


        // Load/Update Static Content
        logger.info("Loading/Updating static content", Date.now() - start);
        const staticContent = [
            {filename: 'authorization/action.json', targetTable: 'raesum_auth_action_type'},
            {filename: 'authorization/object.json', targetTable: 'raesum_auth_object_type'},
            {filename: 'authorization/scope.json', targetTable: 'raesum_auth_scope_type'},
        ]

        // Lop through static content list
        for(let i=0; i<staticContent.length; i++) {

            // Run load function
            let loadReturn = await this.loadUpdateStaticContent(staticContent[i].filename, staticContent[i].targetTable);
            // Return 1 if error else continue
            if(loadReturn != true){
                return false;
            }
        }


        // Load Specialized Static Content (files that need custom load functions)

        // Load the global roles
        await raesumAuthorization.loadGlobalRolesToDatabase();

        logger.info("Static content load/update complete", Date.now() - start);
        return true;
    }

    async doMigration(){
        const start = Date.now();

        // Get current schema version
        let schemaVersion = await this.getCurrentSchemaVesion();

        // Get list of valid available migrations
        let possibleMigrations = this.getValidMigrationsAvailableList();

        // Build list of necessary migrations
        let migrationsToRun = [];
        possibleMigrations.map((element) => {

            // Get the number
            const numberElement = parseInt(element.replace(/\D/g, ''));
            if (numberElement > schemaVersion) {
                migrationsToRun.push(element);
            }
        });

        logger.info(migrationsToRun.length + " migrations to run", Date.now() - start);

        const dirPath = path.join(__dirname, '..','..', 'schema');

        // For each migration
        for (let i = 0; i < migrationsToRun.length; i++) {
            logger.info("Running migration " + migrationsToRun[i], Date.now() - start);

            // Load the SQL file
            const sqlFile = fs.readFileSync(path.join(dirPath, migrationsToRun[i]), 'utf8');

            const sqlStatements = sqlFile.split(';');
            // Run the query set
            try {
                await raesumDB.query(sqlFile);
            }
            catch (e) {
                // If there is error, record error and halt process
                logger.error("Error running migration " + migrationsToRun[i] + ". With error: "+e, Date.now() - start);
                return(1)
            }

            // Update the schema version
            const query = "UPDATE raesum_metadata SET datavalue = $1 WHERE datakey = 'schemaVersion';";
            const params = [parseInt(migrationsToRun[i].replace(/\D/g, ''))];
            await raesumDB.query(query,params);
        }

        logger.info("Database schema migrations complete", Date.now() - start);

        // Load static content
        const loadStaticContentReturn = await this.loadAllStaticContent();
        if(loadStaticContentReturn != 0){
            return 1;
        }

        return 0;
    }

}

export default raesumMigrate;