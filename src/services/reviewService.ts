import api from './api';

export const reviewService = {
  /**
   * GET /api/products/:productId/reviews
   * Public. Includes aggregate rating + the viewer's own review if logged in.
   */
  getProductReviews: async (productId: number | string, page = 1, limit = 10) => {
    const res = await api.get(`/products/${productId}/reviews`, {
      params: { page, limit },
    });
    return res.data.data as {
      reviews: ReviewItem[];
      aggregate: { average_rating: number; review_count: number };
      userReview: ReviewItem | null;
      pagination: { page: number; limit: number; offset: number };
    };
  },

  submitReview: async (
    productId: number | string,
    data: { rating: number; title?: string; body: string },
  ) => {
    const res = await api.post(`/products/${productId}/reviews`, data);
    return res.data;
  },

  updateReview: async (
    productId: number | string,
    reviewId: number | string,
    data: { rating?: number; title?: string; body?: string },
  ) => {
    const res = await api.put(`/products/${productId}/reviews/${reviewId}`, data);
    return res.data;
  },

  reportReview: async (reviewId: number | string, reason: string) => {
    const res = await api.post(`/reviews/${reviewId}/report`, { reason });
    return res.data;
  },
};

export interface ReviewItem {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  reviewer_email: string;
  created_at: string;
  updated_at: string;
}
