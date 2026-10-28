const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Scheme title is required'],
      trim: true
    },
    shortCode: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      enum: ['Income Support', 'Crop Insurance', 'Credit & Loans', 'Market & Infrastructure', 'Soil & Inputs'],
      default: 'Income Support'
    },
    state: {
      type: String,
      default: 'All India',
      trim: true
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      trim: true
    },
    officialUrl: {
      type: String,
      required: [true, 'Official URL is required'],
      trim: true
    },
    helpline: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scheme', schemeSchema);

