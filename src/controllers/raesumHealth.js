import raesumDB from "../modules/raesumDB.js";
import raesumConfig from "../modules/raesumConfig.js";
import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);


export default async function raesumHealthController(req,res,next){
    const start = Date.now();

    // Set default value
    let healthy = true;

    // Check Database Connection
    try{
        let dbResponse = await raesumDB.query("SELECT 1 as Healthy;");
        if(!dbResponse.hasOwnProperty('rows') || dbResponse.rows.length < 1){
            healthy = false;
            logger.critical(`Health Check Fail: Database connected but not returning data.`,Date.now()-start);
        }
    }catch(e){
        // Something is wrong, record error and indicate not healthy
        healthy = false;
        logger.critical(`Health Check Fail: Unable to connect to database`,Date.now()-start);
    }


    // If Redis or PSQL Cache, Check Cache Connection
    const redisOrPSQL = raesumConfig.get("cache.type");
    if(redisOrPSQL == "redis"){
        // TO-DO: Add cache client health test
    }else if( redisOrPSQL == "psql"){

    }

    if(healthy){
        logger.debug(`Health Check Passed`,Date.now()-start);
        const returnObject = {
            "title":"Health Check",
            "message":"Passed",
            "messageId":0
        }
        return res.status(200).send(returnObject)
    }else{
        const returnObject = {
            "title":"Health Check",
            "message":"Failed",
            "messageId":0
        }
        return res.status(500).send(returnObject)
    }
}