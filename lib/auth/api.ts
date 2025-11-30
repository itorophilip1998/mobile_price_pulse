import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class MobileAuthAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/auth`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await tokenStorage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await tokenStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            await tokenStorage.setTokens(accessToken, newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            await tokenStorage.clearTokens();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<any> {
    const response = await this.client.post('/signup', data);
    return response.data;
  }

  async signin(email: string, password: string): Promise<any> {
    const response = await this.client.post('/signin', { email, password });
    return response.data;
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await this.client.post('/verify-email', { token });
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await this.client.post('/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await this.client.post('/reset-password', { token, password });
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/me');
    return response.data;
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const response = await this.client.post('/logout', { refreshToken });
    return response.data;
  }
}

export const mobileAuthAPI = new MobileAuthAPI();

