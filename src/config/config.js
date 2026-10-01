'use strict';

require('dotenv').config();

/**
 * Centralized configuration loader.
 * All environment variables are accessed through this module.
 * Throws immediately on startup if required vars are missing.
 */

function getEnv(key, fallback = '') {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production' && !fallback) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return fallback;
  }
  return value;
}

const config = {
  // ── Server ──────────────────────────────────────────────────────────
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // ── Database ─────────────────────────────────────────────────────────
  mongoUri: getEnv('MONGO_URI', 'mongodb://localhost:27017/voiceReceptionist'),

  // ── Twilio ───────────────────────────────────────────────────────────
  twilio: {
    accountSid: getEnv('TWILIO_ACCOUNT_SID', 'AC_dev_dummy_account_sid'),
    authToken: getEnv('TWILIO_AUTH_TOKEN', 'dev_dummy_auth_token'),
    phoneNumber: getEnv('TWILIO_PHONE_NUMBER', '+1234567890'),
  },

  // ── Google Gemini ────────────────────────────────────────────────────
  geminiApiKey: getEnv('GEMINI_API_KEY', 'dummy_gemini_api_key'),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // ── App ──────────────────────────────────────────────────────────────
  baseUrl:
    process.env.BASE_URL ||
    (process.env.RENDER_EXTERNAL_HOSTNAME
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
      : getEnv('BASE_URL', 'http://localhost:3000')),

  // ── Logging ──────────────────────────────────────────────────────────
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
