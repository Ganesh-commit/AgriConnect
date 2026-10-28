import React from 'react';

export const CropCardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm animate-pulse">
    <div className="h-48 bg-slate-200 w-full"></div>
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-200 rounded w-20"></div>
        <div className="h-4 bg-slate-200 rounded w-16"></div>
      </div>
      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="h-6 bg-slate-200 rounded w-24"></div>
        <div className="h-9 bg-slate-200 rounded-xl w-28"></div>
      </div>
    </div>
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }) => (
  <tr className="animate-pulse border-b border-slate-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

export const CropDetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-8">
    <div className="h-6 bg-slate-200 rounded w-32"></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="h-[420px] bg-slate-200 rounded-3xl"></div>
      <div className="space-y-5">
        <div className="h-5 bg-slate-200 rounded w-24"></div>
        <div className="h-10 bg-slate-200 rounded w-3/4"></div>
        <div className="h-8 bg-slate-200 rounded w-40"></div>
        <div className="h-24 bg-slate-200 rounded-2xl"></div>
        <div className="h-36 bg-slate-200 rounded-2xl"></div>
      </div>
    </div>
  </div>
);

export default {
  CropCardSkeleton,
  TableRowSkeleton,
  CropDetailSkeleton
};
