'use strict';

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

const { combine, timestamp, printf, colorize, errors, json } = format;

// Ensure logs directory exists
const LOGS_DIR = path.resolve('logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ── Custom console format (human-readable for dev) ────────────────────────────
const devConsoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, callSid, ...meta }) => {
    let log = `[${timestamp}] ${level}:`;
    if (callSid) log += ` [${callSid}]`;
    log += ` ${message}`;
    if (stack) log += `\n${stack}`;
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// ── JSON format for production / cloud / rotating log files ───────────────────
const prodFileFormat = combine(
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  errors({ stack: true }),
  json()
);

// ── Rotating Transports ───────────────────────────────────────────────────────
const dailyRotateCombined = new DailyRotateFile({
  dirname: LOGS_DIR,
  filename: 'combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: prodFileFormat,
});

const dailyRotateError = new DailyRotateFile({
  dirname: LOGS_DIR,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: prodFileFormat,
});

// Also keep standard static files for easy developer tailing
const staticCombinedFile = new transports.File({
  filename: path.join(LOGS_DIR, 'combined.log'),
  format: prodFileFormat,
});

const staticErrorFile = new transports.File({
  filename: path.join(LOGS_DIR, 'error.log'),
  level: 'error',
  format: prodFileFormat,
});

// ── Transports Array ──────────────────────────────────────────────────────────
const logTransports = [
  new transports.Console({
    format: config.isDev ? devConsoleFormat : prodFileFormat,
  }),
  dailyRotateCombined,
  dailyRotateError,
  staticCombinedFile,
  staticErrorFile,
];

// ── Create Winston Logger ─────────────────────────────────────────────────────
const logger = createLogger({
  level: config.logLevel || 'info',
  transports: logTransports,
  exitOnError: false,
  exceptionHandlers: [
    new transports.File({
      filename: path.join(LOGS_DIR, 'exceptions.log'),
      format: prodFileFormat,
    }),
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(LOGS_DIR, 'rejections.log'),
      format: prodFileFormat,
    }),
  ],
});

/**
 * Return a contextual child logger with CallSid pre-bound.
 *
 * @param {string} callSid
 * @returns {winston.Logger}
 */
logger.forCall = function (callSid) {
  return logger.child({ callSid });
};

module.exports = logger;
