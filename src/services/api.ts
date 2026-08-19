import axios from 'axios';

/**
 * Shared Axios instance.
 * Dev:  set VITE_API_URL=http://localhost:3000/api in .env.local
 * Prod: falls back to /api (same-origin, served by Express)
 */
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshPromise: Promise<string> | null = null;

// Normalise errors; auto-redirect on 401 with Token Refresh logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Direct 401 check, and don't retry if it already has been retried or is an auth endpoint
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';
      const isAuthRequest = url.includes('/auth/login') || 
                            url.includes('/auth/register') || 
                            url.includes('/auth/refresh') ||
                            url.includes('/auth/logout');

      if (!isAuthRequest) {
        originalRequest._retry = true;

        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh', {}, { withCredentials: true })
            .then((res) => {
              const resData = res.data?.data || res.data;
              const token = resData?.token;
              if (!token) throw new Error('No token returned from refresh');
              localStorage.setItem('token', token);
              return token;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        try {
          const newToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Session is genuinely gone (refresh failed) — clear it and let the
          // rest of the app react. We deliberately do NOT force-navigate here:
          // this interceptor fires for background calls made from public pages
          // too (e.g. the wishlist sync every page runs on mount), and a stale
          // token there shouldn't yank a guest off a page that never required
          // login in the first place. Pages that DO require auth already watch
          // isAuthenticated via ProtectedRoute and redirect themselves.
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('cs:authchange', { detail: { loggedIn: false } }));
          return Promise.reject(refreshError);
        }
      }
    }

    // Normalise error response message
    if (error.response?.status === 401) {
      // If we fall through here (e.g. login/register 401 or failed retry), clear state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('cs:authchange', { detail: { loggedIn: false } }));
    }

    const message =
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : 'An unexpected error occurred.');
    return Promise.reject({ ...error, message });
  },
);

export default api;
