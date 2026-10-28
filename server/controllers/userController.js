const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { processUploadedFiles } = require('../middleware/upload');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const { name, phone, location, avatar, upiId, notificationPreferences, coordinates } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (upiId !== undefined) user.upiId = String(upiId).trim();

    if (notificationPreferences && typeof notificationPreferences === 'object') {
      user.notificationPreferences = {
        inapp: true, // in-app is always active
        email:
          notificationPreferences.email !== undefined
            ? Boolean(notificationPreferences.email)
            : user.notificationPreferences?.email ?? true,
        sms:
          notificationPreferences.sms !== undefined
            ? Boolean(notificationPreferences.sms)
            : user.notificationPreferences?.sms ?? false,
        whatsapp:
          notificationPreferences.whatsapp !== undefined
            ? Boolean(notificationPreferences.whatsapp)
            : user.notificationPreferences?.whatsapp ?? false
      };
    }

    if (coordinates && typeof coordinates === 'object') {
      user.coordinates = {
        lat: coordinates.lat !== undefined ? Number(coordinates.lat) : user.coordinates?.lat ?? null,
        lng: coordinates.lng !== undefined ? Number(coordinates.lng) : user.coordinates?.lng ?? null
      };
    }

    if (location) {
      user.location = {
        village: location.village !== undefined ? location.village.trim() : user.location.village,
        district: location.district !== undefined ? location.district.trim() : user.location.district,
        state: location.state !== undefined ? location.state.trim() : user.location.state
      };
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new passwords.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Farmer submits verification document (Feature 6)
// @route   POST /api/users/verify
// @access  Private (Farmer)
const submitVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'farmer') {
      return res.status(403).json({ success: false, message: 'Only farmers can apply for verification.' });
    }
    if (user.verificationStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'You are already verified.' });
    }
    if (user.verificationStatus === 'pending') {
      return res.status(400).json({ success: false, message: 'Your verification is already under review.' });
    }

    let docUrl = '';
    if (req.files && req.files.length > 0) {
      const urls = await processUploadedFiles(req.files);
      docUrl = urls[0] || '';
    } else if (req.body.docUrl) {
      docUrl = req.body.docUrl;
    }

    if (!docUrl) {
      return res.status(400).json({ success: false, message: 'Please upload a verification document.' });
    }

    user.verificationDoc = docUrl;
    user.verificationStatus = 'pending';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Verification submitted! An admin will review it shortly.',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  submitVerification
};
