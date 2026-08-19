import { useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService.ts';
import { eventService } from '../services/eventService.ts';

export const useCart = () => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cartService.getCart();
      setCart(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: number, quantity: number = 1) => {
    try {
      const result = await cartService.addToCart(productId, quantity);
      setCart(result.cart || []);
      
      // Track event
      eventService.trackAddToCart(productId, { quantity });
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to add item to cart');
      throw err;
    }
  };

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    try {
      const result = await cartService.updateQuantity(cartItemId, quantity);
      setCart(result.cart || []);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to update quantity');
      throw err;
    }
  };

  const removeFromCart = async (cartItemId: number) => {
    try {
      const result = await cartService.removeFromCart(cartItemId);
      setCart(result.cart || []);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to remove item from cart');
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      await cartService.clearCart();
      setCart([]);
    } catch (err: any) {
      setError(err.message || 'Failed to clear cart');
      throw err;
    }
  };

  return { 
    cart, 
    loading, 
    error, 
    addToCart, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    refetch: fetchCart 
  };
};
