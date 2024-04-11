import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = raesumLogger(__filename);


class raesumResponses{

    #hasBeenInitialized = false;
    #responseCache = {};

    async init(){
        let start = Date.now();

        if(!this.#hasBeenInitialized || Object.keys(this.#responseCache).length === 0){
            this.#hasBeenInitialized = true;
            logger.info("Initializing raesumResponses", Date.now() - start);

            // Load the JSON file into memory
            try{
                const dirPath = path.join(__dirname, '..','..', 'controlledData');
                const responseJSON = JSON.parse(fs.readFileSync(path.join(dirPath, "responses.json"), 'utf8'));
                this.#responseCache = responseJSON;
                this.#hasBeenInitialized = true;
            }catch(e){
                logger.error("Error loading responses.json", e);
                throw new Error("Error loading responses.json");
            }
            logger.info("Finished Initializing raesumResponses", Date.now() - start);

        }
    }

    async get(responseKey, variables = []){

        const start = Date.now();
        logger.verbose("Getting response: " + responseKey, Date.now() - start);

        // Ensure that responses have been initialized
        try{
            await this.init();
        }catch(e){
            throw new Error(e);
        }

        // If the response exists
        if(this.#responseCache.hasOwnProperty(responseKey)){
            logger.debug("Found response: " + responseKey, Date.now() - start);

            // If there are variables AND the message contains {0}
            const response = JSON.parse(JSON.stringify(this.#responseCache[responseKey]));
            const message = response.message;
            const variableCount = (message.match(/{[0-9]*}/g) || []).length;
            // If the number of variables is the same as the number of {0} in the message replace them

            if(variables.length > 0 && variableCount == variables.length){
                logger.debug("Replacing variables in response: " + responseKey, Date.now() - start);

                    let newMessage = message;
                    for(let i=0; i<variables.length; i++){
                        newMessage = newMessage.replace("{"+i+"}",variables[i]);
                    }
                    const newResponse = response;

                    // Make a copy of the response and replace the message
                    newResponse.message = JSON.parse(JSON.stringify(newMessage));
                    return newResponse;

            }else if(variableCount == 0){
                return response;
            }else{
                // Otherwise throw an error
                logger.error("Variable count does not match: " + responseKey, Date.now()-start);
                throw new Error("Variable count does not match");
            }
        }else{
            logger.error("Response key not found: " + responseKey, Date.now()-start);
            throw new Error("Response key not found");
        }
    }


}

const responseSet = new raesumResponses();
export default responseSet;