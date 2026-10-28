import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService, reviewService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import StarRating from '../../components/common/StarRating';
import EmptyState from '../../components/common/EmptyState';
import {
  ShoppingBag,
  ArrowLeft,
  X,
  Star,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Truck,
  ExternalLink,
  QrCode,
  FileDown
} from 'lucide-react';
import toast from 'react-hot-toast';

const BuyerOrders = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Review Modal State
  const [reviewOrder, setReviewOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState({});

  // Integration 9: UPI QR Modal State
  const [upiModalData, setUpiModalData] = useState(null);
  const [loadingUpi, setLoadingUpi] = useState(false);

  const handleOpenUpiQr = async (orderId) => {
    try {
      setLoadingUpi(true);
      const res = await orderService.getUpiQr(orderId);
      setUpiModalData(res.data?.data || null);
    } catch (err) {
      toast.error(err.message || 'Could not load UPI QR code');
    } finally {
      setLoadingUpi(false);
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      await orderService.downloadInvoice(order._id, order.invoiceNumber);
      toast.success('Invoice PDF downloaded!');
    } catch (err) {
      toast.error(err.message || 'Could not download invoice');
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getMyOrders();
      setOrders(res.data.data.orders || []);
    } catch (err) {
      toast.error('Failed to load your orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this pending order request?')) {
      return;
    }

    try {
      await orderService.cancelOrder(orderId);
      toast.success('Order request cancelled.');
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    }
  };

  const handleOpenReviewModal = (order) => {
    setReviewOrder(order);
    setRating(5);
    setComment('');
  };

  const handleCloseReviewModal = () => {
    setReviewOrder(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please share a short review of your produce delivery.');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewService.createReview({
        orderId: reviewOrder._id,
        rating,
        comment: comment.trim()
      });

      toast.success('Thank you! Your farmer review has been posted.');
      setReviewedOrders((prev) => ({ ...prev, [reviewOrder._id]: true }));
      handleCloseReviewModal();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredOrders =
    statusFilter === 'all'
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'accepted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <Link
        to="/buyer/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('buyerOrders')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track fulfillment, contact your farmers, and rate produce after delivery.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto">
          {['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'].map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? 'All Orders' : t(s) || s}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading your orders...</div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description={`You don't have any orders matching '${statusFilter}'.`}
          actionText="Browse Marketplace"
          actionLink="/crops"
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Order Info */}
              <div className="flex items-start gap-5">
                <img
                  src={
                    order.crop?.images?.[0] ||
                    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80'
                  }
                  alt={order.crop?.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 border border-slate-200"
                />

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                      {order.crop?.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${getStatusBadge(
                        order.status
                      )}`}
                    >
                      {t(order.status) || order.status}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${
                        order.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {order.paymentStatus === 'paid' ? 'Paid ✓' : 'Unpaid'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      Ordered on:{' '}
                      <strong className="text-slate-700">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Quantity:{' '}
                      <strong className="text-slate-900">
                        {order.quantity} {order.crop?.unit}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Unit Rate:{' '}
                      <strong className="text-slate-900">
                        ₹{order.pricePerUnit} / {order.crop?.unit}
                      </strong>
                    </span>
                  </div>

                  {/* Farmer contact & details */}
                  <div className="pt-2 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        Farmer: {order.farmer?.name}
                      </span>
                      <a
                        href={`tel:${order.farmer?.phone}`}
                        className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <Phone size={12} />
                        <span>{order.farmer?.phone}</span>
                      </a>
                    </div>

                    <p className="text-slate-500">
                      Delivery to: <strong>{order.deliveryLocation}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Price & Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                <div className="lg:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Amount
                  </span>
                  <span className="text-2xl font-black text-emerald-800">
                    ₹{order.totalPrice.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Cancel Pending Order */}
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order._id)}
                      className="px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      {t('cancelOrder')}
                    </button>
                  )}

                  {/* Integration 9: Direct UPI QR Payment Button */}
                  {(order.status === 'accepted' || order.status === 'completed') && (
                    <button
                      type="button"
                      disabled={loadingUpi}
                      onClick={() => handleOpenUpiQr(order._id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      <QrCode size={14} />
                      <span>{order.paymentStatus === 'paid' ? 'View UPI Receipt' : 'Pay via UPI QR'}</span>
                    </button>
                  )}

                  {/* Integration 10: Download PDF Invoice */}
                  {(order.status === 'completed' || order.paymentStatus === 'paid') && (
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(order)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      <FileDown size={14} />
                      <span>Invoice PDF</span>
                    </button>
                  )}

                  {/* Rate Farmer for Completed Orders */}
                  {order.status === 'completed' && (
                    <button
                      type="button"
                      disabled={reviewedOrders[order._id]}
                      onClick={() => handleOpenReviewModal(order)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Star size={14} className="fill-slate-900" />
                      <span>
                        {reviewedOrders[order._id] ? 'Reviewed' : t('rateFarmer')}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integration 9: Direct UPI QR Settlement Modal */}
      {upiModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Direct Farmer UPI Payment
                </h3>
                <p className="text-xs text-slate-500">
                  Zero middleman gateway — settle directly with {upiModalData.farmerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpiModalData(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {upiModalData.upiConfigured ? (
              <div className="space-y-4">
                <div className="inline-block p-3 bg-slate-50 rounded-3xl border border-slate-200">
                  <img
                    src={upiModalData.qrDataUrl}
                    alt="Farmer UPI QR Code"
                    className="w-52 h-52 mx-auto"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-black text-emerald-800">
                    ₹{Number(upiModalData.amount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs font-bold text-slate-700">
                    Farmer UPI ID: <span className="text-emerald-700">{upiModalData.upiId}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Status:{' '}
                    <strong className="uppercase">
                      {upiModalData.paymentStatus || 'unpaid'}
                    </strong>
                  </p>
                </div>

                <a
                  href={upiModalData.upiLink}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
                >
                  <span>Open in UPI App (GPay / PhonePe / BHIM)</span>
                  <ExternalLink size={14} />
                </a>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  After scanning and paying directly in your UPI app, inform the farmer so they can manually mark the order as "Paid".
                </p>
              </div>
            ) : (
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <p className="font-bold">
                  {upiModalData.farmerName} has not added a UPI ID to their profile yet.
                </p>
                <p>
                  Please contact the farmer directly at{' '}
                  <strong>{upiModalData.farmerPhone}</strong> to settle ₹
                  {Number(upiModalData.amount || 0).toLocaleString()} via UPI or Cash.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review & Rating Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t('writeReview')}</h3>
                <p className="text-xs text-slate-500">
                  Rate {reviewOrder.farmer?.name} for "{reviewOrder.crop?.name}"
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseReviewModal}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2 text-center">
                  Select Rating (1 to 5 Stars)
                </label>
                <div className="flex justify-center p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <StarRating
                    rating={rating}
                    interactive={true}
                    size={28}
                    onRate={(val) => setRating(val)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Your Review & Feedback *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Share details about produce freshness, packaging, weight accuracy, and timely dispatch..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseReviewModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : t('submitReview')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;
