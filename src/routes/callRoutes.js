'use strict';

const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

/**
 * Call Records REST API Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /calls          — List all calls (supports ?status=...&limit=...)
 * GET /calls/:callSid — Get single call details by CallSid
 */

router.get('/', callController.getCalls);
router.get('/:callSid', callController.getCallBySid);

module.exports = router;
