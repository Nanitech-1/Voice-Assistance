'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./src/config/config');
const db = require('./src/config/database');
const routes = require('./src/routes/index');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

// ── Create Express App ────────────────────────────────────────────────────────
const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.isDev ? '*' : config.baseUrl,
  methods: ['GET', 'POST'],
}));

// ── Body Parsers ──────────────────────────────────────────────────────────────
// Twilio sends webhooks as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
// Also support JSON bodies for REST API endpoints
app.use(express.json());

// ── Request Logging ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', routes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
});

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = config.port;

app.listen(PORT, async () => {
  // Connect to MongoDB Atlas
  await db.connect();

  logger.info(`🚀 OneBridge AI Voice Receptionist running`, {
    port: PORT,
    env: config.nodeEnv,
    baseUrl: config.baseUrl,
  });
  logger.info(`📞 Twilio webhook URL: ${config.baseUrl}/twilio/incoming-call`);
  logger.info(`❤️  Health check: ${config.baseUrl}/health`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

// ── Unhandled Promise Rejections ──────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason, promise });
});

module.exports = app; // Export for testing
