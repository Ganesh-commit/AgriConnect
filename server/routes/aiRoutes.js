const express = require('express');
const router = express.Router();
const {
  getAiHealth,
  getChatHistory,
  clearChatHistory,
  sendAssistantChat,
  streamAssistantChat,
  checkCropDisease,
  getDiseaseHistory,
  autoListFromPhoto
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { upload } = require('../middleware/upload');
const { aiGlobalLimiter, aiUserLimiter } = require('../middleware/aiRateLimit');

// Apply global and per-user rate limiting to all /api/ai/* routes
router.use(aiGlobalLimiter);
router.use(aiUserLimiter);

// 1. Health & diagnostics
router.get('/health', getAiHealth);

// 2. Bilingual AI Chatbot Assistant (English + Telugu)
router.get('/chat/history', getChatHistory);
router.delete('/chat/history', clearChatHistory);
router.post('/chat', sendAssistantChat);
router.post('/chat/stream', streamAssistantChat);

// 3. Crop Disease Detection (Vision)
router.get(
  '/disease-check/history',
  protect,
  authorizeRoles('farmer', 'admin'),
  getDiseaseHistory
);
router.post(
  '/disease-check',
  protect,
  authorizeRoles('farmer', 'admin'),
  upload.single('image'),
  checkCropDisease
);

// 4. Auto-Listing from Photo (Vision)
router.post(
  '/auto-list-photo',
  protect,
  authorizeRoles('farmer', 'admin'),
  upload.single('image'),
  autoListFromPhoto
);

module.exports = router;
