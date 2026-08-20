import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { eventService } from '../services/eventService';

/**
 * usePageTracking — fires a `page_view` event on every route change AND
 * tracks scroll depth + time-on-page via a lightweight `page_engagement`
 * event that fires when the user navigates away or hides the tab.
 *
 * Performance considerations:
 * - The scroll listener is passive and rAF-throttled — at most one
 *   calculation per animation frame, no layout thrashing.
 * - The engagement event fires at most ONCE per page view (on route change
 *   or tab hide), never on every scroll pixel.
 * - On tab hide the beacon uses fetch with keepalive so it survives unload.
 */
export function usePageTracking() {
  const location = useLocation();

  // Refs persist across renders without triggering re-renders
  const maxScrollRef = useRef(0);           // max scroll % for current page
  const startTimeRef = useRef(Date.now());  // when current page became active
  const currentPathRef = useRef<string | null>(null); // path being tracked
  const engagementSentRef = useRef(false);   // already sent for current page?

  // ── Throttled scroll listener (set up once) ──────────────────────────────
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const pct = scrollable > 0
          ? Math.round((window.scrollY / scrollable) * 100)
          : 100;
        if (pct > maxScrollRef.current) {
          maxScrollRef.current = Math.min(pct, 100);
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Page view + engagement on route change ──────────────────────────────
  useEffect(() => {
    // Fire engagement for the PREVIOUS page (if not already beaconed)
    if (currentPathRef.current !== null && !engagementSentRef.current) {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      eventService.trackEvent('page_engagement', undefined, {
        path: currentPathRef.current,
        scroll_depth_percent: maxScrollRef.current,
        time_on_page_seconds: timeOnPage,
      });
    }

    // Fire page_view for the new route
    eventService.trackEvent('page_view', undefined, {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer || null,
    });

    // Reset refs for the new page
    currentPathRef.current = location.pathname;
    startTimeRef.current = Date.now();
    maxScrollRef.current = 0;
    engagementSentRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // ── Beacon on tab hide / page unload ─────────────────────────────────────
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Fire beacon for current page (if not already sent)
        if (currentPathRef.current !== null && !engagementSentRef.current) {
          const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
          eventService.trackPageEngagement({
            path: currentPathRef.current,
            scroll_depth_percent: maxScrollRef.current,
            time_on_page_seconds: timeOnPage,
          });
          engagementSentRef.current = true;
        }
      } else if (document.visibilityState === 'visible') {
        // User came back — restart the timer so time-on-page doesn't
        // include time spent in another tab
        startTimeRef.current = Date.now();
        engagementSentRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
}

/**
 * useProductTracking — fires a `product_view` event when a product page mounts.
 * @param productId  The product id — pass undefined/null to skip tracking.
 * @param metadata   Optional extra context (name, category, price, etc).
 */
export function useProductTracking(
  productId: number | string | undefined,
  metadata: Record<string, any> = {}
) {
  useEffect(() => {
    if (!productId) return;
    eventService.trackProductView(productId, metadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
}
