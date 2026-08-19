import api from './api';

export interface CreateOrderParams {
  shippingAddress: object | string;
  paymentMethod: string;
  items?: Array<{ product_id: number; quantity: number }>;
  couponCode?: string;
  deliveryMethod?: 'local_delivery' | 'agency_shipping' | 'pickup';
  agencyId?: number | null;
}

export const orderService = {
  createOrder: async (
    shippingAddress: object | string,
    paymentMethod: string,
    items?: Array<{ product_id: number; quantity: number }>,
    couponCode?: string,
    deliveryMethod?: 'local_delivery' | 'agency_shipping' | 'pickup',
    agencyId?: number | null
  ) => {
    const res = await api.post('/orders', {
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      items,
      coupon_code: couponCode,
      delivery_method: deliveryMethod,
      agency_id: agencyId,
    });
    return res.data;
  },
  getOrders: async () => (await api.get('/orders')).data,
  getOrderById: async (id: string | number) => (await api.get(`/orders/${id}`)).data,
};
