import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/ToastContainer';
import PageMeta from '../components/PageMeta';
import { eventService } from '../services/eventService';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { state, toggleWishlist, addToCart, refreshWishlist } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (isAuthenticated) {
      refreshWishlist();
    }
  }, [isAuthenticated, refreshWishlist]);

  const handleAddToCart = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    const productData = item.product || item;
    addToCart({
      id: Number(productData.id),
      name: productData.name,
      category: productData.category || 'Skincare',
      sub: productData.sub || '',
      price: productData.price,
      priceDisplay: productData.priceDisplay || `${productData.price} XAF`,
      img: productData.img || productData.imageUrl || '',
      desc: productData.description || '',
    });
    showToast(`${productData.name} added to bag`, 'shopping_bag');
    eventService.trackAddToCart(Number(productData.id), {
      name: productData.name,
      category: productData.category,
      price: productData.price,
      quantity: 1,
    });
  };

  const handleRemoveFromWishlist = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    await toggleWishlist(productId);
  };

  return (
    <>
      <PageMeta title="Your Wishlist" description="View your saved luxury skincare rituals." />
      <div className="bg-surface text-on-surface min-h-screen pt-32 pb-24 px-6 md:px-8">
        <main className="max-w-[1400px] mx-auto">
          {/* Header */}
          <header className="mb-12 text-center md:text-left reveal">
            <span className="text-xs uppercase tracking-[0.3em] text-tertiary font-bold mb-3 block">
              Curated Collection
            </span>
            <h1 className="font-headline text-4xl md:text-5xl text-on-surface">Your Saved Rituals</h1>
            <p className="text-on-surface-variant mt-2 text-sm md:text-base">
              Keep track of your favorite formulas and add them to your ritual anytime.
            </p>
          </header>

          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-container-low rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[64px] text-tertiary mb-4">favorite</span>
              <h2 className="font-headline text-2xl mb-2 text-on-surface">Save your sacred rituals</h2>
              <p className="text-on-surface-variant text-sm mb-6">
                Sign in to sync your wishlist across all devices and keep track of your skincare favorites.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
              >
                Sign In to View Wishlist
              </button>
            </div>
          ) : state.wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-container-low rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">favorite_border</span>
              <h2 className="font-headline text-2xl mb-2 text-on-surface">Your wishlist is empty</h2>
              <p className="text-on-surface-variant text-sm mb-6">
                Explore our botanical skincare and tap the heart icon on any product to save it here.
              </p>
              <Link
                to="/shop"
                className="px-8 py-3.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
              >
                Explore the Collection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
              {state.wishlistItems.map((item) => {
                const product = item.product;
                if (!product) return null;
                const imgSrc = product.img || product.imageUrl || '';

                return (
                  <div key={item.id} className="group relative flex flex-col reveal bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
                    <Link to={`/product/${product.id}`} className="block">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-surface-container-low mb-4 relative">
                        {imgSrc && (
                          <img
                            src={imgSrc}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        )}
                        <button
                          onClick={(e) => handleRemoveFromWishlist(e, product.id)}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-primary text-white backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md"
                          title="Remove from Wishlist"
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            favorite
                          </span>
                        </button>
                      </div>
                      <div className="px-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-tertiary font-bold mb-1">
                          {product.category}
                        </p>
                        <h3 className="font-headline text-lg mb-1 group-hover:text-primary transition-colors leading-tight">
                          {product.name}
                        </h3>
                        <p className="font-bold text-on-surface text-base mb-4">
                          {product.priceDisplay || `${product.price} XAF`}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => handleAddToCart(e, item)}
                      className="mt-auto w-full py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-primary/10 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">shopping_bag</span>
                      Add to Bag
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
