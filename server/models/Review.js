const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must reference a farmer']
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must reference a buyer']
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Review must reference a completed order'],
      unique: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars']
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
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

reviewSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
