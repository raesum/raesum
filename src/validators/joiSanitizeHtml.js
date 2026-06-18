import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';

// Custom Joi extension to sanitize HTML from string fields
const sanitizeHtmlExtension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.sanitizeHtml':
            '{{#label}} contains HTML that has been sanitized',
    },
    rules: {
        sanitizeHtml: {
            validate(value, helpers) {
                // Strip all HTML tags
                const sanitized = sanitizeHtml(value, {
                    allowedTags: [], // No tags allowed
                    allowedAttributes: {}, // No attributes allowed
                    textFilter: (text) => text,
                });
                return sanitized;
            },
        },
    },
});

// Create Joi instance with the custom extension
const joiWithSanitize = Joi.extend(sanitizeHtmlExtension);

// Reusable sanitized string field
export const sanitizedStringField = joiWithSanitize
    .string()
    .required()
    .sanitizeHtml();
export const sanitizedOptionalStringField = joiWithSanitize
    .string()
    .optional()
    .allow('')
    .sanitizeHtml();

export default joiWithSanitize;
