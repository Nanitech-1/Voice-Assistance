'use strict';

const express = require('express');
const router = express.Router();

const twilioRoutes = require('./twilioRoutes');
const leadRoutes = require('./leadRoutes');
const callRoutes = require('./callRoutes');
const historyRoutes = require('./historyRoutes');
const twilioController = require('../controllers/twilioController');
const validateTwilioSignature = require('../middleware/validateTwilio');

/**
 * Central Route Aggregator — Phase 7 REST APIs
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoints:
 *   GET  /health          — Service health check
 *   GET  /leads           — List captured customer leads (supports ?status=...&isComplete=...&limit=...)
 *   GET  /leads/:id       — Get specific lead by ID or CallSid
 *   GET  /calls           — List call records & metrics (supports ?status=...&limit=...)
 *   GET  /calls/:callSid  — Get specific call metrics by CallSid
 *   GET  /history         — List conversation transcripts across calls
 *   GET  /history/:callSid— Full conversation transcript for a call
 *   POST /incoming-call   — Top-level Twilio Voice webhook alias
 *   POST /twilio/*        — Twilio voice webhooks (/incoming-call, /gather, /status)
 */

// ── Root Endpoint ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'OneBridge AI Voice Receptionist',
    persona: 'Priya (Executive Receptionist for Mr. Vinay Avala)',
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      leads: 'GET /leads',
      calls: 'GET /calls',
      history: 'GET /history',
      twilioVoiceWebhook: 'POST /incoming-call',
      twilioStatusWebhook: 'POST /twilio/status',
    },
    message: 'OneBridge AI Voice Receptionist is running and ready to handle incoming phone calls.',
  });
});

// ── Health Check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OneBridge AI Voice Receptionist is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── REST API Endpoints ────────────────────────────────────────────────────────
router.use('/leads', leadRoutes);
router.use('/calls', callRoutes);
router.use('/history', historyRoutes);

// ── Twilio Webhook Endpoints ──────────────────────────────────────────────────
router.use('/twilio', twilioRoutes);

// Top-level aliases specified in requirements
router.post('/incoming-call', validateTwilioSignature, twilioController.incomingCall);

module.exports = router;
