const { AppError } = require('../middleware/errorHandler');

const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join(', ');
      return next(new AppError(errorMessages, 400));
    }

    req[source] = value;
    return next();
  };
};

module.exports = {
  validateRequest,
  validate: validateRequest
};
