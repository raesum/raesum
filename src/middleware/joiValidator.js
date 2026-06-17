import { raesumLogger } from '../modules/raesumLogger.js';
import raesumResponses from '../modules/raesumResponses.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const logger = raesumLogger(__filename);

/**
 * Generic Joi validation middleware factory
 * @param {Object} schema - Joi schema object
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
    return async (req, res, next) => {
        const start = Date.now();
        logger.debug(
            `Starting Joi validation for ${property}`,
            Date.now() - start
        );

        try {
            const { error, value } = schema.validate(req[property], {
                abortEarly: false,
                stripUnknown: true,
            });

            if (error) {
                logger.info(
                    `Joi validation failed for path ${req.path} with properties: ${property}: ${error.message}`,
                    Date.now() - start
                );

                // Extract error details and separate missing fields from invalid values
                const missingFields = [];
                const invalidFields = [];
                const details = error.details.map((detail) => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    type: detail.type,
                }));

                // Categorize errors based on Joi error type
                details.forEach((detail) => {
                    if (detail.type === 'any.required') {
                        missingFields.push(detail.field);
                    } else {
                        invalidFields.push(detail.field);
                    }
                });

                // Use appropriate response based on error type
                let message;
                if (missingFields.length > 0 && invalidFields.length === 0) {
                    // Only missing fields
                    message = await raesumResponses.get(
                        'requestMissingFields',
                        [missingFields.join(', ')]
                    );
                } else if (
                    invalidFields.length > 0 &&
                    missingFields.length === 0
                ) {
                    // Only invalid fields
                    message = await raesumResponses.get(
                        'requestInvalidFields',
                        [invalidFields.join(', ')]
                    );
                } else {
                    // Both missing and invalid fields - prioritize missing fields
                    message = await raesumResponses.get(
                        'requestMissingFields',
                        [missingFields.join(', ')]
                    );
                }
                message.validationErrors = details;

                return res.status(message.code).json(message);
            }

            // Replace the property with the validated and sanitized value
            req[property] = value;

            logger.debug(
                `Joi validation passed for ${property}`,
                Date.now() - start
            );
            return next();
        } catch (e) {
            logger.error(
                `Error during Joi validation for ${property}: ${e.message}`,
                Date.now() - start
            );
            const message = await raesumResponses.get('internalServerError');
            return res.status(message.code).json(message);
        }
    };
};

export default validate;
