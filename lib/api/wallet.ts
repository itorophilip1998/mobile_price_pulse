import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors, withAuth } from './auth-interceptor';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

export const walletAPI = {
  async getBalance(authToken?: string | null): Promise<{ balance: number; currency: string }> {
    const response = await client.get(
      '/wallet',
      withAuth(undefined, authToken ?? null) as object,
    );
    return response.data;
  },

  async addFunds(amount: number, authToken?: string | null): Promise<{ balance: number; currency: string }> {
    const response = await client.post(
      '/wallet/fund',
      { amount },
      withAuth(undefined, authToken ?? null) as object,
    );
    return response.data;
  },
};
