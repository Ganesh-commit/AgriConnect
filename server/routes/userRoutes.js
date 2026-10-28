const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  submitVerification
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { upload } = require('../middleware/upload');

router.use(protect);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/change-password', changePassword);

// Feature 6: Farmer submits verification document
router.post('/verify', authorizeRoles('farmer', 'admin'), upload.array('doc', 1), submitVerification);

module.exports = router;
