import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService, orderService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import WeatherWidget from '../../components/common/WeatherWidget';
import {
  Sprout,
  Package,
  ShoppingBag,
  Clock,
  IndianRupee,
  PlusCircle,
  ArrowRight,
  Stethoscope,
  ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        adminService.getFarmerStats(),
        orderService.getFarmerOrders()
      ]);

      setStats(
        statsRes.data.data.stats || {
          totalListings: 0,
          activeListings: 0,
          totalOrders: 0,
          pendingOrders: 0,
          totalEarnings: 0
        }
      );
      setRecentOrders(ordersRes.data.data.orders.slice(0, 5) || []);
    } catch (err) {
      console.error('Failed to load farmer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  const statCards = [
    {
      title: t('totalListings'),
      value: stats.totalListings,
      icon: Sprout,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      title: t('activeListings'),
      value: stats.activeListings,
      icon: Package,
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      title: t('totalOrders'),
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      title: t('pendingOrders'),
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-orange-50 text-orange-700 border-orange-200'
    },
    {
      title: t('totalEarnings'),
      value: `₹${stats.totalEarnings.toLocaleString()}`,
      icon: IndianRupee,
      color: 'bg-emerald-100 text-emerald-900 border-emerald-300'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {t('farmer')} Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your crop listings, respond to order requests, and track your farm earnings.
          </p>
        </div>

        <Link
          to="/farmer/add-crop"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle size={18} />
          <span>{t('addCrop')}</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-2xl border ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">
                {loading ? '...' : card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Weather + Quick Action Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <WeatherWidget
            district={user?.location?.district}
            state={user?.location?.state}
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/farmer/add-crop"
            className="p-6 bg-gradient-to-br from-emerald-800 to-green-900 text-white rounded-3xl shadow-sm hover:shadow-lg transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg">List New Crop</h3>
              <p className="text-xs text-emerald-200">Auto-fill from photo & check Mandi prices</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowRight size={20} />
            </div>
          </Link>

          <Link
            to="/farmer/disease-check"
            className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl shadow-xs hover:shadow-lg transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-emerald-950 flex items-center gap-2">
                <Stethoscope size={18} className="text-emerald-700" />
                <span>Crop Disease Check</span>
              </h3>
              <p className="text-xs text-emerald-800">Upload a leaf photo for AI diagnosis & remedies</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowRight size={20} />
            </div>
          </Link>

          <Link
            to="/requirements"
            className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-lg transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <ClipboardList size={18} className="text-emerald-700" />
                <span>Buyer Requirements</span>
              </h3>
              <p className="text-xs text-slate-500">Browse reverse-marketplace demand & send quotes</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowRight size={20} />
            </div>
          </Link>

          <Link
            to="/farmer/orders"
            className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-lg transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900">Incoming Buyer Orders</h3>
              <p className="text-xs text-slate-500">Accept, mark UPI paid, or download PDF invoices</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowRight size={20} />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {t('recentOrders')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest order requests received from buyers
            </p>
          </div>
          <Link
            to="/farmer/orders"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            View All Orders →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No incoming orders yet. Once buyers order your crops, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-4 px-6">Produce</th>
                  <th className="py-4 px-6">Buyer</th>
                  <th className="py-4 px-6">Quantity</th>
                  <th className="py-4 px-6">Total Amount</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block">
                        {order.crop?.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {order.crop?.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800 block">
                        {order.buyer?.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {order.buyer?.phone}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700">
                      {order.quantity} {order.crop?.unit}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-emerald-800">
                      ₹{order.totalPrice.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t(order.status) || order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {order.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order._id, 'accepted')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order._id, 'rejected')}
                            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors text-[11px]"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {order.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order._id, 'completed')}
                          className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                        >
                          Mark Completed
                        </button>
                      )}
                      {(order.status === 'completed' ||
                        order.status === 'rejected' ||
                        order.status === 'cancelled') && (
                        <span className="text-[11px] text-slate-400 italic">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerDashboard;
