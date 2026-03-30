import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors } from './auth-interceptor';
import type { Product } from './products';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

export interface SuggestedProduct {
  id: string;
  name: string;
  price: number;
  currency?: string;
  image?: string;
  url: string;
  sourceId: string;
  sourceName: string;
}

export interface GlobalSearchResponse {
  internal: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  suggested: {
    products: SuggestedProduct[];
    sources: string[];
  };
}

export const searchAPI = {
  async getGlobalSearch(params?: {
    q?: string;
    category?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<GlobalSearchResponse> {
    const response = await client.get<GlobalSearchResponse>('/search', { params });
    return response.data;
  },

  async searchByImage(formData: FormData): Promise<GlobalSearchResponse> {
    const response = await client.post<GlobalSearchResponse>('/search/by-image', formData);
    return response.data;
  },
};
