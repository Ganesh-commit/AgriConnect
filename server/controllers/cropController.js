const Crop = require('../models/Crop');
const Review = require('../models/Review');
const { processUploadedFiles } = require('../middleware/upload');
const { getMandiPrice } = require('../utils/mandiService');
const { resolveCoordinates, estimateTransport } = require('../utils/transportHelper');
const { liveCropFilter, getLiveCropQuery, escapeRegex } = require('../utils/liveCropFilter');

// @desc    Get all crops with filtering, search, sorting, and pagination
// @route   GET /api/crops
// @access  Public
const getCrops = async (req, res, next) => {
  try {
    const {
      search,
      category,
      state,
      district,
      minPrice,
      maxPrice,
      status,
      availability,
      sort,
      page = 1,
      limit = 12
    } = req.query;

    let query;
    // Availability filter (default: use shared liveCropFilter + exclude blocked farmers)
    if (availability === 'sold' || status === 'sold') {
      query = await getLiveCropQuery({ status: 'sold', quantity: { $gte: 0 } });
    } else if (availability === 'all' || status === 'all') {
      query = await getLiveCropQuery({});
      delete query.status;
      delete query.quantity;
    } else {
      query = await getLiveCropQuery();
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // State filter
    if (state && state.trim()) {
      query['location.state'] = { $regex: escapeRegex(state.trim()), $options: 'i' };
    }

    // District filter
    if (district && district.trim()) {
      query['location.district'] = { $regex: escapeRegex(district.trim()), $options: 'i' };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.pricePerUnit = {};
      if (minPrice) query.pricePerUnit.$gte = Number(minPrice);
      if (maxPrice) query.pricePerUnit.$lte = Number(maxPrice);
    }

    // Text search or regex fallback
    if (search && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { 'location.village': { $regex: safeSearch, $options: 'i' } },
        { 'location.district': { $regex: safeSearch, $options: 'i' } },
        { 'location.state': { $regex: safeSearch, $options: 'i' } }
      ];
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // default newest
    if (sort === 'price-asc') {
      sortOption = { pricePerUnit: 1 };
    } else if (sort === 'price-desc') {
      sortOption = { pricePerUnit: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await Crop.countDocuments(query);
    let crops;
    if (sort === 'popular') {
      crops = await Crop.aggregate([
        { $match: query },
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'crop', as: 'orders' } },
        { $addFields: { orderCount: { $size: '$orders' } } },
        { $sort: { orderCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'users',
            localField: 'farmer',
            foreignField: '_id',
            as: 'farmer',
            pipeline: [{ $project: { name: 1, phone: 1, location: 1, avatar: 1, isVerified: 1 } }]
          }
        },
        { $unwind: { path: '$farmer', preserveNullAndEmptyArrays: true } },
        { $project: { orders: 0 } }
      ]);
    } else {
      crops = await Crop.find(query)
        .populate('farmer', 'name phone location avatar isVerified')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);
    }

    res.status(200).json({
      success: true,
      data: {
        crops,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single crop by ID with farmer info and ratings
// @route   GET /api/crops/:id
// @access  Public
const getCropById = async (req, res, next) => {
  try {
    const crop = await Crop.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate(
      'farmer',
      'name email phone location avatar createdAt isVerified isBlocked'
    );

    if (!crop || crop.farmer?.isBlocked) {
      return res.status(404).json({
        success: false,
        message: 'Crop listing not found'
      });
    }

    // Calculate farmer's average rating and total reviews
    const reviews = await Review.find({ farmer: crop.farmer._id })
      .populate('buyer', 'name avatar')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? parseFloat(
            (
              reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
            ).toFixed(1)
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        crop,
        farmerReviews: {
          averageRating,
          totalReviews,
          reviews: reviews.slice(0, 10) // latest 10 reviews
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get crops listed by the currently logged-in farmer
// @route   GET /api/crops/my
// @access  Private (Farmer)
const getMyCrops = async (req, res, next) => {
  try {
    const crops = await Crop.find({ farmer: req.user.id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        crops
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get mandi price suggestion for a crop name (Feature 2)
// @route   GET /api/crops/mandi-price?name=wheat&state=andhra
// @access  Public
const getMandiPriceForCrop = async (req, res, next) => {
  try {
    const { name, state } = req.query;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Crop name is required.' });
    }
    const result = await getMandiPrice(name.trim(), state || '');
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get crops near a location using $geoNear (Feature 3)
// @route   GET /api/crops/nearby?lat=17.38&lng=78.48&radius=50
// @access  Public
const getNearbyCrops = async (req, res, next) => {
  try {
    const { lat, lng, radius = 50, category, page = 1, limit = 20 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required.' });
    }
    const radiusInMeters = Number(radius) * 1000;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const matchStage = await getLiveCropQuery();
    if (category && category !== 'All') matchStage.category = category;

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: radiusInMeters,
          spherical: true,
          query: matchStage
        }
      },
      { $sort: { distance: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'farmer',
          foreignField: '_id',
          as: 'farmer',
          pipeline: [{ $project: { name: 1, phone: 1, location: 1, avatar: 1, isVerified: 1 } }]
        }
      },
      { $unwind: { path: '$farmer', preserveNullAndEmpty: true } },
      { $skip: skip },
      { $limit: limitNum }
    ];

    const crops = await Crop.aggregate(pipeline);
    res.status(200).json({ success: true, data: { crops, count: crops.length } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new crop listing
// @route   POST /api/crops
// @access  Private (Farmer)
const createCrop = async (req, res, next) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      pricePerUnit,
      village,
      district,
      state,
      description,
      harvestDate,
      latitude,
      longitude
    } = req.body;

    // Handle uploaded images from multer
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await processUploadedFiles(req.files);
    } else if (req.body.images) {
      imageUrls = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // Extract location
    const location = {
      village: village || (req.body.location && req.body.location.village) || req.user.location.village || '',
      district: district || (req.body.location && req.body.location.district) || req.user.location.district || '',
      state: state || (req.body.location && req.body.location.state) || req.user.location.state || ''
    };

    // Feature 3: GeoJSON coordinates from map picker
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);
    const geoLocation = {
      type: 'Point',
      coordinates: [
        !isNaN(parsedLng) ? parsedLng : 0,
        !isNaN(parsedLat) ? parsedLat : 0
      ]
    };

    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(pricePerUnit);

    const crop = await Crop.create({
      farmer: req.user.id,
      name: name.trim(),
      category,
      quantity: parsedQuantity,
      unit: unit || 'kg',
      pricePerUnit: parsedPrice,
      location,
      geoLocation,
      images: imageUrls,
      description: description.trim(),
      harvestDate: harvestDate ? new Date(harvestDate) : new Date(),
      status: parsedQuantity > 0 ? 'available' : 'sold'
    });

    res.status(201).json({
      success: true,
      message: 'Crop listing created successfully!',
      data: { crop }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update crop listing
// @route   PUT /api/crops/:id
// @access  Private (Farmer - owner only)
const updateCrop = async (req, res, next) => {
  try {
    let crop = await Crop.findById(req.params.id);

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop listing not found'
      });
    }

    // Make sure user is crop owner or admin
    if (crop.farmer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this crop listing'
      });
    }

    const {
      name,
      category,
      quantity,
      unit,
      pricePerUnit,
      village,
      district,
      state,
      description,
      harvestDate,
      status
    } = req.body;

    if (name) crop.name = name.trim();
    if (category) crop.category = category;
    if (unit) crop.unit = unit;
    if (pricePerUnit !== undefined) crop.pricePerUnit = Number(pricePerUnit);
    if (description) crop.description = description.trim();
    if (harvestDate) crop.harvestDate = new Date(harvestDate);

    if (quantity !== undefined) {
      crop.quantity = Number(quantity);
      if (crop.quantity <= 0) {
        crop.status = 'sold';
      } else if (status) {
        crop.status = status;
      }
    } else if (status) {
      crop.status = status;
    }

    if (village !== undefined || district !== undefined || state !== undefined) {
      crop.location = {
        village: village !== undefined ? village.trim() : crop.location.village,
        district: district !== undefined ? district.trim() : crop.location.district,
        state: state !== undefined ? state.trim() : crop.location.state
      };
    }

    // Process new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = await processUploadedFiles(req.files);
      crop.images = [...crop.images, ...newImages];
    } else if (req.body.existingImages) {
      crop.images = Array.isArray(req.body.existingImages)
        ? req.body.existingImages
        : [req.body.existingImages];
    }

    await crop.save();

    res.status(200).json({
      success: true,
      message: 'Crop listing updated successfully.',
      data: {
        crop
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete crop listing
// @route   DELETE /api/crops/:id
// @access  Private (Farmer owner or Admin)
const deleteCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop listing not found'
      });
    }

    // Check ownership or admin
    if (crop.farmer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this crop listing'
      });
    }

    // Soft delete so historical references stay intact while live queries exclude it immediately
    crop.isDeleted = true;
    crop.deletedAt = new Date();
    await crop.save();

    res.status(200).json({
      success: true,
      message: 'Crop listing removed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Integration 8: Estimate distance & transport cost between farmer crop and buyer
// @route   GET /api/crops/:id/transport-estimate?buyerDistrict=&buyerAddress=&buyerLat=&buyerLng=&quantity=100
// @access  Public
const getTransportEstimateForCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id).populate('farmer', 'location coordinates');
    if (!crop) {
      return res.status(404).json({ success: false, message: 'Crop listing not found.' });
    }

    const farmerCoords = resolveCoordinates({
      geoLocation: crop.geoLocation,
      lat: crop.farmer?.coordinates?.lat,
      lng: crop.farmer?.coordinates?.lng,
      district: crop.location?.district || crop.farmer?.location?.district,
      address: crop.location?.village,
      state: crop.location?.state || crop.farmer?.location?.state
    });

    const buyerCoords = resolveCoordinates({
      lat: req.query.buyerLat,
      lng: req.query.buyerLng,
      district: req.query.buyerDistrict,
      address: req.query.buyerAddress,
      state: req.query.buyerState
    });

    const quantity = Number(req.query.quantity) || 100;
    const estimate = estimateTransport({
      farmerCoords,
      buyerCoords,
      quantity,
      unit: crop.unit
    });

    res.status(200).json({
      success: true,
      message: 'Transport estimate calculated.',
      data: {
        ...estimate,
        farmerLocation: crop.location,
        unit: crop.unit
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCrops,
  getCropById,
  getMyCrops,
  createCrop,
  updateCrop,
  deleteCrop,
  getMandiPriceForCrop,
  getNearbyCrops,
  getTransportEstimateForCrop
};
