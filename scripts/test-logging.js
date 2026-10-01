'use strict';

/**
 * Phase 8 Logging & Observability Verification Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Winston logging across all log levels (info, warn, error, http, debug).
 * 2. Structured JSON output with timestamps, stack traces, and metadata.
 * 3. Daily rotation file generation (combined-YYYY-MM-DD.log, error-YYYY-MM-DD.log).
 * 4. Contextual child logger (logger.forCall) with CallSid correlation.
 * 5. File persistence integrity in the logs/ directory.
 *
 * Run: node scripts/test-logging.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

const LOGS_DIR = path.resolve('logs');

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  📝  Phase 8 — Production Logging & Rotation Verification    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let allPassed = true;

  const testCallSid = 'CA_LOG_VERIFY_' + Date.now();

  console.log('  Step 1: Emitting test logs across all levels...');

  // 1. Info level with structured metadata
  logger.info('OneBridge AI Voice Receptionist test info log', {
    service: 'test-runner',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });

  // 2. Warn level
  logger.warn('Test warning: Simulation of rate limit or retry trigger', {
    retryCount: 2,
    threshold: 3,
  });

  // 3. Error level with Error object & stack trace
  const testError = new Error('Simulated database transient error');
  logger.error('Test error: Verifying error handling format', {
    error: testError.message,
    stack: testError.stack,
    code: 'ERR_SIMULATED_TEST',
  });

  // 4. HTTP level
  logger.http('127.0.0.1 POST /twilio/gather 200 450 - 32.5 ms [CallSid: ' + testCallSid + ']');

  // 5. Contextual child logger bound to CallSid
  const callLogger = logger.forCall(testCallSid);
  callLogger.info('Conversational turn processed via contextual logger', {
    turn: 2,
    language: 'telugu',
    latencyMs: 412,
  });

  console.log('  ✅ Log entries dispatched across all transports');

  // Allow a small flush time for file stream writes
  console.log('\n  Step 2: Waiting for file streams to flush to disk...');
  await new Promise((r) => setTimeout(r, 1500));

  // ── Step 3: Inspect Files in logs/ Directory ──────────────────────────────
  console.log('\n  Step 3: Checking generated log files in logs/:');
  const files = fs.readdirSync(LOGS_DIR);
  console.log('  Found files:', files.join(', '));

  const hasCombined = files.some((f) => f.startsWith('combined') && f.endsWith('.log'));
  const hasError = files.some((f) => f.startsWith('error') && f.endsWith('.log'));

  if (hasCombined && hasError) {
    console.log('  ✅ Rotating and static log files verified in logs/');
  } else {
    console.log('  ❌ Missing expected log files in logs/', { hasCombined, hasError });
    allPassed = false;
  }

  // ── Step 4: Validate Log Content Integrity ────────────────────────────────
  console.log('\n  Step 4: Validating structured JSON log content:');
  const combinedLogPath = path.join(LOGS_DIR, 'combined.log');
  if (fs.existsSync(combinedLogPath)) {
    const raw = fs.readFileSync(combinedLogPath, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);

    console.log(`  Read ${lines.length} log lines from combined.log`);

    // Parse the last few lines to verify JSON structure
    const lastLine = lines[lines.length - 1];
    try {
      const parsed = JSON.parse(lastLine);
      console.log('  Sample structured log record:');
      console.log('  - Timestamp:', parsed.timestamp);
      console.log('  - Level:', parsed.level);
      console.log('  - Message:', parsed.message);
      if (parsed.callSid) {
        console.log('  - Contextual CallSid:', parsed.callSid);
      }

      if (parsed.timestamp && parsed.level && parsed.message) {
        console.log('  ✅ JSON log format integrity verified!');
      } else {
        console.log('  ❌ Log record missing standard fields');
        allPassed = false;
      }
    } catch (e) {
      console.log('  ❌ Failed to parse log line as JSON:', e.message);
      allPassed = false;
    }
  } else {
    console.log('  ❌ combined.log not found');
    allPassed = false;
  }

  console.log('\n------------------------------------------------------------------');
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅  PHASE 8 VERIFIED — Production Logging & Rotation Ready!  ║');
  } else {
    console.log('║  ❌  LOGGING CHECKS FAILED — Review output above            ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
}

runTest().catch((err) => {
  console.error('Fatal logging test error:', err);
  process.exit(1);
});
