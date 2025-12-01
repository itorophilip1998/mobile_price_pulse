import axios from 'axios';
import { API_CONFIG } from '../config';
import { tokenStorage } from '../auth/storage';
import { Product } from './products';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/wishlist`,
  timeout: API_CONFIG.TIMEOUT,
});

// Add auth token to requests
client.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export const wishlistAPI = {
  async getAll(): Promise<WishlistItem[]> {
    const response = await client.get('/');
    return response.data;
  },

  async getCount(): Promise<number> {
    const response = await client.get('/count');
    return response.data;
  },

  async add(productId: string): Promise<WishlistItem> {
    const response = await client.post('/', { productId });
    return response.data;
  },

  async remove(productId: string): Promise<void> {
    await client.delete(`/${productId}`);
  },

  async clear(): Promise<void> {
    await client.delete('/');
  },

  async check(productId: string): Promise<boolean> {
    const response = await client.get(`/check/${productId}`);
    return response.data;
  },
};

