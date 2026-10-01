'use strict';

const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

/**
 * Lead REST API Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /leads           — List all leads (supports ?status=...&isComplete=...&limit=...)
 * GET /leads/:identifier — Get single lead by MongoDB ID or CallSid
 */

router.get('/', leadController.getLeads);
router.get('/:identifier', leadController.getLeadById);

module.exports = router;
