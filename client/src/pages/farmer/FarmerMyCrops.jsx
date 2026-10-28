import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cropService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import EmptyState from '../../components/common/EmptyState';
import {
  Sprout,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  X,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const FarmerMyCrops = () => {
  const { t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingCrop, setEditingCrop] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    quantity: '',
    pricePerUnit: '',
    status: 'available',
    description: ''
  });
  const [updating, setUpdating] = useState(false);

  const fetchMyCrops = async () => {
    try {
      setLoading(true);
      const res = await cropService.getMyCrops();
      setCrops(res.data.data.crops || []);
    } catch (err) {
      toast.error('Failed to load your crops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCrops();
  }, []);

  const handleOpenEditModal = (crop) => {
    setEditingCrop(crop);
    setEditFormData({
      name: crop.name,
      quantity: crop.quantity,
      pricePerUnit: crop.pricePerUnit,
      status: crop.status,
      description: crop.description
    });
  };

  const handleCloseEditModal = () => {
    setEditingCrop(null);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const formData = new FormData();
      formData.append('name', editFormData.name);
      formData.append('quantity', editFormData.quantity);
      formData.append('pricePerUnit', editFormData.pricePerUnit);
      formData.append('status', editFormData.status);
      formData.append('description', editFormData.description);

      await cropService.updateCrop(editingCrop._id, formData);
      toast.success('Crop updated successfully!');
      handleCloseEditModal();
      fetchMyCrops();
    } catch (err) {
      toast.error(err.message || 'Failed to update crop');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleSold = async (crop) => {
    const newStatus = crop.status === 'available' ? 'sold' : 'available';
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      await cropService.updateCrop(crop._id, formData);
      toast.success(`Marked as ${newStatus}`);
      fetchMyCrops();
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const handleDeleteCrop = async (id) => {
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      await cropService.deleteCrop(id);
      toast.success('Crop listing deleted');
      setCrops((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete crop');
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
            {t('myCrops')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your crop listings, adjust available stock, and update expected pricing.
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

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading your crops...</div>
      ) : crops.length === 0 ? (
        <EmptyState
          title="No crops listed yet"
          description="You haven't added any crop listings yet. Create your first listing to start selling!"
          actionText="List Your First Crop"
          actionLink="/farmer/add-crop"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crops.map((crop) => (
            <div
              key={crop._id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-100">
                  <img
                    src={
                      crop.images?.[0] ||
                      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={crop.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-xs text-slate-800 shadow-xs">
                      {crop.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                        crop.status === 'available'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {crop.status === 'available' ? 'Available' : 'Sold Out'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                      {crop.name}
                    </h3>
                    <Link
                      to={`/crops/${crop._id}`}
                      target="_blank"
                      className="text-slate-400 hover:text-emerald-700 transition-colors p-1"
                      title="View Public Page"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {crop.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Stock</span>
                      <span className="font-bold text-slate-800">
                        {crop.quantity} {crop.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Price</span>
                      <span className="font-black text-emerald-800">
                        ₹{crop.pricePerUnit} / {crop.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSold(crop)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    crop.status === 'available'
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                >
                  {crop.status === 'available' ? 'Mark as Sold' : 'Mark Available'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(crop)}
                    className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    title="Edit listing"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCrop(crop._id)}
                    className="p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    title="Delete listing"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Crop Modal */}
      {editingCrop && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Crop Listing</h3>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Produce Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Quantity ({editingCrop.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.quantity}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, quantity: e.target.value })
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Price per {editingCrop.unit} (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editFormData.pricePerUnit}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, pricePerUnit: e.target.value })
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                >
                  <option value="available">Available in Stock</option>
                  <option value="sold">Sold Out</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerMyCrops;
