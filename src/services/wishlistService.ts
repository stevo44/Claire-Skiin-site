import api from './api.ts';

export interface WishlistItem {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    priceDisplay: string;
    category: string;
    stockQuantity: number;
    imageUrl: string;
    img: string;
    metadata: any;
  };
}

export const wishlistService = {
  getWishlist: async () => {
    const response = await api.get('/wishlist');
    return response.data; // { success: true, data: WishlistItem[], productIds: number[] }
  },

  addToWishlist: async (productId: number) => {
    const response = await api.post('/wishlist', { product_id: productId });
    return response.data;
  },

  removeFromWishlist: async (productId: number) => {
    const response = await api.delete(`/wishlist/${productId}`);
    return response.data;
  },
};
