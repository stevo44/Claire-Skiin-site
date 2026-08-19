import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { products, loading } = useProducts({ 
    category: selectedCategory, 
    search: searchQuery 
  });
  const { addToCart } = useCart();

  const handleAddToCart = async (product: any) => {
    try {
      await addToCart(product.id, 1);
      // We could add a nice toast notification here
      alert("Added to cart: " + product.name);
    } catch(err) {
      alert("Please login first to add items to cart.");
    }
  };

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-baseline justify-between mb-24 gap-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-serif text-primary mb-6">The Collection.</h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-md leading-relaxed">
            Curated pieces for everyday rituals. Free from synthetics, rich in soul.
          </p>
        </div>
        
        {/* The Float Input Field with the Ghost Border (no 4-sided box, bottom-only border when possible, but let's use the Ghost Border rounded-md) */}
        <div className="flex w-full md:w-80 gap-4 flex-col">
          <input 
            type="text" 
            placeholder="Search our formulas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-low border-b border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:bg-surface-lowest focus:border-tertiary transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-24 gap-x-12 max-w-7xl mx-auto">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-surface-low rounded-[2rem] animate-pulse" />
          ))
        ) : products.length > 0 ? (
          products.map((product: any, idx: number) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              className={`flex flex-col group ${idx % 2 === 1 ? 'md:mt-24' : ''}`} // Intentional asymmetry
            >
              <div className="aspect-[3/4] rounded-[2.5rem] bg-surface-lowest overflow-hidden mb-8 ambient-shadow relative">
                <img 
                  src={product.image_url || `https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80`} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                />
                
                {/* Floating Add to Cart Button on Hover */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => handleAddToCart(product)}
                    className="w-12 h-12 bg-surface-lowest/80 backdrop-blur-md rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors ambient-shadow"
                    aria-label="Add to cart"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center text-center px-4">
                <h3 className="text-xl font-serif text-on-surface mb-2">{product.name}</h3>
                <span className="text-[11px] font-bold tracking-widest text-on-surface-variant uppercase mb-4">
                  {(product.price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} XAF
                </span>
                <p className="text-sm text-on-surface-variant/80 line-clamp-2 max-w-xs">{product.description}</p>
              </div>

            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-40 text-center">
            <p className="text-on-surface-variant text-lg">No products found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
