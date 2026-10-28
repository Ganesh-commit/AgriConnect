import React from 'react';
import { Filter, RotateCcw, Search, MapPin, IndianRupee } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { cropCategories } from '../../utils/cropCategories';

const categories = ['All', ...cropCategories];

const CropFilterSidebar = ({
  filters,
  onFilterChange,
  onReset,
  className = ''
}) => {
  const { t } = useLanguage();

  return (
    <div className={`bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-emerald-700" />
          <h3 className="font-bold text-slate-800">{t('filters')}</h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-emerald-700 transition-colors"
        >
          <RotateCcw size={12} />
          <span>{t('resetFilters')}</span>
        </button>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          {t('categoriesLabel')}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isSelected = filters.category === cat || (cat === 'All' && !filters.category);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onFilterChange('category', cat === 'All' ? '' : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'All' ? t('allCategories') : t(cat) || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Filter */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          {t('location')}
        </label>
        <div className="space-y-2">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t('statePlaceholder')}
              value={filters.state || ''}
              onChange={(e) => onFilterChange('state', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t('districtPlaceholder')}
              value={filters.district || ''}
              onChange={(e) => onFilterChange('district', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          {t('priceRange')} (₹)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">₹</span>
            <input
              type="number"
              placeholder={t('minPricePlaceholder')}
              min="0"
              value={filters.minPrice || ''}
              onChange={(e) => onFilterChange('minPrice', e.target.value)}
              className="w-full pl-7 pr-2 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">₹</span>
            <input
              type="number"
              placeholder={t('maxPricePlaceholder')}
              min="0"
              value={filters.maxPrice || ''}
              onChange={(e) => onFilterChange('maxPrice', e.target.value)}
              className="w-full pl-7 pr-2 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          {t('availability')}
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="availability"
              checked={filters.availability === 'available' || !filters.availability}
              onChange={() => onFilterChange('availability', 'available')}
              className="text-emerald-600 focus:ring-emerald-500 rounded"
            />
            <span>{t('availableOnly')}</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="availability"
              checked={filters.availability === 'all'}
              onChange={() => onFilterChange('availability', 'all')}
              className="text-emerald-600 focus:ring-emerald-500 rounded"
            />
            <span>{t('allCrops')}</span>
          </label>
        </div>
      </div>

      {/* Sort By */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          {t('sortBy')}
        </label>
        <select
          value={filters.sort || 'newest'}
          onChange={(e) => onFilterChange('sort', e.target.value)}
          aria-label={t('sortBy')}
          className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white"
        >
          <option value="newest">{t('newest')}</option>
          <option value="price-asc">{t('priceLowHigh')}</option>
          <option value="price-desc">{t('priceHighLow')}</option>
          <option value="popular">{t('popularSort')}</option>
        </select>
      </div>
    </div>
  );
};

export default CropFilterSidebar;
