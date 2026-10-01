'use strict';

const mongoose = require('mongoose');

/**
 * Lead Model — stores caller information collected during a call.
 *
 * A "lead" is created every time a caller provides their:
 *   - Name
 *   - Phone number
 *   - Requirement / interest
 *
 * Phase 7 will expose GET /leads to query this collection.
 */

const leadSchema = new mongoose.Schema(
  {
    // ── Core Lead Information ─────────────────────────────────────────────
    name: {
      type: String,
      trim: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    requirement: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Call Context ──────────────────────────────────────────────────────
    callSid: {
      type: String,
      required: true,
      unique: true,       // One lead record per call
      index: true,
    },

    callerNumber: {
      type: String,       // The phone number Twilio received the call from
      trim: true,
      default: null,
    },

    language: {
      type: String,
      enum: ['english', 'telugu', 'mixed', 'unknown'],
      default: 'unknown',
    },

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'closed'],
      default: 'new',
    },

    isComplete: {
      type: Boolean,
      default: false,     // true when all 3 fields (name, phone, requirement) collected
    },

    // ── Source ────────────────────────────────────────────────────────────
    source: {
      type: String,
      default: 'voice-call',
    },

    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,   // Adds createdAt and updatedAt automatically
    versionKey: false,
  }
);

// ── Virtual: check if lead is complete ───────────────────────────────────────
leadSchema.virtual('completeness').get(function () {
  const fields = [this.name, this.phone, this.requirement];
  const filled = fields.filter(Boolean).length;
  return `${filled}/3`;
});

// ── Pre-save: auto-set isComplete ─────────────────────────────────────────────
leadSchema.pre('save', async function () {
  this.isComplete = !!(this.name && this.phone && this.requirement);
});

// ── Indexes ───────────────────────────────────────────────────────────────────
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });
leadSchema.index({ phone: 1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
