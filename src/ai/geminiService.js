'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');
const SYSTEM_PROMPT = require('../prompts/systemPrompt');
const knowledgeService = require('../services/knowledgeService');
const languageDetector = require('../utils/languageDetector');
const logger = require('../utils/logger');

/**
 * Gemini AI Service (Phase 5 — Conversation Rules & Language Switching)
 * ─────────────────────────────────────────────────────────────────────────────
 * Integrates:
 * 1. Google Gemini 2.0 Flash API with multi-turn chat sessions.
 * 2. Automatic language detection (English, Telugu, Tenglish).
 * 3. Dynamic Knowledge Base retrieval and grounding.
 * 4. Strict unknown question fallback enforcement:
 *    "I'll have one of our team members contact you shortly."
 * 5. Full conversation history and session state tracking.
 * 6. TTS cleanup ensuring seamless voice rendering.
 */

// ── Initialize Gemini client ──────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// ── In-memory conversation store (CallSid -> chat session) ────────────────────
const activeSessions = new Map();

// ── Model configuration ───────────────────────────────────────────────────────
const MODEL_NAME = config.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const GENERATION_CONFIG = {
  temperature: 0.5,       // High precision, conversational, polite
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 2048,  // Ample headroom for reasoning + concise spoken output
};

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

const geminiService = {
  /**
   * Get or create a Gemini chat session for a call.
   *
   * @param {string} callSid - Twilio Call SID
   * @returns {object} Gemini chat session
   */
  getOrCreateSession(callSid) {
    if (activeSessions.has(callSid)) {
      logger.debug('Reusing existing Gemini session', { callSid });
      return activeSessions.get(callSid);
    }

    logger.info('Creating new Gemini session', { callSid });

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
    });

    const chat = model.startChat({
      history: [],
    });

    const session = {
      chat,
      history: [],
      callSid,
      startTime: new Date(),
      turnCount: 0,
      currentLanguage: 'english',
    };

    activeSessions.set(callSid, session);
    return session;
  },

  /**
   * Send a message to Gemini with dynamic knowledge base context and language instructions.
   *
   * @param {string} callSid - Twilio Call SID
   * @param {string} userMessage - Caller's transcribed speech
   * @returns {Promise<{ text: string, language: string, toString: Function }>} AI response object
   */
  async chat(callSid, userMessage) {
    const session = this.getOrCreateSession(callSid);

    // 1. Detect language automatically
    const detectedLang = languageDetector.detectLanguage(userMessage);
    const langInstruction = languageDetector.getPromptLanguageInstruction(detectedLang);
    session.currentLanguage = detectedLang;

    // 2. Retrieve relevant context from Knowledge Base
    const relevantContext = knowledgeService.findRelevantContext(userMessage);

    // 3. Construct prompt with Phase 5 conversation rules
    let promptToSend = `[Caller Utterance]: "${userMessage}"\n[Language Instruction]: ${langInstruction}`;

    if (relevantContext) {
      promptToSend += `\n[Verified Ground Truth Facts]:\n${relevantContext}\n(Instructions: Answer in 2-3 spoken sentences using the verified facts above. Always end with a polite follow-up question.)`;
    } else {
      promptToSend += `\n[Scope Notice]: If the caller is inquiring about topics, prices, or services outside our verified OneBridge offerings, DO NOT invent information. Say: "I'll have one of our team members contact you shortly." and politely ask for their contact details.`;
    }

    logger.info('Sending turn to Gemini', {
      callSid,
      turn: session.turnCount + 1,
      userMessage,
      detectedLang,
      hasContext: !!relevantContext,
    });

    try {
      const result = await session.chat.sendMessage(promptToSend);
      const rawResponse = result.response.text();

      // Clean response for Text-to-Speech (TTS)
      const cleanedResponse = this._cleanForTTS(rawResponse);

      // Store clean user message and model response in history
      session.history.push({ role: 'user', content: userMessage, language: detectedLang, timestamp: new Date() });
      session.history.push({ role: 'model', content: cleanedResponse, language: detectedLang, timestamp: new Date() });
      session.turnCount++;

      logger.info('Gemini response received', {
        callSid,
        turn: session.turnCount,
        detectedLang,
        response: cleanedResponse,
      });

      return {
        text: cleanedResponse,
        language: detectedLang,
        toString() {
          return this.text;
        },
      };

    } catch (err) {
      logger.error('Gemini API error', {
        callSid,
        error: err.message,
        stack: err.stack,
      });

      // Safe fallback aligned with Phase 5 rules
      const fallbackText = detectedLang === 'telugu'
        ? "Kshaminchandi, connection lo chinna samasya vachindi. I'll have one of our team members contact you shortly. Mee peru mariyu phone number cheppagalara?"
        : "I apologize, I am experiencing a momentary delay. I'll have one of our team members contact you shortly. May I take your name and phone number?";

      return {
        text: fallbackText,
        language: detectedLang,
        toString() {
          return this.text;
        },
      };
    }
  },

  /**
   * Get the full conversation history for a call.
   *
   * @param {string} callSid
   * @returns {Array|null}
   */
  getHistory(callSid) {
    const session = activeSessions.get(callSid);
    return session ? session.history : null;
  },

  /**
   * Get session metadata.
   *
   * @param {string} callSid
   * @returns {object|null}
   */
  getSessionMeta(callSid) {
    const session = activeSessions.get(callSid);
    if (!session) return null;
    return {
      callSid: session.callSid,
      startTime: session.startTime,
      turnCount: session.turnCount,
      currentLanguage: session.currentLanguage,
      durationMs: new Date() - session.startTime,
    };
  },

  /**
   * End and clean up a session when call ends.
   *
   * @param {string} callSid
   * @returns {Array} Final conversation history
   */
  endSession(callSid) {
    const session = activeSessions.get(callSid);
    if (!session) {
      logger.warn('Tried to end non-existent session', { callSid });
      return [];
    }

    const history = session.history;
    activeSessions.delete(callSid);

    logger.info('Gemini session ended and cleaned up', {
      callSid,
      totalTurns: session.turnCount,
      durationMs: new Date() - session.startTime,
    });

    return history;
  },

  /**
   * Clean AI text response for Text-to-Speech.
   *
   * @param {string} text - Raw Gemini response
   * @returns {string} TTS-friendly text
   * @private
   */
  _cleanForTTS(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')   // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')        // Remove *italic*
      .replace(/#{1,6}\s/g, '')           // Remove # headings
      .replace(/[-•*]\s+/g, '')           // Remove bullet points
      .replace(/`([^`]+)`/g, '$1')        // Remove `code`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove [link](url)
      .replace(/\[.*?\]/g, '')            // Remove square bracket tags
      .replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}]/gu, '') // Remove emojis
      .replace(/\n{2,}/g, '. ')           // Replace double newlines with period pause
      .replace(/\n/g, ' ')                // Replace single newlines with space
      .replace(/\s{2,}/g, ' ')            // Collapse multiple spaces
      .trim();
  },

  /**
   * Get count of active sessions.
   *
   * @returns {number}
   */
  getActiveSessionCount() {
    return activeSessions.size;
  },
};

module.exports = geminiService;
