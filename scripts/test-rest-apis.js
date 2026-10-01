'use strict';

/**
 * Phase 7 REST API Verification Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests all required REST API endpoints against the Express application:
 *   - GET  /leads
 *   - GET  /calls
 *   - GET  /history
 *   - GET  /history/:callSid
 *   - POST /incoming-call
 *   - POST /twilio/status
 *   - GET  /health
 *
 * Run: node scripts/test-rest-apis.js
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const db = require('../src/config/database');
const CallRecord = require('../src/models/CallRecord');
const Lead = require('../src/models/Lead');
const callService = require('../src/services/callService');
const leadService = require('../src/services/leadService');

const TEST_CALL_SID = 'CA_API_TEST_' + Date.now();
const CALLER_NUMBER = '+919988776655';

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🌐   Phase 7 — REST APIs Verification                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let allPassed = true;

  // 1. Ensure DB connection
  await db.connect();

  // 2. Seed a test lead and call record
  console.log('  Seeding test data for API testing...');
  await leadService.createLead({
    callSid: TEST_CALL_SID,
    callerNumber: CALLER_NUMBER,
  });

  await leadService.updateLead(TEST_CALL_SID, {
    name: 'Suresh Reddy',
    phone: CALLER_NUMBER,
    requirement: 'OutSystems Low-Code Development',
    language: 'telugu',
  });

  await callService.createCall({
    callSid: TEST_CALL_SID,
    callerNumber: CALLER_NUMBER,
  });

  await callService.appendTurn(
    TEST_CALL_SID,
    'OutSystems course gurinchi details kavali andi',
    'Namaste Suresh garu! OutSystems certification training duration 6 nundi 8 weeks untundi.',
    'telugu'
  );

  await callService.finalizeCall({
    CallSid: TEST_CALL_SID,
    CallStatus: 'completed',
    CallDuration: '45',
    From: CALLER_NUMBER,
  });

  console.log('  ✅ Seed data created\n');

  // ── Test 1: GET /health ────────────────────────────────────────────────────
  console.log('  Testing GET /health:');
  const resHealth = await request(app).get('/health');
  if (resHealth.status === 200 && resHealth.body.success) {
    console.log('  ✅ Status 200 OK — Health check active');
  } else {
    console.log('  ❌ FAIL GET /health', resHealth.status, resHealth.body);
    allPassed = false;
  }

  // ── Test 2: GET /leads ─────────────────────────────────────────────────────
  console.log('\n  Testing GET /leads:');
  const resLeads = await request(app).get('/leads?limit=10');
  if (resLeads.status === 200 && resLeads.body.success && Array.isArray(resLeads.body.data)) {
    console.log(`  ✅ Status 200 OK — Found ${resLeads.body.count} leads`);
    const found = resLeads.body.data.find((l) => l.callSid === TEST_CALL_SID);
    if (found && found.name === 'Suresh Reddy') {
      console.log(`  ✅ Found seeded lead: ${found.name} (${found.requirement})`);
    } else {
      console.log('  ⚠️  Seeded lead not found in first page');
    }
  } else {
    console.log('  ❌ FAIL GET /leads', resLeads.status, resLeads.body);
    allPassed = false;
  }

  // ── Test 3: GET /calls ─────────────────────────────────────────────────────
  console.log('\n  Testing GET /calls:');
  const resCalls = await request(app).get('/calls?limit=10');
  if (resCalls.status === 200 && resCalls.body.success && Array.isArray(resCalls.body.data)) {
    console.log(`  ✅ Status 200 OK — Found ${resCalls.body.count} calls`);
    const foundCall = resCalls.body.data.find((c) => c.callSid === TEST_CALL_SID);
    if (foundCall && foundCall.duration === 45) {
      console.log(`  ✅ Found seeded call: SID=${foundCall.callSid}, Duration=${foundCall.duration}s`);
    }
  } else {
    console.log('  ❌ FAIL GET /calls', resCalls.status, resCalls.body);
    allPassed = false;
  }

  // ── Test 4: GET /history ───────────────────────────────────────────────────
  console.log('\n  Testing GET /history:');
  const resHistory = await request(app).get('/history?limit=10');
  if (resHistory.status === 200 && resHistory.body.success && Array.isArray(resHistory.body.data)) {
    console.log(`  ✅ Status 200 OK — Found ${resHistory.body.count} recent conversation records`);
  } else {
    console.log('  ❌ FAIL GET /history', resHistory.status, resHistory.body);
    allPassed = false;
  }

  // ── Test 5: GET /history/:callSid ──────────────────────────────────────────
  console.log('\n  Testing GET /history/:callSid:');
  const resCallHistory = await request(app).get(`/history/${TEST_CALL_SID}`);
  if (resCallHistory.status === 200 && resCallHistory.body.success && resCallHistory.body.count >= 2) {
    console.log(`  ✅ Status 200 OK — Retrieved ${resCallHistory.body.count} dialogue turns for call`);
    console.log(`     Snippet: "${resCallHistory.body.data[0]?.content}"`);
  } else {
    console.log('  ❌ FAIL GET /history/:callSid', resCallHistory.status, resCallHistory.body);
    allPassed = false;
  }

  // ── Test 6: POST /incoming-call ────────────────────────────────────────────
  console.log('\n  Testing POST /incoming-call:');
  const resIncoming = await request(app)
    .post('/incoming-call')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .send({
      CallSid: 'CA_TEST_INCOMING_' + Date.now(),
      From: '+919876543210',
      To: '+19804737692',
    });

  if (resIncoming.status === 200 && resIncoming.headers['content-type'].includes('text/xml')) {
    console.log('  ✅ Status 200 OK — Returned valid TwiML XML greeting response');
    const isTwiml = resIncoming.text.includes('<Response>') && resIncoming.text.includes('<Say');
    console.log(`  ✅ Valid TwiML tags: ${isTwiml ? 'PASS' : 'FAIL'}`);
    if (!isTwiml) allPassed = false;
  } else {
    console.log('  ❌ FAIL POST /incoming-call', resIncoming.status, resIncoming.text);
    allPassed = false;
  }

  // ── Test 7: POST /twilio/status ───────────────────────────────────────────
  console.log('\n  Testing POST /twilio/status:');
  const resStatus = await request(app)
    .post('/twilio/status')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .send({
      CallSid: TEST_CALL_SID,
      CallStatus: 'completed',
      CallDuration: '45',
      From: CALLER_NUMBER,
      To: '+19804737692',
    });

  if (resStatus.status === 204) {
    console.log('  ✅ Status 204 No Content — Twilio status callback accepted');
  } else {
    console.log('  ❌ FAIL POST /twilio/status', resStatus.status);
    allPassed = false;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log('\n  Cleaning up test records from MongoDB...');
  await CallRecord.deleteMany({ callSid: { $regex: /^CA_(API_TEST|TEST_INCOMING)/ } });
  await Lead.deleteMany({ callSid: { $regex: /^CA_(API_TEST|TEST_INCOMING)/ } });
  console.log('  ✅ Test records deleted');

  await db.disconnect();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅  PHASE 7 VERIFIED — All REST APIs Working 100%!           ║');
  } else {
    console.log('║  ❌  SOME REST CHECKS FAILED — Review logs above            ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
}

runTest().catch((err) => {
  console.error('Fatal API test error:', err);
  process.exit(1);
});
