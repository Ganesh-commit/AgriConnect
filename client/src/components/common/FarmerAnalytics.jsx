import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { adminService } from '../../services/api';
import { TrendingUp, ShoppingBag, Users, IndianRupee, Loader2 } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#16a34a', '#0284c7', '#d97706', '#9333ea', '#ef4444', '#14b8a6'];

const formatMonth = (item) => MONTHS[(item._id?.month || 1) - 1];

export default function FarmerAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getFarmerAnalytics()
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-400 text-sm text-center py-8">Analytics data unavailable</p>;
  }

  const earningsData = (data.monthlyEarnings || []).map((item) => ({
    month: formatMonth(item),
    earnings: item.earnings,
    orders: item.count
  }));

  const topCropsData = (data.topCrops || []).map((item) => ({
    name: item.cropInfo?.name || 'Unknown',
    revenue: Math.round(item.totalRevenue),
    sold: item.totalSold
  }));

  const statusData = (data.orderStatusBreakdown || []).map((item) => ({
    name: item._id,
    value: item.count
  }));

  const totalEarnings = earningsData.reduce((s, d) => s + d.earnings, 0);

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
          <IndianRupee size={20} className="mb-2 text-white/80" />
          <p className="text-2xl font-bold">₹{totalEarnings.toLocaleString()}</p>
          <p className="text-sm text-green-100">Total Earnings (6 months)</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white">
          <ShoppingBag size={20} className="mb-2 text-white/80" />
          <p className="text-2xl font-bold">{earningsData.reduce((s, d) => s + d.orders, 0)}</p>
          <p className="text-sm text-blue-100">Orders Completed</p>
        </div>
      </div>

      {/* Monthly Earnings Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-600" /> Monthly Earnings
        </h3>
        {earningsData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No earnings data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Earnings']} />
              <Bar dataKey="earnings" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Crops */}
      {topCropsData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">🏆 Top Selling Crops</h3>
          <div className="space-y-3">
            {topCropsData.map((crop, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{crop.name}</span>
                    <span className="text-sm font-semibold text-green-600">₹{crop.revenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (crop.revenue / (topCropsData[0]?.revenue || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Status Pie */}
      {statusData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">📊 Order Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
