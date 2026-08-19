import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { PRODUCTS } from '../data/products';
import { showToast } from '../components/ToastContainer';
import { eventService } from '../services/eventService';

export default function CartPage() {
  const { state, cartTotal, cartCount, updateQty, removeFromCart, addToCart } = useCart();
  const navigate = useNavigate();

  // Cross-sell: products not already in cart
  const cartIds = new Set(state.cart.map(i => i.id));
  const suggestions = PRODUCTS.filter(p => !cartIds.has(p.id)).slice(0, 3);

  const handleAddSuggestion = (product: typeof PRODUCTS[0]) => {
    addToCart(product);
    showToast(`${product.name} added to bag`, 'shopping_bag');
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      <style>{`
        .hero-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 30-15 30-15-30z' fill='%23006c0c' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E");
        }
      `}</style>

      <main className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto hero-pattern">
        {/* Header */}
        <header className="mb-16 md:mb-20 text-center">
          <span className="font-label text-xs uppercase tracking-[0.2em] text-tertiary mb-4 block">Your Selection</span>
          <h1 className="font-headline text-4xl md:text-6xl text-on-surface leading-tight">
            The Shopping <span className="italic text-tertiary">Bag</span>
            {cartCount > 0 && (
              <span className="ml-4 text-2xl text-outline">({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
            )}
          </h1>
          <div className="mt-8 flex justify-center">
            <Link className="font-body text-primary text-sm flex items-center gap-2 hover:translate-x-[-4px] transition-transform duration-300 group" to="/shop">
              <span className="material-symbols-outlined text-sm">west</span>
              <span className="border-b-2 border-transparent group-hover:border-primary pb-0.5">Shop more</span>
            </Link>
          </div>
        </header>

        {/* Empty state */}
        {state.cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
            <span className="material-symbols-outlined text-[80px] text-outline-variant">shopping_bag</span>
            <h2 className="font-headline text-3xl text-on-surface">Your bag is empty</h2>
            <p className="text-on-surface-variant max-w-sm">You haven't added anything yet. Discover our luxury botanical collection.</p>
            <button
              onClick={() => navigate('/shop')}
              className="mt-2 px-10 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
            >
              Shop the Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            {/* Cart Items */}
            <div className="lg:col-span-8 space-y-6">
              {state.cart.map(item => (
                <div key={item.id} className="flex flex-col md:flex-row gap-8 items-center bg-surface-container-low rounded-xl p-6 md:p-8 hover:shadow-sm transition-all duration-500">
                  <div className="w-full md:w-36 h-40 overflow-hidden rounded-lg bg-surface-variant shrink-0">
                    <img
                      loading="lazy"
                      alt={item.name}
                      className="w-full h-full object-cover mix-blend-multiply opacity-90"
                      src={item.img}
                    />
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <Link to={`/product/${item.id}`}>
                      <h3 className="font-headline text-xl text-on-surface mb-1 hover:text-primary transition-colors">{item.name}</h3>
                    </Link>
                    <p className="font-body text-sm text-on-surface-variant mb-4">{item.sub}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                      <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-1.5 border border-outline-variant/20">
                        <button
                          className="text-on-surface-variant hover:text-primary p-1"
                          onClick={() => updateQty(item.id, item.qty - 1)}
                        >
                          <span className="material-symbols-outlined text-lg">remove</span>
                        </button>
                        <span className="px-4 font-medium text-sm min-w-[2rem] text-center">{item.qty}</span>
                        <button
                          className="text-on-surface-variant hover:text-primary p-1"
                          onClick={() => updateQty(item.id, item.qty + 1)}
                        >
                          <span className="material-symbols-outlined text-lg">add</span>
                        </button>
                      </div>
                      <button
                        className="text-xs font-label uppercase tracking-wider text-error/70 hover:text-error transition-colors"
                        onClick={() => {
                          removeFromCart(item.id);
                          showToast(`${item.name} removed`, 'delete');
                          // 🔴 Track remove from cart event
                          eventService.trackRemoveFromCart(item.id, {
                            name: item.name,
                            price: item.price,
                            qty_removed: item.qty
                          });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-center shrink-0">
                    <span className="font-headline text-2xl text-on-surface">
                      {(item.price * item.qty).toLocaleString('fr-CM')} XAF
                    </span>
                    {item.qty > 1 && (
                      <span className="text-xs text-on-surface-variant mt-1">
                        {item.price.toLocaleString('fr-CM')} each
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4">
              <div className="bg-surface-container-low rounded-xl p-10 sticky top-32">
                <h2 className="font-headline text-2xl text-on-surface mb-8">Order Summary</h2>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="font-body">Subtotal ({cartCount} items)</span>
                    <span className="font-body">{cartTotal.toLocaleString('fr-CM')} XAF</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="font-body">Standard Delivery</span>
                    <span className="font-body text-primary font-semibold">Calculated at checkout</span>
                  </div>
                </div>
                <div className="pt-6 mb-10 border-t border-outline-variant/20 flex justify-between items-baseline">
                  <span className="font-headline text-lg">Estimated Total</span>
                  <span className="font-headline text-3xl text-primary">{cartTotal.toLocaleString('fr-CM')} XAF</span>
                </div>
                <Link
                  to="/checkout"
                  className="block text-center w-full py-5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label text-sm font-bold tracking-[0.15em] uppercase shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                  Proceed to Checkout
                </Link>
                <div className="mt-8 flex flex-col gap-4">
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant font-body">
                    <span className="material-symbols-outlined text-tertiary">verified_user</span>
                    Secure checkout with high-level encryption
                  </div>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant font-body">
                    <span className="material-symbols-outlined text-tertiary">local_shipping</span>
                    Carbon-neutral shipping worldwide
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cross-sell */}
        {suggestions.length > 0 && (
          <section className="mt-32">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-[1px] flex-grow bg-outline-variant/30"></div>
              <h2 className="font-headline text-2xl text-center px-4 italic">Complete the Ritual</h2>
              <div className="h-[1px] flex-grow bg-outline-variant/30"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {suggestions.map(p => (
                <div key={p.id} className="group cursor-pointer">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-container mb-6">
                    <img
                      loading="lazy"
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      src={p.img}
                    />
                    <button
                      onClick={() => handleAddSuggestion(p)}
                      className="absolute bottom-6 right-6 bg-white/90 backdrop-blur text-primary w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                  <h4 className="font-headline text-lg mb-1">{p.name}</h4>
                  <p className="text-tertiary font-body">{p.priceDisplay}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
