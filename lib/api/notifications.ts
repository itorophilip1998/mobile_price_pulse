import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors, withAuth } from './auth-interceptor';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationsAPI = {
  async list(authToken?: string | null): Promise<NotificationItem[]> {
    const response = await client.get(
      '/notifications',
      withAuth(undefined, authToken ?? null) as object,
    );
    return response.data;
  },

  async markAsRead(id: string, authToken?: string | null): Promise<void> {
    await client.put(
      `/notifications/${id}/read`,
      {},
      withAuth(undefined, authToken ?? null) as object,
    );
  },

  async markAllAsRead(authToken?: string | null): Promise<void> {
    await client.put(
      '/notifications/read-all',
      {},
      withAuth(undefined, authToken ?? null) as object,
    );
  },
};
