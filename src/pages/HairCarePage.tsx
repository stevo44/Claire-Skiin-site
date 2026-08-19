import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { useProducts, type LiveProduct } from '../store/productStore';
import { productService } from '../services/productService';
import { showToast } from '../components/ToastContainer';

const HairCarePage: React.FC = () => {
  const [localProducts, setLocalProducts] = useState<LiveProduct[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const { addToCart, openCart } = useCart();

  useEffect(() => {
    const fetchHairCare = async () => {
      try {
        setLocalLoading(true);
        const response = await productService.getProducts({ category: 'Hair Care', limit: 50 });
        setLocalProducts(response.products || []);
      } catch (err) {
        console.error('Failed to query hair care:', err);
      } finally {
        setLocalLoading(false);
      }
    };
    fetchHairCare();
  }, []);

  const featuredProduct = localProducts[0];
  const otherProducts = localProducts.slice(1);

  const handleAddToCart = (p: LiveProduct) => {
    addToCart({ ...p, id: Number(p.id) } as any);
    showToast(`${p.name} added to bag 🛍️`, 'shopping_bag');
    openCart();
  };

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-tertiary/20 min-h-screen">

      <main className="pt-28">
        {/* Hero Section */}
        <section className="px-6 md:px-12 max-w-screen-2xl mx-auto mb-24">
          <div className="relative h-[500px] md:h-[716px] rounded-xl overflow-hidden flex items-center bg-surface-container-low">
            <div className="absolute inset-0 z-0">
              <img
                alt="Botanical hair care"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAY_f-3VVI5pM1Re3h-3VCcEKkTVRoBXUOB715OxOOlJZ0PXi3R_SknF2Clq4SGlNIVJNS96N8GDOL1rDxhcgjotAbwRoDta_HoLBz1BiQNBNEl3ytbsbJgzzAwBX7Fg2Ko-KYZH4_dbJNG0EEz6n8--dzpkcKFLuTl8M5jcc5p_-F_QfUgHgzduLgDyNbxR4SOgDaeSAWTI7-fLcAW-uyT2lgZsMvP-VyKqaYLfyEqOyZPCoVGXpRdmtbsu6ORS4cMUV9zr8Bgric"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <div className="relative z-10 pl-8 md:pl-16 max-w-2xl">
              <span className="font-label text-xs uppercase tracking-widest text-white/80 mb-4 block">The Hair Collection</span>
              <h1 className="font-headline text-4xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
                Rooted in <span className="text-tertiary-fixed italic">Radiance.</span>
              </h1>
              <p className="font-body text-base md:text-xl text-white/80 max-w-md mb-10 leading-relaxed">
                Nature's alchemy for crowning beauty. Discover treatments inspired by the lush verdancy of our heritage.
              </p>
              <button className="bg-gradient-to-br from-primary to-primary-container px-8 md:px-10 py-4 rounded-xl text-white font-label text-sm uppercase tracking-widest hover:scale-105 transition-transform duration-300 shadow-lg">
                Shop the Ritual
              </button>
            </div>
          </div>
        </section>

        {/* Category Narrative & Filters */}
        <section className="px-6 md:px-12 max-w-screen-2xl mx-auto mb-20">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 md:gap-12">
            <div className="max-w-xl">
              <h2 className="font-headline text-3xl mb-4">Botanical Intelligence</h2>
              <p className="text-on-surface-variant font-body leading-relaxed">
                Our hair care philosophy treats the scalp as an extension of the soul. We utilize high-potency extracts like Moringa and Hibiscus, cold-pressed to preserve their molecular integrity and deliver ancestral wisdom to your modern routine.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 font-label text-xs uppercase tracking-widest">
              <button className="px-6 py-2 border-b-2 border-tertiary text-on-surface">All Products</button>
              <button className="px-6 py-2 border-b border-transparent text-on-surface-variant hover:text-primary transition-colors">Scalp Elixirs</button>
              <button className="px-6 py-2 border-b border-transparent text-on-surface-variant hover:text-primary transition-colors">Nourishing Oils</button>
            </div>
          </div>
        </section>

        {/* Product Grid — Asymmetric Editorial Style */}
        <section className="px-6 md:px-12 max-w-screen-2xl mx-auto mb-24 min-h-[400px]">
          {localLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="w-12 h-12 border-4 border-stone-200 border-t-primary rounded-full animate-spin" />
              <p className="text-stone-400 uppercase tracking-widest text-xs">Loading Botanical Wisdom...</p>
            </div>
          ) : localProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">dry_cleaning</span>
              <h3 className="font-headline text-2xl mb-2">Collection arriving soon</h3>
              <p className="text-on-surface-variant max-w-xs">We are currently preparing our botanical hair rituals. Please stay tuned.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              {/* Featured Large Product */}
              {featuredProduct && (
                <div className="md:col-span-7 group cursor-pointer">
                  <div className="aspect-[4/5] bg-surface-container-low rounded-xl overflow-hidden mb-6 relative">
                    <img
                      alt={featuredProduct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={featuredProduct.img || featuredProduct.image_url}
                    />
                    {featuredProduct.badge && (
                      <div className="absolute top-6 right-6">
                        <span className="bg-tertiary text-white px-4 py-1 rounded-full font-label text-[10px] uppercase">{featuredProduct.badge}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-headline text-2xl mb-1">{featuredProduct.name}</h3>
                      <p className="text-on-surface-variant text-sm mb-4">{featuredProduct.sub}</p>
                      <span className="font-body font-bold text-lg text-primary">{featuredProduct.priceDisplay}</span>
                    </div>
                    <button onClick={() => handleAddToCart(featuredProduct)} className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Column for smaller items */}
              <div className="md:col-span-5 flex flex-col gap-8 md:gap-16">
                {otherProducts.map((p, idx) => (
                  <div key={idx} className="group cursor-pointer">
                    <div className="aspect-square bg-surface-container-lowest rounded-xl overflow-hidden mb-6 relative">
                      <img
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={p.img || p.image_url}
                      />
                      {p.badge && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-tertiary text-white px-3 py-0.5 rounded-full font-label text-[9px] uppercase">{p.badge}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-headline text-xl mb-1">{p.name}</h3>
                        <p className="text-on-surface-variant text-sm mb-2">{p.sub}</p>
                        <span className="font-body font-bold text-lg text-primary">{p.priceDisplay}</span>
                      </div>
                      <button onClick={() => handleAddToCart(p)} className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Cultural Divider */}
        <div className="py-16 flex justify-center opacity-30">
          <span className="material-symbols-outlined text-4xl text-tertiary">local_florist</span>
        </div>

        {/* Ingredient Spotlight Bento Grid */}
        <section className="px-6 md:px-12 max-w-screen-2xl mx-auto mb-32">
          <h2 className="font-headline text-3xl md:text-4xl mb-12 text-center">
            Harvested for <span className="italic text-tertiary">Efficacy</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:h-[500px] lg:h-[600px]">
            <div className="bg-surface-container-low rounded-xl p-8 md:p-12 flex flex-col justify-end relative overflow-hidden group">
              <div className="relative z-10">
                <span className="font-label text-xs uppercase tracking-widest text-primary mb-4 block">The Superfood</span>
                <h3 className="font-headline text-2xl md:text-3xl mb-4">Moringa Oleifera</h3>
                <p className="text-on-surface-variant leading-relaxed text-sm md:text-base">
                  Known as the 'Miracle Tree', our Moringa is sourced from organic farms in North Cameroon, packed with Vitamin A and Zinc to stimulate follicle growth.
                </p>
              </div>
            </div>
            <div className="bg-primary rounded-xl p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
              <img
                alt="Moringa Leaves"
                className="absolute inset-0 w-full h-full object-cover opacity-20"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDozvfq_Mphg0eKKm6xxfhsIoG__h7XJpjqHqez9_xShfLkvHaIYXvvvGCiStLSC-EDDqzcKHRHQdskK4JPIRipCHpL0kXTu0BOeGiVZqGx6QmPQugDLvpeechbPzVtyyyRd1JsU0voGYVhl48I4TtahbMU0uCvfznbqkHkdUUTvfNQfRZ-bRcZBLLFEEJx1GoD2tWEAHMOATnYlblaSun1xg3RV12XGMKfaFTfOlut8IGTiW-ypxe31yxu6dV4-S7c7l8dLL9UFL8"
              />
              <div className="relative z-10">
                <h3 className="font-headline text-2xl md:text-3xl text-white mb-4">Ancestral Extraction</h3>
                <p className="text-white/80 leading-relaxed mb-8 text-sm md:text-base">
                  We use low-temperature hydraulic pressing to ensure that every drop of oil maintains its bio-active potency. No synthetics. No fillers. Just pure nature.
                </p>
                <a href="#" className="text-white font-label text-xs uppercase tracking-widest border-b border-white/30 pb-1 hover:border-white transition-colors inline-block">
                  Learn Our Heritage
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="bg-surface-container-low py-16 md:py-24 px-6 md:px-12 mb-32">
          <div className="max-w-4xl mx-auto text-center">
            <span className="material-symbols-outlined text-tertiary text-4xl mb-8 block">format_quote</span>
            <p className="font-headline text-xl md:text-3xl leading-relaxed mb-12 italic">
              "The Moringa Elixir has completely transformed my scalp health. For the first time, my hair feels grounded and vibrant. It's more than a product; it's a sanctuary for my crown."
            </p>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 bg-surface-container">
                <img
                  alt="Customer review"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2ppEKD0S8P_9ZFgKWj6opF79Qf1BRlk_gp-Vl1ddV34DW7J28lpkIXIz8nHPYQ5pLiMVL7Gp90bCkWj0CSPy7bQbmA8hSUxMoJt7uHgj3LQALCi09LOkXbHxUPiX1MtY9qQHPuE-QMohzGQQHWVIVcMOUg5U0oLuF09RxzO-CqJ6NGcwy11a4EvGQRrA15ABxiydAGmGUBha67Fse7qNjMRGVpQ9Ei8_kSQZTfdOt6Fd_ipwqkH5IRNq4IfWIGHIkhko_Q0U6fSY"
                />
              </div>
              <span className="font-label text-xs uppercase tracking-widest">Aida M. — Douala</span>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
};

export default HairCarePage;
