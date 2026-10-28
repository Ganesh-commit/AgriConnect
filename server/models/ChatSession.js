const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    language: {
      type: String,
      enum: ['en', 'te'],
      default: 'en'
    },
    provider: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: ''
    },
    latencyMs: {
      type: Number,
      default: 0
    },
    cards: {
      type: Array,
      default: []
    },
    toolsUsed: {
      type: Array,
      default: []
    }
  },
  { timestamps: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    language: {
      type: String,
      enum: ['en', 'te'],
      default: 'en'
    },
    messages: {
      type: [chatMessageSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatSession', chatSessionSchema);

