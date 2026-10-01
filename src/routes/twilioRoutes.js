'use strict';

const express = require('express');
const router = express.Router();

const twilioController = require('../controllers/twilioController');
const validateTwilioSignature = require('../middleware/validateTwilio');

/**
 * Twilio Voice Webhook Routes
 *
 * All routes are prefixed with /twilio (set in src/routes/index.js)
 *
 * POST /twilio/incoming-call  — Handle new incoming call (set as Twilio Voice URL)
 * POST /twilio/gather         — Handle gathered caller speech/DTMF
 * POST /twilio/status         — Handle call status callbacks
 */

// Apply Twilio signature validation to all routes in this router
router.use(validateTwilioSignature);

// Twilio Voice webhook — set this URL in your Twilio console
router.post('/incoming-call', twilioController.incomingCall);

// Gather callback — receives caller's spoken input
router.post('/gather', twilioController.gather);

// Status callback — receives call lifecycle events
router.post('/status', twilioController.statusCallback);

module.exports = router;
