'use strict';

const config = require('../config/config');
const twimlBuilder = require('../utils/twimlBuilder');
const geminiService = require('../ai/geminiService');
const leadService = require('./leadService');
const callService = require('./callService');
const logger = require('../utils/logger');

/**
 * Twilio Service — all Twilio-related business logic.
 * Phase 6: Integrated with MongoDB call records and full conversation history.
 */
const twilioService = {
  /**
   * Handle an incoming call.
   * Creates a lead record and a call record in MongoDB, then plays the greeting.
   *
   * @param {object} callData - Parsed body from Twilio webhook.
   * @returns {string} TwiML XML string.
   */
  async handleIncomingCall(callData) {
    const { CallSid, From, To } = callData;

    logger.info('Incoming call received', {
      callSid: CallSid,
      from: From,
      to: To,
    });

    // Create lead record and call record in MongoDB in parallel
    await Promise.all([
      leadService.createLead({
        callSid: CallSid,
        callerNumber: From,
      }),
      callService.createCall({
        callSid: CallSid,
        callerNumber: From,
        recipientNumber: To,
      }),
    ]);

    const greetingMessage =
      'Hello! Thank you for calling OneBridge Infotech. ' +
      'I am Priya, the AI executive receptionist for Vinay. ' +
      'How can I help you today?';

    const gatherUrl = `${config.baseUrl}/twilio/gather`;

    return twimlBuilder.greetAndGather(greetingMessage, gatherUrl, {
      voice: 'Polly.Aditi',
      language: 'en-IN',
      timeout: 5,
      hints:
        'software, website, mobile app, training, courses, CRM, OutSystems, ' +
        'cybersecurity, React, Node, Python, Java, full stack',
    });
  },

  /**
   * Handle gathered speech.
   * Sends to Gemini AI, extracts lead info, updates MongoDB, returns TwiML.
   *
   * @param {object} gatherData
   * @returns {Promise<string>} TwiML XML string.
   */
  async handleGather(gatherData) {
    const { CallSid, SpeechResult, Confidence } = gatherData;

    // No speech detected — ask again
    if (!SpeechResult || SpeechResult.trim() === '') {
      logger.warn('No speech result in gather', { callSid: CallSid });
      return this._buildRetryTwiML(CallSid);
    }

    logger.info('Speech gathered from caller', {
      callSid: CallSid,
      speech: SpeechResult,
      confidence: Confidence,
    });

    // Get AI response from Gemini (Phase 5: returns text + detected language)
    const aiResult = await geminiService.chat(CallSid, SpeechResult);
    const aiResponse = typeof aiResult === 'string' ? aiResult : (aiResult.text || String(aiResult));
    const detectedLang = (typeof aiResult === 'object' && aiResult.language) ? aiResult.language : 'english';

    // ── Extract and save lead info from this turn ─────────────────────────
    const extracted = leadService.extractLeadInfo(SpeechResult, aiResponse);
    extracted.language = detectedLang;

    // Update lead info and append turn to call record in parallel
    await Promise.all([
      Object.keys(extracted).length > 0 ? leadService.updateLead(CallSid, extracted) : Promise.resolve(),
      callService.appendTurn(CallSid, SpeechResult, aiResponse, detectedLang),
    ]);

    // Check if conversation is ending
    const isEndingCall = this._isConversationEnding(aiResponse);

    // Dynamic voice language based on detected caller language
    const voiceLanguage = detectedLang === 'telugu' ? 'te-IN' : 'en-IN';

    if (isEndingCall) {
      logger.info('Conversation ending — hanging up', { callSid: CallSid, detectedLang });
      return twimlBuilder.say(aiResponse, {
        voice: 'Polly.Aditi',
        language: voiceLanguage,
      });
    }

    // Continue conversation loop
    const gatherUrl = `${config.baseUrl}/twilio/gather`;
    return twimlBuilder.greetAndGather(aiResponse, gatherUrl, {
      voice: 'Polly.Aditi',
      language: voiceLanguage,
      timeout: 5,
    });
  },

  /**
   * Handle call status callback from Twilio.
   * Cleans up Gemini session and finalizes CallRecord in MongoDB.
   *
   * @param {object} statusData - Twilio webhook status payload
   */
  async handleStatusCallback(statusData) {
    const { CallSid, CallStatus, CallDuration, From, To } = statusData;

    logger.info('Call status update', {
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration,
      from: From,
      to: To,
    });

    // Clean up session and persist to MongoDB when call terminates
    if (
      CallStatus === 'completed' ||
      CallStatus === 'failed' ||
      CallStatus === 'busy' ||
      CallStatus === 'no-answer' ||
      CallStatus === 'canceled'
    ) {
      const sessionMeta = geminiService.getSessionMeta(CallSid);
      const history = geminiService.endSession(CallSid);

      const finalized = await callService.finalizeCall(statusData, history, sessionMeta);

      logger.info('Call ended — record finalized in MongoDB', {
        callSid: CallSid,
        duration: finalized?.duration || CallDuration,
        turnCount: finalized?.turnCount || 0,
      });
    }
  },

  /**
   * Handle no-input fallback.
   * @returns {string} TwiML XML
   */
  handleNoInput() {
    return twimlBuilder.say(
      'I\'m sorry, I did not receive any input. ' +
        'Please call us back at OneBridge Infotech and we will be happy to assist you. Goodbye!',
      { voice: 'Polly.Aditi', language: 'en-IN' }
    );
  },

  // ── Private Helpers ───────────────────────────────────────────────────────

  _buildRetryTwiML(callSid) {
    const retryMessage =
      'I\'m sorry, I didn\'t catch that. Could you please repeat what you said?';
    const gatherUrl = `${config.baseUrl}/twilio/gather`;
    logger.debug('Building retry TwiML', { callSid });
    return twimlBuilder.greetAndGather(retryMessage, gatherUrl, {
      voice: 'Polly.Aditi',
      language: 'en-IN',
      timeout: 7,
    });
  },

  _isConversationEnding(response) {
    const endingPhrases = [
      'have a great day',
      'goodbye',
      'good bye',
      'take care',
      'thank you for calling',
      'dhanyavaadalu',
      'bagundali',
      'mee rojanti',
    ];
    const lower = response.toLowerCase();
    return endingPhrases.some((phrase) => lower.includes(phrase));
  },
};

module.exports = twilioService;
