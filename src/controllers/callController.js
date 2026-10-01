'use strict';

const callService = require('../services/callService');
const logger = require('../utils/logger');

/**
 * Call Controller — REST API handler for Call records & Conversation History.
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin controller forwarding requests to callService.
 */
const callController = {
  /**
   * GET /calls
   * Query all call records with optional filtering.
   * Query params:
   *   - status: 'completed' | 'in-progress' | 'ringing' | 'failed'
   *   - limit: number (default 50)
   */
  async getCalls(req, res, next) {
    try {
      const { status, limit } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (limit) filters.limit = parseInt(limit, 10);

      const calls = await callService.getAllCalls(filters);

      return res.status(200).json({
        success: true,
        count: calls.length,
        data: calls,
      });
    } catch (err) {
      logger.error('Error in getCalls controller', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /calls/:callSid
   * Get single call record by CallSid.
   */
  async getCallBySid(req, res, next) {
    try {
      const { callSid } = req.params;
      const call = await callService.getCallBySid(callSid);

      if (!call) {
        return res.status(404).json({
          success: false,
          error: { message: `Call record not found for SID: ${callSid}` },
        });
      }

      return res.status(200).json({
        success: true,
        data: call,
      });
    } catch (err) {
      logger.error('Error in getCallBySid controller', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /history
   * Get conversation history.
   * Optional query param: ?callSid=...
   */
  async getHistory(req, res, next) {
    try {
      const { callSid, limit } = req.query;

      if (callSid) {
        const history = await callService.getHistoryByCallSid(callSid);
        return res.status(200).json({
          success: true,
          callSid,
          count: history.length,
          data: history,
        });
      }

      // If no specific callSid, return recent calls with their histories
      const calls = await callService.getAllCalls({ limit: limit ? parseInt(limit, 10) : 20 });
      const formatted = calls.map((c) => ({
        callSid: c.callSid,
        callerNumber: c.callerNumber,
        customerName: c.customerDetails?.name || null,
        duration: c.duration,
        turnCount: c.turnCount,
        startTime: c.startTime,
        endTime: c.endTime,
        conversationHistory: c.conversationHistory,
      }));

      return res.status(200).json({
        success: true,
        count: formatted.length,
        data: formatted,
      });
    } catch (err) {
      logger.error('Error in getHistory controller', { error: err.message });
      next(err);
    }
  },

  /**
   * GET /history/:callSid
   * Get conversation history for a specific call.
   */
  async getHistoryBySid(req, res, next) {
    try {
      const { callSid } = req.params;
      const history = await callService.getHistoryByCallSid(callSid);

      if (!history || history.length === 0) {
        // Check if call exists without history
        const call = await callService.getCallBySid(callSid);
        if (!call) {
          return res.status(404).json({
            success: false,
            error: { message: `Call record not found for SID: ${callSid}` },
          });
        }
      }

      return res.status(200).json({
        success: true,
        callSid,
        count: history.length,
        data: history,
      });
    } catch (err) {
      logger.error('Error in getHistoryBySid controller', { error: err.message });
      next(err);
    }
  },
};

module.exports = callController;
