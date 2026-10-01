'use strict';

/**
 * localtunnel helper — zero-account alternative to ngrok
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a public HTTPS tunnel without needing any account or authtoken.
 *
 * Usage:  npm run tunnel:lt
 *
 * Note: localtunnel URLs change every restart. For stable URLs, use ngrok.
 */

require('dotenv').config();
const localtunnel = require('localtunnel');

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function startTunnel() {
  console.log('\n🔧 Starting localtunnel on port', PORT, '...\n');
  console.log('   (No account needed — tunnel starts instantly)\n');

  try {
    const tunnel = await localtunnel({ port: PORT });
    const url = tunnel.url;

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅  localtunnel is LIVE!                                ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n  🌐  Public URL:      ${url}`);
    console.log(`  📞  Twilio Webhook: ${url}/twilio/incoming-call`);
    console.log(`  ❤️   Health Check:  ${url}/health`);
    console.log('\n  ⚠️  IMPORTANT: First visit in browser to accept the warning:');
    console.log(`  ${url}`);
    console.log('\n──────────────────────────────────────────────────────────');
    console.log('  NEXT STEPS:');
    console.log('  1. Update .env → BASE_URL=' + url);
    console.log('  2. Restart server: npm run dev');
    console.log('  3. Open Twilio Console:');
    console.log('     https://console.twilio.com/us1/develop/phone-numbers/manage/incoming');
    console.log('  4. Click your phone number');
    console.log('  5. Voice & Fax → A Call Comes In:');
    console.log(`     Webhook: ${url}/twilio/incoming-call   Method: POST`);
    console.log('  6. Click Save, then call your Twilio number!');
    console.log('──────────────────────────────────────────────────────────');
    console.log('\n  Press Ctrl+C to stop the tunnel.\n');

    tunnel.on('close', () => {
      console.log('\n🔌 localtunnel closed.');
      process.exit(0);
    });

    tunnel.on('error', (err) => {
      console.error('\n❌ Tunnel error:', err.message);
    });

  } catch (err) {
    console.error('\n❌ Failed to start localtunnel:', err.message);
    process.exit(1);
  }
}

startTunnel();

process.on('SIGINT', () => {
  console.log('\n⏹️  Stopping tunnel...');
  process.exit(0);
});
