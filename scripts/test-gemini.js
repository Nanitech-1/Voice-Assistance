'use strict';

/**
 * Gemini AI Test Script — Phase 2 Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the Gemini AI service directly WITHOUT needing Twilio or a phone call.
 * Simulates a full bilingual (English + Telugu) conversation.
 *
 * Run: node scripts/test-gemini.js
 */

require('dotenv').config();
const geminiService = require('../src/ai/geminiService');

const TEST_CALL_SID = 'CA_TEST_' + Date.now();

// Simulate a real conversation — English then Telugu mix
const conversationScript = [
  { lang: 'English', message: 'Hello, I want to know about your software development services.' },
  { lang: 'English', message: 'What kind of mobile apps do you develop?' },
  { lang: 'Telugu', message: 'Mee OutSystems training gurinchi cheppagalara?' },
  { lang: 'Tenglish', message: 'React course fees enti? And how long is the course?' },
  { lang: 'English', message: 'My name is Vinay and my number is 9876543210. I want Full Stack training.' },
];

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🤖  Gemini AI Receptionist — Phase 2 Test                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  Call SID: ${TEST_CALL_SID}`);
  console.log('  Testing bilingual conversation (English + Telugu)...\n');
  console.log('─'.repeat(66));

  let allPassed = true;

  for (let i = 0; i < conversationScript.length; i++) {
    const { lang, message } = conversationScript[i];

    console.log(`\n  Turn ${i + 1} [${lang}]`);
    console.log(`  👤 Caller: "${message}"`);

    try {
      const response = await geminiService.chat(TEST_CALL_SID, message);
      console.log(`  🤖 Priya:  "${response}"`);

      if (!response || response.trim() === '') {
        console.log('  ❌ FAIL: Empty response!');
        allPassed = false;
      } else {
        console.log('  ✅ PASS');
      }
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
      allPassed = false;
    }

    console.log('─'.repeat(66));

    // Small delay between turns to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Show session summary
  const meta = geminiService.getSessionMeta(TEST_CALL_SID);
  const history = geminiService.getHistory(TEST_CALL_SID);

  console.log('\n  📊 Session Summary:');
  console.log(`     Total turns: ${meta?.turnCount || 0}`);
  console.log(`     History entries: ${history?.length || 0}`);
  console.log(`     Duration: ${meta ? Math.round(meta.durationMs / 1000) : 0}s`);

  // Clean up
  geminiService.endSession(TEST_CALL_SID);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅  ALL TESTS PASSED — Gemini AI is working correctly!      ║');
  } else {
    console.log('║  ❌  SOME TESTS FAILED — Check errors above                  ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
}

runTest().catch((err) => {
  console.error('\n❌ Fatal test error:', err.message);
  process.exit(1);
});
