'use strict';

const leadService = require('../services/leadService');
const logger = require('../utils/logger');

/**
 * Lead Controller — REST API handler for Lead entities.
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin controller forwarding requests to leadService.
 */
const leadController = {
  /**
   * GET /leads
   * Query leads with optional filters.
   * Query params:
   *   - status: 'new' | 'contacted' | 'qualified' | 'closed'
   *   - isComplete: 'true' | 'false'
   *   - limit: number (default 50)
   */
  async getLeads(req, res, next) {
    try {
      const { status, isComplete, limit } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (typeof isComplete !== 'undefined') {
        filters.isComplete = isComplete === 'true';
      }
      if (limit) filters.limit = parseInt(limit, 10);

      const leads = await leadService.getAllLeads(filters);

      return res.status(200).json({
        success: true,
        count: leads.length,
        data: leads,
      });
    } catch (err) {
      logger.error('Error in getLeads controller', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /leads/:identifier
   * Get single lead by MongoDB ID or CallSid.
   */
  async getLeadById(req, res, next) {
    try {
      const { identifier } = req.params;

      let lead = await leadService.getLeadByCallSid(identifier);
      if (!lead) {
        const Lead = require('../models/Lead');
        // If not callSid, attempt by MongoDB ObjectId
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
          lead = await Lead.findById(identifier).lean();
        }
      }

      if (!lead) {
        return res.status(404).json({
          success: false,
          error: { message: `Lead not found for: ${identifier}` },
        });
      }

      return res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (err) {
      logger.error('Error in getLeadById controller', { error: err.message });
      next(err);
    }
  },
};

module.exports = leadController;
