import axios from 'axios';
import { API_CONFIG } from '../config';
import { tokenStorage } from '../auth/storage';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/products`,
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

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  rating: number;
  reviews: number;
  discount?: number;
  vendor: string;
  stock: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const productsAPI = {
  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ProductsResponse> {
    const response = await client.get('', { params });
    return response.data;
  },

  async getCategories(): Promise<Category[]> {
    const response = await client.get('/categories');
    return response.data;
  },

  async getProduct(slug: string): Promise<Product> {
    const response = await client.get(`/${slug}`);
    return response.data;
  },
};

