const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Crop listing must belong to a farmer']
    },
    name: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true,
      maxlength: [120, 'Crop name cannot exceed 120 characters']
    },
    category: {
      type: String,
      required: [true, 'Crop category is required'],
      enum: [
        'Vegetables', 'Fruits', 'Grains & Cereals', 'Pulses', 'Spices', 'Oilseeds',
        'Millets', 'Dairy & Eggs', 'Flowers', 'Cash Crops', 'Nuts & Dry Fruits',
        'Honey & Jaggery', 'Seeds & Saplings', 'Organic Products', 'Grains', 'Others'
      ]
    },
    quantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required'],
      enum: ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece'],
      default: 'kg'
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price per unit is required'],
      min: [0, 'Price cannot be negative']
    },
    location: {
      village: { type: String, default: '', trim: true },
      district: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true }
    },
    // Feature 3: GeoJSON Point for map-based search
    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    images: {
      type: [String],
      default: []
    },
    imageAttribution: {
      photographer: { type: String, default: '' },
      photographerUrl: { type: String, default: '' },
      sourceUrl: { type: String, default: '' }
    },
    description: {
      type: String,
      required: [true, 'Crop description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    harvestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['available', 'sold'],
      default: 'available'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
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

// Text index for full-text search on crop name and description
cropSchema.index({ name: 'text', description: 'text' });
cropSchema.index({ category: 1, status: 1 });
cropSchema.index({ 'location.state': 1, 'location.district': 1 });
// Feature 3: 2dsphere index for geo queries
cropSchema.index({ geoLocation: '2dsphere' });

module.exports = mongoose.model('Crop', cropSchema);
