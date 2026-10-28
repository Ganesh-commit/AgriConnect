const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getFarmerOrders,
  updateOrderStatus,
  cancelOrder,
  submitOffer,
  respondToOffer,
  getOrderUpiQr,
  markOrderPaid,
  downloadOrderInvoice
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');

router.use(protect);

// Buyer creates order
router.post('/', authorizeRoles('buyer', 'admin'), createOrder);

// Buyer gets their own orders
router.get('/my', authorizeRoles('buyer', 'admin'), getMyOrders);

// Farmer gets incoming orders
router.get('/farmer', authorizeRoles('farmer', 'admin'), getFarmerOrders);

// Integration 9: Direct UPI QR code for accepted/completed order
router.get('/:id/upi-qr', getOrderUpiQr);

// Integration 9: Farmer manually marks order as paid
router.put('/:id/mark-paid', authorizeRoles('farmer', 'admin'), markOrderPaid);

// Integration 10: PDF Invoice download for buyer and farmer
router.get('/:id/invoice', downloadOrderInvoice);

// Farmer updates order status (accept/reject/complete)
router.put('/:id/status', authorizeRoles('farmer', 'admin'), updateOrderStatus);

// Buyer cancels order while pending
router.put('/:id/cancel', authorizeRoles('buyer', 'admin'), cancelOrder);

// Feature 4: Negotiation – both buyer and farmer can submit an offer
router.post('/:id/negotiate', submitOffer);

// Feature 4: Farmer responds to an offer
router.put('/:id/offer/:offerId/respond', authorizeRoles('farmer', 'admin'), respondToOffer);

module.exports = router;
