'use strict';

const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

/**
 * MongoDB connection manager.
 * - Connects once on startup
 * - Retries automatically on disconnect (Mongoose handles this)
 * - Exposes connect() and disconnect() for lifecycle management
 */

mongoose.set('bufferCommands', false);

// Mongoose connection options
const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 5000,  // Fail fast if Atlas unreachable
  socketTimeoutMS: 45000,
  maxPoolSize: 10,                 // Max concurrent connections
  retryWrites: true,
  bufferCommands: false,
};

const db = {
  /**
   * Connect to MongoDB Atlas.
   * Call once from server.js on startup.
   */
  async connect() {
    try {
      await mongoose.connect(config.mongoUri, MONGOOSE_OPTIONS);
      logger.info('✅ MongoDB Atlas connected', {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      });
    } catch (err) {
      logger.error('❌ MongoDB connection failed', {
        error: err.message,
        uri: config.mongoUri.replace(/:([^@]+)@/, ':****@'), // mask password
      });
      // Don't crash server — DB features will be unavailable but calls still work
    }
  },

  /**
   * Gracefully disconnect from MongoDB.
   * Called on server shutdown (SIGTERM/SIGINT).
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected cleanly');
    } catch (err) {
      logger.error('Error disconnecting from MongoDB', { error: err.message });
    }
  },
};

// ── Connection Event Listeners ──────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — Mongoose will auto-retry');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

module.exports = db;
