import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({
  rating = 0,
  maxStars = 5,
  size = 18,
  interactive = false,
  onRate,
  showValue = false
}) => {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center">
        {stars.map((star) => {
          const filled = star <= Math.round(rating);
          return (
            <button
              type="button"
              key={star}
              disabled={!interactive}
              onClick={() => interactive && onRate && onRate(star)}
              className={`${
                interactive
                  ? 'cursor-pointer hover:scale-110 transition-transform p-0.5'
                  : 'cursor-default'
              } text-amber-400 focus:outline-none`}
            >
              <Star
                size={size}
                className={`${
                  filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                }`}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-slate-700 ml-1">
          {rating > 0 ? rating.toFixed(1) : '0.0'}
        </span>
      )}
    </div>
  );
};

export default StarRating;
