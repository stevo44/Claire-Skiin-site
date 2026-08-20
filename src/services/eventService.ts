import api from './api.ts';
import { v4 as uuidv4 } from 'uuid';

// Simple session management
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

export const eventService = {
  /**
   * @desc Track a user event
   * @param eventType - The type of event (e.g., 'page_view', 'product_view',
   *   'add_to_cart', 'remove_from_cart', 'search', 'wishlist_action', 'login',
   *   'logout', 'checkout_started', 'checkout_completed', 'appointment_booking',
   *   'review_submission', 'coupon_applied', 'delivery_method_selected',
   *   'page_engagement')
   * @param productId - The ID of the product (if applicable)
   * @param metadata - Additional data about the event
   */
  trackEvent: async (eventType: string, productId?: number | string, metadata: any = {}) => {
    try {
      const sessionId = getSessionId();
      const response = await api.post('/events', {
        session_id: sessionId,
        event_type: eventType,
        metadata: {
          ...metadata,
          product_id: productId,
        }
      });
      return response.data;
    } catch (error) {
      // Log error but don't break the UI for event tracking failures
      console.error('Failed to track event:', error);
      return null;
    }
  },

  /**
   * @desc Fire-and-forget beacon for page-unload scenarios.
   * Uses fetch with keepalive so the request survives navigation/tab close.
   * Does NOT go through the axios instance (which could be mid-interceptor).
   */
  trackEventBeacon: (eventType: string, metadata: any = {}) => {
    try {
      const sessionId = getSessionId();
      const baseUrl = (import.meta as any).env?.VITE_API_URL ?? '/api';
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const body = JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        metadata,
      });
      fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers,
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Silently fail — beacon must never break the UI
    }
  },

  /**
   * @desc Track a product view event
   */
  trackProductView: (productId: number | string, metadata: any = {}) => {
    return eventService.trackEvent('product_view', productId, metadata);
  },

  /**
   * @desc Track an add to cart event
   */
  trackAddToCart: (productId: number | string, metadata: any = {}) => {
    return eventService.trackEvent('add_to_cart', productId, metadata);
  },

  /**
   * @desc Track a remove from cart event
   */
  trackRemoveFromCart: (productId: number | string, metadata: any = {}) => {
    return eventService.trackEvent('remove_from_cart', productId, metadata);
  },

  // ── New event types (event tracking expansion) ───────────────────────────

  /**
   * @desc Track a product search submission
   */
  trackSearch: (searchTerm: string, resultCount: number, metadata: any = {}) => {
    return eventService.trackEvent('search', undefined, {
      search_term: searchTerm,
      result_count: resultCount,
      ...metadata,
    });
  },

  /**
   * @desc Track a wishlist add or remove action
   */
  trackWishlistAction: (
    productId: number | string,
    action: 'add' | 'remove',
    metadata: any = {},
  ) => {
    return eventService.trackEvent('wishlist_action', productId, {
      action,
      ...metadata,
    });
  },

  /**
   * @desc Track a successful login
   */
  trackLogin: (userId: string | number, metadata: any = {}) => {
    return eventService.trackEvent('login', undefined, { user_id: userId, ...metadata });
  },

  /**
   * @desc Track a logout
   */
  trackLogout: (userId: string | number, metadata: any = {}) => {
    return eventService.trackEvent('logout', undefined, { user_id: userId, ...metadata });
  },

  /**
   * @desc Track checkout flow start (customer enters the shipping step)
   */
  trackCheckoutStarted: (metadata: any = {}) => {
    return eventService.trackEvent('checkout_started', undefined, metadata);
  },

  /**
   * @desc Track checkout completion (order confirmed)
   */
  trackCheckoutCompleted: (metadata: any = {}) => {
    return eventService.trackEvent('checkout_completed', undefined, metadata);
  },

  /**
   * @desc Track a successful appointment booking
   */
  trackAppointmentBooking: (metadata: any = {}) => {
    return eventService.trackEvent('appointment_booking', undefined, metadata);
  },

  /**
   * @desc Track a review submission (rating only — no review body text)
   */
  trackReviewSubmission: (
    productId: number | string,
    rating: number,
    metadata: any = {},
  ) => {
    return eventService.trackEvent('review_submission', productId, {
      rating,
      ...metadata,
    });
  },

  /**
   * @desc Track a successfully applied coupon at checkout
   */
  trackCouponApplied: (couponCode: string, metadata: any = {}) => {
    return eventService.trackEvent('coupon_applied', undefined, {
      coupon_code: couponCode,
      ...metadata,
    });
  },

  /**
   * @desc Track delivery method selection at checkout
   */
  trackDeliveryMethodSelected: (
    method: string,
    metadata: any = {},
  ) => {
    return eventService.trackEvent('delivery_method_selected', undefined, {
      method,
      ...metadata,
    });
  },

  /**
   * @desc Track page engagement (scroll depth + time on page).
   * Uses the beacon variant so it survives page-unload / tab-switch.
   */
  trackPageEngagement: (metadata: any = {}) => {
    eventService.trackEventBeacon('page_engagement', metadata);
  },
};
