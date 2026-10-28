const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage
} = require('../controllers/chatController');

// GET all conversations for current user
router.get('/conversations', protect, getMyConversations);

// POST get or create a conversation
router.post('/conversations', protect, getOrCreateConversation);

// GET messages for a conversation
router.get('/conversations/:id/messages', protect, getMessages);

// POST send a message (REST fallback)
router.post('/conversations/:id/messages', protect, sendMessage);

module.exports = router;
