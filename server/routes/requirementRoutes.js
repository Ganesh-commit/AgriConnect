const express = require('express');
const router = express.Router();
const {
  createRequirement,
  getRequirements,
  getMyRequirements,
  createQuote,
  getMyQuotes,
  acceptQuote
} = require('../controllers/requirementController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');

router.get('/', getRequirements);
router.get('/my', protect, authorizeRoles('buyer', 'admin'), getMyRequirements);
router.get('/quotes/my', protect, authorizeRoles('farmer', 'admin'), getMyQuotes);
router.post('/', protect, authorizeRoles('buyer', 'admin'), createRequirement);
router.post('/:id/quotes', protect, authorizeRoles('farmer', 'admin'), createQuote);
router.put('/:id/quotes/:quoteId/accept', protect, authorizeRoles('buyer', 'admin'), acceptQuote);

module.exports = router;

