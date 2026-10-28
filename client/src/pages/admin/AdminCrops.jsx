import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import {
  Sprout,
  Search,
  ArrowLeft,
  Trash2,
  ExternalLink,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

const categories = [
  'All',
  'Vegetables',
  'Fruits',
  'Grains',
  'Pulses',
  'Spices',
  'Others'
];

const AdminCrops = () => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const res = await adminService.getCrops({
        search: search.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined
      });
      setCrops(res.data.data.crops || []);
    } catch (err) {
      toast.error('Failed to load crops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCrops();
  };

  const handleDeleteCrop = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      return;
    }

    try {
      await adminService.deleteCrop(id);
      toast.success('Crop listing removed by admin');
      setCrops((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete crop listing');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <Link
        to="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Admin Overview</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Produce Moderation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor listings across India, check price sanity, and remove fake produce posts.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search produce name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-600 shadow-xs"
            />
          </form>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Crops Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading produce records...</div>
        ) : crops.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No crop listings match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-4 px-6">Produce</th>
                  <th className="py-4 px-6">Farmer</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Stock</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crops.map((crop) => (
                  <tr key={crop._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            crop.images?.[0] ||
                            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=200&q=80'
                          }
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{crop.name}</span>
                          <span className="text-[11px] text-slate-400">
                            {[crop.location?.village, crop.location?.district, crop.location?.state]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800 block">
                        {crop.farmer?.name}
                      </span>
                      <span className="text-[11px] text-slate-400">{crop.farmer?.phone}</span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {crop.category}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-semibold text-slate-800">
                      {crop.quantity} {crop.unit}
                    </td>

                    <td className="py-4 px-6 font-black text-emerald-800">
                      ₹{crop.pricePerUnit} / {crop.unit}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          crop.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {crop.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/crops/${crop._id}`}
                          target="_blank"
                          className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                          title="View on marketplace"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteCrop(crop._id, crop.name)}
                          className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove listing"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

export default AdminCrops;
