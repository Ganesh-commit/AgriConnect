const Notification = require('../models/Notification');
const User = require('../models/User');
const notifier = require('../services/notifier');

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments({ user: req.user.id, isRead: false })
    ]);

    res.status(200).json({
      success: true,
      data: { notifications, unreadCount }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification channels status and user preferences (Integration 7)
// @route   GET /api/notifications/channels
// @access  Private
const getNotificationChannels = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    const channels = notifier.getChannelStatus();
    res.status(200).json({
      success: true,
      message: 'Notification channels and preferences loaded',
      data: {
        channels,
        preferences: user?.notificationPreferences || {
          inapp: true,
          email: true,
          sms: false,
          whatsapp: false
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user notification channel preferences (Integration 7)
// @route   PUT /api/notifications/preferences
// @access  Private
const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { email, sms, whatsapp } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.notificationPreferences = {
      inapp: true,
      email: email !== undefined ? Boolean(email) : user.notificationPreferences?.email ?? true,
      sms: sms !== undefined ? Boolean(sms) : user.notificationPreferences?.sms ?? false,
      whatsapp:
        whatsapp !== undefined
          ? Boolean(whatsapp)
          : user.notificationPreferences?.whatsapp ?? false
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated.',
      data: {
        preferences: user.notificationPreferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.status(200).json({ success: true, data: { notification } });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getNotificationChannels,
  updateNotificationPreferences,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
