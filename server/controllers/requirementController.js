const Requirement = require('../models/Requirement');
const Quote = require('../models/Quote');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationHelper');

/**
 * @desc    Buyer posts a crop requirement (Reverse Marketplace)
 * @route   POST /api/requirements
 * @access  Private (Buyer / Admin)
 */
const createRequirement = async (req, res, next) => {
  try {
    const {
      cropName,
      category = 'Vegetables',
      quantity,
      unit = 'kg',
      targetPricePerUnit,
      deliveryAddress,
      district = '',
      state = '',
      neededByDate,
      notes = ''
    } = req.body;

    if (!cropName || !quantity || !targetPricePerUnit || !deliveryAddress || !neededByDate) {
      return res.status(400).json({
        success: false,
        message:
          'Crop name, quantity, target price, delivery address, and needed-by date are required.'
      });
    }

    const requirement = await Requirement.create({
      buyer: req.user.id,
      cropName: cropName.trim(),
      category,
      quantity: Number(quantity),
      unit,
      targetPricePerUnit: Number(targetPricePerUnit),
      deliveryLocation: {
        address: deliveryAddress.trim(),
        district: (district || req.user.location?.district || '').trim(),
        state: (state || req.user.location?.state || '').trim()
      },
      neededByDate: new Date(neededByDate),
      notes: notes.trim(),
      status: 'open'
    });

    // Notify relevant farmers (matching district or state, up to 15 farmers to avoid spam)
    const farmerFilter = { role: 'farmer', isBlocked: false };
    if (district) {
      farmerFilter['location.district'] = { $regex: district.trim(), $options: 'i' };
    } else if (state) {
      farmerFilter['location.state'] = { $regex: state.trim(), $options: 'i' };
    }

    const matchingFarmers = await User.find(farmerFilter).select('_id').limit(15);
    for (const farmer of matchingFarmers) {
      await createNotification({
        userId: farmer._id.toString(),
        type: 'requirement_posted',
        title: `New Buyer Requirement: ${cropName}`,
        message: `${req.user.name} needs ${quantity} ${unit} of ${cropName} at target ₹${targetPricePerUnit}/${unit} in ${district || state || 'your region'}.`,
        link: '/requirements',
        relatedDoc: requirement._id
      });
    }

    const populated = await Requirement.findById(requirement._id).populate(
      'buyer',
      'name phone location avatar'
    );

    return res.status(201).json({
      success: true,
      message: 'Requirement posted! Relevant farmers have been notified.',
      data: { requirement: populated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Browse buyer requirements (filter by crop, district, state, status)
 * @route   GET /api/requirements?crop=&district=&state=&status=open
 * @access  Public
 */
const getRequirements = async (req, res, next) => {
  try {
    const { crop, district, state, category, status = 'open' } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (crop && crop.trim()) {
      query.cropName = { $regex: crop.trim(), $options: 'i' };
    }
    if (district && district.trim()) {
      query['deliveryLocation.district'] = { $regex: district.trim(), $options: 'i' };
    }
    if (state && state.trim()) {
      query['deliveryLocation.state'] = { $regex: state.trim(), $options: 'i' };
    }
    if (category && category !== 'All') {
      query.category = category;
    }

    const requirements = await Requirement.find(query)
      .populate('buyer', 'name phone location avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Attach quotes count to each requirement
    const reqIds = requirements.map((r) => r._id);
    const quotes = await Quote.find({ requirement: { $in: reqIds } })
      .populate('farmer', 'name phone location avatar isVerified')
      .sort({ createdAt: -1 })
      .lean();

    const quotesByReq = {};
    for (const q of quotes) {
      const k = q.requirement.toString();
      if (!quotesByReq[k]) quotesByReq[k] = [];
      quotesByReq[k].push(q);
    }

    const enriched = requirements.map((r) => ({
      ...r,
      quotes: quotesByReq[r._id.toString()] || [],
      quoteCount: (quotesByReq[r._id.toString()] || []).length
    }));

    return res.status(200).json({
      success: true,
      message: 'Requirements loaded',
      data: { requirements: enriched }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in buyer's own requirements with all farmer quotes
 * @route   GET /api/requirements/my
 * @access  Private (Buyer / Admin)
 */
const getMyRequirements = async (req, res, next) => {
  try {
    const requirements = await Requirement.find({ buyer: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const reqIds = requirements.map((r) => r._id);
    const quotes = await Quote.find({ requirement: { $in: reqIds } })
      .populate('farmer', 'name phone email location avatar isVerified')
      .sort({ createdAt: -1 })
      .lean();

    const quotesByReq = {};
    for (const q of quotes) {
      const k = q.requirement.toString();
      if (!quotesByReq[k]) quotesByReq[k] = [];
      quotesByReq[k].push(q);
    }

    const enriched = requirements.map((r) => ({
      ...r,
      quotes: quotesByReq[r._id.toString()] || []
    }));

    return res.status(200).json({
      success: true,
      data: { requirements: enriched }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Farmer sends a quote on an open buyer requirement
 * @route   POST /api/requirements/:id/quotes
 * @access  Private (Farmer / Admin)
 */
const createQuote = async (req, res, next) => {
  try {
    const { pricePerUnit, quantity, message = '' } = req.body;
    const requirement = await Requirement.findById(req.params.id).populate('buyer', 'name email');

    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found.' });
    }

    if (requirement.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Cannot send quote because this requirement is already ${requirement.status}.`
      });
    }

    if (!pricePerUnit || Number(pricePerUnit) <= 0 || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price per unit and quantity are required.'
      });
    }

    const quote = await Quote.create({
      requirement: requirement._id,
      farmer: req.user.id,
      pricePerUnit: Number(pricePerUnit),
      quantity: Number(quantity),
      unit: requirement.unit,
      message: message.trim(),
      status: 'pending'
    });

    const populatedQuote = await Quote.findById(quote._id).populate(
      'farmer',
      'name phone location avatar isVerified'
    );

    await createNotification({
      userId: requirement.buyer._id.toString(),
      type: 'quote_received',
      title: `New Quote for ${requirement.cropName}`,
      message: `Farmer ${req.user.name} quoted ₹${pricePerUnit}/${requirement.unit} for ${quantity} ${requirement.unit} of ${requirement.cropName}.`,
      link: '/requirements',
      relatedDoc: requirement._id
    });

    return res.status(201).json({
      success: true,
      message: 'Quote sent to the buyer!',
      data: { quote: populatedQuote }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in farmer's submitted quotes
 * @route   GET /api/requirements/quotes/my
 * @access  Private (Farmer / Admin)
 */
const getMyQuotes = async (req, res, next) => {
  try {
    const quotes = await Quote.find({ farmer: req.user.id })
      .populate({
        path: 'requirement',
        populate: { path: 'buyer', select: 'name phone location' }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { quotes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Buyer accepts a farmer's quote -> converts it into a normal Order
 * @route   PUT /api/requirements/:id/quotes/:quoteId/accept
 * @access  Private (Buyer / Admin)
 */
const acceptQuote = async (req, res, next) => {
  try {
    const { id, quoteId } = req.params;
    const requirement = await Requirement.findById(id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found.' });
    }

    if (requirement.buyer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer who posted this requirement can accept a quote.'
      });
    }

    if (requirement.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Requirement is already ${requirement.status}.`
      });
    }

    const quote = await Quote.findById(quoteId).populate('farmer', 'name location phone email');
    if (!quote || quote.requirement.toString() !== requirement._id.toString()) {
      return res.status(404).json({ success: false, message: 'Quote not found for this requirement.' });
    }

    // Find an existing matching crop listing by this farmer, or create a dedicated listing for the Order reference
    let crop = await Crop.findOne({
      farmer: quote.farmer._id,
      name: { $regex: `^${requirement.cropName}$`, $options: 'i' }
    });

    if (!crop) {
      crop = await Crop.create({
        farmer: quote.farmer._id,
        name: requirement.cropName,
        category: requirement.category || 'Vegetables',
        quantity: 0,
        unit: requirement.unit || 'kg',
        pricePerUnit: quote.pricePerUnit,
        location: quote.farmer.location || {
          district: requirement.deliveryLocation?.district || 'Guntur',
          state: requirement.deliveryLocation?.state || 'Andhra Pradesh'
        },
        description: `Fulfilled via Reverse Marketplace Quote for buyer requirement (${requirement.cropName}).`,
        status: 'sold'
      });
    }

    const totalPrice = Math.round(quote.pricePerUnit * quote.quantity * 100) / 100;
    const deliveryStr = [
      requirement.deliveryLocation?.address,
      requirement.deliveryLocation?.district,
      requirement.deliveryLocation?.state
    ]
      .filter(Boolean)
      .join(', ');

    const order = await Order.create({
      crop: crop._id,
      buyer: requirement.buyer,
      farmer: quote.farmer._id,
      quantity: quote.quantity,
      pricePerUnit: quote.pricePerUnit,
      totalPrice,
      message: quote.message || `Created from accepted quote on requirement: ${requirement.cropName}`,
      deliveryLocation: deliveryStr || 'Buyer Address',
      status: 'accepted',
      paymentMethod: 'upi',
      sourceRequirement: requirement._id
    });

    quote.status = 'accepted';
    quote.createdOrder = order._id;
    await quote.save();

    // Mark other quotes on this requirement as rejected
    await Quote.updateMany(
      { requirement: requirement._id, _id: { $ne: quote._id } },
      { $set: { status: 'rejected' } }
    );

    requirement.status = 'fulfilled';
    requirement.acceptedQuote = quote._id;
    requirement.createdOrder = order._id;
    await requirement.save();

    await createNotification({
      userId: quote.farmer._id.toString(),
      type: 'quote_accepted',
      title: `Quote Accepted – Order Created!`,
      message: `${req.user.name} accepted your quote of ₹${quote.pricePerUnit}/${quote.unit} for ${quote.quantity} ${quote.unit} of ${requirement.cropName}. An accepted Order has been created.`,
      link: '/farmer/orders',
      relatedDoc: order._id
    });

    return res.status(200).json({
      success: true,
      message: 'Quote accepted! Converted into an active Order.',
      data: {
        requirement,
        quote,
        order
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequirement,
  getRequirements,
  getMyRequirements,
  createQuote,
  getMyQuotes,
  acceptQuote
};

