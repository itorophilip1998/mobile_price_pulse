import axios from 'axios';
import { API_CONFIG } from '../config';
import { tokenStorage } from '../auth/storage';
import { setupRefreshTokenInterceptor } from './interceptors';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/cart`,
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

// Setup refresh token interceptor
setupRefreshTokenInterceptor(client);

export interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    originalPrice?: number;
    image?: string;
    discount?: number;
    vendor: string;
  };
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  count: number;
}

export const cartAPI = {
  async getCart(): Promise<Cart> {
    const response = await client.get('');
    return response.data;
  },

  async addToCart(productId: string, quantity: number = 1): Promise<CartItem> {
    const response = await client.post('/add', { productId, quantity });
    return response.data;
  },

  async updateCartItem(itemId: string, quantity: number): Promise<CartItem | null> {
    const response = await client.put(`/${itemId}`, { quantity });
    return response.data;
  },

  async removeFromCart(itemId: string): Promise<void> {
    await client.delete(`/${itemId}`);
  },

  async clearCart(): Promise<void> {
    await client.delete('');
  },
};

