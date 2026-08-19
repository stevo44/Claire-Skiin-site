import api from './api';

export interface PaymentInitiateRequest {
  order_id: number | string;
  phone?: string;
  medium?: string;
  email?: string;
}

export interface PaymentInitiateResponse {
  message: string;
  paymentId: number;
  providerReference: string;
  status: string;
  redirectUrl?: string;
}

export interface PaymentStatusResponse {
  orderId: number;
  orderStatus: string;
  paymentStatus: string;
  providerReference?: string;
  payment?: {
    id: number;
    provider_reference: string;
    amount: number;
    currency: string;
    status: string;
    method?: string;
    created_at?: string;
  };
}

export const paymentService = {
  /**
   * Initiate a payment via Fapshi gateway
   */
  initiatePayment: async (data: PaymentInitiateRequest): Promise<PaymentInitiateResponse> => {
    const res = await api.post('/payments/initiate', data);
    return res.data;
  },

  /**
   * Check real-time payment status of an order
   */
  getPaymentStatus: async (orderId: number | string): Promise<PaymentStatusResponse> => {
    const res = await api.get(`/payments/${orderId}/status`);
    return res.data;
  },

  /**
   * Refund payment (Admin only)
   */
  refundPayment: async (paymentId: number | string, reason?: string) => {
    const res = await api.post(`/admin/payments/${paymentId}/refund`, { reason });
    return res.data;
  },
};
