import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../auth/storage';
import { API_CONFIG } from '../config';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupRefreshTokenInterceptor = (client: any) => {
  client.interceptors.response.use(
    (response: any) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return client(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await tokenStorage.getRefreshToken();
          if (!refreshToken) {
            // Only log once, not for every request
            if (failedQueue.length === 0) {
              console.warn('No refresh token available for token refresh');
            }
            await tokenStorage.clearTokens();
            processQueue(new Error('No refresh token available'));
            return Promise.reject(error);
          }

          const response = await axios.post(
            `${API_CONFIG.BASE_URL}${API_CONFIG.AUTH_ENDPOINT}/refresh-token`,
            { refreshToken },
            { timeout: API_CONFIG.TIMEOUT }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await tokenStorage.setTokens(accessToken, newRefreshToken);

          processQueue(null, accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          await tokenStorage.clearTokens();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};

