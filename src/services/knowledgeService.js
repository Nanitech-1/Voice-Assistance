'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Knowledge Base Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads, indexes, and queries JSON-based domain knowledge for OneBridge Infotech.
 *
 * Provides context-aware retrieval to ground Gemini AI responses:
 * - Company info & SaaS platforms (OneBridge Academy, OneBridge Social)
 * - Services (Software, Websites, Mobile Apps, CRM, ERP, AI Automation)
 * - Courses (OutSystems, Cybersecurity, React, Node, Python, Java, Full Stack)
 * - FAQs & Strict Pricing / Escalation Policies
 *
 * Prepared for future RAG / Vector DB migration in upcoming phases.
 */

class KnowledgeService {
  constructor() {
    this.baseDir = path.join(__dirname, '..', '..', 'data', 'knowledge');
    this.company = null;
    this.services = [];
    this.courses = [];
    this.faqs = [];
    this.pricingPolicy = null;
    this.fallbackStatement = "I'll have one of our team members contact you shortly.";
    this.load();
  }

  /**
   * Load all JSON knowledge files into memory.
   */
  load() {
    try {
      const companyPath = path.join(this.baseDir, 'company.json');
      const servicesPath = path.join(this.baseDir, 'services.json');
      const coursesPath = path.join(this.baseDir, 'courses.json');
      const faqsPath = path.join(this.baseDir, 'faqs.json');

      if (fs.existsSync(companyPath)) {
        this.company = JSON.parse(fs.readFileSync(companyPath, 'utf8'));
      }

      if (fs.existsSync(servicesPath)) {
        const data = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
        this.services = data.services || [];
        this.pricingPolicy = data.pricingPolicy || null;
      }

      if (fs.existsSync(coursesPath)) {
        const data = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
        this.courses = data.courses || [];
      }

      if (fs.existsSync(faqsPath)) {
        const data = JSON.parse(fs.readFileSync(faqsPath, 'utf8'));
        this.faqs = data.faqs || [];
        if (data.escalationFallback) {
          this.fallbackStatement = data.escalationFallback;
        }
      }

      logger.info('Knowledge base loaded successfully', {
        servicesCount: this.services.length,
        coursesCount: this.courses.length,
        faqsCount: this.faqs.length,
      });
    } catch (err) {
      logger.error('Failed to load knowledge base JSON files', { error: err.message });
    }
  }

  /**
   * Search knowledge base for items relevant to caller query.
   * Matches keywords, titles, and questions.
   *
   * @param {string} query - User's transcribed speech
   * @returns {string} Context snippet to feed into Gemini prompt
   */
  findRelevantContext(query) {
    if (!query || typeof query !== 'string') return '';

    const lower = query.toLowerCase();
    const matches = [];

    // 1. Check FAQs
    for (const faq of this.faqs) {
      const matched = faq.keywords?.some((k) => lower.includes(k.toLowerCase())) ||
                      lower.includes(faq.question.toLowerCase());
      if (matched) {
        matches.push(`[FAQ] Q: ${faq.question} A: ${faq.answer}`);
      }
    }

    // 2. Check Services
    for (const svc of this.services) {
      const matched = svc.keywords?.some((k) => lower.includes(k.toLowerCase())) ||
                      lower.includes(svc.name.toLowerCase());
      if (matched) {
        matches.push(`[Service: ${svc.name}] ${svc.description} Tech Stack: ${svc.techStack.join(', ')}.`);
      }
    }

    // 3. Check Courses
    for (const crs of this.courses) {
      const matched = crs.keywords?.some((k) => lower.includes(k.toLowerCase())) ||
                      lower.includes(crs.name.toLowerCase());
      if (matched) {
        matches.push(`[Course: ${crs.name}] Duration: ${crs.duration}. Highlights: ${crs.highlights}. Key Topics: ${crs.curriculum.slice(0, 3).join('; ')}.`);
      }
    }

    // 4. Check Pricing
    if (lower.includes('price') || lower.includes('cost') || lower.includes('fee') || lower.includes('pricing')) {
      if (this.pricingPolicy) {
        matches.push(`[Pricing Policy] ${this.pricingPolicy.rule}`);
      }
    }

    // 5. Check Products (Academy, Social)
    if (lower.includes('academy') || lower.includes('resume') || lower.includes('interview') || lower.includes('mock')) {
      matches.push('[Product: OneBridge Academy] AI Career Intelligence SaaS with AI Resume Analyzer, ATS checker, and Mock Interview Studio.');
    }
    if (lower.includes('social') || lower.includes('instagram') || lower.includes('linkedin') || lower.includes('marketing')) {
      matches.push('[Product: OneBridge Social] Social media management SaaS for visual multi-platform scheduling and analytics.');
    }

    return matches.join('\n');
  }

  /**
   * Get an overall ground-truth summary of all company services and courses.
   * Injected into the system prompt so the AI always has primary domain awareness.
   *
   * @returns {string} Formatted knowledge summary
   */
  getSystemKnowledgeSummary() {
    const serviceList = this.services.map((s) => `- ${s.name}: ${s.description}`).join('\n');
    const courseList = this.courses.map((c) => `- ${c.name} (${c.duration}): ${c.highlights}`).join('\n');

    return `
## Verified Knowledge Base (OneBridge Infotech)
Headquarters: ${this.company?.headquarters || 'Hyderabad, Telangana, India'}
Working Hours: ${this.company?.contact?.officeHours || 'Mon-Fri 9:00 AM to 6:00 PM IST'}
Leadership: Mr. Vinay Avala

### Services Offered:
${serviceList}

### Training & Courses:
${courseList}

### Core SaaS Products:
- OneBridge Academy: AI Career Intelligence SaaS (Resume Analyzer, ATS Score Checker, AI Mock Interview Studio).
- OneBridge Social: Multi-platform social media scheduling and analytics SaaS.

### Pricing Policy:
Never give arbitrary fixed prices. State that pricing depends on project scope or batch schedule, and offer to have a team member follow up with a personalized quote.

### Fallback Policy:
If you do not know the answer or if the question is outside our verified knowledge, say:
"${this.fallbackStatement}"
`.trim();
  }
}

const knowledgeService = new KnowledgeService();

module.exports = knowledgeService;
