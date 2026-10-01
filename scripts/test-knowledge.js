'use strict';

/**
 * Knowledge Base Verification Script — Phase 4
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates that all JSON domain knowledge for OneBridge Infotech is loaded,
 * indexed, and searchable across all required topics:
 * - OneBridge Infotech
 * - Software Development
 * - Website Development
 * - Mobile Apps
 * - CRM
 * - Outsystems Training
 * - Cybersecurity Training
 * - React
 * - Node
 * - Python
 * - Java
 * - Full Stack Courses
 * - SaaS Platforms (OneBridge Academy, OneBridge Social)
 * - Office Hours, Headquarters, & Pricing
 *
 * Run: node scripts/test-knowledge.js
 */

require('dotenv').config();
const knowledgeService = require('../src/services/knowledgeService');

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  📚  OneBridge Knowledge Base — Phase 4 Verification         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let allPassed = true;

  // 1. Check data loading
  console.log('  Checking loaded entities:');
  console.log(`  - Company: ${knowledgeService.company?.companyName || 'FAILED'}`);
  console.log(`  - Services count: ${knowledgeService.services?.length || 0}`);
  console.log(`  - Courses count: ${knowledgeService.courses?.length || 0}`);
  console.log(`  - FAQs count: ${knowledgeService.faqs?.length || 0}`);

  if (!knowledgeService.company || knowledgeService.services.length < 5 || knowledgeService.courses.length < 5) {
    console.log('  ❌ FAIL: Knowledge base files not fully populated!');
    allPassed = false;
  } else {
    console.log('  ✅ Data structures verified');
  }

  console.log('\n------------------------------------------------------------------');
  console.log('  Testing Context Queries for All Required Phase 4 Topics:\n');

  const testQueries = [
    { topic: 'OneBridge Infotech & Location', query: 'Where is OneBridge located and what are your working hours?' },
    { topic: 'Software Development', query: 'Can you build custom enterprise software and backend APIs?' },
    { topic: 'Website Development', query: 'Do you develop Next.js or React web applications?' },
    { topic: 'Mobile Apps', query: 'Can you build a mobile app for Android and iOS in Flutter?' },
    { topic: 'CRM & ERP Solutions', query: 'Do you build custom CRM systems or integrate with Salesforce?' },
    { topic: 'Outsystems Training', query: 'Tell me about your OutSystems low code developer certification course.' },
    { topic: 'Cybersecurity Training', query: 'What is covered in the ethical hacking and cybersecurity syllabus?' },
    { topic: 'React Training', query: 'What will I learn in the React frontend development training?' },
    { topic: 'Node.js Training', query: 'Do you teach Node.js Express backend engineering?' },
    { topic: 'Python Training', query: 'What is the duration of your Python and Generative AI course?' },
    { topic: 'Java Training', query: 'Do you provide Spring Boot and Java microservices training?' },
    { topic: 'Full Stack Courses', query: 'Tell me about your MERN Full Stack career program.' },
    { topic: 'SaaS - OneBridge Academy', query: 'How does your AI Resume Analyzer and mock interview tool work?' },
    { topic: 'Pricing Policy', query: 'How much do you charge for a full project?' },
  ];

  for (const item of testQueries) {
    const context = knowledgeService.findRelevantContext(item.query);
    const hasMatch = context && context.trim().length > 0;

    console.log(`  🔍 [${item.topic}]`);
    console.log(`     Query: "${item.query}"`);
    if (hasMatch) {
      console.log(`     Match: ${context.split('\n')[0]}`);
      console.log('     Status: ✅ FOUND\n');
    } else {
      console.log('     Status: ❌ NO MATCH\n');
      allPassed = false;
    }
  }

  // 3. Verify system prompt knowledge summary
  console.log('─'.repeat(66));
  console.log('  Validating System Knowledge Grounding:');
  const summary = knowledgeService.getSystemKnowledgeSummary();
  if (summary && summary.includes('OutSystems') && summary.includes('Cybersecurity') && summary.includes('Full Stack')) {
    console.log('  ✅ Grounded summary generated successfully with all core offerings');
  } else {
    console.log('  ❌ FAIL: Grounded summary missing core topics');
    allPassed = false;
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅  ALL TESTS PASSED — Knowledge Base is Phase 4 Ready!     ║');
  } else {
    console.log('║  ❌  SOME TESTS FAILED — Check output above                 ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
