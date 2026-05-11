import {raesumLogger} from "../modules/raesumLogger.js";
import {fileURLToPath} from "url";
import raesumDB from "../modules/raesumDB.js";
import raesumOrganization from "../models/raesumOrganization.js";
import raesumResponses from "../modules/raesumResponses.js";
import raesumAudit from "../models/raesumAudit.js";
import raesumAuthorization from "../models/raesumAuth.js";
import { get } from "http";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumFileController {


    async upload(req,res,next){}


    // Gets a list of files for the current user and organization. 
    async getList(req,res,next){}


    // Gets an file entry by ID. It will also get the current status
    async getById(req,res,next){}


    // Gets an file by ID, default to current organization if no ID provided. It will either give the file itself or a redirect to the public url of the fil
    async getFileById(req,res,next){}



    async delete(req,res,next){}


    async getFileMetadata(req,res,next){}


    async deleteOneFileMetaData(req,res,next){}


    async setOneFileMetaData(req,res,next){}


    async getAllFileMetaData(req,res,next){}


    async getOneFileMetaData(req,res,next){}


    async getMetaDataKeys(req,res,next){}

}

const singleInstance = new raesumFileController();
export default singleInstance;