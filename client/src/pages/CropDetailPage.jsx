import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { chatService, cropService, orderService, priceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import StarRating from '../components/common/StarRating';
import { CropDetailSkeleton } from '../components/common/LoadingSkeleton';
import toast from 'react-hot-toast';
import {
  MapPin,
  Calendar,
  Phone,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  ArrowLeft,
  Truck,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const CropDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [crop, setCrop] = useState(null);
  const [reviewsData, setReviewsData] = useState({ averageRating: 0, totalReviews: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');

  // Order form state
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [deliveryLocation, setDeliveryLocation] = useState(
    user?.location?.district || ''
  );
  const [orderMessage, setOrderMessage] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  // Integration 5: 30-day Mandi Price Trend + Forecast + AI Insight
  const [priceTrend, setPriceTrend] = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Integration 8: Distance & Transport Estimate
  const [transportEst, setTransportEst] = useState(null);

  useEffect(() => {
    const fetchCropDetails = async () => {
      try {
        setLoading(true);
        const res = await cropService.getCropById(id);
        const cropData = res.data.data.crop;
        setCrop(cropData);
        setReviewsData(res.data.data.farmerReviews || { averageRating: 0, totalReviews: 0, reviews: [] });

        if (cropData.images && cropData.images.length > 0) {
          setSelectedImage(cropData.images[0]);
        }

        // Load 30-day mandi trend + forecast + AI insight
        setLoadingTrend(true);
        priceService
          .getTrend({
            crop: cropData.name,
            state: cropData.location?.state || '',
            district: cropData.location?.district || '',
            days: 30
          })
          .then((tRes) => setPriceTrend(tRes.data?.data || null))
          .catch(() => {})
          .finally(() => setLoadingTrend(false));
      } catch (err) {
        toast.error('Failed to load crop details');
        navigate('/crops');
      } finally {
        setLoading(false);
      }
    };
    fetchCropDetails();
  }, [id, navigate]);

  // Integration 8: Update transport estimate when quantity or delivery location changes
  useEffect(() => {
    if (!crop?._id) return;
    const timer = setTimeout(() => {
      cropService
        .getTransportEstimate(crop._id, {
          buyerDistrict: user?.location?.district || deliveryLocation,
          buyerAddress: deliveryLocation,
          buyerState: user?.location?.state || '',
          buyerLat: user?.coordinates?.lat || undefined,
          buyerLng: user?.coordinates?.lng || undefined,
          quantity: orderQuantity || 1
        })
        .then((res) => setTransportEst(res.data?.data || null))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [crop?._id, orderQuantity, deliveryLocation, user]);

  if (loading) {
    return <CropDetailSkeleton />;
  }

  if (!crop) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">Produce listing not found.</p>
        <Link to="/crops" className="text-emerald-700 font-bold hover:underline">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const isAvailable = crop.status === 'available' && crop.quantity > 0;
  const isOwner = user && crop.farmer && crop.farmer._id === user._id;

  // Clean phone for WhatsApp link
  const cleanPhone = (phoneStr) => {
    if (!phoneStr) return '';
    return phoneStr.replace(/[^0-9]/g, '');
  };

  const farmerWhatsappUrl = `https://wa.me/${cleanPhone(crop.farmer?.phone)}?text=${encodeURIComponent(
    `Hello ${crop.farmer?.name}, I saw your listing for "${crop.name}" on AgriConnect and I am interested in placing an order.`
  )}`;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please log in as a buyer to place an order request.');
      navigate('/login', { state: { from: { pathname: `/crops/${crop._id}` } } });
      return;
    }

    if (user?.role === 'farmer') {
      toast.error('Farmers cannot place orders. Please use a Buyer account.');
      return;
    }

    if (orderQuantity <= 0) {
      toast.error('Please enter a valid quantity.');
      return;
    }

    if (orderQuantity > crop.quantity) {
      toast.error(`Quantity cannot exceed available stock (${crop.quantity} ${crop.unit}).`);
      return;
    }

    if (!deliveryLocation.trim()) {
      toast.error('Please specify your delivery address or town.');
      return;
    }

    try {
      setSubmittingOrder(true);
      await orderService.createOrder({
        cropId: crop._id,
        quantity: orderQuantity,
        deliveryLocation: deliveryLocation.trim(),
        message: orderMessage.trim()
      });

      toast.success('Order request sent to the farmer!');
      navigate('/buyer/orders');
    } catch (err) {
      toast.error(err.message || 'Failed to place order request');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/crops/${crop._id}` } } });
      return;
    }

    try {
      setStartingChat(true);
      await chatService.getOrCreateConversation({
        recipientId: crop.farmer._id,
        cropId: crop._id
      });
      navigate('/chat');
    } catch (err) {
      toast.error(err.message || 'Failed to start chat');
    } finally {
      setStartingChat(false);
    }
  };

  const calculatedTotal = Math.round(crop.pricePerUnit * (Number(orderQuantity) || 0) * 100) / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb / Back button */}
      <Link
        to="/crops"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Marketplace</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Image Gallery & Description */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Hero Image */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm aspect-4/3 max-h-[460px]">
            <img
              src={
                selectedImage ||
                crop.images?.[0] ||
                'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80'
              }
              alt={crop.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src =
                  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80';
              }}
            />
            {/* Status Pill */}
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                  isAvailable
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900/80 backdrop-blur-sm text-slate-200'
                }`}
              >
                {isAvailable ? t('available') : t('soldOut')}
              </span>
            </div>
          </div>

          {/* Thumbnails row (if multiple images) */}
          {crop.images && crop.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {crop.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                    selectedImage === img
                      ? 'border-emerald-600 scale-95 shadow-sm'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Full Description & Farm Info */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <h2 className="text-xl font-extrabold text-slate-900">Produce Overview</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {crop.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Category
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {t(crop.category) || crop.category}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  {t('harvestDate')}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {new Date(crop.harvestDate).toLocaleDateString()}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Available Quantity
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  {crop.quantity} {crop.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Integration 5: 30-Day Mandi Price Trend + 7-Day Forecast + AI Insight */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-700" />
                  <span>30-Day Mandi Price Trend & 7-Day Forecast</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Agmarknet modal rates (₹/quintal) with linear-regression projection
                </p>
              </div>

              {priceTrend && (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      priceTrend.trendDirection === 'rising'
                        ? 'bg-emerald-100 text-emerald-800'
                        : priceTrend.trendDirection === 'falling'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {priceTrend.trendDirection} ({priceTrend.changePercent > 0 ? '+' : ''}
                    {priceTrend.changePercent}%)
                  </span>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                    Latest: ₹{priceTrend.latestPrice}/qtl
                  </span>
                </div>
              )}
            </div>

            {loadingTrend ? (
              <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                Loading 30-day mandi trend & AI insight...
              </div>
            ) : priceTrend?.chartSeries?.length > 0 ? (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceTrend.chartSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(d) => d.slice(5)}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        width={56}
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip
                        formatter={(val, name) => [
                          `₹${val}/quintal`,
                          name === 'price' ? 'Historical Modal Price' : '7-Day Projected Forecast'
                        ]}
                      />
                      <Legend
                        formatter={(value) =>
                          value === 'price'
                            ? 'Last 30 Days (Mandi Price)'
                            : 'Next 7 Days (Forecast Projection)'
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecastPrice"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={{ r: 2 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {priceTrend.insight && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                      <Sparkles size={14} className="text-emerald-700" />
                      <span>AI Mandi Price Insight</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {priceTrend.insight.summary}
                    </p>
                    <p className="text-xs font-bold text-emerald-800">
                      💡 Good time to sell? {priceTrend.insight.sellHint}
                    </p>
                    <p className="text-[10px] text-slate-500 pt-1">
                      {priceTrend.insight.disclaimer ||
                        'Not financial advice. AI replies are suggestions and may be imperfect.'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">Mandi price history unavailable.</p>
            )}
          </div>

          {/* Farmer Reviews Section */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {t('reviewsTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified feedback from completed buyer transactions
                </p>
              </div>

              <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200">
                <StarRating rating={reviewsData.averageRating} size={16} />
                <span className="text-sm font-extrabold text-amber-900">
                  {reviewsData.averageRating > 0 ? reviewsData.averageRating.toFixed(1) : '5.0'}
                </span>
                <span className="text-xs text-amber-700 font-medium">
                  ({reviewsData.totalReviews} reviews)
                </span>
              </div>
            </div>

            {reviewsData.reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">
                {t('noReviewsYet')}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-4 pt-2">
                {reviewsData.reviews.map((rev) => (
                  <div key={rev._id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {rev.buyer?.name?.charAt(0) || 'B'}
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {rev.buyer?.name}
                        </span>
                      </div>
                      <StarRating rating={rev.rating} size={14} />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic pl-10">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing, Farmer Contact & Place Order Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Title & Price Header */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <MapPin size={16} />
              <span>
                {[crop.location?.village, crop.location?.district, crop.location?.state]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {crop.name}
            </h1>

            <div className="flex items-baseline gap-2 pt-2 border-t border-slate-100">
              <span className="text-3xl font-black text-emerald-800">
                ₹{crop.pricePerUnit}
              </span>
              <span className="text-sm font-bold text-slate-500">
                per {crop.unit}
              </span>
            </div>
          </div>

          {/* Farmer Contact Card */}
          <div className="bg-gradient-to-br from-emerald-800 to-green-900 text-white p-6 rounded-3xl shadow-lg space-y-5">
            <div className="flex items-center gap-3">
              <img
                src={
                  crop.farmer?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    crop.farmer?.name || 'Farmer'
                  )}&background=22c55e&color=fff`
                }
                alt={crop.farmer?.name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-400/40"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-base text-white">
                    {crop.farmer?.name}
                  </h3>
                  <ShieldCheck size={16} className="text-emerald-300" />
                </div>
                <p className="text-xs text-emerald-200">
                  Verified Farmer • {crop.farmer?.location?.district || 'Andhra Pradesh'}
                </p>
              </div>
            </div>

            <p className="text-xs text-emerald-100 leading-relaxed">
              Contact the farmer directly for negotiation, sample inspection, bulk transportation, or harvesting queries.
            </p>

            {/* Direct Contact Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={`tel:${crop.farmer?.phone}`}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-sm"
              >
                <Phone size={15} />
                <span>{t('callFarmer')}</span>
              </a>

              <a
                href={farmerWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <MessageSquare size={15} />
                <span>{t('whatsappFarmer')}</span>
              </a>
            </div>
            {!isOwner && (
              <button
                type="button"
                onClick={handleStartChat}
                disabled={startingChat}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-300 text-white font-bold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                <MessageCircle size={15} />
                <span>{startingChat ? 'Opening chat...' : 'Message farmer'}</span>
              </button>
            )}
          </div>

          {/* Place Order Request Form */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {t('placeOrderTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit an order request. The farmer will confirm availability and dispatch.
              </p>
            </div>

            {isOwner ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span>This is your own crop listing. You can manage it from your Farmer Dashboard.</span>
              </div>
            ) : !isAvailable ? (
              <div className="p-4 bg-slate-100 rounded-2xl text-xs font-semibold text-slate-600 text-center">
                This produce is currently sold out.
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {t('quantityNeeded')} ({crop.unit})
                    </label>
                    <span className="text-xs text-emerald-700 font-semibold">
                      Max: {crop.quantity} {crop.unit}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={crop.quantity}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    required
                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* Delivery Location */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    {t('deliveryAddress')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shop 12, Main Mandi, Hyderabad"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* Optional Message */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    {t('optionalMessage')}
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Packaging requirements, delivery schedule, etc."
                    value={orderMessage}
                    onChange={(e) => setOrderMessage(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  ></textarea>
                </div>

                {/* Total Price Estimate */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {t('totalEstimate')}
                  </span>
                  <span className="text-xl font-black text-emerald-900">
                    ₹{calculatedTotal.toLocaleString()}
                  </span>
                </div>

                {/* Integration 8: Distance & Rough Transport Cost Estimate + Book Transport */}
                {transportEst && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Truck size={15} className="text-emerald-700" />
                        <span>Distance & Transport Estimate</span>
                      </span>
                      {transportEst.available && (
                        <span className="text-xs font-extrabold text-emerald-800">
                          ~{transportEst.distanceKm} km • ₹{transportEst.estimatedCost?.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {transportEst.note}
                    </p>
                    {transportEst.bookingUrl && (
                      <a
                        href={
                          import.meta.env.VITE_TRANSPORT_BOOKING_URL ||
                          transportEst.bookingUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        <Truck size={13} />
                        <span>Book Transport (External Logistics Partner)</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>{submittingOrder ? t('submitting') : t('submitOrder')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropDetailPage;
