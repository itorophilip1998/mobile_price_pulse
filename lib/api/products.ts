import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors } from './auth-interceptor';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

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
  sellerId?: string | null;
  shopId?: string | null;
  isVerified?: boolean;
  /** Brand new / foreign used / local used (optional, e.g. vehicles) */
  condition?: 'BRAND_NEW' | 'FOREIGN_USED' | 'LOCAL_USED' | null;
  /** Set once at listing creation; cannot be changed later */
  deliveryFulfillment?: 'COMPANY_APP' | 'PRODUCT_OWNER';
  /** Required on new listings; may be absent for legacy data */
  deliveryMode?: 'SELLER_ARRANGES' | 'BUYER_PICKUP' | 'FLEXIBLE' | 'THIRD_PARTY';
  deliveryNotes?: string | null;
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
  isPinned?: boolean;
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
    condition?: 'BRAND_NEW' | 'FOREIGN_USED' | 'LOCAL_USED';
  }): Promise<ProductsResponse> {
    const response = await client.get('/products', { params });
    return response.data;
  },

  async getCategories(): Promise<Category[]> {
    const response = await client.get('/products/categories');
    return response.data;
  },

  async getProduct(slug: string): Promise<Product> {
    const response = await client.get(`/products/${slug}`);
    return response.data;
  },
};
