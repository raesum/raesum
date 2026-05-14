import {raesumLogger} from "../modules/raesumLogger.js";
import raesumFileValidator from "../modules/raesumFileValidator.js";
import raesumFile from "../models/raesumFile.js";
import raesumResponses from "../modules/raesumResponses.js";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

const raesumFileValidationMiddleware = async(req, res, next) => {
    const start = Date.now();
    logger.debug(`Starting synchronous file validation middleware`,Date.now()-start);

    // Is the raesume file type specified in the upload and is it valid?
    if (!req.body.fileType) {
        logger.debug(`File type not specified in request`, Date.now() - start);
        const message = await raesumResponses.get("fileTypeNotAllowed");
        return res.status(message.code).json(message);
    }
    logger.debug(`File type specified: ${req.body.fileType}`, Date.now() - start);
    
    // Get the details of the raesum file type
    try{
        const fileTypeDetails = await raesumFile.getOneFileType(req.body.fileType);
        if (!fileTypeDetails) {
            logger.info(`Invalid file type: ${req.body.fileType}`, Date.now() - start);
            const message = await raesumResponses.get("fileTypeNotAllowed");
            return res.status(message.code).json(message);
        }
        logger.debug(`File type details retrieved for: ${req.body.fileType}`, Date.now() - start);

        // Does the file type match the expected file type?
        if (!req.file || !req.file.mimetype) {
            logger.debug(`No file or mimetype found in request`, Date.now() - start);
            const message = await raesumResponses.get("fileTypeNotAllowed");
            return res.status(message.code).json(message);
        }

        const isMimeTypeValid = await raesumFileValidator.validateMime(req.file.mimetype, req.body.fileType);
        if (!isMimeTypeValid) {
            logger.info(`Mimetype ${req.file.mimetype} does not match expected type for ${req.body.fileType}`, Date.now() - start);
            const message = await raesumResponses.get("fileTypeNotAllowed");
            return res.status(message.code).json(message);
        }
        logger.debug(`Mimetype validation passed for ${req.file.mimetype}`, Date.now() - start);
    }catch(e){
        logger.error(`Error getting file type details: ${e.message}`, Date.now() - start);
        const message = await raesumResponses.get("fileTypeNotAllowed");
        return res.status(message.code).json(message);
    }
    

    try{
    // Does the upload size exceed the limit
        if (!req.file.size) {
            logger.debug(`No file size found in request`, Date.now() - start);
            const message = await raesumResponses.get("fileSizeTooLarge");
            return res.status(message.code).json(message);
        }

        const isSizeValid = await raesumFileValidator.validateSize(req.file.size, req.body.fileType);
        if (!isSizeValid) {
            logger.debug(`File size ${req.file.size} exceeds limit for ${req.body.fileType}`, Date.now() - start);
            const message = await raesumResponses.get("fileSizeTooLarge");
            return res.status(message.code).json(message);
        }
        logger.debug(`File size validation passed for size: ${req.file.size}`, Date.now() - start);
    }catch(e){
        logger.error(`Error validating file size: ${e.message}`, Date.now() - start);
        const message = await raesumResponses.get("fileSizeTooLarge");
        return res.status(message.code).json(message);
    }
    
    try{
// If the file type has dimensions set, call the size validator
    if (fileTypeDetails.dimensionsLimit && fileTypeDetails.dimensionsLimit.width && fileTypeDetails.dimensionsLimit.height) {
        if (!req.file.width || !req.file.height) {
            logger.debug(`No dimensions found in request for file type requiring dimensions`, Date.now() - start);
            const message = await raesumResponses.get("fileDimensionsTooLarge");
            return res.status(message.code).json(message);
        }

        // Check the file mimeType against known image mimetypes defined in the raesumFileValidator. If the file type is not a known image type, return an error
        const isImageMimeType = raesumFileValidator.validateImageMime(req.file.mimetype);
        if (!isImageMimeType) {
            logger.info(`File type ${req.file.mimetype} is not a known image type`, Date.now() - start);
            const message = await raesumResponses.get("fileTypeNotAllowed");
            return res.status(message.code).json(message);
        }


        const areDimensionsValid = await raesumFileValidator.validateDimensions(req.file.width, req.file.height, req.body.fileType);
        if (!areDimensionsValid) {
            logger.debug(`Dimensions ${req.file.width}x${req.file.height} exceed limit for ${req.body.fileType}`, Date.now() - start);
            const message = await raesumResponses.get("fileDimensionsTooLarge");
            return res.status(message.code).json(message);
        }
        logger.debug(`Dimensions validation passed for ${req.file.width}x${req.file.height}`, Date.now() - start);
    } else {
        logger.debug(`No dimension validation required for ${req.body.fileType}`, Date.now() - start);
    }
    }catch(e){
        logger.error(`Error validating file dimensions: ${e.message}`, Date.now() - start);
        const message = await raesumResponses.get("fileDimensionsTooLarge");
        return res.status(message.code).json(message);
    }
    

    // File passed the synchronous validations
    logger.info(`File synchronous validation complete`,Date.now() - start);
    return next();
        
}

export default raesumFileValidationMiddleware;
