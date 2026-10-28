const User = require('../models/User');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const { sendEmail, emailTemplates } = require('../utils/mailer');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get all users with optional filtering
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        users,
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

// @desc    Toggle block/unblock user
// @route   PUT /api/admin/users/:id/block
// @access  Private (Admin)
const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Safety: prevent admin from blocking themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot block their own account.'
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all crops for admin management
// @route   GET /api/admin/crops
// @access  Private (Admin)
const getAllCropsAdmin = async (req, res, next) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Crop.countDocuments(query);
    const crops = await Crop.find(query)
      .populate('farmer', 'name email phone location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

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

// @desc    Delete any crop listing by admin
// @route   DELETE /api/admin/crops/:id
// @access  Private (Admin)
const deleteCropAdmin = async (req, res, next) => {
  try {
    const crop = await Crop.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop listing not found.'
      });
    }

    crop.isDeleted = true;
    crop.deletedAt = new Date();
    await crop.save();

    res.status(200).json({
      success: true,
      message: 'Crop listing removed by administrator.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform aggregate stats for Admin dashboard
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalCrops,
      activeCrops,
      soldCrops,
      totalOrders,
      pendingOrders,
      completedOrders,
      completedOrdersAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'buyer' }),
      Crop.countDocuments(),
      Crop.countDocuments({ status: 'available' }),
      Crop.countDocuments({ status: 'sold' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed' }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalTradeVolume: { $sum: '$totalPrice' } } }
      ])
    ]);

    const totalTradeVolume =
      completedOrdersAgg.length > 0 ? completedOrdersAgg[0].totalTradeVolume : 0;

    // Recent 5 orders and crops
    const recentOrders = await Order.find()
      .populate('crop', 'name category')
      .populate('buyer', 'name')
      .populate('farmer', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalFarmers,
          totalBuyers,
          totalCrops,
          activeCrops,
          soldCrops,
          totalOrders,
          pendingOrders,
          completedOrders,
          totalTradeVolume
        },
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get farmer's own dashboard summary stats
// @route   GET /api/admin/farmer-stats
// @access  Private (Farmer)
const getFarmerDashboardStats = async (req, res, next) => {
  try {
    const farmerId = req.user.id;

    const [
      totalListings,
      activeListings,
      totalOrders,
      pendingOrders,
      completedAgg
    ] = await Promise.all([
      Crop.countDocuments({ farmer: farmerId }),
      Crop.countDocuments({ farmer: farmerId, status: 'available' }),
      Order.countDocuments({ farmer: farmerId }),
      Order.countDocuments({ farmer: farmerId, status: 'pending' }),
      Order.aggregate([
        { $match: { farmer: req.user._id, status: 'completed' } },
        { $group: { _id: null, totalEarnings: { $sum: '$totalPrice' } } }
      ])
    ]);

    const totalEarnings = completedAgg.length > 0 ? completedAgg[0].totalEarnings : 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalListings,
          activeListings,
          totalOrders,
          pendingOrders,
          totalEarnings
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get farmers with pending verification (Feature 6)
// @route   GET /api/admin/verifications
// @access  Private (Admin)
const getPendingVerifications = async (req, res, next) => {
  try {
    const farmers = await User.find({ role: 'farmer', verificationStatus: 'pending' })
      .select('-password')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: { farmers } });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject a farmer verification (Feature 6)
// @route   PUT /api/admin/verifications/:id
// @access  Private (Admin)
const reviewVerification = async (req, res, next) => {
  try {
    const { action, note } = req.body; // action: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be 'approved' or 'rejected'." });
    }
    const farmer = await User.findOne({ _id: req.params.id, role: 'farmer' });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found.' });

    farmer.verificationStatus = action;
    farmer.isVerified = action === 'approved';
    farmer.verificationNote = note || '';
    await farmer.save();

    await createNotification({
      userId: farmer._id.toString(),
      type: action === 'approved' ? 'verification_approved' : 'verification_rejected',
      title: `Verification ${action}`,
      message: action === 'approved'
        ? 'Congratulations! Your farmer account is now verified.'
        : `Verification rejected. ${note || ''}`,
      link: '/profile',
      relatedDoc: farmer._id
    });

    if (farmer.email) {
      const tmpl = emailTemplates.verificationUpdate(farmer.name, action, note);
      sendEmail(farmer.email, tmpl.subject, tmpl.html);
    }

    res.status(200).json({ success: true, message: `Farmer verification ${action}.`, data: { farmer } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed analytics for the admin dashboard (Feature 7)
// @route   GET /api/admin/analytics
// @access  Private (Admin)
const getAdminAnalytics = async (req, res, next) => {
  try {
    // User growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Listings per category
    const listingsPerCategory = await Crop.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Total order value by month (last 6 months)
    const orderValueByMonth = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'completed' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          totalValue: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: { userGrowth, listingsPerCategory, orderValueByMonth, orderStatusBreakdown }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get farmer analytics dashboard (Feature 7)
// @route   GET /api/admin/farmer-analytics
// @access  Private (Farmer)
const getFarmerAnalytics = async (req, res, next) => {
  try {
    const farmerId = req.user._id;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Monthly earnings (last 6 months)
    const monthlyEarnings = await Order.aggregate([
      {
        $match: {
          farmer: farmerId,
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          earnings: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top selling crops
    const topCrops = await Order.aggregate([
      { $match: { farmer: farmerId, status: 'completed' } },
      {
        $group: {
          _id: '$crop',
          totalSold: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'crops',
          localField: '_id',
          foreignField: '_id',
          as: 'cropInfo',
          pipeline: [{ $project: { name: 1, category: 1, unit: 1 } }]
        }
      },
      { $unwind: { path: '$cropInfo', preserveNullAndEmpty: true } }
    ]);

    // Order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $match: { farmer: farmerId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: { monthlyEarnings, topCrops, orderStatusBreakdown }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
