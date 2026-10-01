'use strict';

const twilioService = require('../services/twilioService');
const logger = require('../utils/logger');

/**
 * Twilio Controller — thin layer between routes and service.
 * Phase 2: gather() is now async (calls Gemini AI).
 */
const twilioController = {
  /**
   * POST /twilio/incoming-call
   * Twilio calls this when a new incoming call arrives.
   * Responds with TwiML greeting + gather.
   */
  async incomingCall(req, res, next) {
    try {
      const callData = req.body;
      const twiml = await twilioService.handleIncomingCall(callData);

      res.set('Content-Type', 'text/xml');
      res.status(200).send(twiml);
    } catch (err) {
      logger.error('Error in incomingCall controller', { error: err.message });
      next(err);
    }
  },

  /**
   * POST /twilio/gather
   * Receives caller's transcribed speech from Twilio Gather.
   * Passes to Gemini AI and responds with AI-generated TwiML.
   */
  async gather(req, res, next) {
    try {
      const gatherData = req.body;
      const twiml = await twilioService.handleGather(gatherData);

      res.set('Content-Type', 'text/xml');
      res.status(200).send(twiml);
    } catch (err) {
      logger.error('Error in gather controller', {
        callSid: req.body?.CallSid,
        error: err.message,
      });

      // Safe fallback TwiML — never send an empty response to Twilio
      const fallback = twilioService.handleNoInput();
      res.set('Content-Type', 'text/xml');
      res.status(200).send(fallback);
    }
  },

  /**
   * POST /twilio/status
   * Twilio calls this when call status changes.
   * Finalizes CallRecord in MongoDB and cleans up Gemini session.
   */
  async statusCallback(req, res, next) {
    try {
      await twilioService.handleStatusCallback(req.body);
      res.sendStatus(204);
    } catch (err) {
      logger.error('Error in statusCallback controller', { error: err.message });
      next(err);
    }
  },
};

module.exports = twilioController;
