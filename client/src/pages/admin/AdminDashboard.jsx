import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import {
  Users,
  Sprout,
  ShoppingBag,
  IndianRupee,
  Shield,
  ArrowRight,
  UserCheck,
  CheckCircle,
  Clock,
  Layers
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const res = await adminService.getStats();
        setStats(res.data.data.stats);
        setRecentOrders(res.data.data.recentOrders || []);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading admin analytics...</div>;
  }

  const statItems = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      sub: `${stats?.totalFarmers || 0} Farmers • ${stats?.totalBuyers || 0} Buyers`,
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      title: 'Total Crop Listings',
      value: stats?.totalCrops || 0,
      sub: `${stats?.activeCrops || 0} Active • ${stats?.soldCrops || 0} Sold`,
      icon: Sprout,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      title: 'Total Orders Placed',
      value: stats?.totalOrders || 0,
      sub: `${stats?.pendingOrders || 0} Pending • ${stats?.completedOrders || 0} Completed`,
      icon: ShoppingBag,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      title: 'Gross Trade Volume',
      value: `₹${(stats?.totalTradeVolume || 0).toLocaleString()}`,
      sub: 'Direct Farmer Earnings',
      icon: IndianRupee,
      color: 'bg-green-100 text-green-900 border-green-300'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            Platform Administration
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            AgriConnect Governance & Stats
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time platform activity metrics, user governance, and content moderation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Manage Users
          </Link>
          <Link
            to="/admin/crops"
            className="px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
          >
            Moderate Crops
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {item.title}
                </span>
                <div className={`p-2.5 rounded-2xl border ${item.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900">{item.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/admin/users"
          className="p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-lg transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-slate-900">User Account Governance</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Review registered farmers and buyers, verify credentials, and suspend/block fraudulent profiles.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowRight size={22} />
          </div>
        </Link>

        <Link
          to="/admin/crops"
          className="p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-lg transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-slate-900">Produce Marketplace Moderation</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Inspect all crop listings, remove misleading prices or inappropriate listings.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowRight size={22} />
          </div>
        </Link>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Recent Marketplace Trades</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live orders being processed directly between farmers and buyers
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="py-4 px-6">Produce</th>
                <th className="py-4 px-6">Farmer</th>
                <th className="py-4 px-6">Buyer</th>
                <th className="py-4 px-6">Quantity</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((ord) => (
                <tr key={ord._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{ord.crop?.name}</td>
                  <td className="py-4 px-6 text-slate-700">{ord.farmer?.name}</td>
                  <td className="py-4 px-6 text-slate-700">{ord.buyer?.name}</td>
                  <td className="py-4 px-6 font-semibold text-slate-800">
                    {ord.quantity} units
                  </td>
                  <td className="py-4 px-6 font-extrabold text-emerald-800">
                    ₹{ord.totalPrice?.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                        ord.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : ord.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : ord.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
