const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  getNotificationChannels,
  updateNotificationPreferences,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

router.get('/', protect, getNotifications);
router.get('/channels', protect, getNotificationChannels);
router.put('/preferences', protect, updateNotificationPreferences);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
