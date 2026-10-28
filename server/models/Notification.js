const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: [
        'order_placed',
        'order_accepted',
        'order_rejected',
        'order_completed',
        'order_cancelled',
        'negotiation_offer',
        'negotiation_accepted',
        'negotiation_rejected',
        'verification_approved',
        'verification_rejected',
        'new_message',
        'order_paid',
        'requirement_posted',
        'quote_received',
        'quote_accepted',
        'weather_alert',
        'general'
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    link: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    relatedDoc: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
