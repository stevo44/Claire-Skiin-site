import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { eventService } from '../services/eventService';

interface User {
  id: string | number;
  email: string;
  full_name: string;
  role?: string;
  avatar_url?: string;
  whatsapp_number?: string;
  email_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<any>;
  register: (userData: { email: string; password: string; full_name: string; whatsapp_number?: string }) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync auth state on storage changes (multi-tab support)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') {
        const hasToken = !!e.newValue;
        setIsAuthenticated(hasToken);
        if (!hasToken) setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Sync auth state within the same tab when api.ts detects an expired/invalid
  // session in the background (e.g. a stale token on an otherwise-public page).
  // Without this, isAuthenticated stayed stale until a manual reload — pages
  // that require auth (ProtectedRoute) need this to redirect promptly, while
  // public pages just quietly continue as a guest.
  useEffect(() => {
    const onAuthChange = (e: Event) => {
      const loggedIn = (e as CustomEvent).detail?.loggedIn;
      if (!loggedIn) {
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    window.addEventListener('cs:authchange', onAuthChange);
    return () => window.removeEventListener('cs:authchange', onAuthChange);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
      setIsAuthenticated(true);
      // Track successful login (non-blocking, fire-and-forget)
      if (data.user?.id !== undefined) eventService.trackLogin(data.user.id);
      // Dispatch same-tab auth event so cartStore can sync wishlist immediately
      // (storage events don't fire for same-tab writes)
      window.dispatchEvent(new CustomEvent('cs:authchange', { detail: { loggedIn: true } }));
      return data;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; full_name: string; whatsapp_number?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.register(userData);
      return data;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    // Capture user before clearing state so we can track the logout event
    const currentUser = authService.getUser();
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    // Track logout (non-blocking, fire-and-forget)
    if (currentUser?.id !== undefined) eventService.trackLogout(currentUser.id);
    // Notify same tab that auth state changed (clear wishlist)
    window.dispatchEvent(new CustomEvent('cs:authchange', { detail: { loggedIn: false } }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: authService.getUser(),
      isAuthenticated: authService.isAuthenticated(),
      loading: false,
      error: null,
      login: async (credentials: { email: string; password: string }) => authService.login(credentials),
      register: async (userData: { email: string; password: string; full_name: string; whatsapp_number?: string }) => authService.register(userData),
      logout: () => authService.logout(),
    };
  }
  return ctx;
};
