import React, { useState, useEffect } from 'react';
import { schemeService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Landmark,
  ExternalLink,
  PhoneCall,
  PlusCircle,
  Trash2,
  ShieldCheck,
  AlertCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SchemesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [schemes, setSchemes] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Admin modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    shortCode: '',
    category: 'Income Support',
    state: 'All India',
    summary: '',
    officialUrl: '',
    helpline: ''
  });

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const res = await schemeService.getSchemes();
      setSchemes(res.data?.data?.schemes || []);
      setDisclaimer(res.data?.data?.disclaimer || '');
    } catch {
      toast.error('Failed to load government schemes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleAddScheme = async (e) => {
    e.preventDefault();
    try {
      await schemeService.createScheme(formData);
      toast.success('Scheme added!');
      setShowModal(false);
      setFormData({
        title: '',
        shortCode: '',
        category: 'Income Support',
        state: 'All India',
        summary: '',
        officialUrl: '',
        helpline: ''
      });
      fetchSchemes();
    } catch (err) {
      toast.error(err.message || 'Failed to add scheme');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this scheme from the directory?')) return;
    try {
      await schemeService.deleteScheme(id);
      toast.success('Scheme removed');
      fetchSchemes();
    } catch (err) {
      toast.error(err.message || 'Failed to delete scheme');
    }
  };

  const categories = [
    'All',
    'Income Support',
    'Crop Insurance',
    'Credit & Loans',
    'Market & Infrastructure',
    'Soil & Inputs'
  ];

  const filtered =
    selectedCategory === 'All'
      ? schemes
      : schemes.filter((s) => s.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Farmer Welfare Portals
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Government Agricultural Schemes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verified central and state agricultural welfare portals with direct official links.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md"
          >
            <PlusCircle size={18} />
            <span>Add Scheme (Admin)</span>
          </button>
        )}
      </div>

      {/* Official Verification Note */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
        <AlertCircle size={18} className="shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="font-bold">Official Links Only — Verify Eligibility on Government Portals</p>
          <p className="text-blue-800 mt-0.5">
            {disclaimer ||
              'Do not share OTPs or bank PINs with unofficial agents. Always check the official .gov.in portal or visit your local Rythu Bharosa Kendra / Agriculture Officer.'}
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === cat
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading official schemes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <div
              key={s._id || s.shortCode}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {s.category}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {s.state}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {s.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {s.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                {s.helpline && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <PhoneCall size={13} className="text-emerald-700" />
                    <span>Helpline: <strong>{s.helpline}</strong></span>
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <a
                    href={s.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors"
                  >
                    <span>Check the official site</span>
                    <ExternalLink size={13} />
                  </a>

                  {isAdmin && s._id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(s._id)}
                      className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                      title="Delete scheme"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Add Scheme Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                Add Official Government Scheme
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddScheme} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Scheme Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Official Portal URL (https://...gov.in) *
                </label>
                <input
                  type="url"
                  required
                  value={formData.officialUrl}
                  onChange={(e) => setFormData({ ...formData, officialUrl: e.target.value })}
                  placeholder="https://pmkisan.gov.in/"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Helpline Number
                </label>
                <input
                  type="text"
                  value={formData.helpline}
                  onChange={(e) => setFormData({ ...formData, helpline: e.target.value })}
                  placeholder="1800-180-1551"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Short Summary *
                </label>
                <textarea
                  rows="3"
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                Save Official Scheme
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

