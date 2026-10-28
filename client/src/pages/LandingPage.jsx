import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cropService } from '../services/api';
import { cropCategories } from '../utils/cropCategories';
import CropCard from '../components/crops/CropCard';
import { CropCardSkeleton } from '../components/common/LoadingSkeleton';
import { useLanguage } from '../context/LanguageContext';
import {
  Apple,
  Bean,
  Carrot,
  CircleDollarSign,
  Droplets,
  Flame,
  Flower2,
  Leaf,
  Milk,
  Nut,
  Sprout,
  Wheat,
  Search,
  ArrowRight,
  PhoneCall,
  Sparkles
} from 'lucide-react';

const categoryStyles = [
  [Carrot, 'bg-emerald-100 text-emerald-800'],
  [Apple, 'bg-rose-100 text-rose-800'],
  [Wheat, 'bg-amber-100 text-amber-800'],
  [Bean, 'bg-orange-100 text-orange-800'],
  [Flame, 'bg-red-100 text-red-800'],
  [Droplets, 'bg-yellow-100 text-yellow-800'],
  [Wheat, 'bg-lime-100 text-lime-800'],
  [Milk, 'bg-sky-100 text-sky-800'],
  [Flower2, 'bg-pink-100 text-pink-800'],
  [CircleDollarSign, 'bg-teal-100 text-teal-800'],
  [Nut, 'bg-stone-100 text-stone-800'],
  [Droplets, 'bg-amber-100 text-amber-900'],
  [Sprout, 'bg-green-100 text-green-800'],
  [Leaf, 'bg-cyan-100 text-cyan-800']
];
const categories = cropCategories.slice(0, 14).map((name, index) => ({
  name,
  icon: categoryStyles[index][0],
  color: categoryStyles[index][1]
}));

const LandingPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [freshCrops, setFreshCrops] = useState([]);
  const [popularCrops, setPopularCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const [freshResult, popularResult] = await Promise.allSettled([
          cropService.getCrops({ limit: 6, availability: 'available', sort: 'newest' }),
          cropService.getCrops({ limit: 6, availability: 'available', sort: 'popular' })
        ]);
        if (freshResult.status === 'fulfilled') {
          setFreshCrops(freshResult.value.data.data.crops || []);
        }
        if (popularResult.status === 'fulfilled') {
          setPopularCrops(popularResult.value.data.data.crops || []);
        }
      } catch (err) {
        console.error('Failed to load featured crops:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (selectedCategory) params.append('category', selectedCategory);
    navigate(`/crops?${params.toString()}`);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        {/* Background ambient elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-800/80 border border-emerald-700/60 text-xs font-bold text-emerald-200 tracking-wide uppercase">
              <Sparkles size={14} className="text-amber-400" />
              <span>India's Direct Kisan Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              {t('heroTitle')}
            </h1>

            <p className="text-lg sm:text-xl text-emerald-100/90 leading-relaxed max-w-2xl mx-auto font-normal">
              {t('heroSubtitle')}
            </p>

            {/* Quick Search Box */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 bg-white/95 backdrop-blur-md p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 flex flex-col sm:flex-row items-center gap-2 text-slate-800"
            >
              <div className="relative flex-1 w-full">
                <Search size={20} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl focus:outline-none placeholder-slate-400 bg-transparent"
                />
              </div>

              <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by category"
                  className="w-full sm:w-auto px-4 py-3 text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="">{t('allCategories')}</option>
                  {cropCategories.slice(0, 14).map((category) => (
                    <option key={category} value={category}>{t(category) || category}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-7 py-3 rounded-xl sm:rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Search</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/crops"
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
              >
                {t('exploreCrops')}
              </Link>
              <Link
                to="/register"
                className="px-6 py-3 rounded-2xl bg-emerald-800/80 hover:bg-emerald-800 text-white border border-emerald-600 font-bold text-sm transition-colors"
              >
                {t('listProduce')}
              </Link>
            </div>
          </div>
        </div>

        {/* Floating stats banner */}
        <div className="max-w-6xl mx-auto px-4 mt-16 sm:mt-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/15 text-center">
            <div>
              <p className="text-3xl font-extrabold text-amber-400">100%</p>
              <p className="text-xs font-medium text-emerald-100 mt-1">Direct Farmer Sales</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">0%</p>
              <p className="text-xs font-medium text-emerald-100 mt-1">Middlemen Commission</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber-400">25+</p>
              <p className="text-xs font-medium text-emerald-100 mt-1">Agricultural Categories</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">Verified</p>
              <p className="text-xs font-medium text-emerald-100 mt-1">Kisan Profiles</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Simple & Transparent
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('howItWorksSub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all relative">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl mb-6">
              <Sprout size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('step1Title')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{t('step1Desc')}</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xl mb-6">
              <PhoneCall size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('step2Title')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{t('step2Desc')}</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all relative">
            <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-800 flex items-center justify-center font-black text-xl mb-6">
              <CircleDollarSign size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('step3Title')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{t('step3Desc')}</p>
          </div>
        </div>
      </section>

      {/* Categories Browser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Browse By Crop
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
              Popular Produce Categories
            </h2>
          </div>
          <Link
            to="/crops"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span>View All Listings</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/crops?category=${encodeURIComponent(cat.name)}`}
              className="group flex min-h-32 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${cat.color}`}>
                <cat.icon size={28} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm leading-tight text-slate-900">{t(cat.name) || cat.name}</h4>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  Browse <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Fresh listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Listed Recently
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
              Fresh today
            </h2>
          </div>
          <Link
            to="/crops"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span>Explore Full Market</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CropCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {freshCrops.map((crop) => (
              <CropCard key={crop._id} crop={crop} />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Buyer interest
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Popular crops</h2>
          </div>
          <Link to="/crops?sort=popular" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800">
            <span>Explore popular listings</span><ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => <CropCardSkeleton key={index} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularCrops.map((crop) => <CropCard key={crop._id} crop={crop} />)}
          </div>
        )}
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-3xl p-8 sm:p-14 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-5">
            <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400">
              Start Trading Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              Ready to Buy Direct or Sell Your Farm Harvest?
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              Join thousands of farmers getting fair prices for their hard work, and wholesale buyers securing pure, unadulterated farm produce.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/register"
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                Create Free Account
              </Link>
              <Link
                to="/crops"
                className="px-6 py-3.5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-950 text-white font-bold text-sm border border-emerald-600 transition-all"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
