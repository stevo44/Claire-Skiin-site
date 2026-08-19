import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { useProducts, LiveProduct } from '../store/productStore';
import { showToast } from '../components/ToastContainer';
import { eventService } from '../services/eventService';
import PageMeta from '../components/PageMeta';

type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'name_asc';
const PRICE_MAX = 300000;

export default function ShopPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, state, toggleWishlist } = useCart();
  const { products, loading } = useProducts();

  // Derive categories dynamically from live products
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    return ['All', ...cats];
  }, [products]);

  const getInitialCategory = () => {
    const param = new URLSearchParams(location.search).get('category');
    if (param && categories.includes(param)) return param;
    const stored = sessionStorage.getItem('shopCategory');
    if (stored && categories.includes(stored)) return stored;
    return 'All';
  };

  const [category, setCategory] = useState<string>('All');
  const [priceMax, setPriceMax]  = useState(PRICE_MAX);
  const [sort, setSort]          = useState<SortOption>('featured');
  const [search, setSearch]      = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Sync category from URL on mount
  useEffect(() => { setCategory(getInitialCategory()); }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    navigate({ search: params.toString() }, { replace: true });
    sessionStorage.removeItem('shopCategory');
  }, [category]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'All') list = list.filter(p => p.category === category);
    list = list.filter(p => p.price <= priceMax);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sub || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'price_asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'name_asc':   list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }, [products, category, priceMax, sort, search]);

  const handleAddToCart = (e: React.MouseEvent, product: LiveProduct) => {
    e.preventDefault(); e.stopPropagation();
    addToCart({ ...product, id: Number(product.id) } as any);
    showToast(`${product.name} added to bag`, 'shopping_bag');
    eventService.trackAddToCart(Number(product.id), { name: product.name, category: product.category, price: product.price, quantity: 1 });
  };

  const handleToggleWishlist = async (e: React.MouseEvent, product: LiveProduct) => {
    e.preventDefault(); e.stopPropagation();
    const success = await toggleWishlist(Number(product.id));
    if (!success && !localStorage.getItem('token')) {
      navigate('/login');
    }
  };

  const resetFilters = () => { setCategory('All'); setPriceMax(PRICE_MAX); setSort('featured'); setSearch(''); };
  const hasActiveFilters = category !== 'All' || priceMax < PRICE_MAX || sort !== 'featured' || search !== '';

  const SkeletonCard = () => (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-stone-100 mb-5" />
      <div className="space-y-2 px-1">
        <div className="h-2 w-16 bg-stone-100 rounded" />
        <div className="h-4 w-3/4 bg-stone-100 rounded" />
        <div className="h-3 w-1/2 bg-stone-100 rounded" />
        <div className="h-4 w-1/3 bg-stone-200 rounded" />
      </div>
      <div className="mt-4 h-11 w-full rounded-xl bg-stone-100" />
    </div>
  );

  return (
    <>
      <PageMeta title="Shop the Collection" description="Explore our full range of luxury botanical skincare." />
      <div className="bg-surface text-on-surface min-h-screen">
        <main className="pt-32 pb-24 px-6 md:px-8 max-w-[1600px] mx-auto">

          <header className="mb-12 reveal">
            <span className="text-xs uppercase tracking-[0.3em] text-tertiary font-bold mb-3 block">The Collection</span>
            <h1 className="font-headline text-4xl md:text-5xl text-on-surface">All Products</h1>
          </header>

          {/* Mobile search + filter toggle */}
          <div className="flex md:hidden gap-3 mb-6">
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 pl-4 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm focus:outline-none focus:border-primary transition-colors" />
            <button onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-semibold">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filters {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full inline-block" />}
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar */}
            <aside className={`w-full lg:w-64 shrink-0 space-y-8 ${filterOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="hidden lg:block relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <h3 className="font-headline text-xl mb-5">Category</h3>
                <div className="flex flex-col gap-3">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center gap-3 group cursor-pointer" onClick={() => setCategory(cat)}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${category === cat ? 'border-primary bg-primary' : 'border-outline group-hover:border-primary'}`}>
                        {category === cat && <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'wght' 700" }}>check</span>}
                      </div>
                      <span className={`text-sm transition-colors ${category === cat ? 'text-primary font-bold' : 'text-on-surface-variant group-hover:text-primary'}`}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-headline text-xl mb-5">Price Range</h3>
                <input type="range" min={0} max={PRICE_MAX} step={1000} value={priceMax} onChange={e => setPriceMax(Number(e.target.value))} className="w-full accent-tertiary cursor-pointer mb-2" />
                <div className="flex justify-between text-sm text-on-surface-variant font-medium">
                  <span>0 XAF</span>
                  <span className="text-primary font-bold">{priceMax.toLocaleString('fr-CM')} XAF</span>
                </div>
              </div>

              <div>
                <h3 className="font-headline text-xl mb-5">Sort By</h3>
                <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm p-3 focus:outline-none focus:border-primary appearance-none cursor-pointer">
                  <option value="featured">Most Popular</option>
                  <option value="name_asc">Name: A–Z</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button onClick={resetFilters} className="flex items-center gap-2 text-sm text-error font-semibold hover:opacity-70 transition-opacity">
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  Clear All Filters
                </button>
              )}
            </aside>

            {/* Grid */}
            <section className="flex-1">
              <p className="text-sm text-on-surface-variant mb-8">
                {loading ? 'Loading products…' : filtered.length === 0 ? 'No products found' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}
              </p>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                  {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <span className="material-symbols-outlined text-[64px] text-outline-variant">search_off</span>
                  <h3 className="font-headline text-2xl">No products match your filters</h3>
                  <p className="text-on-surface-variant">Try adjusting or clearing your filters.</p>
                  <button onClick={resetFilters} className="mt-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform">
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                  {filtered.map(product => {
                    const inWishlist = state.wishlist.includes(Number(product.id));
                    const imgSrc = product.img || product.image_url || '';
                    return (
                      <div key={product.id} className="group relative flex flex-col reveal">
                        <Link to={`/product/${product.id}`} className="block">
                          <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-surface-container-low mb-5 relative">
                            {imgSrc && (
                              <img src={imgSrc} alt={product.name} loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            )}
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-6">
                              <button onClick={e => handleAddToCart(e, product)}
                                className="bg-white/90 backdrop-blur-sm text-primary px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg">
                                Add to Bag
                              </button>
                            </div>
                            {product.badge && (
                              <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                                {product.badge}
                              </span>
                            )}
                            <button onClick={e => handleToggleWishlist(e, product)}
                              className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${inWishlist ? 'bg-primary text-white' : 'bg-white/80 text-primary hover:bg-white'}`}>
                              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: inWishlist ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                            </button>
                          </div>
                          <div className="px-1">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-tertiary font-bold mb-1">{product.category}</p>
                            <h3 className="font-headline text-lg mb-1 group-hover:text-primary transition-colors leading-tight">{product.name}</h3>
                            <p className="text-sm text-on-surface-variant mb-3">{product.sub}</p>
                            <p className="font-bold text-on-surface">{product.priceDisplay}</p>
                          </div>
                        </Link>
                        <button onClick={e => handleAddToCart(e, product)}
                          className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/10">
                          Add to Bag
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
