'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * HTTP Request Logger Middleware (Phase 8 Production Logging)
 * ─────────────────────────────────────────────────────────────────────────────
 * Combines Morgan HTTP tokenization with Winston structured streaming.
 * Includes CallSid tokenization for direct request-to-call traceability.
 */

// Custom Morgan token for Twilio CallSid
morgan.token('call-sid', (req) => {
  return req.body?.CallSid || req.query?.callSid || req.params?.callSid || '-';
});

// Stream piping Morgan into Winston
const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Skip noisy health check calls from monitoring scrapers
const skipHealthCheck = (req) => req.url === '/health';

const requestLogger = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms [CallSid: :call-sid]',
  {
    stream: morganStream,
    skip: skipHealthCheck,
  }
);

module.exports = requestLogger;
