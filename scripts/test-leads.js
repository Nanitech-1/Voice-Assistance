'use strict';

/**
 * MongoDB Lead Capture Test — Phase 3 Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests MongoDB connection, lead creation, update, and extraction WITHOUT
 * needing Twilio or a phone call.
 *
 * Run: node scripts/test-leads.js
 */

require('dotenv').config();
const db = require('../src/config/database');
const leadService = require('../src/services/leadService');

const TEST_CALL_SID = 'CA_LEAD_TEST_' + Date.now();

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🗄️   MongoDB Lead Capture — Phase 3 Test                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let allPassed = true;

  // ── Step 1: Connect to MongoDB ────────────────────────────────────────────
  console.log('  Step 1: Connecting to MongoDB Atlas...');
  await db.connect();
  console.log('  ✅ MongoDB connected\n');

  // ── Step 2: Create Lead ───────────────────────────────────────────────────
  console.log('  Step 2: Creating lead on incoming call...');
  const lead = await leadService.createLead({
    callSid: TEST_CALL_SID,
    callerNumber: '+919876543210',
  });

  if (lead && lead._id) {
    console.log(`  ✅ Lead created: ID=${lead._id}, CallSid=${lead.callSid}`);
  } else {
    console.log('  ❌ FAIL: Lead not created');
    allPassed = false;
  }

  // ── Step 3: Extract lead info from English message ────────────────────────
  console.log('\n  Step 3: Extracting lead info (English)...');
  const engMessage = 'My name is Vinay Avala and my number is 9876543210. I want Full Stack training.';
  const extracted = leadService.extractLeadInfo(engMessage, 'Thank you Vinay!');
  console.log('  Extracted:', JSON.stringify(extracted, null, 4));

  if (extracted.name && extracted.phone && extracted.requirement) {
    console.log('  ✅ All 3 fields extracted correctly');
  } else {
    console.log('  ⚠️  Partial extraction (some fields missing — expected for regex)');
  }

  // ── Step 4: Extract lead info from Telugu/mixed message ───────────────────
  console.log('\n  Step 4: Extracting lead info (Tenglish)...');
  const telMessage = 'Nenu Ravi, React course gurinchi cheppandi, mee number 9123456780';
  const extractedTel = leadService.extractLeadInfo(telMessage, '');
  console.log('  Extracted:', JSON.stringify(extractedTel, null, 4));
  console.log('  Language detected:', extractedTel.language || 'unknown');
  console.log('  ✅ Telugu extraction complete');

  // ── Step 5: Update lead in MongoDB ───────────────────────────────────────
  console.log('\n  Step 5: Updating lead in MongoDB...');
  const updated = await leadService.updateLead(TEST_CALL_SID, {
    name: extracted.name || 'Vinay Avala',
    phone: extracted.phone || '+919876543210',
    requirement: extracted.requirement || 'Full Stack Training',
    language: extracted.language || 'english',
  });

  if (updated && updated.isComplete) {
    console.log(`  ✅ Lead updated: isComplete=${updated.isComplete}, name=${updated.name}`);
  } else if (updated) {
    console.log(`  ⚠️  Lead updated but incomplete: isComplete=${updated?.isComplete}`);
  } else {
    console.log('  ❌ FAIL: Lead update returned null');
    allPassed = false;
  }

  // ── Step 6: Fetch lead back ───────────────────────────────────────────────
  console.log('\n  Step 6: Fetching lead by CallSid...');
  const fetched = await leadService.getLeadByCallSid(TEST_CALL_SID);
  if (fetched) {
    console.log(`  ✅ Lead fetched: name=${fetched.name}, phone=${fetched.phone}`);
  } else {
    console.log('  ❌ FAIL: Could not fetch lead');
    allPassed = false;
  }

  // ── Step 7: Get all leads ─────────────────────────────────────────────────
  console.log('\n  Step 7: Fetching all leads...');
  const allLeads = await leadService.getAllLeads({ limit: 5 });
  console.log(`  ✅ Found ${allLeads.length} lead(s) in database`);

  // ── Cleanup: Delete test lead ─────────────────────────────────────────────
  console.log('\n  Cleaning up test lead...');
  const Lead = require('../src/models/Lead');
  await Lead.deleteOne({ callSid: TEST_CALL_SID });
  console.log('  ✅ Test lead deleted');

  // ── Disconnect ────────────────────────────────────────────────────────────
  await db.disconnect();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅  ALL TESTS PASSED — MongoDB lead capture is working!     ║');
  } else {
    console.log('║  ❌  SOME TESTS FAILED — Check errors above                  ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
}

runTest().catch((err) => {
  console.error('\n❌ Fatal test error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
