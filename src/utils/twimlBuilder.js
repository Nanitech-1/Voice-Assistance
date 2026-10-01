'use strict';

const twilio = require('twilio');

const { VoiceResponse } = twilio.twiml;

/**
 * TwiML Builder — reusable helper for constructing Twilio Voice responses.
 * All TwiML generation logic lives here; never in controllers or routes.
 */
const twimlBuilder = {
  /**
   * Build a TwiML response that speaks a message and then hangs up.
   * @param {string} message - The text to speak.
   * @param {object} [options]
   * @param {string} [options.voice='Polly.Aditi'] - Twilio voice name.
   * @param {string} [options.language='en-IN'] - BCP-47 language tag.
   * @returns {string} TwiML XML string.
   */
  say(message, options = {}) {
    const response = new VoiceResponse();
    response.say(
      {
        voice: options.voice || 'Polly.Aditi',
        language: options.language || 'en-IN',
      },
      message
    );
    return response.toString();
  },

  /**
   * Build a TwiML response that plays a greeting then gathers speech/DTMF input.
   * @param {string} message - Greeting to speak before gathering.
   * @param {string} actionUrl - URL to POST the gathered input to.
   * @param {object} [options]
   * @param {string} [options.voice] - Twilio voice name.
   * @param {string} [options.language] - BCP-47 language tag.
   * @param {number} [options.timeout=5] - Seconds of silence before timeout.
   * @param {string} [options.hints] - Speech recognition hints (comma-separated).
   * @returns {string} TwiML XML string.
   */
  greetAndGather(message, actionUrl, options = {}) {
    const response = new VoiceResponse();

    const gather = response.gather({
      input: 'speech',
      action: actionUrl,
      method: 'POST',
      timeout: options.timeout || 5,
      language: options.language || 'en-IN',
      speechTimeout: 'auto',
      hints: options.hints || '',
    });

    gather.say(
      {
        voice: options.voice || 'Polly.Aditi',
        language: options.language || 'en-IN',
      },
      message
    );

    // Fallback if no input received
    response.say(
      {
        voice: options.voice || 'Polly.Aditi',
        language: options.language || 'en-IN',
      },
      'I did not catch that. Please call back and we will be happy to assist you. Goodbye!'
    );

    return response.toString();
  },

  /**
   * Build a TwiML response that speaks a message and then redirects.
   * @param {string} message - Text to speak.
   * @param {string} redirectUrl - URL to redirect to after speaking.
   * @param {object} [options]
   * @returns {string} TwiML XML string.
   */
  sayAndRedirect(message, redirectUrl, options = {}) {
    const response = new VoiceResponse();
    response.say(
      {
        voice: options.voice || 'Polly.Aditi',
        language: options.language || 'en-IN',
      },
      message
    );
    response.redirect({ method: 'POST' }, redirectUrl);
    return response.toString();
  },

  /**
   * Build a TwiML hangup response.
   * @returns {string} TwiML XML string.
   */
  hangup() {
    const response = new VoiceResponse();
    response.hangup();
    return response.toString();
  },
};

module.exports = twimlBuilder;
