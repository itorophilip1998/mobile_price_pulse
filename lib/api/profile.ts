import axios from 'axios';
import { API_CONFIG } from '../config';
import { tokenStorage } from '../auth/storage';
import { setupRefreshTokenInterceptor } from './interceptors';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/auth`,
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

// Setup refresh token interceptor
setupRefreshTokenInterceptor(client);

export interface Profile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  address1?: string;
  address2?: string;
  state?: string;
  localGovernment?: string;
  country?: string;
  deliveryLocation?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  address1?: string;
  address2?: string;
  state?: string;
  localGovernment?: string;
  country?: string;
  deliveryLocation?: string;
}

export const profileAPI = {
  async updateProfile(data: UpdateProfileData): Promise<{ message: string; profile: Profile }> {
    const response = await client.post('/profile', data);
    return response.data;
  },
};

