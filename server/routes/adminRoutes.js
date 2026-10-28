const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  toggleBlockUser,
  getAllCropsAdmin,
  deleteCropAdmin,
  getAdminStats,
  getFarmerDashboardStats,
  getPendingVerifications,
  reviewVerification,
  getAdminAnalytics,
  getFarmerAnalytics
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { upload } = require('../middleware/upload');

router.use(protect);

// Farmer dashboard stats
router.get('/farmer-stats', authorizeRoles('farmer', 'admin'), getFarmerDashboardStats);

// Feature 7: Farmer analytics
router.get('/farmer-analytics', authorizeRoles('farmer', 'admin'), getFarmerAnalytics);

// Admin-only management endpoints
router.get('/users', authorizeRoles('admin'), getAllUsers);
router.put('/users/:id/block', authorizeRoles('admin'), toggleBlockUser);
router.get('/crops', authorizeRoles('admin'), getAllCropsAdmin);
router.delete('/crops/:id', authorizeRoles('admin'), deleteCropAdmin);
router.get('/stats', authorizeRoles('admin'), getAdminStats);

// Feature 7: Admin analytics
router.get('/analytics', authorizeRoles('admin'), getAdminAnalytics);

// Feature 6: Verification management
router.get('/verifications', authorizeRoles('admin'), getPendingVerifications);
router.put('/verifications/:id', authorizeRoles('admin'), reviewVerification);

module.exports = router;
