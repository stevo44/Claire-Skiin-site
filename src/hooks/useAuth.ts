import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService.ts';
import { eventService } from '../services/eventService';

export const useAuth = () => {
  const [user, setUser] = useState(authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
      setIsAuthenticated(true);
      // Track successful login (non-blocking, fire-and-forget)
      if (data.user?.id !== undefined) eventService.trackLogin(data.user.id);
      return data;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; full_name: string; avatar_url?: string }) => {
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
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getProfile();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  return { 
    user, 
    isAuthenticated, 
    loading, 
    error, 
    login, 
    register, 
    logout, 
    fetchProfile 
  };
};
