import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { wishlistService, WishlistItem } from '../services/wishlistService';
import { showToast } from '../components/ToastContainer';

export interface Product {
  id: number;
  name: string;
  category: string;
  sub: string;
  price: number;
  priceDisplay: string;
  badge?: string;
  img: string;
  desc: string;
  ingredients?: string[];
  benefits?: string[];
}

export interface CartItem extends Product {
  qty: number;
}

interface State {
  cart: CartItem[];
  wishlist: number[]; // Product IDs wishlisted by logged in user
  wishlistItems: WishlistItem[]; // Joined product details for wishlist page
  cartOpen: boolean;
  wishlistLoading: boolean;
}

type Action =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'UPDATE_QTY'; payload: { id: number; qty: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_WISHLIST_LOCAL'; payload: number }
  | { type: 'SET_WISHLIST'; payload: { productIds: number[]; items: WishlistItem[] } }
  | { type: 'CLEAR_WISHLIST' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'HYDRATE'; payload: Partial<State> };

const loadPersistedState = (): State => {
  try {
    const cart = localStorage.getItem('cs_cart');
    return {
      cart: cart ? JSON.parse(cart) : [],
      wishlist: [],
      wishlistItems: [],
      cartOpen: false,
      wishlistLoading: false,
    };
  } catch {
    return { cart: [], wishlist: [], wishlistItems: [], cartOpen: false, wishlistLoading: false };
  }
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };
    case 'ADD_TO_CART': {
      const existing = state.cart.find(i => i.id === action.payload.id);
      if (existing) {
        return { ...state, cart: state.cart.map(i => i.id === action.payload.id ? { ...i, qty: i.qty + 1 } : i) };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, qty: 1 }] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => i.id !== action.payload) };
    case 'UPDATE_QTY': {
      if (action.payload.qty <= 0) return { ...state, cart: state.cart.filter(i => i.id !== action.payload.id) };
      return { ...state, cart: state.cart.map(i => i.id === action.payload.id ? { ...i, qty: action.payload.qty } : i) };
    }
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'TOGGLE_WISHLIST_LOCAL': {
      const id = action.payload;
      const inList = state.wishlist.includes(id);
      return {
        ...state,
        wishlist: inList ? state.wishlist.filter(item => item !== id) : [...state.wishlist, id],
        wishlistItems: inList ? state.wishlistItems.filter(item => item.productId !== id) : state.wishlistItems,
      };
    }
    case 'SET_WISHLIST':
      return {
        ...state,
        wishlist: action.payload.productIds,
        wishlistItems: action.payload.items,
        wishlistLoading: false,
      };
    case 'CLEAR_WISHLIST':
      return { ...state, wishlist: [], wishlistItems: [], wishlistLoading: false };
    case 'OPEN_CART':
      return { ...state, cartOpen: true };
    case 'CLOSE_CART':
      return { ...state, cartOpen: false };
    default:
      return state;
  }
}

interface CartContextType {
  state: State;
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: number) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  cartTotal: number;
  cartCount: number;
  wishlistCount: number;
}

export const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, loadPersistedState());

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cs_cart', JSON.stringify(state.cart));
    } catch {
      // localStorage full or unavailable
    }
  }, [state.cart]);

  // Fetch wishlist from API when user is logged in
  const refreshWishlist = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'CLEAR_WISHLIST' });
      return;
    }

    try {
      const res = await wishlistService.getWishlist();
      if (res && res.success) {
        dispatch({
          type: 'SET_WISHLIST',
          payload: {
            productIds: res.productIds || res.data.map((i: WishlistItem) => i.productId),
            items: res.data || [],
          },
        });
      }
    } catch (err) {
      console.error('Failed to sync wishlist:', err);
    }
  }, []);

  // Fetch wishlist on mount, storage events (multi-tab), and cs:authchange (same-tab)
  useEffect(() => {
    refreshWishlist();

    // Multi-tab: fires when another tab writes/removes the token
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') {
        refreshWishlist();
      }
    };

    // Same-tab: fires when authStore dispatches after login/logout
    const onAuthChange = (e: Event) => {
      const { loggedIn } = (e as CustomEvent<{ loggedIn: boolean }>).detail;
      if (loggedIn) {
        refreshWishlist();
      } else {
        dispatch({ type: 'CLEAR_WISHLIST' });
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('cs:authchange', onAuthChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cs:authchange', onAuthChange);
    };
  }, [refreshWishlist]);

  // Handle wishlist toggle with API persistence & authentication check
  const toggleWishlist = async (productId: number): Promise<boolean> => {
    if (!productId || productId <= 0) return false;

    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please sign in to save items to your wishlist.', 'person');
      return false;
    }

    const inList = state.wishlist.includes(productId);

    // Optimistic state update
    dispatch({ type: 'TOGGLE_WISHLIST_LOCAL', payload: productId });

    try {
      if (inList) {
        await wishlistService.removeFromWishlist(productId);
        showToast('Removed from wishlist', 'heart_broken');
      } else {
        await wishlistService.addToWishlist(productId);
        showToast('Added to wishlist', 'favorite');
      }
      // Refresh to get full product joining for Wishlist Page
      refreshWishlist();
      return true;
    } catch (err: any) {
      // Revert optimistic update on failure
      dispatch({ type: 'TOGGLE_WISHLIST_LOCAL', payload: productId });
      showToast(err.message || 'Failed to update wishlist', 'error');
      return false;
    }
  };

  const cartTotal = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = state.cart.reduce((sum, i) => sum + i.qty, 0);
  const wishlistCount = state.wishlist.length;

  const value: CartContextType = {
    state,
    addToCart: (product) => dispatch({ type: 'ADD_TO_CART', payload: product }),
    removeFromCart: (id) => dispatch({ type: 'REMOVE_FROM_CART', payload: id }),
    updateQty: (id, qty) => dispatch({ type: 'UPDATE_QTY', payload: { id, qty } }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    toggleWishlist,
    refreshWishlist,
    openCart: () => dispatch({ type: 'OPEN_CART' }),
    closeCart: () => dispatch({ type: 'CLOSE_CART' }),
    cartTotal,
    cartCount,
    wishlistCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
