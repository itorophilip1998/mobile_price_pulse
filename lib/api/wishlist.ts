import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors } from './auth-interceptor';
import { Product } from './products';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export const wishlistAPI = {
  async getAll(): Promise<WishlistItem[]> {
    const response = await client.get('/wishlist');
    return response.data;
  },

  async getCount(): Promise<number> {
    const response = await client.get('/wishlist/count');
    return response.data;
  },

  async add(productId: string): Promise<WishlistItem> {
    const response = await client.post('/wishlist', { productId });
    return response.data;
  },

  async remove(productId: string): Promise<void> {
    await client.delete(`/wishlist/${productId}`);
  },

  async clear(): Promise<void> {
    await client.delete('/wishlist');
  },

  async check(productId: string): Promise<boolean> {
    const response = await client.get(`/wishlist/check/${productId}`);
    return response.data;
  },
};

