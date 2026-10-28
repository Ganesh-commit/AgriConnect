const Order = require('../models/Order');
const Crop = require('../models/Crop');
const { emailTemplates } = require('../utils/mailer');
const { createNotification } = require('../utils/notificationHelper');
const { buildUpiLink, generateQrDataUrl } = require('../utils/upiHelper');
const { generateInvoicePdfBuffer } = require('../utils/pdfInvoiceGenerator');
const User = require('../models/User');

// @desc    Place a new order request
// @route   POST /api/orders
// @access  Private (Buyer)
const createOrder = async (req, res, next) => {
  try {
    const { cropId, quantity, message, deliveryLocation, paymentMethod } = req.body;

    if (!cropId || !quantity || !deliveryLocation) {
      return res.status(400).json({
        success: false,
        message: 'Crop ID, quantity, and delivery location are required.'
      });
    }

    const orderQty = Number(quantity);
    if (orderQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Order quantity must be greater than 0.'
      });
    }

    const crop = await Crop.findById(cropId).populate('farmer', 'name phone email');
    if (!crop) {
      return res.status(404).json({ success: false, message: 'Crop not found.' });
    }

    if (crop.status === 'sold' || crop.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This crop listing is already sold out.'
      });
    }

    if (orderQty > crop.quantity) {
      return res.status(400).json({
        success: false,
        message: `Order quantity (${orderQty} ${crop.unit}) exceeds available stock (${crop.quantity} ${crop.unit}).`
      });
    }

    if (crop.farmer._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot place an order for your own crop listing.'
      });
    }

    const totalPrice = Math.round(crop.pricePerUnit * orderQty * 100) / 100;
    const validPaymentMethods = ['cash', 'upi', 'other'];
    const pm = validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'cash';

    const order = await Order.create({
      crop: crop._id,
      buyer: req.user.id,
      farmer: crop.farmer._id,
      quantity: orderQty,
      pricePerUnit: crop.pricePerUnit,
      totalPrice,
      message: message || '',
      deliveryLocation: deliveryLocation.trim(),
      status: 'pending',
      paymentMethod: pm,
      offerHistory: [],
      currentOffer: crop.pricePerUnit
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('crop', 'name category unit pricePerUnit images location')
      .populate('farmer', 'name phone email avatar location')
      .populate('buyer', 'name phone email');

    // Notifications (In-App + Email + SMS/WhatsApp via Notifier)
    const farmerUser = await User.findById(crop.farmer._id);
    const tmpl = farmerUser
      ? emailTemplates.orderPlaced(farmerUser.name, req.user.name, crop.name, orderQty, crop.unit)
      : null;

    await createNotification({
      userId: crop.farmer._id.toString(),
      type: 'order_placed',
      title: 'New Order Request',
      message: `${req.user.name} placed an order for ${crop.name} (${orderQty} ${crop.unit})`,
      link: '/farmer/orders',
      relatedDoc: order._id,
      emailSubject: tmpl?.subject,
      emailHtml: tmpl?.html
    });

    res.status(201).json({
      success: true,
      message: 'Order request placed successfully! The farmer will review it.',
      data: { order: populatedOrder }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in buyer's orders
// @route   GET /api/orders/my
// @access  Private (Buyer)
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate('crop', 'name category unit pricePerUnit images location status')
      .populate('farmer', 'name phone email location avatar isVerified upiId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders received by the logged-in farmer
// @route   GET /api/orders/farmer
// @access  Private (Farmer)
const getFarmerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ farmer: req.user.id })
      .populate('crop', 'name category unit pricePerUnit images location quantity status')
      .populate('buyer', 'name phone email location avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Accept, Reject, Complete)
// @route   PUT /api/orders/:id/status
// @access  Private (Farmer)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'rejected', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status can be accepted, rejected, or completed.'
      });
    }

    const order = await Order.findById(req.params.id).populate('crop', 'name').populate('buyer', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.farmer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this order.' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update an order that has already been cancelled by the buyer.'
      });
    }

    if (status === 'accepted' && (order.status === 'pending' || order.status === 'negotiating')) {
      const crop = await Crop.findById(order.crop);
      if (!crop) {
        return res.status(404).json({ success: false, message: 'The associated crop listing no longer exists.' });
      }
      if (crop.quantity < order.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot accept order: only ${crop.quantity} ${crop.unit} remaining in stock.`
        });
      }
      crop.quantity = Math.max(0, crop.quantity - order.quantity);
      if (crop.quantity === 0) crop.status = 'sold';
      await crop.save();
    }

    order.status = status;
    if (status === 'completed' && !order.invoiceNumber) {
      order.invoiceNumber = `INV-${new Date().getFullYear()}-${String(order._id).slice(-6).toUpperCase()}`;
    }
    await order.save();

    // Notifications + email/sms/whatsapp to buyer via Notifier
    const notifType = `order_${status}`;
    const tmpl = order.buyer
      ? emailTemplates.orderStatusUpdate(order.buyer.name, order.crop.name, status)
      : null;

    await createNotification({
      userId: order.buyer._id.toString(),
      type: notifType,
      title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your order for ${order.crop.name} has been ${status}.`,
      link: '/buyer/orders',
      relatedDoc: order._id,
      emailSubject: tmpl?.subject,
      emailHtml: tmpl?.html
    });

    const updatedOrder = await Order.findById(order._id)
      .populate('crop', 'name category unit pricePerUnit images location status quantity')
      .populate('buyer', 'name phone email location')
      .populate('farmer', 'name phone email location');

    res.status(200).json({
      success: true,
      message: `Order status successfully updated to ${status}.`,
      data: { order: updatedOrder }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order request while it is pending
// @route   PUT /api/orders/:id/cancel
// @access  Private (Buyer)
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('crop', 'name').populate('farmer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.buyer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order.' });
    }

    if (order.status !== 'pending' && order.status !== 'negotiating') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already '${order.status}'.`
      });
    }

    order.status = 'cancelled';
    await order.save();

    await createNotification({
      userId: order.farmer._id.toString(),
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `${req.user.name} cancelled their order for ${order.crop.name}.`,
      link: '/farmer/orders',
      relatedDoc: order._id
    });

    res.status(200).json({ success: true, message: 'Order has been cancelled successfully.', data: { order } });
  } catch (error) {
    next(error);
  }
};

// @desc    Buyer sends a counter-offer price (Feature 4: Negotiation)
// @route   POST /api/orders/:id/negotiate
// @access  Private (Buyer or Farmer)
const submitOffer = async (req, res, next) => {
  try {
    const { pricePerUnit, note } = req.body;

    if (!pricePerUnit || pricePerUnit <= 0) {
      return res.status(400).json({ success: false, message: 'A valid price is required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const isBuyer = order.buyer.toString() === req.user.id;
    const isFarmer = order.farmer.toString() === req.user.id;

    if (!isBuyer && !isFarmer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (!['pending', 'negotiating'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Negotiation is only allowed on pending or negotiating orders.'
      });
    }

    const newOffer = {
      offeredBy: req.user.id,
      role: isBuyer ? 'buyer' : 'farmer',
      pricePerUnit,
      note: note || '',
      status: 'pending'
    };

    // Mark previous offer as countered
    if (order.offerHistory.length > 0) {
      const lastOffer = order.offerHistory[order.offerHistory.length - 1];
      lastOffer.status = 'countered';
    }

    order.offerHistory.push(newOffer);
    order.status = 'negotiating';
    order.currentOffer = pricePerUnit;
    order.totalPrice = Math.round(pricePerUnit * order.quantity * 100) / 100;
    await order.save();

    // Notify the other party
    const recipientId = isBuyer ? order.farmer.toString() : order.buyer.toString();
    await createNotification({
      userId: recipientId,
      type: 'negotiation_offer',
      title: 'New Offer Received',
      message: `${req.user.name} offered ₹${pricePerUnit}/unit for the order.`,
      link: isBuyer ? '/farmer/orders' : '/buyer/orders',
      relatedDoc: order._id
    });

    const updatedOrder = await Order.findById(order._id)
      .populate('crop', 'name category unit pricePerUnit images location')
      .populate('buyer', 'name phone email avatar')
      .populate('farmer', 'name phone email avatar');

    res.status(200).json({ success: true, message: 'Offer submitted.', data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
};

// @desc    Farmer accepts or rejects an offer (Feature 4)
// @route   PUT /api/orders/:id/offer/:offerId/respond
// @access  Private (Farmer)
const respondToOffer = async (req, res, next) => {
  try {
    const { action } = req.body; // 'accepted' or 'rejected'
    const { id, offerId } = req.params;

    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'accepted' or 'rejected'." });
    }

    const order = await Order.findById(id).populate('crop', 'name').populate('buyer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.farmer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the farmer can respond to offers.' });
    }

    const offer = order.offerHistory.id(offerId);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });

    offer.status = action;

    if (action === 'accepted') {
      order.status = 'accepted';
      order.pricePerUnit = offer.pricePerUnit;
      order.totalPrice = Math.round(offer.pricePerUnit * order.quantity * 100) / 100;

      // Deduct crop quantity
      const crop = await Crop.findById(order.crop);
      if (crop) {
        crop.quantity = Math.max(0, crop.quantity - order.quantity);
        if (crop.quantity === 0) crop.status = 'sold';
        await crop.save();
      }
    } else {
      order.status = 'pending';
    }

    await order.save();

    const notifType = action === 'accepted' ? 'negotiation_accepted' : 'negotiation_rejected';
    await createNotification({
      userId: order.buyer._id.toString(),
      type: notifType,
      title: `Offer ${action}`,
      message: `Your offer for ${order.crop.name} was ${action} by the farmer.`,
      link: '/buyer/orders',
      relatedDoc: order._id
    });

    const updatedOrder = await Order.findById(order._id)
      .populate('crop', 'name category unit pricePerUnit images location')
      .populate('buyer', 'name phone email avatar')
      .populate('farmer', 'name phone email avatar upiId');

    res.status(200).json({ success: true, data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
};

// @desc    Integration 9: Generate direct UPI deep link & QR code for an accepted/completed order
// @route   GET /api/orders/:id/upi-qr
// @access  Private (Buyer or Farmer)
const getOrderUpiQr = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('farmer', 'name phone upiId')
      .populate('crop', 'name unit');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isBuyer = order.buyer.toString() === req.user.id;
    const isFarmer = order.farmer._id.toString() === req.user.id;
    if (!isBuyer && !isFarmer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order QR.' });
    }

    if (!['accepted', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'UPI QR payment is only available once the farmer accepts the order.'
      });
    }

    const farmerUpiId = (order.farmer?.upiId || '').trim();
    if (!farmerUpiId) {
      return res.status(200).json({
        success: true,
        message: 'Farmer has not added a UPI ID yet. Please settle directly via phone/cash.',
        data: {
          upiConfigured: false,
          upiId: null,
          upiLink: null,
          qrDataUrl: null,
          farmerName: order.farmer?.name,
          farmerPhone: order.farmer?.phone,
          amount: order.totalPrice,
          paymentStatus: order.paymentStatus || 'unpaid'
        }
      });
    }

    const upiLink = buildUpiLink({
      upiId: farmerUpiId,
      payeeName: order.farmer?.name,
      amount: order.totalPrice,
      orderId: order._id
    });

    const qrDataUrl = await generateQrDataUrl(upiLink);

    return res.status(200).json({
      success: true,
      message: 'UPI QR generated for direct farmer settlement.',
      data: {
        upiConfigured: true,
        upiId: farmerUpiId,
        upiLink,
        qrDataUrl,
        farmerName: order.farmer?.name,
        farmerPhone: order.farmer?.phone,
        amount: order.totalPrice,
        paymentStatus: order.paymentStatus || 'unpaid',
        paidAt: order.paidAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Integration 9: Farmer manually marks an order as "paid"
// @route   PUT /api/orders/:id/mark-paid
// @access  Private (Farmer / Admin)
const markOrderPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('crop', 'name unit')
      .populate('buyer', 'name email phone')
      .populate('farmer', 'name email phone upiId');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.farmer._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the farmer can manually mark this order as paid.'
      });
    }

    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    if (!order.invoiceNumber) {
      order.invoiceNumber = `INV-${new Date().getFullYear()}-${String(order._id).slice(-6).toUpperCase()}`;
    }
    await order.save();

    await createNotification({
      userId: order.buyer._id.toString(),
      type: 'order_paid',
      title: 'Payment Acknowledged by Farmer',
      message: `${order.farmer.name} marked your payment of ₹${order.totalPrice.toLocaleString()} for ${order.crop?.name} as received.`,
      link: '/buyer/orders',
      relatedDoc: order._id
    });

    return res.status(200).json({
      success: true,
      message: 'Order manually marked as paid.',
      data: { order }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Integration 10: Download PDF Invoice for a completed (or accepted/paid) order
// @route   GET /api/orders/:id/invoice
// @access  Private (Buyer or Farmer)
const downloadOrderInvoice = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('crop', 'name category unit pricePerUnit location')
      .populate('buyer', 'name phone email location')
      .populate('farmer', 'name phone email location upiId');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isBuyer = order.buyer?._id.toString() === req.user.id;
    const isFarmer = order.farmer?._id.toString() === req.user.id;
    if (!isBuyer && !isFarmer && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this invoice.'
      });
    }

    if (order.status !== 'completed' && order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoices are generated once an order is completed or marked paid.'
      });
    }

    if (!order.invoiceNumber) {
      order.invoiceNumber = `INV-${new Date(order.createdAt || Date.now()).getFullYear()}-${String(
        order._id
      )
        .slice(-6)
        .toUpperCase()}`;
      await order.save();
    }

    const pdfBuffer = await generateInvoicePdfBuffer(order);
    const filename = `AgriConnect-${order.invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
