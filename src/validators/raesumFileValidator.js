import Joi from 'joi';

// Common validation patterns
const positiveInteger = Joi.number().integer().positive().required();
const optionalPositiveInteger = Joi.number().integer().positive().optional();
const stringField = Joi.string().required();
const optionalStringField = Joi.string().optional().allow('');

// File validation schemas
export const fileSchemas = {
    // POST /file/upload/:fileId
    uploadWithId: Joi.object({
        fileId: positiveInteger,
        fileType: stringField,
    }),

    // POST /file/upload/
    uploadNew: Joi.object({
        fileType: stringField,
    }),

    // GET /file/get/byUser/:userId
    getList: Joi.object({
        userId: optionalPositiveInteger,
    }),

    // GET /file/get/:fileId
    getById: Joi.object({
        fileId: positiveInteger,
    }),

    // GET /file/data/:fileId
    getFileById: Joi.object({
        fileId: positiveInteger,
    }),

    // POST /file/delete/:fileId
    delete: Joi.object({
        fileId: positiveInteger,
    }),

    // GET /file/metadata/get/keys
    getMetadataKeys: Joi.object().empty({}),

    // GET /file/metadata/get/:fileId
    getAllMetadata: Joi.object({
        fileId: positiveInteger,
    }),

    // GET /file/metadata/get/byKey/:key/:fileId
    getOneMetadata: Joi.object({
        key: stringField,
        fileId: positiveInteger,
    }),

    // POST /file/metadata/set/byKey/:key/:fileId
    setOneMetadata: Joi.object({
        key: stringField,
        fileId: positiveInteger,
        value: stringField,
    }),

    // POST /file/metadata/delete/byKey/:key/:fileId
    deleteOneMetadata: Joi.object({
        key: stringField,
        fileId: positiveInteger,
    }),
};

export default fileSchemas;
