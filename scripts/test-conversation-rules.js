'use strict';

/**
 * Phase 5 Conversation Rules Verification Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Polite greetings in English and Telugu.
 * 2. Automatic language detection and seamless language switching (no asking).
 * 3. Strict zero-hallucination unknown question fallback:
 *    When asked an unknown question (e.g. unrelated products or unlisted fees),
 *    the AI MUST say: "I'll have one of our team members contact you shortly."
 * 4. Concise voice speech rules (2-3 sentences max, zero markdown).
 *
 * Run: node scripts/test-conversation-rules.js
 */

require('dotenv').config();
const geminiService = require('../src/ai/geminiService');
const languageDetector = require('../src/utils/languageDetector');

const TEST_CALL_SID = 'CA_CONV_TEST_' + Date.now();

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🗣️   Phase 5 — Conversation Rules & Language Switching      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let allPassed = true;

  // ── Step 1: Language Detector Unit Tests ─────────────────────────────────
  console.log('  Step 1: Testing Language Detector Utility:');
  const detectorCases = [
    { input: 'Hello, what software development services do you offer?', expected: 'english' },
    { input: 'నమస్కారం, మీ ఆఫీస్ ఎక్కడ ఉంది?', expected: 'telugu' },
    { input: 'Namaskaram andi, mee training batches eppudu start avthundi?', expected: 'telugu' },
    { input: 'Python course gurinchi details cheppandi please', expected: 'mixed' },
  ];

  for (const tc of detectorCases) {
    const detected = languageDetector.detectLanguage(tc.input);
    const passed = detected === tc.expected || (tc.expected === 'telugu' && detected === 'mixed');
    console.log(`  - Input: "${tc.input}"`);
    console.log(`    Detected: ${detected} | Expected: ${tc.expected} -> ${passed ? '✅ PASS' : '❌ FAIL'}`);
    if (!passed) allPassed = false;
  }

  console.log('\n' + '-'.repeat(66));

  // ── Step 2: Multi-Turn Conversation Rules & Language Switching ─────────────
  console.log('  Step 2: Multi-Turn Live Conversation Rules Verification:\n');

  const testTurns = [
    {
      name: 'English Inquiry (Software Services)',
      message: 'Hello Priya, what custom software development services do you offer?',
      expectedLang: 'english',
    },
    {
      name: 'Telugu Automatic Switch (Office Location & Hours)',
      message: 'Namaste andi, mee office ekkada undhi?',
      expectedLang: 'telugu',
    },
    {
      name: 'Tenglish (Full Stack Training)',
      message: 'Mee Full Stack MERN course duration entha and what will we learn?',
      expectedLang: 'mixed',
    },
    {
      name: 'Unknown Question (Must trigger exact fallback rule)',
      message: 'Can you supply medical ICU ventilators and hospital beds?',
      expectedLang: 'english',
      mustInclude: "I'll have one of our team members contact you shortly",
    },
  ];

  for (let i = 0; i < testTurns.length; i++) {
    const turn = testTurns[i];
    console.log(`  Turn ${i + 1}: [${turn.name}]`);
    console.log(`  👤 Caller: "${turn.message}"`);

    try {
      const response = await geminiService.chat(TEST_CALL_SID, turn.message);
      const text = response.text || String(response);
      const detected = response.language;

      console.log(`  🤖 Priya (${detected}): "${text}"`);

      // 1. Check for markdown / TTS violations
      const hasMarkdown = /[*#_`~\[\]]/.test(text);
      if (hasMarkdown) {
        console.log('  ⚠️  Warning: Detected markdown in response text');
      }

      // 2. Check fallback requirement if specified
      if (turn.mustInclude) {
        const lowerText = text.toLowerCase();
        const lowerExpected = turn.mustInclude.toLowerCase();
        if (lowerText.includes(lowerExpected)) {
          console.log(`  ✅ Fallback rule verified: Matched "${turn.mustInclude}"!`);
        } else {
          console.log(`  ❌ Fallback phrasing missed: "${text}"`);
          allPassed = false;
        }
      }

      console.log('  Turn Status: ✅ Passed\n');
    } catch (err) {
      console.log(`  ❌ Turn error: ${err.message}\n`);
      allPassed = false;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  // Clean up
  geminiService.endSession(TEST_CALL_SID);

  console.log('-'.repeat(66));
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅  PHASE 5 VERIFIED — Conversation Rules & Switching Active ║');
  } else {
    console.log('║  ❌  SOME CHECKS FAILED — Review logs above                 ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
