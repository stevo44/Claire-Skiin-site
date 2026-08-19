import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { notificationService, Notification } from '../services/notificationService';
import { showToast } from '../components/ToastContainer';
import PageMeta from '../components/PageMeta';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const result = await notificationService.getNotifications(targetPage, PAGE_SIZE);
      setNotifications(result.notifications);
      setTotalPages(result.totalPages || 1);
      setPage(result.page || targetPage);
    } catch {
      showToast('Could not load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (isAuthenticated) {
      loadNotifications(1);
    }
  }, [isAuthenticated, loadNotifications]);

  const visibleNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleMarkAsRead = async (id: number) => {
    // Optimistic update — feels instant, reconciled silently if the request fails.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await notificationService.markAsRead(id);
    } catch {
      // Revert on failure
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
      showToast('Could not mark as read', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationService.markAllAsRead();
      showToast('All notifications marked as read', 'check_circle');
    } catch {
      setNotifications(previous);
      showToast('Could not mark all as read', 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) handleMarkAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <PageMeta title="Notifications" description="Your order updates and account notifications." />
      <div className="bg-surface text-on-surface min-h-screen pt-32 pb-24 px-6 md:px-8">
        <main className="max-w-[900px] mx-auto">
          <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 reveal">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-tertiary font-bold mb-3 block">
                Account
              </span>
              <h1 className="font-headline text-4xl md:text-5xl text-on-surface">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-on-surface-variant mt-2 text-sm">
                  {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
                </p>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                // 44px minimum tap target height for mobile
                className="min-h-[44px] px-6 py-3 bg-primary/10 text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/20 transition-colors disabled:opacity-50 self-start md:self-auto"
              >
                {markingAll ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </header>

          {/* Read/unread filter */}
          <div className="flex gap-2 mb-6">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                // 44px minimum tap target height for mobile
                className={`min-h-[44px] px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {f === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>

          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-container-low rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[64px] text-tertiary mb-4">notifications</span>
              <h2 className="font-headline text-2xl mb-2 text-on-surface">Sign in to see notifications</h2>
              <p className="text-on-surface-variant text-sm mb-6">
                Order updates, appointment reminders, and account activity will show up here.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="min-h-[44px] px-8 py-3.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
              >
                Sign In
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-3" role="status" aria-label="Loading notifications">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse bg-surface-container-low rounded-2xl h-20" />
              ))}
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-container-low rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">
                notifications_off
              </span>
              <h2 className="font-headline text-2xl mb-2 text-on-surface">
                {filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
              </h2>
              <p className="text-on-surface-variant text-sm">
                {filter === 'unread'
                  ? 'No unread notifications right now.'
                  : "We'll let you know when there's something new."}
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {visibleNotifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleNotificationClick(n)}
                      // min-h-[44px]: mobile tap-target minimum, applies to the whole row
                      className={`w-full min-h-[44px] text-left flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
                        n.is_read
                          ? 'bg-surface-container-lowest border-outline/10'
                          : 'bg-primary/5 border-primary/20'
                      } hover:bg-surface-container-low`}
                    >
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" aria-hidden="true" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.is_read ? 'text-on-surface-variant' : 'text-on-surface font-semibold'}`}>
                          {n.title}
                        </p>
                        <p className="text-sm text-on-surface-variant mt-1">{n.body}</p>
                        <span className="text-xs text-on-surface-variant/70 mt-2 block">
                          {new Date(n.created_at).toLocaleString('fr-CM', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {n.email_status && (
                          <span
                            className={`inline-block mt-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                              n.email_status === 'sent'
                                ? 'bg-green-100 text-green-700'
                                : n.email_status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {n.email_status === 'sent' ? 'Email Sent' : n.email_status === 'failed' ? 'Email Failed' : 'Email Pending'}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => loadNotifications(page - 1)}
                    disabled={page <= 1}
                    className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className="text-xs text-on-surface-variant">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => loadNotifications(page + 1)}
                    disabled={page >= totalPages}
                    className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
