import Joi from 'joi';
import {
    sanitizedStringField,
    sanitizedOptionalStringField,
} from './joiSanitizeHtml.js';

// Common validation patterns
const positiveInteger = Joi.number().integer().positive().required();
const optionalPositiveInteger = Joi.number().integer().positive().optional();
const stringField = sanitizedStringField;
const optionalStringField = sanitizedOptionalStringField;
const booleanField = Joi.boolean().required();

// Organization validation schemas
export const organizationSchemas = {
    // POST /organization/create
    create: Joi.object({
        name: stringField.max(255),
        description: optionalStringField.max(1000),
    }),

    // GET /organization/get/:organizationId
    getById: Joi.object({
        organizationId: positiveInteger,
    }),

    // GET /organization/metadata/get/keys
    getMetadataKeys: Joi.object().empty({}),

    // GET /organization/metadata/get/:organizationId
    getAllMetadata: Joi.object({
        organizationId: positiveInteger,
    }),

    // GET /organization/metadata/get/byKey/:key/:organizationId
    getOneMetadata: Joi.object({
        key: stringField,
        organizationId: positiveInteger,
    }),

    // POST /organization/metadata/set/byKey/:key/:organizationId
    setOneMetadata: Joi.object({
        key: stringField,
        organizationId: positiveInteger,
        value: stringField,
    }),

    // POST /organization/metadata/delete/byKey/:key/:organizationId
    deleteOneMetadata: Joi.object({
        key: stringField,
        organizationId: positiveInteger,
    }),

    // POST /organization/activation/set/:organizationId
    setActivation: Joi.object({
        organizationId: positiveInteger,
        active_status: booleanField,
    }),
};

export default organizationSchemas;
