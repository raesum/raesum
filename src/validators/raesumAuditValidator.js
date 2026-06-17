import Joi from 'joi';

// Common validation patterns
const positiveInteger = Joi.number().integer().positive().required();
const optionalPositiveInteger = Joi.number().integer().positive().optional();
const stringField = Joi.string().required();
const optionalStringField = Joi.string().optional().allow('');

// Audit validation schemas
export const auditSchemas = {
    // GET /audit/get
    getAuditLogs: Joi.object({
        organizationId: optionalPositiveInteger,
        userId: optionalPositiveInteger,
        objectTypeID: optionalPositiveInteger,
        actionTypeID: optionalPositiveInteger,
        sortBy: optionalStringField.valid(
            'timestamp',
            'action_type_id',
            'object_type_id',
            'user_id',
            'organization_id'
        ),
        sortOrder: optionalStringField.valid('asc', 'desc'),
    }),
};

export default auditSchemas;
