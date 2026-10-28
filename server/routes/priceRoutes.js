const express = require('express');
const router = express.Router();
const { getPrices, getTrend } = require('../controllers/priceController');

router.get('/', getPrices);
router.get('/trend', getTrend);

module.exports = router;

