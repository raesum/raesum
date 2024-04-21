import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumConfig from "../modules/raesumConfig.js";
import raesumCache from "./raesumCache.js";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumServer{

    #cacheObjectType = "raesumServer";
    async buildBaseServerURL(){
        const start = Date.now();

        // Get from cache
        const cacheKey = "serverURL";
        const cacheValue = await raesumCache.get(cacheKey, this.#cacheObjectType);

        if(cacheValue){
            return cacheValue;
        }

        const protocol = await raesumConfig.get('server.protocol');
        const proxyInUse = await raesumConfig.get('server.proxyInUse');
        let port = await raesumConfig.get('server.port');
        const host = await raesumConfig.get('server.host');

        // If a proxy is present, use the proxy port
        if(proxyInUse){
            port = await raesumConfig.get('server.proxyPort');
        }

        // Assemble the URL
        let serverURL = protocol + "://" + host

        // If the protocol does not equal the default port, append the port
        if((protocol == "http" && port != 80) || (protocol == "https" && port != 443)){
            serverURL += ":" + port;
        }

        // Set cache
        await raesumCache.set(cacheKey, serverURL, 86400, this.#cacheObjectType);

        // Return
        return serverURL;

    }
}

const singleInstance = new raesumServer();
export default singleInstance;