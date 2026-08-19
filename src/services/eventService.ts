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
   * @param eventType - The type of event (e.g., 'product_view', 'add_to_cart', 'checkout')
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
   * @desc Track a checkout event
   */
  trackCheckout: (metadata: any = {}) => {
    return eventService.trackEvent('checkout', undefined, metadata);
  },

  /**
   * @desc Track a remove from cart event
   */
  trackRemoveFromCart: (productId: number | string, metadata: any = {}) => {
    return eventService.trackEvent('remove_from_cart', productId, metadata);
  },
};
