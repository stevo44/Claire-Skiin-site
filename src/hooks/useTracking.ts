import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { eventService } from '../services/eventService';

/**
 * usePageTracking — fires a `page_view` event on every route change.
 * Drop this into the root RouteWrapper — zero per-page boilerplate needed.
 *
 * Usage: call once inside the component that has access to useLocation()
 *   e.g. RouteWrapper in App.tsx
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Fire async, non-blocking — doesn't affect render
    eventService.trackEvent('page_view', undefined, {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer || null,
    });
  }, [location.pathname, location.search]);
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
