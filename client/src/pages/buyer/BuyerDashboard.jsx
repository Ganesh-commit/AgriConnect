import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService, cropService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import CropCard from '../../components/crops/CropCard';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  ArrowRight,
  Search,
  IndianRupee,
  Package
} from 'lucide-react';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [freshCrops, setFreshCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [ordersRes, cropsRes] = await Promise.all([
          orderService.getMyOrders(),
          cropService.getCrops({ limit: 3, availability: 'available' })
        ]);

        setOrders(ordersRes.data.data.orders || []);
        setFreshCrops(cropsRes.data.data.crops || []);
      } catch (err) {
        console.error('Failed to load buyer dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const activeCount = orders.filter((o) => o.status === 'accepted').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const totalSpent = orders
    .filter((o) => o.status === 'completed')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {t('buyer')} Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Hello, {user?.name}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your farm produce orders, discover seasonal crops, and contact verified farmers.
          </p>
        </div>

        <Link
          to="/crops"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all self-start sm:self-auto"
        >
          <Search size={18} />
          <span>{t('exploreCrops')}</span>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Placed
            </span>
            <p className="text-3xl font-black text-slate-900">{orders.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
            <ShoppingBag size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Awaiting Farmer
            </span>
            <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Accepted Orders
            </span>
            <p className="text-3xl font-black text-emerald-600">{activeCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
            <Package size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Completed Deals
            </span>
            <p className="text-3xl font-black text-green-700">
              ₹{totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-green-50 text-green-700">
            <IndianRupee size={22} />
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Your Recent Order Requests
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track fulfillment status of recent orders placed with farmers
            </p>
          </div>
          <Link
            to="/buyer/orders"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            Manage All Orders →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            You haven't placed any orders yet. Visit the Marketplace to explore farm produce.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 4).map((order) => (
              <div
                key={order._id}
                className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={
                      order.crop?.images?.[0] ||
                      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80'
                    }
                    alt=""
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {order.crop?.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Farmer: {order.farmer?.name} • {order.quantity} {order.crop?.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Amount</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      ₹{order.totalPrice.toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fresh Picks Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900">Fresh Produce Picks</h3>
          <Link
            to="/crops"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Explore Marketplace →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {freshCrops.map((crop) => (
            <CropCard key={crop._id} crop={crop} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
