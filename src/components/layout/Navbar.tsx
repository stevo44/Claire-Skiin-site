import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isShop = location.pathname.includes('/shop');

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#faf9f8]/85 dark:bg-[#1a1c1c]/85 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(26,28,28,0.04)] transition-all duration-300 ease-in-out">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-full mx-auto">
        <div className="flex items-center gap-12">
          <Link to="/" className="text-2xl font-headline font-bold text-primary dark:text-primary-container hover:scale-105 transition-transform duration-300">
            Claire Skiin
          </Link>
          <div className="hidden md:flex items-center space-x-12 font-serif text-base tracking-wide">
            <Link 
              className={`transition-all duration-300 ease-in-out hover:text-primary hover:scale-105 ${isShop ? 'text-primary border-b-2 border-tertiary pb-1' : 'text-on-surface dark:text-surface'}`} 
              to="/shop"
            >
              Skincare
            </Link>
            <Link className="text-on-surface dark:text-surface hover:text-primary transition-all duration-300 hover:scale-105" to="/shop">
              Lip Care
            </Link>
            <Link className="text-on-surface dark:text-surface hover:text-primary transition-all duration-300 hover:scale-105" to="/shop">
              Hair Care
            </Link>
            <Link className="text-on-surface dark:text-surface hover:text-primary transition-all duration-300 hover:scale-105" to="/">
              Spa Services
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {isShop && (
            <div className="relative hidden lg:block group">
              <div className="flex items-center bg-surface-container-low rounded-full px-4 py-2 w-64 border-b border-outline/20 focus-within:border-tertiary transition-all duration-300">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
                <input className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full ml-2 placeholder:text-on-surface-variant/50 text-on-surface" placeholder="Find your ritual..." type="text" />
              </div>
            </div>
          )}
          
          <button className="text-primary dark:text-primary-container hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined">favorite</span>
          </button>
          <Link to="/cart" className="text-primary dark:text-primary-container hover:scale-105 transition-transform duration-300 relative">
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="absolute -top-1 -right-1 bg-tertiary text-on-tertiary text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
              3
            </span>
          </Link>
          <Link to="/dashboard" className="text-primary dark:text-primary-container hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined">person</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
