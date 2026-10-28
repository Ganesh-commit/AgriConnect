const express = require('express');
const router = express.Router();
const {
  getSchemes,
  createScheme,
  updateScheme,
  deleteScheme
} = require('../controllers/schemeController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');

router.get('/', getSchemes);
router.post('/', protect, authorizeRoles('admin'), createScheme);
router.put('/:id', protect, authorizeRoles('admin'), updateScheme);
router.delete('/:id', protect, authorizeRoles('admin'), deleteScheme);

module.exports = router;

