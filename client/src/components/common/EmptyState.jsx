import React from 'react';
import { Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';

const EmptyState = ({
  icon: Icon = Sprout,
  title = 'No items found',
  description = 'There are no records matching your query or filters.',
  actionText,
  actionLink,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      {actionText && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm"
        >
          {actionText}
        </Link>
      )}
      {actionText && onAction && !actionLink && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
