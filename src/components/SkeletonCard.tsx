import React from 'react';

export const ProductSkeletonCard: React.FC = () => (
  <div className="flex flex-col animate-pulse">
    <div className="aspect-[3/4] rounded-2xl bg-stone-100 mb-5" />
    <div className="px-1 space-y-2">
      <div className="h-2 w-16 bg-stone-100 rounded" />
      <div className="h-4 w-3/4 bg-stone-100 rounded" />
      <div className="h-3 w-1/2 bg-stone-100 rounded" />
      <div className="h-4 w-1/3 bg-stone-200 rounded mt-1" />
    </div>
    <div className="mt-4 h-11 w-full rounded-xl bg-stone-100" />
  </div>
);

export const ProductDetailSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-[6fr_5fr] gap-12 lg:gap-20 animate-pulse">
    <div className="aspect-[4/5] rounded-2xl bg-stone-100" />
    <div className="space-y-6 py-4">
      <div className="h-3 w-20 bg-stone-100 rounded" />
      <div className="h-8 w-2/3 bg-stone-100 rounded" />
      <div className="h-3 w-1/3 bg-stone-100 rounded" />
      <div className="h-6 w-1/4 bg-stone-200 rounded" />
      <div className="space-y-2 pt-4">
        <div className="h-3 w-full bg-stone-100 rounded" />
        <div className="h-3 w-5/6 bg-stone-100 rounded" />
        <div className="h-3 w-4/6 bg-stone-100 rounded" />
      </div>
      <div className="h-14 w-full rounded-2xl bg-stone-100 mt-6" />
    </div>
  </div>
);

interface FetchErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const FetchError: React.FC<FetchErrorProps> = ({
  message = 'Something went wrong loading this page.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
      <span className="material-symbols-outlined text-[28px] text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>
        wifi_off
      </span>
    </div>
    <div>
      <h3 className="font-headline text-2xl text-on-surface mb-2">Unable to load</h3>
      <p className="text-on-surface-variant text-sm max-w-sm">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
      >
        Try Again
      </button>
    )}
  </div>
);
