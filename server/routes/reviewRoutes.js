const express = require('express');
const router = express.Router();
const {
  createReview,
  getFarmerReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');

// Public route to get reviews for a farmer
router.get('/farmer/:id', getFarmerReviews);

// Buyer only: submit review
router.post('/', protect, authorizeRoles('buyer', 'admin'), createReview);

module.exports = router;
