import axios from 'axios';
import { API_CONFIG } from '../config';
import { getClerkToken } from '../clerk-token';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/auth`,
  timeout: API_CONFIG.TIMEOUT,
});

client.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  profile?: Profile;
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
  async getCurrentUser(): Promise<User> {
    const response = await client.get('/me');
    return response.data;
  },
  async updateProfile(data: UpdateProfileData): Promise<{ message: string; profile: Profile }> {
    const response = await client.post('/profile', data);
    return response.data;
  },
};

