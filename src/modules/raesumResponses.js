import raesumConfig from "./raesumConfig.js";
import NodeCache from 'node-cache';

import {raesumLogger} from "./raesumLogger.js";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename, "module");


class raesumResponses{

    async get(responseKey){}

}

const responseSet = new raesumResponses();
export default responseSet;