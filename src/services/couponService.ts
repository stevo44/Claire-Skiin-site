import api from './api';

export interface ValidateCouponRequest {
  code: string;
  items?: Array<{ id?: number; product_id?: number; qty?: number; quantity?: number }>;
}

export interface ValidateCouponResponse {
  success: boolean;
  message: string;
  data: {
    couponId: number;
    code: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    discountAmount: number;
    finalTotal: number;
  };
}

export const couponService = {
  validateCoupon: async (code: string, items?: any[]): Promise<ValidateCouponResponse> => {
    const res = await api.post('/coupons/validate', { code, items });
    return res.data;
  },
};
