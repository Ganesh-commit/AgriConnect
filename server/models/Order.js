const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    offeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['buyer', 'farmer'],
      required: true
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'countered'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Order must reference a crop']
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must reference a buyer']
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must reference a farmer']
    },
    quantity: {
      type: Number,
      required: [true, 'Order quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price per unit is required'],
      min: [0, 'Price per unit cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative']
    },
    message: {
      type: String,
      default: '',
      trim: true
    },
    deliveryLocation: {
      type: String,
      required: [true, 'Delivery location is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled', 'negotiating'],
      default: 'pending'
    },
    // Feature 1: payment method note (no gateway)
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'other'],
      default: 'cash'
    },
    // Integration 9: Direct UPI / cash payment status (manually marked by farmer)
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid'
    },
    paidAt: {
      type: Date,
      default: null
    },
    // Integration 10: Invoice number for completed orders
    invoiceNumber: {
      type: String,
      default: ''
    },
    // Integration 8: Distance & transport estimate snapshot
    transportEstimate: {
      distanceKm: { type: Number, default: null },
      estimatedCost: { type: Number, default: null }
    },
    // Integration 11: Reference if created from a Reverse Marketplace quote
    sourceRequirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Requirement',
      default: null
    },
    // Feature 4: Negotiation offer history
    offerHistory: {
      type: [offerSchema],
      default: []
    },
    currentOffer: {
      type: Number,
      default: null
    },
    isSeed: {
      type: Boolean,
      default: false,
      select: false
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ crop: 1 });

module.exports = mongoose.model('Order', orderSchema);
