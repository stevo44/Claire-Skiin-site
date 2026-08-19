// import api from './api.ts';

// export const productService = {
//   /**
//    * @desc Fetch all products with pagination, search, and filtering
//    */
//   getProducts: async (params = {}) => {
//     const response = await api.get('/products', { params });
//     return response.data;
//   },

//   /**
//    * @desc Get single product by ID
//    */
//   getProductById: async (id: string | number) => {
//     const response = await api.get(`/products/${id}`);
//     return response.data;
//   },

//   /**
//    * @desc Get all unique categories
//    */
//   getCategories: async () => {
//     const response = await api.get('/products/categories');
//     return response.data;
//   },
// };

import api from './api';

export const productService = {
  getProducts:    async (params = {}) => (await api.get('/products', { params })).data,
  getProductById: async (id: string | number) => (await api.get(`/products/${id}`)).data,
  getCategories:  async () => (await api.get('/products/categories')).data,
};
