import axios from 'axios';
import { API_CONFIG } from '../config';
import { getClerkToken } from '../clerk-token';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/products`,
  timeout: API_CONFIG.TIMEOUT,
});

client.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CreateProductData {
  shopName: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  categoryId: string;
  stock?: number;
  image?: string;
  images?: string[];
}

export const vendorAPI = {
  async createProduct(data: CreateProductData): Promise<any> {
    const response = await client.post('/', data);
    return response.data;
  },
};

