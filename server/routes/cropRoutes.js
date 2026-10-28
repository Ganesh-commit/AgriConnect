const express = require('express');
const router = express.Router();
const {
  getCrops,
  getCropById,
  getMyCrops,
  createCrop,
  updateCrop,
  deleteCrop,
  getMandiPriceForCrop,
  getNearbyCrops,
  getTransportEstimateForCrop
} = require('../controllers/cropController');

const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { upload } = require('../middleware/upload');

// Public route: browse crops
router.get('/', getCrops);

// Feature 2: Mandi price API endpoint (before /:id to avoid conflict)
router.get('/mandi-price', getMandiPriceForCrop);

// Feature 3: Nearby crops map search (before /:id)
router.get('/nearby', getNearbyCrops);

// Farmer only: get farmer's own crops (must be placed before /:id)
router.get('/my', protect, authorizeRoles('farmer', 'admin'), getMyCrops);

// Public route: single crop details & transport estimate
router.get('/:id/transport-estimate', getTransportEstimateForCrop);
router.get('/:id', getCropById);

// Farmer only: create crop
router.post(
  '/',
  protect,
  authorizeRoles('farmer', 'admin'),
  upload.array('images', 5),
  createCrop
);

// Farmer owner / Admin: update crop
router.put(
  '/:id',
  protect,
  authorizeRoles('farmer', 'admin'),
  upload.array('images', 5),
  updateCrop
);

// Farmer owner / Admin: delete crop
router.delete(
  '/:id',
  protect,
  authorizeRoles('farmer', 'admin'),
  deleteCrop
);

module.exports = router;
