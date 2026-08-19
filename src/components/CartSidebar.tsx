import React from 'react';
import { useCart } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';

const CartSidebar: React.FC = () => {
  const { state, closeCart, updateQty, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-[2000] backdrop-blur-[4px] transition-opacity duration-300 ${state.cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCart}
      />
      <div
        className={`fixed top-0 right-0 w-[min(480px,100vw)] h-full bg-surface-container-lowest z-[2001] flex flex-col overflow-hidden transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${state.cartOpen ? 'translate-x-[0%]' : 'translate-x-[100%]'}`}
      >
        <div className="flex justify-between items-center px-8 py-6 border-b border-outline-variant/40">
          <h2 className="font-serif text-2xl font-bold">Shopping Bag</h2>
          <button
            onClick={closeCart}
            className="w-10 h-10 border-none bg-surface-container-low rounded-full cursor-pointer flex items-center justify-center transition-all duration-250 hover:bg-error hover:text-white hover:rotate-90"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col">
          {state.cart.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">shopping_bag</span>
              <p className="text-secondary">Your bag is empty.<br/>Discover our rituals.</p>
              <button
                className="mt-6 px-7 py-3.5 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-transform hover:scale-105"
                onClick={() => { closeCart(); navigate('/shop'); }}
              >
                Shop Now
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {state.cart.map(item => (
                <div key={item.id} className="flex gap-4 py-5 border-b border-outline-variant/30 animate-[fadeUp-cs_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
                  <div className="w-20 h-24 rounded-[10px] overflow-hidden bg-surface-container-low shrink-0">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-[1rem] font-semibold mb-1">{item.name}</h4>
                      <p className="text-[0.78rem] text-secondary mb-2">{item.sub}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center border border-outline-variant rounded-full overflow-hidden w-fit scale-[0.85] origin-left">
                          <button className="w-11 h-11 border-none bg-transparent hover:bg-surface-container-low hover:text-primary text-xl text-secondary transition-colors" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                          <span className="min-w-[48px] text-center font-semibold text-[1rem]">{item.qty}</span>
                          <button className="w-11 h-11 border-none bg-transparent hover:bg-surface-container-low hover:text-primary text-xl text-secondary transition-colors" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                        </div>
                        <span className="font-bold text-[1rem]">{(item.price * item.qty).toLocaleString()} XAF</span>
                      </div>
                      <div className="mt-1">
                        <button
                          className="bg-transparent border-none text-[0.7rem] font-bold tracking-[0.1em] uppercase text-error/60 hover:text-error transition-colors cursor-pointer"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {state.cart.length > 0 && (
          <div className="p-6 md:px-8 border-t border-outline-variant/40 bg-surface-container-low">
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex justify-between text-sm text-secondary">
                <span>Subtotal</span>
                <span>{cartTotal.toLocaleString()} XAF</span>
              </div>
              <div className="flex justify-between text-sm text-secondary">
                <span>Shipping</span>
                <span className="text-primary font-semibold">Calculated at checkout</span>
              </div>
              <div className="flex justify-between font-serif text-[1.25rem] font-bold pt-3 mt-2 border-t border-outline-variant">
                <span>Subtotal</span>
                <span className="text-tertiary">{cartTotal.toLocaleString()} XAF</span>
              </div>
            </div>
            <button
              className="w-full p-[18px] bg-gradient-to-br from-primary to-primary-container text-white border-none rounded-xl text-[0.75rem] font-bold tracking-[0.2em] uppercase cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_16px_36px_rgba(0,108,12,0.4)] transition-all shadow-[0_8px_24px_rgba(0,108,12,0.3)]"
              onClick={() => { closeCart(); navigate('/checkout'); }}
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeUp-cs { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default CartSidebar;
