import { raesumLogger } from './raesumLogger.js';
import { fileURLToPath } from 'url';
import raesumFile from '../models/raesumFile.js';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

class raesumFileValidator {
    knownImageFileTypes = [
        'image/aces',
        'image/apng',
        'image/avci',
        'image/avcs',
        'image/avif',
        'image/bmp',
        'image/cgm',
        'image/dicom-rle',
        'image/dpx',
        'image/emf',
        'image/example',
        'image/fits',
        'image/g3fax',
        'image/gif',
        'image/heic',
        'image/heic-sequence',
        'image/heif',
        'image/heif-sequence',
        'image/hej2k',
        'image/hsj2',
        'image/jls',
        'image/jp2',
        'image/jph',
        'image/jphc',
        'image/jpm',
        'image/jpx',
        'image/jpeg',
        'image/jxr',
        'image/jxrA',
        'image/jxrS',
        'image/jxs',
        'image/jxsc',
        'image/jxsi',
        'image/jxss',
        'image/ktx',
        'image/ktx2',
        'image/naplps',
        'image/png',
        'image/x-png',
        'image/prs.btif',
        'image/prs.pti',
        'image/pwg-raster',
        'image/svg+xml',
        'image/t38',
        'image/tiff',
        'image/tiff-fx',
        'image/vnd.microsoft.icon',
    ];

    /**
     * This function is called by upload and is NOT awaited. It will get the file information from the database and call either internal or external services to validate the file. It will update the file record with the validation results and finally call the uploadDisposition function to move/delete the file to the end location
     * @param  {String} fileId The ID of the file to update
     * @return {Boolean} Returns true if the file successfully completes validation, false otherwise
     * @throws {Error} If unable to get file types
     */
    async validateFileAsync(fileId) {
        // TODO: Implement async validation
    }

    /**
    This function will compare the identified upload size against the type definition,.
    * @param  {Number} fileSize The size of the file in bytes
    * @param  {String} fileTypeKey The key of the file type to validate against
    * @return {Boolean} Returns true if the file size is valid, false otherwise
    */
    async validateSize(fileSize, fileTypeKey) {
        const start = Date.now();
        logger.debug(
            `Validating file size for type: ${fileTypeKey}`,
            Date.now() - start
        );

        try {
            // Get the file type details
            const fileTypeDetails =
                await raesumFile.getOneFileType(fileTypeKey);
            if (!fileTypeDetails) {
                logger.warning(
                    `File type not found: ${fileTypeKey}`,
                    Date.now() - start
                );
                return false;
            }

            // Check if fileSizeLimit is defined
            if (!fileTypeDetails.fileSizeLimit) {
                logger.debug(
                    `No file size limit defined for type: ${fileTypeKey}`,
                    Date.now() - start
                );
                return true;
            }

            // Validate the file size
            const isValid = fileSize <= fileTypeDetails.fileSizeLimit;
            logger.debug(
                `File size validation result: ${isValid} (size: ${fileSize}, limit: ${fileTypeDetails.fileSizeLimit})`,
                Date.now() - start
            );
            return isValid;
        } catch (e) {
            logger.error(
                `Error validating file size for type ${fileTypeKey}: ${e.message}`,
                Date.now() - start
            );
            return false;
        }
    }

    /**
     * This function will compare the identified upload dimensions against the type definition.
     * @param  {Number} fileWidth The width of the file in pixels
     * @param  {Number} fileHeight The height of the file in pixels
     * @param  {String} fileTypeKey The key of the file type to validate against
     * @return {Boolean} Returns true if the file dimensions are valid, false otherwise
     */
    async validateDimensions(fileWidth, fileHeight, fileTypeKey) {
        const start = Date.now();
        logger.debug(
            `Validating file dimensions for type: ${fileTypeKey}`,
            Date.now() - start
        );

        try {
            // Get the file type details
            const fileTypeDetails =
                await raesumFile.getOneFileType(fileTypeKey);
            if (!fileTypeDetails) {
                logger.warning(
                    `File type not found: ${fileTypeKey}`,
                    Date.now() - start
                );
                return false;
            }

            // Check if dimensionsLimit is defined
            if (
                !fileTypeDetails.dimensionsLimit ||
                !fileTypeDetails.dimensionsLimit.width ||
                !fileTypeDetails.dimensionsLimit.height
            ) {
                logger.debug(
                    `No dimension limit defined for type: ${fileTypeKey}`,
                    Date.now() - start
                );
                return true;
            }

            // Validate the dimensions
            const isWidthValid =
                fileWidth <= fileTypeDetails.dimensionsLimit.width;
            const isHeightValid =
                fileHeight <= fileTypeDetails.dimensionsLimit.height;
            const isValid = isWidthValid && isHeightValid;

            logger.debug(
                `Dimension validation result: ${isValid} (width: ${fileWidth}, limit: ${fileTypeDetails.dimensionsLimit.width}, height: ${fileHeight}, limit: ${fileTypeDetails.dimensionsLimit.height})`,
                Date.now() - start
            );
            return isValid;
        } catch (e) {
            logger.error(
                `Error validating file dimensions for type ${fileTypeKey}: ${e.message}`,
                Date.now() - start
            );
            return false;
        }
    }

    /**
     * This function will compare the identified upload mime type against the type definition.
     * @param  {String} fileMime The mime type of the file
     * @param  {String} fileTypeKey The key of the file type to validate against
     * @return {Boolean} Returns true if the file mime type is valid, false otherwise
     */
    async validateMime(fileMime, fileTypeKey) {
        const start = Date.now();
        logger.debug(
            `Validating file mime type for type: ${fileTypeKey}`,
            Date.now() - start
        );

        try {
            // Get the file type details
            const fileTypeDetails =
                await raesumFile.getOneFileType(fileTypeKey);
            if (!fileTypeDetails) {
                logger.warning(
                    `File type not found: ${fileTypeKey}`,
                    Date.now() - start
                );
                return false;
            }

            // Check if mimeTypes is defined
            if (
                !fileTypeDetails.mimeTypes ||
                !Array.isArray(fileTypeDetails.mimeTypes) ||
                fileTypeDetails.mimeTypes.length === 0
            ) {
                logger.debug(
                    `No mime types defined for type: ${fileTypeKey}`,
                    Date.now() - start
                );
                return true;
            }

            // Validate the mime type (case-insensitive comparison)
            const isValid = fileTypeDetails.mimeTypes.some(
                (allowedMime) =>
                    allowedMime.toLowerCase() === fileMime.toLowerCase()
            );
            logger.debug(
                `Mime type validation result: ${isValid} (mime: ${fileMime}, allowed: ${fileTypeDetails.mimeTypes.join(', ')})`,
                Date.now() - start
            );
            return isValid;
        } catch (e) {
            logger.error(
                `Error validating file mime type for type ${fileTypeKey}: ${e.message}`,
                Date.now() - start
            );
            return false;
        }
    }

    validateImageMime(fileMime) {
        // Check if the file mime type is in the allowed image mimetypes
        return this.knownImageFileTypes.includes(fileMime.toLowerCase());
    }
}

const raesumFileValidatorObject = new raesumFileValidator();
export default raesumFileValidatorObject;
