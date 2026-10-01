'use strict';

const CallRecord = require('../models/CallRecord');
const Lead = require('../models/Lead');
const logger = require('../utils/logger');

/**
 * Call Service — Manages call records, durations, timestamps, and conversation history in MongoDB.
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean architecture service layer for call persistence.
 */
const callService = {
  /**
   * Create an initial call record when an incoming call arrives.
   *
   * @param {object} callData
   * @param {string} callData.callSid - Twilio unique call identifier
   * @param {string} callData.callerNumber - Phone number calling in
   * @param {string} [callData.recipientNumber] - Twilio number called
   * @returns {Promise<object|null>} Created CallRecord document
   */
  async createCall(callData) {
    try {
      const { callSid, callerNumber, recipientNumber } = callData;

      const record = new CallRecord({
        callSid,
        callerNumber,
        recipientNumber: recipientNumber || null,
        callStatus: 'ringing',
        startTime: new Date(),
        conversationHistory: [],
      });

      await record.save();

      logger.info('CallRecord initialized in MongoDB', {
        callSid,
        callerNumber,
        recordId: record._id,
      });

      return record;
    } catch (err) {
      logger.error('Failed to initialize CallRecord', {
        callSid: callData.callSid,
        error: err.message,
      });
      return null;
    }
  },

  /**
   * Append an ongoing conversation turn to the call record in MongoDB.
   *
   * @param {string} callSid
   * @param {string} userMessage
   * @param {string} aiResponse
   * @param {string} language
   * @returns {Promise<void>}
   */
  async appendTurn(callSid, userMessage, aiResponse, language = 'english') {
    try {
      const now = new Date();
      const turns = [
        { role: 'user', content: userMessage, language, timestamp: now },
        { role: 'model', content: aiResponse, language, timestamp: new Date(now.getTime() + 100) },
      ];

      await CallRecord.findOneAndUpdate(
        { callSid },
        {
          $push: { conversationHistory: { $each: turns } },
          $inc: { turnCount: 1 },
          $set: { callStatus: 'in-progress' },
        },
        { returnDocument: 'after' }
      );

      logger.debug('Appended turn to CallRecord', { callSid, language });
    } catch (err) {
      logger.error('Failed to append turn to CallRecord', {
        callSid,
        error: err.message,
      });
    }
  },

  /**
   * Finalize call record upon call termination.
   * Syncs duration, status, final transcript, and customer details.
   *
   * @param {object} statusData - Twilio status webhook payload
   * @param {Array} [sessionHistory] - In-memory Gemini conversation turns
   * @param {object} [sessionMeta] - In-memory session metrics
   * @returns {Promise<object|null>}
   */
  async finalizeCall(statusData, sessionHistory = [], sessionMeta = null) {
    const { CallSid, CallStatus, CallDuration } = statusData;

    try {
      // 1. Calculate final duration in seconds
      let durationSeconds = 0;
      if (CallDuration) {
        durationSeconds = parseInt(CallDuration, 10);
      } else if (sessionMeta && sessionMeta.durationMs) {
        durationSeconds = Math.round(sessionMeta.durationMs / 1000);
      }

      // 2. Fetch associated Lead to sync customer details
      const lead = await Lead.findOne({ callSid: CallSid });

      const customerDetails = {
        name: lead?.name || null,
        phone: lead?.phone || statusData.From || null,
        requirement: lead?.requirement || null,
        language: lead?.language || sessionMeta?.currentLanguage || 'english',
      };

      // 3. Format full conversation history if provided
      const updatePayload = {
        callStatus: (CallStatus || 'completed').toLowerCase(),
        duration: durationSeconds,
        endTime: new Date(),
        customerDetails,
        leadId: lead?._id || null,
      };

      if (Array.isArray(sessionHistory) && sessionHistory.length > 0) {
        updatePayload.conversationHistory = sessionHistory.map((item) => ({
          role: item.role === 'model' ? 'model' : 'user',
          content: item.content,
          language: item.language || 'english',
          timestamp: item.timestamp || new Date(),
        }));
        updatePayload.turnCount = Math.floor(sessionHistory.length / 2);
      }

      const updatedRecord = await CallRecord.findOneAndUpdate(
        { callSid: CallSid },
        { $set: updatePayload },
        { returnDocument: 'after', upsert: true }
      );

      logger.info('CallRecord finalized in MongoDB', {
        callSid: CallSid,
        status: updatedRecord.callStatus,
        durationSeconds: updatedRecord.duration,
        turnCount: updatedRecord.turnCount,
        customerName: customerDetails.name,
      });

      return updatedRecord;
    } catch (err) {
      logger.error('Failed to finalize CallRecord', {
        callSid: CallSid,
        error: err.message,
      });
      return null;
    }
  },

  /**
   * Get single call record by CallSid with full conversation history.
   *
   * @param {string} callSid
   * @returns {Promise<object|null>}
   */
  async getCallBySid(callSid) {
    try {
      return await CallRecord.findOne({ callSid }).populate('leadId').lean();
    } catch (err) {
      logger.error('Failed to fetch call by SID', { callSid, error: err.message });
      return null;
    }
  },

  /**
   * Get paginated list of calls.
   *
   * @param {object} [filters]
   * @param {string} [filters.status]
   * @param {number} [filters.limit=50]
   * @returns {Promise<Array>}
   */
  async getAllCalls(filters = {}) {
    try {
      const query = {};
      if (filters.status) query.callStatus = filters.status;

      const limit = parseInt(filters.limit, 10) || 50;

      return await CallRecord.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('leadId')
        .lean();
    } catch (err) {
      logger.error('Failed to fetch all calls', { error: err.message });
      return [];
    }
  },

  /**
   * Get just the conversation history for a specific call.
   *
   * @param {string} callSid
   * @returns {Promise<Array>}
   */
  async getHistoryByCallSid(callSid) {
    try {
      const call = await CallRecord.findOne({ callSid }, { conversationHistory: 1, callSid: 1 }).lean();
      return call ? call.conversationHistory : [];
    } catch (err) {
      logger.error('Failed to fetch history by SID', { callSid, error: err.message });
      return [];
    }
  },
};

module.exports = callService;
