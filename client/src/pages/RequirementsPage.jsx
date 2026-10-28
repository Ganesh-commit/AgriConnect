import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requirementService } from '../services/api';
import { cropCategories } from '../utils/cropCategories';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  PlusCircle,
  Send,
  CheckCircle2,
  MapPin,
  Calendar,
  IndianRupee,
  Filter,
  Phone,
  Sparkles,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const units = ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece'];

export default function RequirementsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cropFilter, setCropFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  // Buyer Post Requirement Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState({
    cropName: '',
    category: 'Vegetables',
    quantity: '',
    unit: 'quintal',
    targetPricePerUnit: '',
    deliveryAddress: '',
    district: user?.location?.district || '',
    state: user?.location?.state || 'Andhra Pradesh',
    neededByDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: ''
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  // Farmer Send Quote Modal
  const [quoteTarget, setQuoteTarget] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    pricePerUnit: '',
    quantity: '',
    message: ''
  });
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const fetchRequirements = async (filters = {}) => {
    try {
      setLoading(true);
      const res = await requirementService.getRequirements({
        crop: filters.crop !== undefined ? filters.crop : cropFilter,
        district: filters.district !== undefined ? filters.district : districtFilter,
        status: 'all'
      });
      setRequirements(res.data?.data?.requirements || []);
    } catch {
      toast.error('Failed to load buyer requirements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handlePostRequirement = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReq(true);
      await requirementService.createRequirement(postForm);
      toast.success('Requirement posted! Matching farmers have been notified.');
      setShowPostModal(false);
      setPostForm({
        ...postForm,
        cropName: '',
        quantity: '',
        targetPricePerUnit: '',
        notes: ''
      });
      fetchRequirements();
    } catch (err) {
      toast.error(err.message || 'Failed to post requirement');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleOpenQuoteModal = (reqItem) => {
    setQuoteTarget(reqItem);
    setQuoteForm({
      pricePerUnit: reqItem.targetPricePerUnit,
      quantity: reqItem.quantity,
      message: ''
    });
  };

  const handleSendQuote = async (e) => {
    e.preventDefault();
    if (!quoteTarget) return;
    try {
      setSubmittingQuote(true);
      await requirementService.createQuote(quoteTarget._id, quoteForm);
      toast.success('Quote sent to buyer!');
      setQuoteTarget(null);
      fetchRequirements();
    } catch (err) {
      toast.error(err.message || 'Failed to send quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleAcceptQuote = async (reqId, quoteId) => {
    try {
      await requirementService.acceptQuote(reqId, quoteId);
      toast.success('Quote accepted! Converted to a normal Order.');
      navigate('/buyer/orders');
    } catch (err) {
      toast.error(err.message || 'Failed to accept quote');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Reverse Marketplace
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Buyer Crop Requirements & Farmer Quotes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Buyers post what produce they need; farmers submit direct quotes. Accepting a quote creates an instant Order.
          </p>
        </div>

        {isAuthenticated && (user?.role === 'buyer' || user?.role === 'admin') && (
          <button
            type="button"
            onClick={() => setShowPostModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all self-start sm:self-auto"
          >
            <PlusCircle size={18} />
            <span>Post Buyer Requirement</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchRequirements({ crop: cropFilter, district: districtFilter });
        }}
        className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-2">
          <Filter size={15} className="text-emerald-700" />
          <span>Filter:</span>
        </div>
        <input
          type="text"
          value={cropFilter}
          onChange={(e) => setCropFilter(e.target.value)}
          placeholder="Search crop (e.g. Tomato, Chilli, Rice)..."
          className="flex-1 min-w-[180px] px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
        />
        <input
          type="text"
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          placeholder="Filter by district (e.g. Guntur, Hyderabad)..."
          className="flex-1 min-w-[180px] px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
        >
          Apply Filters
        </button>
        {(cropFilter || districtFilter) && (
          <button
            type="button"
            onClick={() => {
              setCropFilter('');
              setDistrictFilter('');
              fetchRequirements({ crop: '', district: '' });
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
          >
            Reset
          </button>
        )}
      </form>

      {/* Requirements List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading buyer requirements...
        </div>
      ) : requirements.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3">
          <ClipboardList size={36} className="text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800">
            No Buyer Requirements Found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Buyers can post bulk or retail produce requirements here, and farmers in matching districts will be notified automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {requirements.map((reqItem) => {
            const isBuyerOwner =
              user && reqItem.buyer && reqItem.buyer._id === user._id;
            const canQuote =
              isAuthenticated &&
              (user?.role === 'farmer' || user?.role === 'admin') &&
              reqItem.status === 'open';

            return (
              <div
                key={reqItem._id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {reqItem.category}
                      </span>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        {reqItem.cropName} — {reqItem.quantity} {reqItem.unit}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          reqItem.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {reqItem.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-semibold">
                        <MapPin size={14} className="text-emerald-700" />
                        {[
                          reqItem.deliveryLocation?.address,
                          reqItem.deliveryLocation?.district,
                          reqItem.deliveryLocation?.state
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} className="text-slate-400" />
                        Needed by:{' '}
                        <strong>
                          {new Date(reqItem.neededByDate).toLocaleDateString()}
                        </strong>
                      </span>
                      <span>
                        Posted by: <strong>{reqItem.buyer?.name || 'Buyer'}</strong>
                      </span>
                    </div>

                    {reqItem.notes && (
                      <p className="text-xs text-slate-500 italic">
                        "{reqItem.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Target Price
                      </span>
                      <span className="text-2xl font-black text-emerald-800">
                        ₹{reqItem.targetPricePerUnit}
                      </span>
                      <span className="text-xs text-slate-500"> / {reqItem.unit}</span>
                    </div>

                    {canQuote && (
                      <button
                        type="button"
                        onClick={() => handleOpenQuoteModal(reqItem)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                      >
                        <Send size={14} />
                        <span>Send Quote</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quotes List (visible to requirement owner or farmers who quoted) */}
                {reqItem.quotes && reqItem.quotes.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Farmer Quotes Received ({reqItem.quotes.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reqItem.quotes.map((q) => (
                        <div
                          key={q._id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-slate-900">
                              {q.farmer?.name || 'Farmer'} •{' '}
                              <span className="text-emerald-800">
                                ₹{q.pricePerUnit}/{q.unit}
                              </span>{' '}
                              ({q.quantity} {q.unit})
                            </p>
                            {q.message && (
                              <p className="text-xs text-slate-600 italic">
                                "{q.message}"
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400">
                              {q.farmer?.location?.district || 'India'} • Status:{' '}
                              <strong className="uppercase">{q.status}</strong>
                            </p>
                          </div>

                          {isBuyerOwner &&
                            reqItem.status === 'open' &&
                            q.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleAcceptQuote(reqItem._id, q._id)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                              >
                                <CheckCircle2 size={14} />
                                <span>Accept & Order</span>
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Buyer Post Requirement Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                Post a Crop Requirement
              </h3>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostRequirement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Crop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={postForm.cropName}
                    onChange={(e) =>
                      setPostForm({ ...postForm, cropName: e.target.value })
                    }
                    placeholder="e.g. Guntur Red Chilli"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={postForm.category}
                    onChange={(e) =>
                      setPostForm({ ...postForm, category: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  >
                    {cropCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={postForm.quantity}
                    onChange={(e) =>
                      setPostForm({ ...postForm, quantity: e.target.value })
                    }
                    placeholder="100"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Unit *
                  </label>
                  <select
                    value={postForm.unit}
                    onChange={(e) =>
                      setPostForm({ ...postForm, unit: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Target ₹/{postForm.unit} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={postForm.targetPricePerUnit}
                    onChange={(e) =>
                      setPostForm({
                        ...postForm,
                        targetPricePerUnit: e.target.value
                      })
                    }
                    placeholder="2200"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={postForm.deliveryAddress}
                    onChange={(e) =>
                      setPostForm({
                        ...postForm,
                        deliveryAddress: e.target.value
                      })
                    }
                    placeholder="Market Yard, Shop 8"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={postForm.district}
                    onChange={(e) =>
                      setPostForm({ ...postForm, district: e.target.value })
                    }
                    placeholder="Guntur"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={postForm.state}
                    onChange={(e) =>
                      setPostForm({ ...postForm, state: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Needed By Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={postForm.neededByDate}
                    onChange={(e) =>
                      setPostForm({ ...postForm, neededByDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Quality / Packaging Notes
                </label>
                <textarea
                  rows="2"
                  value={postForm.notes}
                  onChange={(e) =>
                    setPostForm({ ...postForm, notes: e.target.value })
                  }
                  placeholder="Specify grading, moisture level, or gunny bag requirements..."
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReq}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {submittingReq ? 'Posting Requirement...' : 'Publish Requirement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Farmer Send Quote Modal */}
      {quoteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Send Farmer Quote
                </h3>
                <p className="text-xs text-slate-500">
                  For {quoteTarget.cropName} ({quoteTarget.quantity} {quoteTarget.unit})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendQuote} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Your Quote Rate (₹/{quoteTarget.unit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quoteForm.pricePerUnit}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, pricePerUnit: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Available Qty ({quoteTarget.unit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quoteForm.quantity}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, quantity: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Message to Buyer
                </label>
                <textarea
                  rows="3"
                  value={quoteForm.message}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, message: e.target.value })
                  }
                  placeholder="Share harvest date, quality grade, and dispatch readiness..."
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={submittingQuote}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {submittingQuote ? 'Sending Quote...' : 'Submit Quote to Buyer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

