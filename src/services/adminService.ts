// import api from './api.ts';

// const ADMIN_URL = '/admin';

// export const adminService = {
//   // Dashboard
//   getDashboardKPIs: async () => {
//     const response = await api.get(`${ADMIN_URL}/dashboard/kpis`);
//     return response.data;
//   },

//   // Analytics
//   getRevenueTrends: async () => {
//     const response = await api.get(`${ADMIN_URL}/analytics/revenue-trends`);
//     return response.data;
//   },
//   getMostViewedProducts: async () => {
//     const response = await api.get(`${ADMIN_URL}/analytics/most-viewed`);
//     return response.data;
//   },
//   getConversionRate: async () => {
//     const response = await api.get(`${ADMIN_URL}/analytics/conversion-rate`);
//     return response.data;
//   },
//   getCartAbandonmentRate: async () => {
//     const response = await api.get(`${ADMIN_URL}/analytics/abandonment-rate`);
//     return response.data;
//   },

//   // Products
//   getProducts: async (params = {}) => {
//     const response = await api.get(`${ADMIN_URL}/products`, { params });
//     return response.data;
//   },
//   createProduct: async (data: any) => {
//     const response = await api.post(`${ADMIN_URL}/products`, data);
//     return response.data;
//   },
//   updateProduct: async (id: number | string, data: any) => {
//     const response = await api.put(`${ADMIN_URL}/products/${id}`, data);
//     return response.data;
//   },
//   deleteProduct: async (id: number | string) => {
//     const response = await api.delete(`${ADMIN_URL}/products/${id}`);
//     return response.data;
//   },

//   // Orders
//   getOrders: async (params = {}) => {
//     const response = await api.get(`${ADMIN_URL}/orders`, { params });
//     return response.data;
//   },
//   getOrderById: async (id: number | string) => {
//     const response = await api.get(`${ADMIN_URL}/orders/${id}`);
//     return response.data;
//   },
//   updateOrderStatus: async (id: number | string, status: string) => {
//     const response = await api.put(`${ADMIN_URL}/orders/${id}/status`, { status });
//     return response.data;
//   },

//   // Users
//   getUsers: async (params = {}) => {
//     const response = await api.get(`${ADMIN_URL}/users`, { params });
//     return response.data;
//   },
//   updateUserRole: async (id: number | string, role: string) => {
//     const response = await api.put(`${ADMIN_URL}/users/${id}/role`, { role });
//     return response.data;
//   },
// };


/**
 * Admin service — uses the shared api instance (JWT auto-attached).
 * Matches routes in src/backend/routes/admin.routes.ts
 */
import api from './api';

export const adminService = {
  // ── Dashboard / Analytics ─────────────────────────────────────────────
  getDashboardKPIs:      async () => (await api.get('/admin/dashboard/kpis')).data,
  getRevenueTrends:      async () => (await api.get('/admin/analytics/revenue-trends')).data,
  getMostViewedProducts: async () => (await api.get('/admin/analytics/most-viewed')).data,
  getConversionRate:     async () => (await api.get('/admin/analytics/conversion-rate')).data,
  getCartAbandonmentRate:async () => (await api.get('/admin/analytics/abandonment-rate')).data,

  // ── Products ──────────────────────────────────────────────────────────
  getProducts:   async (params = {}) => (await api.get('/admin/products', { params })).data,
  createProduct: async (data: Record<string, any>) => (await api.post('/admin/products', data)).data,
  updateProduct: async (id: string | number, data: Record<string, any>) => (await api.put(`/admin/products/${id}`, data)).data,
  deleteProduct: async (id: string | number) => (await api.delete(`/admin/products/${id}`)).data,

  /**
   * Upload a product image from the admin's local computer.
   * Sends multipart/form-data to POST /api/admin/upload/image
   * Returns { url: string } — the public path to use as image_url.
   */
  uploadProductImage: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post('/admin/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // ── Orders ────────────────────────────────────────────────────────────
  getOrders:         async (params = {}) => (await api.get('/admin/orders', { params })).data,
  updateOrderStatus: async (id: string | number, status: string) =>
    (await api.put(`/admin/orders/${id}/status`, { status })).data,

  // ── Users ─────────────────────────────────────────────────────────────
  getUsers: async (params = {}) => (await api.get('/admin/users', { params })).data,
  updateUserRole: async (id: string | number, role: string) => (await api.put(`/admin/users/${id}/role`, { role })).data,

  // ── Coupons ───────────────────────────────────────────────────────────
  getCoupons:      async () => (await api.get('/admin/coupons')).data,
  createCoupon:   async (data: Record<string, any>) => (await api.post('/admin/coupons', data)).data,
  updateCoupon:   async (id: string | number, data: Record<string, any>) => (await api.put(`/admin/coupons/${id}`, data)).data,
  deactivateCoupon: async (id: string | number) => (await api.delete(`/admin/coupons/${id}`)).data,

  // ── Reviews ───────────────────────────────────────────────────────────────
  getReviews:           async (params: Record<string, any> = {}) => (await api.get('/admin/reviews', { params })).data,
  updateReviewStatus:   async (id: string | number, status: string) => (await api.put(`/admin/reviews/${id}/status`, { status })).data,
  getReviewReports:     async (params: Record<string, any> = {}) => (await api.get('/admin/reviews/reports', { params })).data,
  updateReportStatus:   async (id: string | number, status: string) => (await api.put(`/admin/reviews/reports/${id}/status`, { status })).data,
};
