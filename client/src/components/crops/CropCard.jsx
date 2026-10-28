import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, BadgeCheck, UserCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const getCategoryColor = (category) => {
  switch (category) {
    case 'Vegetables':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Fruits':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Grains':
    case 'Grains & Cereals':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Pulses':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Spices':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const CropCard = ({ crop }) => {
  const { t, tCropName, tCropDesc, tUnit, tLocation, tFarmer } = useLanguage();

  // Helper for image URLs (handles relative uploads vs external Cloudinary/Unsplash URLs)
  const apiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  const fallbackImage = `${apiOrigin}/public/placeholder-crop.jpg`;
  const getImageUrl = (img) => {
    if (!img) {
      return fallbackImage;
    }
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    // Relative upload from server
    return img.startsWith('/') ? `${apiOrigin}${img}` : `${apiOrigin}/${img}`;
  };

  const mainImage = crop.images && crop.images.length > 0 ? getImageUrl(crop.images[0]) : getImageUrl();
  const isAvailable = crop.status === 'available' && crop.quantity > 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col group">
      {/* Image container */}
      <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
        <img
          src={mainImage}
          alt={crop.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.src = fallbackImage;
          }}
        />
        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${getCategoryColor(
              crop.category
            )}`}
          >
            {t(crop.category) || crop.category}
          </span>
        </div>

        {/* Status Pill */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${
              isAvailable
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800/80 backdrop-blur-sm text-slate-200'
            }`}
          >
            {isAvailable ? t('available') : t('soldOut')}
          </span>
        </div>
        {crop.imageAttribution?.photographer && crop.imageAttribution.photographer !== 'Local placeholder' && (
          <a
            href={crop.imageAttribution.photographerUrl || crop.imageAttribution.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 text-[10px] text-white"
          >
            Photo: {crop.imageAttribution.photographer}
          </a>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <MapPin size={14} className="text-emerald-600 shrink-0" />
            <span className="truncate">
              {tLocation(
                [crop.location?.village, crop.location?.district, crop.location?.state]
                  .filter(Boolean)
                  .join(', ') || 'Andhra Pradesh, Telangana'
              )}
            </span>
          </div>

          {/* Crop Title */}
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {tCropName(crop.name)}
          </h3>

          {/* Short description */}
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {tCropDesc(crop.description, crop.name, crop.category)}
          </p>
        </div>

        {/* Farmer tag & stock */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <UserCheck size={14} className="text-emerald-600" />
            <span className="font-medium truncate max-w-[120px]">
              {tFarmer(crop.farmer?.name) || t('localFarmer')}
            </span>
            {crop.farmer?.isVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700" title="Verified farmer">
                <BadgeCheck size={13} /> {t('verifiedBadgeText')}
              </span>
            )}
          </div>
          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
            {crop.quantity} {tUnit(crop.unit)} {t('leftInStock')}
          </span>
        </div>

        {/* Pricing and Action */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-xs text-slate-400 block font-medium">{t('priceLabel')}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-emerald-800">
                ₹{crop.pricePerUnit}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {tUnit(crop.unit)}
              </span>
            </div>
          </div>

          <Link
            to={`/crops/${crop._id}`}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 group-hover:shadow-md group-hover:shadow-emerald-700/20 transition-all"
          >
            <span>{t('viewDetails')}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CropCard;
