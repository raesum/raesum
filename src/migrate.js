
import {raesumLogger, raesumLoggerRequestFinishMiddleware} from "./modules/raesumLogger.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import raesumMigrate from "./modules/raesumMigrate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename);

const start = Date.now();
logger.info("Starting Migration", Date.now() - start);

const migrator = new raesumMigrate();


migrator.doMigration().then((migrationReturn)=>{
    logger.info("Migration Complete", Date.now() - start);
    process.exit(migrationReturn);
});
