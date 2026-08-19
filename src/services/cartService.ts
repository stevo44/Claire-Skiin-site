import api from './api';

export const cartService = {
  getCart:         async () => (await api.get('/cart')).data,
  addToCart:       async (productId: number | string, quantity = 1) =>
    (await api.post('/cart/add', { product_id: productId, quantity })).data,
  updateQuantity:  async (cartItemId: number | string, quantity: number) =>
    (await api.put(`/cart/${cartItemId}`, { quantity })).data,
  removeFromCart:  async (cartItemId: number | string) =>
    (await api.delete(`/cart/${cartItemId}`)).data,
  clearCart:       async () => (await api.delete('/cart')).data,
};
