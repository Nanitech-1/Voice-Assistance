'use strict';

const twilio = require('twilio');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Twilio signature validation middleware.
 * Validates that incoming requests are genuinely from Twilio.
 * Should be applied to all Twilio webhook routes in production.
 *
 * Skips validation in development mode to allow easy local testing.
 */
function validateTwilioSignature(req, res, next) {
  // Skip validation in development for easier local testing
  if (config.isDev) {
    logger.warn('Twilio signature validation SKIPPED (development mode)');
    return next();
  }

  const authToken = config.twilio.authToken;
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${config.baseUrl}${req.originalUrl}`;
  const params = req.body || {};

  const isValid = twilio.validateRequest(authToken, twilioSignature, url, params);

  if (!isValid) {
    logger.warn('Invalid Twilio signature', {
      url,
      signature: twilioSignature,
    });
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: Invalid Twilio signature' },
    });
  }

  return next();
}

module.exports = validateTwilioSignature;
