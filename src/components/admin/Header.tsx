import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../../store/authStore';
import { showToast } from '../ToastContainer';
import { useNotifications } from '../../hooks/useNotifications';
import { Notification } from '../../services/notificationService';

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, title = 'Registry' }) => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  const handleLogout = () => {
    logout();
    showToast('Signed out successfully', 'check_circle');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-50/85 backdrop-blur-md h-16 border-b border-stone-200/20 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-stone-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="relative w-full max-w-md hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-outline/30 focus:border-tertiary outline-none text-sm font-body transition-colors"
            placeholder="Search clients, orders, or products..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex gap-2 font-label text-[10px] tracking-[0.3em] uppercase text-outline hidden md:flex">
          <span>Section /</span>
          <span className="text-primary font-bold">{title}</span>
        </div>

        <div className="flex gap-4 items-center">
          {/* Notifications Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 hover:text-amber-600 transition-colors"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-96 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-stone-100 overflow-hidden z-[200]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline text-lg text-on-surface">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        await markAllAsRead();
                        setDropdownOpen(false);
                      }}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-8 text-center text-stone-400">
                      <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
                      <p className="text-xs mt-2">Loading...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <span className="material-symbols-outlined text-[40px] text-stone-300 block mb-2">notifications_off</span>
                      <p className="text-sm text-stone-400">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-50">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full px-4 py-3 hover:bg-stone-50 transition-colors text-left ${
                            !notification.is_read ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              notification.type === 'new_order' ? 'bg-amber-50 text-amber-600' :
                              notification.type === 'order_status_changed' ? 'bg-green-50 text-green-600' :
                              notification.type === 'appointment_created' ? 'bg-purple-50 text-purple-600' :
                              notification.type === 'appointment_status_changed' ? 'bg-blue-50 text-blue-600' :
                              notification.type === 'review_approved' ? 'bg-emerald-50 text-emerald-600' :
                              notification.type === 'review_rejected' ? 'bg-red-50 text-red-600' :
                              notification.type === 'low_stock' ? 'bg-red-50 text-red-600' :
                              'bg-stone-100 text-stone-600'
                            }`}>
                              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {notification.type === 'new_order' ? 'shopping_bag' :
                                 notification.type === 'order_status_changed' ? 'local_shipping' :
                                 notification.type === 'appointment_created' || notification.type === 'appointment_status_changed' ? 'spa' :
                                 notification.type === 'review_approved' || notification.type === 'review_rejected' ? 'rate_review' :
                                 notification.type === 'low_stock' ? 'inventory_2' : 'notifications'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${!notification.is_read ? 'text-on-surface' : 'text-stone-600'}`}>
                                {notification.title}
                              </p>
                              <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">
                                {notification.body}
                              </p>
                              <p className="text-[10px] text-stone-400 mt-1">
                                {formatTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-stone-100">
                  <Link
                    to="/admin/notifications"
                    onClick={() => setDropdownOpen(false)}
                    className="block text-center text-xs text-primary font-bold hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/admin/settings')}
            title="Settings"
            className="text-stone-500 hover:text-amber-600 transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-stone-500 hover:text-red-600 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>

        {/* User avatar + name */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full overflow-hidden border border-outline/10 bg-primary/10 flex items-center justify-center">
            {user?.avatar_url
              ? <img alt={user.full_name} className="w-full h-full object-cover" src={user.avatar_url} />
              : <span className="text-xs font-bold text-primary">
                  {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
                </span>
            }
          </div>
          <span className="text-xs font-body text-stone-600 hidden md:block">
            {user?.full_name?.split(' ')[0] || 'Admin'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;