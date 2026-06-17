import Joi from 'joi';

// Common validation patterns
const positiveInteger = Joi.number().integer().positive().required();
const optionalPositiveInteger = Joi.number().integer().positive().optional();
const stringField = Joi.string().required();
const optionalStringField = Joi.string().optional().allow('');
const booleanField = Joi.boolean().required();

// User validation schemas
export const userSchemas = {
    // GET /user/get/:userId
    getUserById: Joi.object({
        userId: optionalPositiveInteger,
    }),

    // GET /user/metadata/get/keys
    getMetadataKeys: Joi.object().empty({}),

    // GET /user/metadata/get/:userId
    getAllMetadata: Joi.object({
        userId: optionalPositiveInteger,
    }),

    // GET /user/metadata/get/byKey/:key/:userId
    getOneMetadata: Joi.object({
        key: stringField,
        userId: optionalPositiveInteger,
    }),

    // POST /user/metadata/set/byKey/:key/:userId
    setOneMetadata: Joi.object({
        key: stringField,
        userId: optionalPositiveInteger,
        value: stringField,
    }),

    // POST /user/metadata/delete/byKey/:key/:userId
    deleteOneMetadata: Joi.object({
        key: stringField,
        userId: optionalPositiveInteger,
    }),

    // GET /user/metadata/resync
    resyncFromCognito: Joi.object().empty({}),

    // POST /user/activation/set/:userId
    setActivation: Joi.object({
        userId: optionalPositiveInteger,
        active_status: booleanField,
    }),

    // POST /user/organization/set/:userId
    changeOrg: Joi.object({
        userId: optionalPositiveInteger,
        organizationId: positiveInteger,
    }),

    // GET /user/organization/getAllowed/:userId
    getAllowedOrgs: Joi.object({
        userId: optionalPositiveInteger,
    }),
};

export default userSchemas;
