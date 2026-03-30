import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors, withAuth } from './auth-interceptor';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

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
  async getCart(authToken?: string | null): Promise<Cart> {
    const response = await client.get('/cart', withAuth(undefined, authToken ?? null) as object);
    return response.data;
  },

  async addToCart(productId: string, quantity: number = 1, authToken?: string | null): Promise<CartItem> {
    const response = await client.post('/cart/add', { productId, quantity }, withAuth(undefined, authToken ?? null) as object);
    return response.data;
  },

  async updateCartItem(itemId: string, quantity: number, authToken?: string | null): Promise<CartItem | null> {
    const response = await client.put(`/cart/${itemId}`, { quantity }, withAuth(undefined, authToken ?? null) as object);
    return response.data;
  },

  async removeFromCart(itemId: string, authToken?: string | null): Promise<void> {
    await client.delete(`/cart/${itemId}`, withAuth(undefined, authToken ?? null) as object);
  },

  async clearCart(authToken?: string | null): Promise<void> {
    await client.delete('/cart', withAuth(undefined, authToken ?? null) as object);
  },
};

