import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors, withAuth } from './auth-interceptor';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
export type PaymentStatus = 'PENDING' | 'PAID';
export type PaymentMethod =
  | 'WALLET'
  | 'CRYPTO'
  | 'CARD'
  | 'BANK'
  | 'CASH_ON_DELIVERY'
  | 'OTHER';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtOrder: number;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    vendor: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  trackingNumber: string | null;
  carrier: string | null;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export const ordersAPI = {
  async list(authToken?: string | null): Promise<Order[]> {
    const response = await client.get(
      '/orders',
      withAuth(undefined, authToken ?? null) as object,
    );
    return response.data;
  },

  async getById(orderId: string, authToken?: string | null): Promise<Order> {
    const response = await client.get(
      `/orders/${orderId}`,
      withAuth(undefined, authToken ?? null) as object,
    );
    return response.data;
  },

  async createFromCart(
    paymentMethod: PaymentMethod,
    authToken?: string | null,
  ): Promise<Order> {
    const response = await client.post(
      '/orders',
      { paymentMethod },
      withAuth(undefined, authToken ?? null) as object,
    );
    return response.data;
  },
};
