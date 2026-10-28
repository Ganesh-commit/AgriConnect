const mongoose = require('mongoose');

const diseaseReportSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cropName: {
      type: String,
      default: '',
      trim: true
    },
    imageUrl: {
      type: String,
      default: ''
    },
    cropGuess: {
      type: String,
      required: true
    },
    likelyIssue: {
      type: String,
      required: true
    },
    confidence: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    symptoms: {
      type: [String],
      default: []
    },
    organicRemedies: {
      type: [String],
      default: []
    },
    chemicalRemedies: {
      type: [String],
      default: []
    },
    preventionTips: {
      type: [String],
      default: []
    },
    whenToConsultExpert: {
      type: String,
      default: ''
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
    }
  },
  { timestamps: true }
);

diseaseReportSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('DiseaseReport', diseaseReportSchema);

