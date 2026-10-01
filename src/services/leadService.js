'use strict';

const Lead = require('../models/Lead');
const logger = require('../utils/logger');

/**
 * Lead Service — all business logic for lead management.
 *
 * Responsibilities:
 * - Create a lead record when a call starts
 * - Update lead with extracted name/phone/requirement as conversation progresses
 * - Detect language from AI conversation context
 * - Query leads for the REST API (Phase 7)
 */
const leadService = {
  /**
   * Create a new lead record when a call starts.
   * Called from twilioService.handleIncomingCall().
   *
   * @param {object} callData
   * @param {string} callData.callSid
   * @param {string} callData.callerNumber
   * @returns {Promise<object>} Created lead document
   */
  async createLead(callData) {
    try {
      const { callSid, callerNumber } = callData;

      const lead = new Lead({
        callSid,
        callerNumber,
        source: 'voice-call',
      });

      await lead.save();

      logger.info('Lead record created', {
        leadId: lead._id,
        callSid,
        callerNumber,
      });

      return lead;
    } catch (err) {
      // Don't throw — lead creation failure should not break the call
      logger.error('Failed to create lead', {
        error: err.message,
        callSid: callData.callSid,
      });
      return null;
    }
  },

  /**
   * Update a lead with extracted information from the conversation.
   * Called after each AI turn where new info is detected.
   *
   * @param {string} callSid
   * @param {object} updates - Fields to update (name, phone, requirement, language)
   * @returns {Promise<object|null>} Updated lead document
   */
  async updateLead(callSid, updates) {
    try {
      // Only update fields that are provided and not already set
      const updatePayload = {};

      if (updates.name) updatePayload.name = updates.name;
      if (updates.phone) updatePayload.phone = updates.phone;
      if (updates.requirement) updatePayload.requirement = updates.requirement;
      if (updates.language) updatePayload.language = updates.language;
      if (updates.notes) updatePayload.notes = updates.notes;

      const lead = await Lead.findOneAndUpdate(
        { callSid },
        { $set: updatePayload },
        { returnDocument: 'after', runValidators: true }
      );

      if (!lead) {
        logger.warn('Lead not found for update', { callSid });
        return null;
      }

      logger.info('Lead updated', {
        leadId: lead._id,
        callSid,
        updates: updatePayload,
        isComplete: lead.isComplete,
      });

      return lead;
    } catch (err) {
      logger.error('Failed to update lead', {
        error: err.message,
        callSid,
        updates,
      });
      return null;
    }
  },

  /**
   * Get a lead by CallSid.
   *
   * @param {string} callSid
   * @returns {Promise<object|null>}
   */
  async getLeadByCallSid(callSid) {
    try {
      return await Lead.findOne({ callSid });
    } catch (err) {
      logger.error('Failed to fetch lead by callSid', { error: err.message, callSid });
      return null;
    }
  },

  /**
   * Get all leads, newest first.
   * Used by Phase 7 GET /leads API.
   *
   * @param {object} [filters]
   * @param {string} [filters.status] - Filter by status
   * @param {boolean} [filters.isComplete] - Filter by completeness
   * @param {number} [filters.limit=50] - Max results
   * @returns {Promise<Array>}
   */
  async getAllLeads(filters = {}) {
    try {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (typeof filters.isComplete === 'boolean') query.isComplete = filters.isComplete;

      const limit = parseInt(filters.limit, 10) || 50;

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      logger.info('Leads fetched', { count: leads.length, filters });
      return leads;
    } catch (err) {
      logger.error('Failed to fetch leads', { error: err.message });
      return [];
    }
  },

  /**
   * Extract lead information from a conversation exchange.
   * Uses simple pattern matching to pick up name/phone/requirement.
   * Phase 4 will enhance this with Gemini-based extraction.
   *
   * @param {string} userMessage - What the caller said
   * @param {string} aiResponse - What the AI responded
   * @returns {object} Extracted fields (may be partially empty)
   */
  extractLeadInfo(userMessage, aiResponse) {
    const extracted = {};

    // ── Phone number detection (Indian + International) ───────────────────
    const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{9}|(?:\+1[\s-]?)?\d{10}/g;
    const phoneMatch = userMessage.match(phoneRegex);
    if (phoneMatch) {
      extracted.phone = phoneMatch[0].replace(/[\s-]/g, '');
    }

    // ── Name detection (after "my name is" / "I am" / "nenu") ────────────
    // Negative lookahead prevents capturing stopwords (and, my, the, is, or)
    const namePatterns = [
      /my name is\s+([A-Za-z]+(?:\s+(?!and\b|my\b|the\b|is\b|or\b|i\b)[A-Za-z]+){0,2})/i,
      /i(?:'m| am)\s+([A-Za-z]+(?:\s+(?!and\b|from\b|the\b|calling\b)[A-Za-z]+){0,2})(?=\s|,|$)/i,
      /this is\s+([A-Za-z]+(?:\s+(?!and\b|from\b|calling\b)[A-Za-z]+){0,2})(?=\s|,|$)/i,
      /nenu\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,1})(?=\s|,|$)/i,      // Telugu: "I am"
      /mee peru\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,1})(?=\s|,|$)/i,  // Telugu: "my name"
    ];

    for (const pattern of namePatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        // Strip trailing stopwords and normalize whitespace
        extracted.name = match[1]
          .trim()
          .replace(/\s+(and|my|the|or|is|from|calling)$/i, '')
          .trim();
        break;
      }
    }

    // ── Language detection ────────────────────────────────────────────────
    const teluguChars = /[\u0C00-\u0C7F]/;
    const teluguWords = /\b(nenu|meeru|mee|maa|enti|cheppandi|cheppagalara|dhanyavaadalu|bagundi|ledu|avunu|kaadu)\b/i;

    if (teluguChars.test(userMessage)) {
      extracted.language = 'telugu';
    } else if (teluguWords.test(userMessage)) {
      extracted.language = 'mixed';
    } else {
      extracted.language = 'english';
    }

    // ── Requirement detection (service keywords) ──────────────────────────
    const services = [
      'software', 'website', 'web', 'mobile app', 'android', 'ios',
      'crm', 'outsystems', 'cybersecurity', 'react', 'node', 'nodejs',
      'python', 'java', 'full stack', 'fullstack', 'training', 'course',
      'development', 'staffing', 'outsourcing',
    ];

    const lowerMessage = userMessage.toLowerCase();
    const matchedServices = services.filter((s) => lowerMessage.includes(s));

    if (matchedServices.length > 0) {
      extracted.requirement = matchedServices.join(', ');
    }

    return extracted;
  },
};

module.exports = leadService;
