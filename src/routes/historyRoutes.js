'use strict';

const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

/**
 * Conversation History REST API Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /history          — List conversation histories across calls (supports ?callSid=...&limit=...)
 * GET /history/:callSid  — Get full dialogue transcript for a specific CallSid
 */

router.get('/', callController.getHistory);
router.get('/:callSid', callController.getHistoryBySid);

module.exports = router;
