'use strict';

/**
 * Language Detector Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatically detects whether input speech is English, Telugu (Script or
 * Romanized/Transliterated), or mixed (Tenglish).
 *
 * Used to guide AI prompt language instructions and Twilio Voice TTS parameters.
 */

// Common Telugu Romanized keywords and patterns
const TELUGU_ROMAN_WORDS = new Set([
  'namaste', 'namaskaram', 'meeru', 'nenu', 'maa', 'mee', 'enti', 'ela',
  'cheppandi', 'cheppagalara', 'telusukovalani', 'undhi', 'undi', 'unnaru',
  'unnara', 'ledu', 'avunu', 'kaadu', 'dhanyavaadalu', 'bagundi', 'bagundali',
  'chala', 'ippudu', 'epudu', 'eppudu', 'kavalenu', 'kavali', 'chesanu',
  'chesaru', 'gurinchi', 'tvaralo', 'tondarlo', 'peru', 'matladali', 'matladandi',
  'andi', 'garu', 'vinay', 'avala', 'cheyandi', 'adigi', 'kotha', 'batch',
  'fees', 'entha', 'epudu', 'start', 'avtundi', 'avthundi', 'classes'
]);

// Telugu Unicode block range: U+0C00 to U+0C7F
const TELUGU_UNICODE_REGEX = /[\u0C00-\u0C7F]/;

const languageDetector = {
  /**
   * Detect language of a text string.
   *
   * @param {string} text - Spoken transcribed utterance
   * @returns {'telugu'|'mixed'|'english'} Detected language
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return 'english';

    // 1. Direct Telugu Unicode script detection
    if (TELUGU_UNICODE_REGEX.test(text)) {
      return 'telugu';
    }

    // 2. Tokenize words for Romanized Telugu matching
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return 'english';

    let teluguWordCount = 0;
    for (const word of words) {
      if (TELUGU_ROMAN_WORDS.has(word)) {
        teluguWordCount++;
      }
    }

    const ratio = teluguWordCount / words.length;

    if (teluguWordCount >= 2 || ratio >= 0.3) {
      // Mixed or primarily Telugu
      return ratio > 0.6 ? 'telugu' : 'mixed';
    }

    return 'english';
  },

  /**
   * Return appropriate language instruction for Gemini prompt.
   *
   * @param {'telugu'|'mixed'|'english'} detectedLang
   * @returns {string} Explicit system instruction
   */
  getPromptLanguageInstruction(detectedLang) {
    switch (detectedLang) {
      case 'telugu':
        return 'The caller spoke in Telugu. You MUST respond completely in natural, polite spoken Telugu (using clear English/Latin alphabet or Telugu script). Do not switch back to English unless the caller speaks English.';
      case 'mixed':
        return 'The caller used a mix of Telugu and English (Tenglish). Respond in a warm, natural mix of Telugu and English that sounds authentic and respectful.';
      case 'english':
      default:
        return 'The caller spoke in English. Respond in professional, fluent Indian English.';
    }
  },

  /**
   * Get recommended Twilio TTS parameters for detected language.
   *
   * @param {'telugu'|'mixed'|'english'} detectedLang
   * @returns {{ voice: string, language: string }}
   */
  getTwilioVoiceConfig(detectedLang) {
    if (detectedLang === 'telugu') {
      // Polly.Aditi supports Indian English with excellent bilingual Telugu phonetics
      return {
        voice: 'Polly.Aditi',
        language: 'te-IN',
      };
    }
    return {
      voice: 'Polly.Aditi',
      language: 'en-IN',
    };
  },
};

module.exports = languageDetector;
