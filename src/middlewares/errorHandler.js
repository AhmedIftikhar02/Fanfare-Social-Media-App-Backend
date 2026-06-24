const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });

  res.status(statusCode).json({
    status,
    message: err.isOperational ? err.message : 'Something went wrong',
  });
};

module.exports = errorHandler;