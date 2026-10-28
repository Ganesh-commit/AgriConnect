const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get or create conversation between two users (optionally linked to crop/order)
// @route   POST /api/chat/conversations
// @access  Private
const getOrCreateConversation = async (req, res, next) => {
  try {
    const { recipientId, cropId, orderId } = req.body;
    const userId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'recipientId is required.' });
    }

    if (userId === recipientId) {
      return res.status(400).json({ success: false, message: 'Cannot chat with yourself.' });
    }

    // Look for an existing conversation between the two users for the same crop/order
    let query = {
      participants: { $all: [userId, recipientId] }
    };
    if (cropId) query.crop = cropId;
    if (orderId) query.order = orderId;

    let conversation = await Conversation.findOne(query)
      .populate('participants', 'name avatar role isVerified')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
        crop: cropId || null,
        order: orderId || null,
        unreadCounts: { [recipientId]: 0, [userId]: 0 }
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name avatar role isVerified')
        .populate('lastMessage');
    }

    res.status(200).json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations for the current user
// @route   GET /api/chat/conversations
// @access  Private
const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'name avatar role isVerified')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name' }
      })
      .populate('crop', 'name images')
      .populate('order', 'status totalPrice')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: { conversations } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a conversation (paginated)
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { id: convId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(convId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Ensure user is a participant
    if (!conversation.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.find({ conversation: convId })
      .populate('sender', 'name avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark messages as read by this user
    await Message.updateMany(
      { conversation: convId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    // Reset unread count for this user
    conversation.unreadCounts.set(req.user.id, 0);
    await conversation.save();

    res.status(200).json({
      success: true,
      data: { messages: messages.reverse() }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message (REST fallback; socket is primary)
// @route   POST /api/chat/conversations/:id/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { id: convId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const conversation = await Conversation.findById(convId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    if (!conversation.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const message = await Message.create({
      conversation: convId,
      sender: req.user.id,
      text: text.trim(),
      readBy: [req.user.id]
    });

    // Update lastMessage and increment unread counts for other participants
    conversation.lastMessage = message._id;
    conversation.participants.forEach((pid) => {
      const pidStr = pid.toString();
      if (pidStr !== req.user.id) {
        conversation.unreadCounts.set(pidStr, (conversation.unreadCounts.get(pidStr) || 0) + 1);
      }
    });
    await conversation.save();

    const populated = await Message.findById(message._id).populate(
      'sender',
      'name avatar role'
    );

    // Create notification for other participants
    for (const pid of conversation.participants) {
      if (pid.toString() !== req.user.id) {
        await createNotification({
          userId: pid.toString(),
          type: 'new_message',
          title: 'New Message',
          message: `${req.user.name}: ${text.substring(0, 60)}...`,
          link: '/chat',
          relatedDoc: convId
        });
      }
    }

    res.status(201).json({ success: true, data: { message: populated } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage
};
