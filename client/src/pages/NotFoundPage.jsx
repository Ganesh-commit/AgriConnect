import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
        <Sprout size={36} />
      </div>
      <h1 className="text-5xl font-black text-slate-900 mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        The harvest route you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all"
      >
        <ArrowLeft size={16} />
        <span>Return to Home</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;
