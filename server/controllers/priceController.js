const { getMandiPrice, getPriceTrend } = require('../utils/mandiService');

/**
 * @desc    Get current mandi price & suggested per-kg rate for a crop
 * @route   GET /api/prices?crop=&state=&district=
 * @access  Public
 */
const getPrices = async (req, res, next) => {
  try {
    const crop = (req.query.crop || req.query.name || 'Wheat').trim();
    const state = (req.query.state || '').trim();
    const district = (req.query.district || '').trim();

    const data = await getMandiPrice(crop, state, district);
    return res.status(200).json({
      success: true,
      message: `Mandi prices loaded for ${data.crop}`,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get 30-day mandi price trend + 7-day forecast + AI insight
 * @route   GET /api/prices/trend?crop=&days=30&state=&district=
 * @access  Public
 */
const getTrend = async (req, res, next) => {
  try {
    const crop = (req.query.crop || req.query.name || 'Wheat').trim();
    const state = (req.query.state || '').trim();
    const district = (req.query.district || '').trim();
    const days = parseInt(req.query.days, 10) || 30;

    const data = await getPriceTrend({ crop, state, district, days });
    return res.status(200).json({
      success: true,
      message: `${days}-day mandi trend & forecast loaded for ${data.crop}`,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrices,
  getTrend
};

