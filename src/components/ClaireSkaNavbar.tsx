import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../services/notificationService';
import { showToast } from './ToastContainer';

const ClairesNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount, wishlistCount, openCart } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    fetchNotifications,
  } = useNotifications();

  const navLinks = [
    { label: 'Skincare', to: '/shop' },
    { label: 'Lip Care', to: '/lip-care' },
    { label: 'Hair Care', to: '/hair-care' },
    { label: 'Spa Services', to: '/spa-services' },
  ];

  const isActive = (to: string) => location.pathname === to;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    showToast('Signed out successfully', 'logout');
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-[#faf9f8]/90 backdrop-blur-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.07)] border-b border-outline-variant/20 transition-all duration-400">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto px-8 h-[72px]">
          {/* Logo */}
          <Link to="/" className="font-serif text-[1.4rem] font-bold text-primary hover:scale-[1.04] transition-transform duration-300 tracking-[-0.02em]">
            Claire Skiin
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden md:flex items-center gap-10 list-none m-0 p-0">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`relative font-serif text-[0.9rem] tracking-[0.02em] pb-[2px] transition-colors duration-300 before:content-[''] before:absolute before:bottom-[-2px] before:left-0 before:h-[1.5px] before:bg-tertiary before:transition-all before:duration-300 ${
                    isActive(link.to)
                      ? 'text-primary before:w-full'
                      : 'text-on-surface hover:text-primary hover:before:w-full before:w-0'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Search */}
          <div className="hidden lg:block relative group ml-8">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">search</span>
            <input
              type="text"
              placeholder="Find your ritual..."
              className="w-[240px] focus:w-[300px] bg-surface-container-low border-none rounded-full py-2 pr-4 pl-10 font-sans text-[0.8rem] text-on-surface outline-none transition-all duration-300 focus:shadow-[0_0_0_2px_rgba(184,134,11,0.3)]"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            <div className={`absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-4 z-[100] transition-all duration-250 ${searchFocused ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-outline mb-3">Trending Rituals</p>
              <div className="flex flex-wrap gap-1">
                {['Hibiscus Serum', 'Shea Butter', 'Baobab Oil', 'Clay Mask', 'Hair Oil'].map(tag => (
                  <span key={tag} className="inline-block px-3 py-1 bg-surface-container-low rounded-full text-[11px] text-on-surface-variant cursor-pointer hover:bg-primary hover:text-white transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Wishlist */}
            <button
              className="relative hidden md:flex w-[42px] h-[42px] border-none bg-transparent rounded-full items-center justify-center text-primary cursor-pointer hover:bg-primary/10 hover:scale-110 transition-all duration-250"
              onClick={() => navigate('/wishlist')}
              title="Wishlist"
            >
              <span className="material-symbols-outlined">favorite</span>
              <span className={`absolute top-[5px] right-[5px] w-4 h-4 bg-tertiary text-white rounded-full text-[10px] font-bold flex items-center justify-center transition-transform duration-300 ${wishlistCount > 0 ? 'scale-100' : 'scale-0'}`}>
                {wishlistCount}
              </span>
            </button>

            {/* Cart */}
            <button className="relative w-[44px] h-[44px] border-none bg-transparent rounded-full flex items-center justify-center text-primary cursor-pointer hover:bg-primary/10 hover:scale-110 transition-all duration-250" onClick={openCart} title="Cart">
              <span className="material-symbols-outlined">shopping_bag</span>
              <span className={`absolute top-[5px] right-[5px] w-4 h-4 bg-tertiary text-white rounded-full text-[10px] font-bold flex items-center justify-center transition-transform duration-300 ${cartCount > 0 ? 'scale-100' : 'scale-0'}`}>
                {cartCount}
              </span>
            </button>

            {/* Notifications */}
            {isAuthenticated && (
              <div className="hidden md:block relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationOpen(v => !v)}
                  className="relative w-[42px] h-[42px] border-none bg-transparent rounded-full flex items-center justify-center text-primary cursor-pointer hover:bg-primary/10 hover:scale-110 transition-all duration-250"
                  title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-96 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-outline-variant/10 overflow-hidden z-[200]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
                      <h3 className="font-semibold text-sm text-on-surface">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] text-primary hover:underline font-medium"
                            disabled={loading}
                          >
                            Mark all as read
                          </button>
                        )}
                        <button
                          onClick={() => setNotificationOpen(false)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {loading ? (
                        <div className="px-4 py-8 text-center text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                          <p className="mt-2">Loading...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined text-[40px] block mb-2">notifications_none</span>
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-outline-variant/10">
                          {notifications.map((notification: Notification) => (
                            <button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors ${
                                notification.is_read ? '' : 'bg-primary/5'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                  notification.type === 'order_status_changed' ? 'bg-green-100 text-green-600' :
                                  notification.type === 'appointment_created' || notification.type === 'appointment_status_changed' ? 'bg-purple-100 text-purple-600' :
                                  notification.type === 'review_approved' || notification.type === 'review_rejected' ? 'bg-amber-100 text-amber-600' :
                                  notification.type === 'low_stock' ? 'bg-red-100 text-red-600' :
                                  'bg-primary/10 text-primary'
                                }`}>
                                  <span className="material-symbols-outlined text-[18px]">
                                    {notification.type === 'order_status_changed' ? 'shopping_bag' :
                                     notification.type === 'new_order' ? 'shopping_cart' :
                                     notification.type === 'appointment_created' || notification.type === 'appointment_status_changed' ? 'spa' :
                                     notification.type === 'review_approved' || notification.type === 'review_rejected' ? 'rate_review' :
                                     notification.type === 'low_stock' ? 'inventory_2' : 'notifications'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${notification.is_read ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                                    {notification.body}
                                  </p>
                                  <p className="text-[10px] text-on-surface-variant mt-1">
                                    {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer — links to the full notification history page */}
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationOpen(false)}
                      className="block text-center px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary hover:bg-surface-container-low transition-colors border-t border-outline-variant/10"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Profile / Account */}
            {isAuthenticated ? (
              <div className="hidden md:block relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="w-[42px] h-[42px] rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all duration-250 hover:scale-110"
                  title="Account"
                >
                  {initials}
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-outline-variant/10 overflow-hidden z-[200]">
                    {/* User info */}
                    <div className="px-5 py-4 border-b border-outline-variant/10 bg-surface-container-low">
                      <p className="font-semibold text-sm text-on-surface truncate">{user?.full_name || user?.email}</p>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{user?.email}</p>
                    </div>
                    {/* Links */}
                    <div className="py-2">
                      <Link
                        to="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-5 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                      >
                        <span className="material-symbols-outlined text-base text-primary">dashboard</span>
                        Admin Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">logout</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex w-[42px] h-[42px] border-none bg-transparent rounded-full items-center justify-center text-primary cursor-pointer hover:bg-primary/10 hover:scale-110 transition-all duration-250"
                title="Sign In"
              >
                <span className="material-symbols-outlined">person</span>
              </Link>
            )}

            {/* Mobile Toggle */}
            <button
              className="md:hidden flex w-[44px] h-[44px] border-none bg-transparent rounded-full items-center justify-center text-primary cursor-pointer hover:bg-primary/10 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed top-[72px] left-0 right-0 bottom-0 bg-[#faf9f8]/95 backdrop-blur-[20px] z-[999] p-8 flex flex-col gap-4 overflow-y-auto transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/" onClick={() => setMobileOpen(false)} className="font-serif text-[1.5rem] font-bold text-on-surface no-underline py-3 border-b border-outline-variant/30">Home</Link>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className={`font-serif text-[1.5rem] font-bold no-underline py-3 ${link.to !== '/spa-services' ? 'border-b border-outline-variant/30' : ''} ${isActive(link.to) ? 'text-tertiary' : 'text-on-surface'}`}
          >
            {link.label}
          </Link>
        ))}
        {isAuthenticated && (
          <Link
            to="/notifications"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between font-serif text-[1.5rem] font-bold no-underline py-3 border-b border-outline-variant/30 text-on-surface"
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined">notifications</span>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}
        <div className="mt-auto pt-4 border-t border-outline-variant/30">
          {isAuthenticated ? (
            <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex items-center gap-3 min-h-[44px] text-red-600 font-semibold py-3">
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 min-h-[44px] text-primary font-semibold py-3">
              <span className="material-symbols-outlined">person</span>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default ClairesNavbar;
