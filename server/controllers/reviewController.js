const Review = require('../models/Review');
const Order = require('../models/Order');

// @desc    Create a review for a farmer after a completed order
// @route   POST /api/reviews
// @access  Private (Buyer)
const createReview = async (req, res, next) => {
  try {
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, rating (1-5), and comment are required.'
      });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5 stars.'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Verify buyer is the owner of the order
    if (order.buyer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only review orders that you have placed.'
      });
    }

    // Rule: buyer can rate farmer ONLY after a Completed order
    if (order.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted after the order has been completed.'
      });
    }

    // Check if review already exists for this order
    const existingReview = await Review.findOne({ order: orderId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this order.'
      });
    }

    const review = await Review.create({
      farmer: order.farmer,
      buyer: req.user.id,
      order: orderId,
      rating: numRating,
      comment: comment.trim()
    });

    const populatedReview = await Review.findById(review._id).populate(
      'buyer',
      'name avatar'
    );

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been recorded.',
      data: {
        review: populatedReview
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews for a farmer
// @route   GET /api/reviews/farmer/:id
// @access  Public
const getFarmerReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ farmer: req.params.id })
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

    // Breakdown by star
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (breakdown[r.rating] !== undefined) {
        breakdown[r.rating] += 1;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        stats: {
          totalReviews,
          averageRating,
          breakdown
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getFarmerReviews
};
