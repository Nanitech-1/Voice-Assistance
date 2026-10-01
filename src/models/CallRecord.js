'use strict';

const mongoose = require('mongoose');

/**
 * CallRecord Model — Stores call lifecycle, metrics, and conversation history.
 * ─────────────────────────────────────────────────────────────────────────────
 * Captures:
 * - Unique Call SID and phone numbers (From / To)
 * - Lifecycle status (ringing, in-progress, completed, failed)
 * - Timestamps (startTime, endTime) and call duration (in seconds)
 * - Full multi-turn conversation history with timestamps and language tags
 * - Customer details snapshot (Name, Phone, Requirement) linked to Lead
 */

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'model', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      default: 'english',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const callRecordSchema = new mongoose.Schema(
  {
    // ── Twilio Call Identifiers ───────────────────────────────────────────────
    callSid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    callerNumber: {
      type: String,
      required: true,
      index: true,
    },

    recipientNumber: {
      type: String,
      default: null,
    },

    // ── Lifecycle & Status ────────────────────────────────────────────────────
    callStatus: {
      type: String,
      enum: ['initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'],
      default: 'initiated',
      index: true,
    },

    duration: {
      type: Number, // In seconds
      default: 0,
    },

    startTime: {
      type: Date,
      default: Date.now,
    },

    endTime: {
      type: Date,
      default: null,
    },

    // ── Customer Details (Lead linkage) ───────────────────────────────────────
    customerDetails: {
      name: { type: String, default: null },
      phone: { type: String, default: null },
      requirement: { type: String, default: null },
      language: { type: String, default: 'english' },
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },

    // ── Conversation Transcript ───────────────────────────────────────────────
    conversationHistory: [messageSchema],

    turnCount: {
      type: Number,
      default: 0,
    },

    // ── Metadata & Notes ──────────────────────────────────────────────────────
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes for fast queries ──────────────────────────────────────────────────
callRecordSchema.index({ createdAt: -1 });

const CallRecord = mongoose.model('CallRecord', callRecordSchema);

module.exports = CallRecord;
