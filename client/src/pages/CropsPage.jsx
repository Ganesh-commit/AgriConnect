import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cropService } from '../services/api';
import CropCard from '../components/crops/CropCard';
import CropFilterSidebar from '../components/crops/CropFilterSidebar';
import { CropCardSkeleton } from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';

const CropsPage = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filters state initialized from URL search params
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    state: searchParams.get('state') || '',
    district: searchParams.get('district') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    availability: searchParams.get('availability') || 'available',
    sort: searchParams.get('sort') || 'newest',
    page: parseInt(searchParams.get('page'), 10) || 1
  });

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: 12,
        sort: filters.sort,
        availability: filters.availability
      };

      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'All') params.category = filters.category;
      if (filters.state) params.state = filters.state;
      if (filters.district) params.district = filters.district;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      const res = await cropService.getCrops(params);
      setCrops(res.data.data.crops || []);
      setPagination(res.data.data.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
    } catch (err) {
      console.error('Failed to fetch crops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();

    // Update URL query params
    const newParams = {};
    Object.keys(filters).forEach((k) => {
      if (filters[k] && filters[k] !== '' && filters[k] !== 'All') {
        newParams[k] = filters[k];
      }
    });
    setSearchParams(newParams, { replace: true });
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when changing filters
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      state: '',
      district: '',
      minPrice: '',
      maxPrice: '',
      availability: 'available',
      sort: 'newest',
      page: 1
    });
  };

  const firstPage = Math.max(1, Math.min(filters.page - 2, pagination.pages - 4));
  const lastPage = Math.min(pagination.pages, firstPage + 4);
  const visiblePages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner & Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('marketplace')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse verified crops listed directly by farmers across India
          </p>
        </div>

        {/* Search input + Mobile Filter Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-80">
            <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-2xl bg-white border border-slate-200 shadow-xs focus:outline-none focus:border-emerald-600"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => handleFilterChange('search', '')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-xs"
          >
            <SlidersHorizontal size={16} />
            <span>{t('filters')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block lg:col-span-1 sticky top-28">
          <CropFilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </div>

        {/* Mobile Filter Modal / Drawer */}
        {mobileFilterOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
            <div className="w-full max-w-sm bg-white h-full overflow-y-auto p-6 space-y-4 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-800">{t('filters')}</h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <CropFilterSidebar
                filters={filters}
                onFilterChange={(key, val) => {
                  handleFilterChange(key, val);
                }}
                onReset={handleResetFilters}
                className="border-0 shadow-none p-0"
              />

              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-emerald-700 text-white font-bold text-sm shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Crops Listing Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Result Count and Sort Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{crops.length}</strong> of{' '}
              <strong className="text-slate-800">{pagination.total}</strong> produce listings
            </span>
            {filters.category && (
              <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
                {t(filters.category) || filters.category}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <CropCardSkeleton key={i} />
              ))}
            </div>
          ) : crops.length === 0 ? (
            <EmptyState
              title="No produce found"
              description="No crops matched your current filter criteria. Try clearing some filters or searching with different keywords."
              actionText="Reset All Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {crops.map((crop) => (
                <CropCard key={crop._id} crop={crop} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-1">
                {firstPage > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
                      className="w-10 h-10 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >1</button>
                    {firstPage > 2 && <span className="px-1 text-slate-400">...</span>}
                  </>
                )}
                {visiblePages.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                    className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                      filters.page === p
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {lastPage < pagination.pages && (
                  <>
                    {lastPage < pagination.pages - 1 && <span className="px-1 text-slate-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, page: pagination.pages }))}
                      className="w-10 h-10 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >{pagination.pages}</button>
                  </>
                )}
              </div>

              <button
                type="button"
                disabled={filters.page >= pagination.pages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CropsPage;
