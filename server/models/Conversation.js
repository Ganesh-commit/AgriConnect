const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      default: null
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ crop: 1 });
conversationSchema.index({ order: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
