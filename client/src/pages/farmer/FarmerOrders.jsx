import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import EmptyState from '../../components/common/EmptyState';
import {
  ShoppingBag,
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  MessageSquare,
  FileDown,
  IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';

const FarmerOrders = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getFarmerOrders();
      setOrders(res.data.data.orders || []);
    } catch (err) {
      toast.error('Failed to load incoming orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  const handleMarkPaid = async (orderId) => {
    try {
      await orderService.markPaid(orderId);
      toast.success('Order manually marked as Paid!');
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to mark order as paid');
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      await orderService.downloadInvoice(order._id, order.invoiceNumber);
      toast.success('Invoice PDF downloaded!');
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice');
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
        to="/farmer/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('farmerOrders')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review incoming requests from buyers, accept consignments, and update order progress.
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
        <div className="p-12 text-center text-slate-500">Loading incoming orders...</div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description={`There are currently no orders with status '${statusFilter}'.`}
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
                      Order Date:{' '}
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
                      Rate:{' '}
                      <strong className="text-slate-900">
                        ₹{order.pricePerUnit} / {order.crop?.unit}
                      </strong>
                    </span>
                  </div>

                  {/* Buyer & Delivery details */}
                  <div className="pt-2 text-xs text-slate-600 space-y-1">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span>Buyer: {order.buyer?.name}</span>
                      <a
                        href={`tel:${order.buyer?.phone}`}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold ml-2"
                      >
                        <Phone size={12} />
                        <span>{order.buyer?.phone}</span>
                      </a>
                    </p>
                    <p className="flex items-start gap-1.5 text-slate-500">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>Delivery Location: {order.deliveryLocation}</span>
                    </p>
                    {order.message && (
                      <p className="italic text-slate-400 pl-4 border-l-2 border-emerald-200 mt-1">
                        "{order.message}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price & Status Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                <div className="lg:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Order Value
                  </span>
                  <span className="text-2xl font-black text-emerald-800">
                    ₹{order.totalPrice.toLocaleString()}
                  </span>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order._id, 'accepted')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} />
                        <span>{t('accept')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order._id, 'rejected')}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <XCircle size={14} />
                        <span>{t('reject')}</span>
                      </button>
                    </>
                  )}

                  {order.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order._id, 'completed')}
                      className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      <span>{t('markCompleted')}</span>
                    </button>
                  )}

                  {/* Integration 9: Farmer manually marks order as Paid */}
                  {(order.status === 'accepted' || order.status === 'completed') &&
                    order.paymentStatus !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(order._id)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <IndianRupee size={14} />
                        <span>Mark Paid</span>
                      </button>
                    )}

                  {/* Integration 10: Download PDF Invoice */}
                  {(order.status === 'completed' || order.paymentStatus === 'paid') && (
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(order)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <FileDown size={14} />
                      <span>Invoice PDF</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmerOrders;
