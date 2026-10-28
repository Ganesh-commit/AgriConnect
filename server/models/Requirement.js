const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cropName: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true,
      maxlength: 120
    },
    category: {
      type: String,
      default: 'Vegetables',
      enum: [
        'Vegetables', 'Fruits', 'Grains & Cereals', 'Pulses', 'Spices', 'Oilseeds',
        'Millets', 'Dairy & Eggs', 'Flowers', 'Cash Crops', 'Nuts & Dry Fruits',
        'Honey & Jaggery', 'Seeds & Saplings', 'Organic Products', 'Grains', 'Others'
      ]
    },
    quantity: {
      type: Number,
      required: [true, 'Required quantity is mandatory'],
      min: 1
    },
    unit: {
      type: String,
      enum: ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece'],
      default: 'kg'
    },
    targetPricePerUnit: {
      type: Number,
      required: [true, 'Target price per unit is required'],
      min: 0
    },
    deliveryLocation: {
      address: { type: String, required: true, trim: true },
      district: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true }
    },
    neededByDate: {
      type: Date,
      required: [true, 'Needed-by date is required']
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'cancelled'],
      default: 'open'
    },
    acceptedQuote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: null
    },
    createdOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    }
  },
  { timestamps: true }
);

requirementSchema.index({ status: 1, createdAt: -1 });
requirementSchema.index({ cropName: 1, 'deliveryLocation.district': 1 });

module.exports = mongoose.model('Requirement', requirementSchema);

