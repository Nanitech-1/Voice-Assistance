'use strict';

const logger = require('../utils/logger');

/**
 * Global error handler middleware.
 * Must be registered LAST in Express middleware chain.
 * Catches all errors passed via next(err).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: isProduction && statusCode === 500
        ? 'Internal Server Error'
        : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
