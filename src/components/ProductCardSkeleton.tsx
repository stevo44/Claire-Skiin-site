import React from 'react';

const ProductCardSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="aspect-[3/4] rounded-2xl bg-surface-container mb-4" />
    <div className="h-3 bg-surface-container rounded w-1/3 mb-2" />
    <div className="h-5 bg-surface-container rounded w-3/4 mb-2" />
    <div className="h-4 bg-surface-container rounded w-1/2" />
  </div>
);

export default ProductCardSkeleton;
