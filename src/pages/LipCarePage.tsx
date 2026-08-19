import React, { useState, useEffect } from 'react';
import { useCart } from '../store/cartStore';
import { useProducts, type LiveProduct } from '../store/productStore';
import { productService } from '../services/productService';
import { showToast } from '../components/ToastContainer';

const LipCarePage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All Lip Care');
  const [localProducts, setLocalProducts] = useState<LiveProduct[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const { addToCart, openCart } = useCart();

  useEffect(() => {
    const fetchLipCare = async () => {
      try {
        setLocalLoading(true);
        const response = await productService.getProducts({ category: 'Lip Care', limit: 50 });
        setLocalProducts(response.products || []);
      } catch (err) {
        console.error('Failed to query lip care:', err);
      } finally {
        setLocalLoading(false);
      }
    };
    fetchLipCare();
  }, []);

  const filters = ['All Lip Care', 'Lip Scrubs', 'Lip Liners', 'Lip Balms', 'Lip Creams', 'Lip Glosses'];

  const lipProducts = localProducts.map((p, i) => {
      // Logic for filterTag — try to match sub or name to filters
      let filterTag = 'All Lip Care';
      const nameLower = (p.name || '').toLowerCase();
      const subLower = (p.sub || '').toLowerCase();
      
      if (nameLower.includes('scrub') || subLower.includes('scrub')) filterTag = 'Lip Scrubs';
      else if (nameLower.includes('liner') || subLower.includes('liner')) filterTag = 'Lip Liners';
      else if (nameLower.includes('balm') || subLower.includes('balm')) filterTag = 'Lip Balms';
      else if (nameLower.includes('cream') || subLower.includes('cream') || nameLower.includes('mask')) filterTag = 'Lip Creams';
      else if (nameLower.includes('gloss') || subLower.includes('gloss') || nameLower.includes('stain')) filterTag = 'Lip Glosses';

      return {
        ...p,
        filterTag,
        offset: Math.floor(i / 2) % 2 === 1
      };
    });

  const filtered = activeFilter === 'All Lip Care' 
    ? lipProducts 
    : lipProducts.filter(p => p.filterTag === activeFilter);

  const handleAddToCart = (p: typeof lipProducts[0]) => {
    addToCart({ ...p, id: Number(p.id) } as any);
    showToast(`${p.name} added to bag 🛍️`, 'shopping_bag');
    openCart();
  };

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-tertiary/20 min-h-screen">
      {/* Hero Section */}
      <header className="relative w-full h-[500px] md:h-[700px] lg:h-[870px] flex items-center overflow-hidden bg-surface-container-low mt-24">
        <div className="absolute inset-0 z-0">
          <img className="w-full h-full object-cover opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCktmOWHeYtITe53joZAFLXtRblCfOCJHjmGYzDqYOmREdzYfEta_0_cnqsqoMh-VZkbPeRTQ4MAgK9ZtvVwecyhlSei2_Fg6Tos0Jg0AixU2vwd0EDk0IkcZp4t9IIw-wy1I4oi81iBGNdVKEPB_kzvvuFdqR0GPsXDJkqkZlTDS7-y5q-jn7TeKW7XqhQ0I5RImML64TqyhstoKHb8QyHOzL_mdhjBC9cpNErnEaa3n-vFQf9Ogb73ChQc7Oc1pttyWM32nhXEfY" alt="Luxury lip care" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/30 to-transparent" />
        </div>
        <div className="relative z-10 px-6 md:px-16 lg:px-24 max-w-3xl">
          <span className="font-label text-sm tracking-[0.2em] uppercase text-tertiary mb-4 block">Lip Sanctuary</span>
          <h1 className="font-headline text-4xl md:text-6xl lg:text-8xl leading-[1.1] text-on-surface mb-8">The Lip <br /><span className="italic text-primary">Sanctuary</span></h1>
          <p className="font-body text-base md:text-xl text-on-surface-variant max-w-lg mb-10 leading-relaxed">Nourished by the earth, refined by heritage. Discover our collection of botanical-infused lip care, crafted with raw Shea and forest-harvested flora.</p>
        </div>
      </header>

      <div className="h-16 md:h-[6rem]" />

      {/* Filters */}
      <section className="px-6 md:px-12 mb-16 md:mb-20">
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 border-b border-outline-variant/20 pb-8">
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`font-label text-xs tracking-widest uppercase py-2 px-4 md:px-6 rounded-full transition-all duration-300 ${activeFilter === f ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      <main className="px-6 md:px-12 max-w-[1440px] mx-auto py-6 md:py-12 mb-16">
        {localLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="w-12 h-12 border-4 border-stone-200 border-t-primary rounded-full animate-spin" />
            <p className="text-stone-400 uppercase tracking-widest text-xs">Curating Collection...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">inventory_2</span>
            <h3 className="font-headline text-2xl mb-2">No Lip Care found</h3>
            <p className="text-on-surface-variant max-w-xs">We are currently restocking our Lip Sanctuary. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-12 md:gap-y-16">
            {filtered.map((p) => (
              <article key={p.id} className={`group ${p.offset ? 'lg:translate-y-12' : ''}`}>
                <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_10px_40px_-10px_rgba(26,28,28,0.04)] mb-5">
                  <img className="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-105" src={p.img || p.image_url} alt={p.name} loading="lazy" />
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-4 left-4 right-4 translate-y-12 group-hover:translate-y-0 transition-transform duration-500 flex gap-2">
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="flex-1 bg-surface-container-lowest/90 backdrop-blur-md py-3 rounded-full font-label text-[10px] tracking-widest uppercase hover:bg-primary hover:text-white transition-colors duration-300">
                      Quick Add
                    </button>
                    <button className="w-12 h-12 bg-surface-container-lowest/90 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors duration-300">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-headline text-xl text-on-surface">{p.name}</h3>
                  <p className="font-body text-sm text-on-surface-variant">{p.sub}</p>
                  <p className="font-label text-tertiary font-semibold tracking-wide">{p.priceDisplay}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <div className="my-16 md:my-32 flex justify-center items-center gap-8 md:gap-12 opacity-30">
        <div className="h-[1px] w-24 md:w-32 bg-tertiary" />
        <span className="material-symbols-outlined text-tertiary text-4xl">eco</span>
        <div className="h-[1px] w-24 md:w-32 bg-tertiary" />
      </div>

      <section className="px-6 md:px-12 max-w-7xl mx-auto py-12 md:py-20 flex flex-col md:flex-row items-center gap-12 md:gap-20 mb-16">
        <div className="w-full md:w-1/2 relative">
          <div className="absolute -inset-4 bg-tertiary/10 rounded-xl -rotate-2 z-0" />
          <img className="relative z-10 w-full aspect-square object-cover rounded-xl shadow-2xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeMc4SmMVjO8LjDbGKaIXX-1k5mgH2gWKXCFPYHbzV-1RidgXkExwp-fowwPcgbzv_ZHQCensJUq1AkteqTbd5RMo2EyOP_9brRaAIcIfibEvCOoUnNQSM5taXY4IUNfdOX4yq7B6op-XAf1xy-_0NEcZV3M-gDrHxxOPFBfU3ofhwnOn5lgsmoOPjz0wwhSx3Tlt0qdZFNZVBU6_TiK3_hzNO5TLgmmxNF7oexSVw9HdvDkfZdWGVqI5A3UWVHY2Jm0nFRjZVSnQ" alt="Botanical healing ritual" />
        </div>
        <div className="w-full md:w-1/2 space-y-6 md:space-y-8">
          <span className="font-label text-xs tracking-[0.3em] uppercase text-tertiary">The Ritual</span>
          <h2 className="font-headline text-3xl md:text-5xl text-on-surface leading-tight">The Art of <br /><span className="italic font-normal">Botanical Healing</span></h2>
          <p className="font-body text-base md:text-lg text-on-surface-variant leading-relaxed">In Cameroon, the forest provides everything the skin requires. We honor these ancient traditions by blending raw shea with botanical extracts to create a barrier of protection and a glow of health.</p>
        </div>
      </section>
    </div>
  );
};

export default LipCarePage;
