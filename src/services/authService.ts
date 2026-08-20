import api from './api.ts';
import { mockLogin, mockRegister, isMockMode } from './mockAuth.ts';

export const authService = {
  /**
   * @desc Register a new user
   * Swap: remove isMockMode() branch when backend is ready
   */
  register: async (userData: { email: string; password: string; full_name: string; avatar_url?: string; whatsapp_number?: string }) => {
    if (isMockMode()) return mockRegister(userData);
    const response = await api.post('/auth/register', userData);
    return response.data.data || response.data;
  },

  /**
   * @desc Login a user
   * Swap: remove isMockMode() branch when backend is ready
   */
  login: async (credentials: { email: string; password: string }) => {
    if (isMockMode()) return mockLogin(credentials);
    const response = await api.post('/auth/login', credentials);
    const data = response.data?.data || response.data;
    const { token, user } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return data;
  },

  /**
   * @desc Logout a user
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Failed to notify backend on logout:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  /**
   * @desc Refresh auth token manually if needed
   */
  refreshToken: async () => {
    const response = await api.post('/auth/refresh', {}, { withCredentials: true });
    const data = response.data?.data || response.data;
    const token = data?.token;
    if (token) {
      localStorage.setItem('token', token);
    }
    return token;
  },

  /**
   * @desc Get current user profile
   */
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  /**
   * @desc Update current user profile (whatsapp_number, momo_number, etc.)
   */
  updateProfile: async (data: { full_name?: string; whatsapp_number?: string; momo_number?: string }) => {
    const response = await api.put('/auth/profile', data);
    const updatedUser = response.data.data || response.data;
    if (updatedUser) {
      const stored = authService.getUser() || {};
      localStorage.setItem('user', JSON.stringify({ ...stored, ...updatedUser }));
    }
    return response.data;
  },

  /**
   * @desc Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /**
   * @desc Get stored user info
   */
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * @desc Request a password reset link (forgot password flow)
   */
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * @desc Reset password using a token from the email link
   */
  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};
