import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cropService, aiService, priceService } from '../../services/api';
import { cropCategories } from '../../utils/cropCategories';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Sprout, Upload, ArrowLeft, X, IndianRupee, MapPin,
  Calendar, Layers, FileText, Mic, MicOff, TrendingUp, Loader2, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Lazy load map to avoid SSR issues
const MapLocationPicker = lazy(() => import('../../components/crops/MapLocationPicker'));

const categories = cropCategories;
const units = ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece'];

// Feature 8: Web Speech API hook for voice input (English + Telugu)
const useSpeechInput = (fieldSetter) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const startListening = useCallback((lang = 'en-IN') => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error('Voice input failed. Try again.');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      fieldSetter(transcript);
      toast.success(`Voice input: "${transcript}"`);
    };
    recognition.start();
  }, [fieldSetter]);

  return { listening, supported, startListening };
};

const FarmerAddCrop = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    category: 'Vegetables',
    quantity: '',
    unit: 'kg',
    pricePerUnit: '',
    village: user?.location?.village || '',
    district: user?.location?.district || '',
    state: user?.location?.state || 'Andhra Pradesh',
    harvestDate: new Date().toISOString().split('T')[0],
    description: '',
    imageUrl: ''
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [aiQualityNotes, setAiQualityNotes] = useState('');
  const [geoPosition, setGeoPosition] = useState(null);
  // Mandi price (Feature 2)
  const [mandiData, setMandiData] = useState(null);
  const [mandiLoading, setMandiLoading] = useState(false);
  // Voice input (Feature 8)
  const [voiceLang, setVoiceLang] = useState('en-IN');

  const setName = (val) => setFormData((prev) => ({ ...prev, name: val }));
  const setDescription = (val) => setFormData((prev) => ({ ...prev, description: val }));

  const { listening: listeningName, supported: speechSupported, startListening: startName } = useSpeechInput(setName);
  const { listening: listeningDesc, startListening: startDesc } = useSpeechInput(setDescription);

  // Fetch mandi price when crop name changes (debounced)
  useEffect(() => {
    if (!formData.name || formData.name.length < 3) return;
    const timer = setTimeout(() => {
      fetchMandiPrice(formData.name);
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.name]);

  const fetchMandiPrice = async (cropName) => {
    setMandiLoading(true);
    try {
      const res = await cropService.getMandiPrice(cropName, formData.state);
      setMandiData(res.data.data);
      // Auto-suggest price from mandi data
      if (res.data.data?.latestPrice && !formData.pricePerUnit) {
        const suggestedPrice = Math.round(res.data.data.latestPrice / 100); // quintal to kg
        setFormData((prev) => ({ ...prev, pricePerUnit: suggestedPrice }));
      }
    } catch {
      setMandiData(null);
    } finally {
      setMandiLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      toast.error('You can upload a maximum of 5 images.');
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
    setFilePreviews([...filePreviews, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setFilePreviews(filePreviews.filter((_, i) => i !== index));
  };

  // Integration 4: Auto-fill form from uploaded produce photo
  const handleAutoFillFromPhoto = async (fileToAnalyze) => {
    const file = fileToAnalyze || selectedFiles[0];
    if (!file) {
      toast.error('Please choose a produce photo first to auto-fill details.');
      return;
    }

    try {
      setAutoFilling(true);
      const fd = new FormData();
      fd.append('image', file);
      const res = await aiService.autoListFromPhoto(fd);
      const listing = res.data?.data?.listing;
      if (listing) {
        const validCategory = categories.includes(listing.category)
          ? listing.category
          : 'Vegetables';
        setFormData((prev) => ({
          ...prev,
          name: listing.name || prev.name,
          category: validCategory,
          description: listing.suggestedDescription
            ? `${listing.suggestedDescription}${
                listing.qualityNotes ? `\n\nQuality Notes: ${listing.qualityNotes}` : ''
              }`
            : prev.description
        }));
        setAiQualityNotes(listing.qualityNotes || '');
        toast.success('Form pre-filled from photo! Review and edit before saving.');
      }
    } catch (err) {
      toast.error(err.message || 'Could not auto-fill from photo');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Crop name is required.'); return; }
    if (!formData.quantity || Number(formData.quantity) <= 0) { toast.error('Please enter a valid quantity.'); return; }
    if (!formData.pricePerUnit || Number(formData.pricePerUnit) <= 0) { toast.error('Please enter a valid price per unit.'); return; }
    if (!formData.description.trim()) { toast.error('Please provide a short description.'); return; }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('category', formData.category);
      data.append('quantity', formData.quantity);
      data.append('unit', formData.unit);
      data.append('pricePerUnit', formData.pricePerUnit);
      data.append('village', formData.village);
      data.append('district', formData.district);
      data.append('state', formData.state);
      data.append('harvestDate', formData.harvestDate);
      data.append('description', formData.description.trim());

      // Feature 3: geo coordinates from map
      if (geoPosition) {
        data.append('latitude', geoPosition.lat);
        data.append('longitude', geoPosition.lng);
      }

      if (formData.imageUrl.trim()) data.append('images', formData.imageUrl.trim());
      selectedFiles.forEach((file) => data.append('images', file));

      await cropService.createCrop(data);
      toast.success('Crop listed successfully!');
      navigate('/farmer/my-crops');
    } catch (err) {
      toast.error(err.message || 'Failed to list crop');
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare chart data
  const chartData = mandiData?.prices?.map((p) => ({
    date: p.date.split('-').slice(1).join('/'),
    price: p.price
  })) || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        to="/farmer/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          New Listing
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
          List Your Produce for Sale
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Provide accurate crop details and photos to attract direct wholesale and retail buyers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Sprout size={18} className="text-emerald-700" /> Crop Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Crop Name with Voice Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Crop / Produce Name *
                </label>
                {/* Feature 8: Voice buttons */}
                {speechSupported && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={voiceLang}
                      onChange={(e) => setVoiceLang(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 bg-white outline-none"
                    >
                      <option value="en-IN">EN</option>
                      <option value="te-IN">తె</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => startName(voiceLang)}
                      className={`p-1.5 rounded-lg transition-all ${listeningName ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      title="Voice input for crop name"
                    >
                      {listeningName ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                  </div>
                )}
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Guntur Sannam Red Chilli"
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              {/* Mandi price loading */}
              {mandiLoading && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Fetching mandi price...
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium cursor-pointer"
              >
                {categories.map((c) => <option key={c} value={c}>{t(c) || c}</option>)}
              </select>
            </div>
          </div>

          {/* Feature 2: Mandi Price Suggestion */}
          {mandiData && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <TrendingUp size={14} /> Mandi Price Suggestion
                  <span className="text-emerald-500 font-normal">({mandiData.source})</span>
                </p>
                <div className="text-sm font-bold text-emerald-800">
                  ₹{mandiData.latestPrice}/quintal
                  <span className="text-xs font-normal text-emerald-600 ml-1">
                    ≈ ₹{Math.round(mandiData.latestPrice / 100)}/kg
                  </span>
                </div>
              </div>
              {chartData.length > 1 && (
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(v) => [`₹${v}`, 'Price/quintal']} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, pricePerUnit: Math.round(mandiData.latestPrice / 100) }))}
                className="mt-2 text-xs text-emerald-700 hover:underline font-medium"
              >
                ← Apply suggested price to form
              </button>
            </div>
          )}

          {/* Quantity, Unit, Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Quantity *
              </label>
              <input
                type="number" name="quantity" required min="1"
                value={formData.quantity} onChange={handleChange}
                placeholder="e.g. 500"
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Unit *</label>
              <select name="unit" value={formData.unit} onChange={handleChange}
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white font-semibold uppercase cursor-pointer">
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Price per Unit (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number" name="pricePerUnit" required min="0.1" step="any"
                  value={formData.pricePerUnit} onChange={handleChange}
                  placeholder="e.g. 195"
                  className="w-full pl-9 pr-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white font-semibold text-emerald-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location & Harvest */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-700" /> Farm Location & Harvest
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Village / Mandal</label>
              <input type="text" name="village" value={formData.village} onChange={handleChange}
                placeholder="e.g. Tenali"
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">District</label>
              <input type="text" name="district" value={formData.district} onChange={handleChange}
                placeholder="e.g. Guntur"
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange}
                placeholder="e.g. Andhra Pradesh"
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Harvest Date</label>
            <input type="date" name="harvestDate" value={formData.harvestDate} onChange={handleChange}
              className="w-full sm:w-1/2 px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white" />
          </div>

          {/* Feature 3: Map location picker */}
          <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse flex items-center justify-center text-gray-400 text-sm">Loading map...</div>}>
            <MapLocationPicker
              onChange={setGeoPosition}
              initialPosition={geoPosition}
            />
          </Suspense>
        </div>

        {/* Description with Voice */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-emerald-700" /> Description
            </h2>
            {speechSupported && (
              <button
                type="button"
                onClick={() => startDesc(voiceLang)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium
                  ${listeningDesc ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              >
                {listeningDesc ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Voice Input</>}
              </button>
            )}
          </div>
          <textarea
            name="description" rows="4" required
            value={formData.description} onChange={handleChange}
            placeholder="Describe quality, pesticide usage, grading, storage method, shelf life, minimum order quantity, etc."
            className="w-full p-4 text-sm rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white leading-relaxed"
          />
        </div>

        {/* Image Upload & Integration 4 Auto-Fill from Photo */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Upload size={18} className="text-emerald-700" /> Produce Photos (Max 5)
            </h2>

            <button
              type="button"
              disabled={autoFilling || selectedFiles.length === 0}
              onClick={() => handleAutoFillFromPhoto(selectedFiles[0])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold disabled:opacity-50 transition-colors"
            >
              {autoFilling ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-700" />
                  <span>Analyzing Photo...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Auto-fill from photo</span>
                </>
              )}
            </button>
          </div>

          {aiQualityNotes && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">AI Vision Quality Notes: {aiQualityNotes}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                AI replies are suggestions and may be imperfect. You can edit all pre-filled fields above.
              </p>
            </div>
          )}
          <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center text-center">
            <Upload size={32} className="text-emerald-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">Upload real photos from your farm</p>
            <p className="text-xs text-slate-500 mb-4">Supports JPEG, PNG, WEBP up to 5MB each</p>
            <label className="cursor-pointer px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors">
              <span>Choose Files</span>
              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
          {filePreviews.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {filePreviews.map((preview, i) => (
                <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                  <img src={preview} alt="upload preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => handleRemoveFile(i)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Or paste an Image URL (Optional fallback)
            </label>
            <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange}
              placeholder="https://example.com/crop-photo.jpg"
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600" />
          </div>
        </div>

        <button
          type="submit" disabled={submitting}
          className="w-full py-4 px-6 rounded-2xl text-white font-extrabold text-sm bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20 disabled:opacity-50"
        >
          {submitting ? 'Publishing Crop Listing...' : 'Publish Crop Listing'}
        </button>
      </form>
    </div>
  );
};

export default FarmerAddCrop;
