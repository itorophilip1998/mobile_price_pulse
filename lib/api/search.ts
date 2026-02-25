import axios from 'axios';
import { API_CONFIG } from '../config';
import { getClerkToken } from '../clerk-token';
import type { Product } from './products';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/search`,
  timeout: API_CONFIG.TIMEOUT,
});

client.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    const response = await client.get<GlobalSearchResponse>('', { params });
    return response.data;
  },

  async searchByImage(formData: FormData): Promise<GlobalSearchResponse> {
    const response = await client.post<GlobalSearchResponse>('by-image', formData);
    return response.data;
  },
};
