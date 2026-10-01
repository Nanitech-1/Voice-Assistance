'use strict';

/**
 * ngrok tunnel helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Starts an ngrok tunnel on port 3000 and prints the public Twilio webhook URL.
 *
 * REQUIRES ngrok authtoken:
 *   1. Sign up free at: https://dashboard.ngrok.com/signup
 *   2. Get token at:    https://dashboard.ngrok.com/get-started/your-authtoken
 *   3. Add to .env:     NGROK_AUTHTOKEN=your_token_here
 *
 * Then run:  npm run tunnel
 */

require('dotenv').config();
const ngrok = require('ngrok');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;

if (!NGROK_AUTHTOKEN) {
  console.error('\n╔══════════════════════════════════════════════════════════╗');
  console.error('║  ❌  NGROK_AUTHTOKEN is missing!                         ║');
  console.error('╠══════════════════════════════════════════════════════════╣');
  console.error('║  To fix this:                                            ║');
  console.error('║  1. Go to: https://dashboard.ngrok.com/signup            ║');
  console.error('║  2. Copy your authtoken from the dashboard               ║');
  console.error('║  3. Add to your .env file:                               ║');
  console.error('║     NGROK_AUTHTOKEN=your_token_here                      ║');
  console.error('║  4. Run again: npm run tunnel                            ║');
  console.error('╚══════════════════════════════════════════════════════════╝\n');
  console.error('  Alternative (no account needed): npm run tunnel:lt\n');
  process.exit(1);
}

async function startTunnel() {
  console.log('\n🔧 Starting ngrok tunnel on port', PORT, '...\n');

  try {
    const url = await ngrok.connect({
      addr: PORT,
      authtoken: NGROK_AUTHTOKEN,
    });

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅  ngrok tunnel is LIVE!                               ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n  🌐  Public URL:      ${url}`);
    console.log(`  📞  Twilio Webhook: ${url}/twilio/incoming-call`);
    console.log(`  ❤️   Health Check:  ${url}/health`);
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

  } catch (err) {
    console.error('\n❌ Failed to start ngrok tunnel');
    console.error('   Error:', err.message);
    if (err.message.includes('authtoken') || err.message.includes('auth')) {
      console.error('\n   Your authtoken may be invalid. Get a new one at:');
      console.error('   https://dashboard.ngrok.com/get-started/your-authtoken');
    }
    process.exit(1);
  }
}

startTunnel();

process.on('SIGINT', async () => {
  console.log('\n⏹️  Stopping ngrok tunnel...');
  await ngrok.kill();
  process.exit(0);
});
