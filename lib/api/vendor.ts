import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors } from './auth-interceptor';
import type { Product } from './products';

/**
 * Single client with baseURL = API root only.
 * Paths must be full (`/shops`, `/products/...`). Do not use baseURL ending in `/shops`
 * with `url: '/'` — axios merges `/` as absolute path and drops `/shops`, causing 404.
 */
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(api);

export interface CreateProductData {
  shopName?: string;
  shopId?: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  categoryId: string;
  stock?: number;
  image?: string;
  images?: string[];
  condition?: 'BRAND_NEW' | 'FOREIGN_USED' | 'LOCAL_USED';
  deliveryFulfillment: 'COMPANY_APP' | 'PRODUCT_OWNER';
  deliveryMode: 'SELLER_ARRANGES' | 'BUYER_PICKUP' | 'FLEXIBLE' | 'THIRD_PARTY';
  deliveryNotes?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  categoryId?: string;
  stock?: number;
  image?: string;
  images?: string[];
  shopId?: string | null;
  shopName?: string;
  condition?: 'BRAND_NEW' | 'FOREIGN_USED' | 'LOCAL_USED' | null;
  deliveryNotes?: string;
}

export interface ShopSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  website?: string | null;
  address?: string | null;
  companyPhone?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  isVerified: boolean;
  verificationStatus: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopDetail extends Omit<ShopSummary, 'productCount'> {
  ownerId: string;
  productCount: number;
  products: Product[];
}

export interface CreateShopData {
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  address?: string;
  companyPhone?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
}

export interface UpdateShopData {
  name?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  address?: string;
  companyPhone?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  isActive?: boolean;
}

export interface ProductAiScanResult {
  name: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  estimatedPrice: number | null;
}

export type VerificationType = 'SHOP' | 'PRODUCT';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VerificationRequestRow {
  id: string;
  type: VerificationType;
  status: VerificationStatus;
  businessRegistrationUrl?: string | null;
  governmentIdUrl?: string | null;
  proofOfAddressUrl?: string | null;
  additionalDocumentUrls?: string[];
  documents: string[];
  note?: string | null;
  adminNote?: string | null;
  shop?: { id: string; name: string; slug: string } | null;
  product?: { id: string; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopAnalytics {
  shopId: string;
  days: number;
  summary: {
    totalRevenue: number;
    orderCount: number;
    unitsSold: number;
    lineItemCount: number;
  };
  series: { day: string; revenue: number; orderCount: number }[];
}

function absoluteUploadUrl(path: string): string {
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  return path.startsWith('http') ? path : `${base}${path}`;
}

export const vendorAPI = {
  async createProduct(data: CreateProductData): Promise<Product> {
    const response = await api.post('/products', data);
    return response.data;
  },

  async getMyProducts(shopId?: string): Promise<Product[]> {
    const response = await api.get('/products/mine', {
      params: shopId ? { shopId } : undefined,
    });
    return response.data;
  },

  async getProductForEdit(id: string): Promise<Product> {
    const response = await api.get(`/products/manage/${id}`);
    return response.data;
  },

  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  async setProductStock(id: string, stock: number): Promise<Product> {
    const response = await api.patch(`/products/${id}/stock`, { stock });
    return response.data;
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  async aiScanProductImage(imageUri: string): Promise<ProductAiScanResult> {
    const form = new FormData();
    const name = imageUri.split('/').pop() || 'photo.jpg';
    const ext = name.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    form.append('image', {
      uri: imageUri,
      name: name.includes('.') ? name : `${name}.jpg`,
      type: mime,
    } as unknown as Blob);

    const response = await api.post('/products/ai-scan', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getMyShops(): Promise<ShopSummary[]> {
    const response = await api.get('/shops/mine');
    return response.data;
  },

  async createShop(data: CreateShopData): Promise<ShopDetail> {
    const response = await api.post('/shops', data);
    return response.data;
  },

  async getShop(id: string): Promise<ShopDetail> {
    const response = await api.get(`/shops/${id}`);
    return response.data;
  },

  async updateShop(id: string, data: UpdateShopData): Promise<ShopDetail> {
    const response = await api.put(`/shops/${id}`, data);
    return response.data;
  },

  async deleteShop(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/shops/${id}`);
    return response.data;
  },

  async uploadVerificationDocument(fileUri: string): Promise<string> {
    const form = new FormData();
    const name = fileUri.split('/').pop() || 'document.pdf';
    const ext = name.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/jpeg';
    form.append('file', {
      uri: fileUri,
      name: name.includes('.') ? name : `${name}.jpg`,
      type: mime,
    } as unknown as Blob);

    const response = await api.post<{ path: string }>('/verification/upload-document', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return absoluteUploadUrl(response.data.path);
  },

  async submitShopVerification(data: {
    shopId: string;
    businessRegistrationUrl: string;
    governmentIdUrl: string;
    proofOfAddressUrl: string;
    additionalDocumentUrls?: string[];
    note?: string;
  }): Promise<VerificationRequestRow> {
    const response = await api.post('/verification/request', data);
    return response.data;
  },

  async getShopAnalytics(shopId: string, days = 30): Promise<ShopAnalytics> {
    const response = await api.get(`/shops/${shopId}/analytics`, {
      params: { days },
    });
    return response.data;
  },

  async getMyVerifications(): Promise<VerificationRequestRow[]> {
    const response = await api.get('/verification/mine');
    return response.data;
  },

  async getVerification(id: string): Promise<VerificationRequestRow> {
    const response = await api.get(`/verification/${id}`);
    return response.data;
  },
};
