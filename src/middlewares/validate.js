const AppError = require('../utils/AppError');

/**
 * Flexible validation middleware supporting body, params, or query dynamic keys
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'params' | 'query'} source - default: 'body'
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(', ');
    return next(new AppError(message, 400));
  }

  req[source] = result.data;
  next();
};

module.exports = validate;