/**
 * ProductStore
 * ─────────────
 * Single source of truth for all products across the app.
 *
 * • Fetches from the real API on mount
 * • Falls back to the static PRODUCTS array if API is unavailable
 * • Listens to Socket.io events (product:created / updated / deleted)
 *   so admin changes propagate to the frontend in real-time without a reload
 * • Exposes helpers used by ShopPage, ProductDetailPage, HomePage, etc.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { PRODUCTS as STATIC_PRODUCTS } from '../data/products';
import { productService } from '../services/productService';

export interface LiveProduct {
  id: number | string;
  name: string;
  description?: string;
  price: number;
  priceDisplay: string;
  category: string;
  sub?: string;
  badge?: string;
  img?: string;
  image_url?: string;
  stock_quantity?: number;
  ingredients?: string[];
  benefits?: string[];
  metadata?: any;
}

// Normalise backend row → LiveProduct shape
function normalise(raw: any): LiveProduct {
  const price = parseFloat(raw.price) || 0;
  return {
    id:             raw.id,
    name:           raw.name,
    description:    raw.description || '',
    price,
    priceDisplay:   raw.priceDisplay || `${price.toLocaleString('fr-CM')} XAF`,
    category:       raw.category || 'Skincare',
    sub:            raw.sub || raw.description?.slice(0, 40) || '',
    badge:          raw.badge || raw.metadata?.badge,
    img:            raw.img || raw.image_url || '',
    image_url:      raw.image_url || raw.img || '',
    stock_quantity: raw.stock_quantity ?? 50,
    ingredients:    raw.ingredients || raw.metadata?.ingredients || [],
    benefits:       raw.benefits || raw.metadata?.benefits || [],
    metadata:       raw.metadata || {},
  };
}

interface ProductContextType {
  products: LiveProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getById: (id: number | string) => LiveProduct | undefined;
  lowStockProducts: LiveProduct[];
  isConnected: boolean;
}

const ProductContext = createContext<ProductContextType | null>(null);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<LiveProduct[]>(STATIC_PRODUCTS.map(normalise));
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [isConnected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getProducts({ limit: 100 });
      const rows = data.products ?? data;
      if (Array.isArray(rows) && rows.length > 0) {
        setProducts(rows.map(normalise));
      }
    } catch {
      // API unavailable — keep static fallback, don't show error to shoppers
      setError('Using cached product data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Socket.io — real-time product sync
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Admin created a product → add to store
    socket.on('product:created', (product: any) => {
      setProducts(prev => {
        const exists = prev.some(p => String(p.id) === String(product.id));
        if (exists) return prev;
        return [normalise(product), ...prev];
      });
    });

    // Admin updated a product → replace in store
    socket.on('product:updated', (product: any) => {
      setProducts(prev =>
        prev.map(p => String(p.id) === String(product.id) ? normalise(product) : p)
      );
    });

    // Admin deleted a product → remove from store
    socket.on('product:deleted', ({ id }: { id: string | number }) => {
      setProducts(prev => prev.filter(p => String(p.id) !== String(id)));
    });

    return () => { socket.disconnect(); };
  }, []);

  const getById = useCallback((id: number | string) =>
    products.find(p => String(p.id) === String(id)),
  [products]);

  const lowStockProducts = products.filter(p => (p.stock_quantity ?? 50) < 10);

  return (
    <ProductContext.Provider value={{ products, loading, error, refetch: fetchProducts, getById, lowStockProducts, isConnected }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used inside ProductProvider');
  return ctx;
};
