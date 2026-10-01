'use strict';

/**
 * Phase 6 Call History & Persistence Verification Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Creation and tracking of CallRecord in MongoDB Atlas.
 * 2. Real-time appending of multi-turn conversation transcripts (user + model).
 * 3. Finalization of call with:
 *    - Call duration (in seconds)
 *    - Call status ('completed')
 *    - Start & End timestamps
 *    - Customer details (Name, Phone, Requirement, Language) linked to Lead
 *    - Turn count
 * 4. Verification of data integrity and clean retrieval.
 *
 * Run: node scripts/test-call-history.js
 */

require('dotenv').config();
const db = require('../src/config/database');
const callService = require('../src/services/callService');
const leadService = require('../src/services/leadService');
const CallRecord = require('../src/models/CallRecord');
const Lead = require('../src/models/Lead');

const TEST_CALL_SID = 'CA_HIST_TEST_' + Date.now();
const CALLER_PHONE = '+919876543210';
const TWILIO_PHONE = '+19804737692';

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🗃️   Phase 6 — Call History & Session Persistence in MongoDB ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let allPassed = true;

  // ── Step 1: Connect to MongoDB Atlas ──────────────────────────────────────
  console.log('  Step 1: Connecting to MongoDB Atlas...');
  await db.connect();
  console.log('  ✅ Database connected\n');

  // ── Step 2: Initialize Lead and CallRecord on Incoming Call ────────────────
  console.log('  Step 2: Initializing Lead and CallRecord...');
  const lead = await leadService.createLead({
    callSid: TEST_CALL_SID,
    callerNumber: CALLER_PHONE,
  });

  const call = await callService.createCall({
    callSid: TEST_CALL_SID,
    callerNumber: CALLER_PHONE,
    recipientNumber: TWILIO_PHONE,
  });

  if (call && call._id && call.callStatus === 'ringing') {
    console.log(`  ✅ CallRecord created: ID=${call._id}, Status=${call.callStatus}`);
  } else {
    console.log('  ❌ FAIL: CallRecord not created properly');
    allPassed = false;
  }

  // ── Step 3: Stream and Append Conversation Turns ───────────────────────────
  console.log('\n  Step 3: Appending Conversation Turns...');

  const turns = [
    {
      user: 'Hello, what full stack web development training do you have?',
      ai: 'At OneBridge Infotech, we offer a 12 to 16 week comprehensive Full Stack MERN program covering React, Node.js, Express, and MongoDB with 5 live projects. Could I get your name and phone number to share the brochure?',
      lang: 'english',
    },
    {
      user: 'Naa peru Anand, phone number 9876543210. Python course kuda undha?',
      ai: 'Namaste Anand garu! Avunandi, maaku Python programming mariyu Generative AI engineering course kuda 8 weeks duration lo undi. Meeru full stack tho patu python kuda nerchukovalani anukuntunnara?',
      lang: 'telugu',
    },
    {
      user: 'Yes, I want to join both batches.',
      ai: 'Wonderful! We have noted your interest in both Full Stack and Python Generative AI batches. Our senior counselor will connect with you shortly with the schedule.',
      lang: 'english',
    },
  ];

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    await callService.appendTurn(TEST_CALL_SID, t.user, t.ai, t.lang);
    console.log(`  - Appended Turn ${i + 1} [${t.lang}]`);
  }

  // Also simulate lead extraction update
  await leadService.updateLead(TEST_CALL_SID, {
    name: 'Anand',
    phone: '9876543210',
    requirement: 'Full Stack MERN and Python Generative AI training',
    language: 'mixed',
  });
  console.log('  ✅ Lead details updated in parallel');

  // ── Step 4: Finalize Call on Hangup / Status Callback ─────────────────────
  console.log('\n  Step 4: Finalizing Call via Status Callback...');
  const statusPayload = {
    CallSid: TEST_CALL_SID,
    CallStatus: 'completed',
    CallDuration: '78', // 78 seconds duration reported by Twilio
    From: CALLER_PHONE,
    To: TWILIO_PHONE,
  };

  const finalized = await callService.finalizeCall(statusPayload);

  if (finalized && finalized.callStatus === 'completed' && finalized.duration === 78) {
    console.log(`  ✅ Call finalized: Duration=${finalized.duration}s, Status=${finalized.callStatus}`);
  } else {
    console.log('  ❌ FAIL: Call finalization did not record expected duration or status');
    allPassed = false;
  }

  // ── Step 5: Verify MongoDB Persistence & Data Integrity ───────────────────
  console.log('\n  Step 5: Verifying Persisted Record from MongoDB:');
  const record = await callService.getCallBySid(TEST_CALL_SID);

  if (!record) {
    console.log('  ❌ FAIL: Could not query CallRecord by SID');
    allPassed = false;
  } else {
    console.log(`  - Call SID: ${record.callSid}`);
    console.log(`  - Caller Phone: ${record.callerNumber}`);
    console.log(`  - Call Status: ${record.callStatus}`);
    console.log(`  - Duration: ${record.duration} seconds`);
    console.log(`  - Start Time: ${record.startTime}`);
    console.log(`  - End Time: ${record.endTime}`);
    console.log(`  - Customer Name: ${record.customerDetails?.name || 'N/A'}`);
    console.log(`  - Customer Phone: ${record.customerDetails?.phone || 'N/A'}`);
    console.log(`  - Customer Requirement: ${record.customerDetails?.requirement || 'N/A'}`);
    console.log(`  - Stored Messages Count: ${record.conversationHistory?.length || 0}`);
    console.log(`  - Total Turn Count: ${record.turnCount}`);

    // Assertions
    const hasCorrectTurns = record.conversationHistory?.length === 6; // 3 user + 3 model
    const hasCustomerDetails = record.customerDetails?.name === 'Anand';
    const hasTimestamps = record.startTime && record.endTime;

    if (hasCorrectTurns && hasCustomerDetails && hasTimestamps) {
      console.log('  ✅ ALL INTEGRITY CHECKS PASSED: History, Duration, Customer Details, Timestamps!');
    } else {
      console.log('  ❌ Data integrity check failed:', { hasCorrectTurns, hasCustomerDetails, hasTimestamps });
      allPassed = false;
    }
  }

  // ── Step 6: Test getHistoryByCallSid ───────────────────────────────────────
  console.log('\n  Step 6: Testing getHistoryByCallSid API helper:');
  const history = await callService.getHistoryByCallSid(TEST_CALL_SID);
  console.log(`  ✅ Retrieved ${history.length} dialogue messages`);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log('\n  Cleaning up test records from MongoDB...');
  await CallRecord.deleteOne({ callSid: TEST_CALL_SID });
  await Lead.deleteOne({ callSid: TEST_CALL_SID });
  console.log('  ✅ Test records deleted cleanly');

  await db.disconnect();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅  PHASE 6 VERIFIED — Call History & Session Persistence OK ║');
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
