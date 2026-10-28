const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema(
  {
    requirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Requirement',
      required: true
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Quote price per unit is required'],
      min: 0
    },
    quantity: {
      type: Number,
      required: [true, 'Quote quantity is required'],
      min: 1
    },
    unit: {
      type: String,
      enum: ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece'],
      default: 'kg'
    },
    message: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    }
  },
  { timestamps: true }
);

quoteSchema.index({ requirement: 1, createdAt: -1 });
quoteSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('Quote', quoteSchema);

