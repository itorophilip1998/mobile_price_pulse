import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './storage';
import { API_CONFIG } from '../config';
import { checkApiHealth, testEndpoint } from '../api/health-check';

const API_URL = API_CONFIG.BASE_URL;

class MobileAuthAPI {
  private client: AxiosInstance;
  private isApiHealthy: boolean = false;
  private healthCheckPromise: Promise<boolean> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/auth`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: API_CONFIG.TIMEOUT,
    });

    // Perform initial health check
    this.initializeHealthCheck();

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

            const response = await axios.post(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH_ENDPOINT}/refresh-token`, {
              refreshToken,
            }, {
              timeout: API_CONFIG.TIMEOUT,
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

  /**
   * Initialize and perform health check on API
   */
  private async initializeHealthCheck(): Promise<void> {
    try {
      const healthResult = await checkApiHealth();
      this.isApiHealthy = healthResult.isHealthy;
      
      if (!this.isApiHealthy) {
        console.warn('API health check failed:', healthResult.error);
      } else {
        console.log(`API is healthy (${healthResult.responseTime}ms)`);
      }
    } catch (error) {
      console.error('Health check error:', error);
      this.isApiHealthy = false;
    }
  }

  /**
   * Ensure API is healthy before making requests
   */
  private async ensureApiHealthy(): Promise<boolean> {
    if (this.isApiHealthy) {
      return true;
    }

    // If health check is already in progress, wait for it
    if (this.healthCheckPromise) {
      return this.healthCheckPromise;
    }

    // Start new health check
    this.healthCheckPromise = (async () => {
      try {
        const healthResult = await checkApiHealth();
        this.isApiHealthy = healthResult.isHealthy;
        return this.isApiHealthy;
      } catch (error) {
        console.error('Health check failed:', error);
        this.isApiHealthy = false;
        return false;
      } finally {
        this.healthCheckPromise = null;
      }
    })();

    return this.healthCheckPromise;
  }

  /**
   * Test endpoint before making actual request
   */
  private async testEndpointBeforeRequest(endpoint: string): Promise<void> {
    const testResult = await testEndpoint(`${API_CONFIG.AUTH_ENDPOINT}${endpoint}`, 'POST');
    
    if (!testResult.isHealthy && testResult.error) {
      throw new Error(`API endpoint test failed: ${testResult.error}`);
    }
  }

  async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ message: string; user: any }> {
    // Ensure API is healthy before making request
    const isHealthy = await this.ensureApiHealthy();
    if (!isHealthy) {
      throw new Error('API server is not reachable. Please check your connection and try again.');
    }

    try {
      // Test endpoint before actual request (optional, can be removed if too slow)
      // await this.testEndpointBeforeRequest('/signup');

      const response = await this.client.post('/signup', {
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });
      return response.data;
    } catch (error: any) {
      // Update health status on error
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.isApiHealthy = false;
      }

      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message ||
                          'Failed to create account';
      throw new Error(errorMessage);
    }
  }

  async signin(email: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    // Ensure API is healthy before making request
    const isHealthy = await this.ensureApiHealthy();
    if (!isHealthy) {
      throw new Error('API server is not reachable. Please check your connection and try again.');
    }

    try {
      const response = await this.client.post('/signin', { 
        email: email.trim(), 
        password 
      });
      return response.data;
    } catch (error: any) {
      // Update health status on error
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.isApiHealthy = false;
      }

      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message ||
                          'Invalid email or password';
      throw new Error(errorMessage);
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const isHealthy = await this.ensureApiHealthy();
    if (!isHealthy) {
      throw new Error('API server is not reachable. Please check your connection and try again.');
    }

    try {
      const response = await this.client.post('/verify-email', { 
        token: token.trim() 
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.isApiHealthy = false;
      }
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message ||
                          'Failed to verify email';
      throw new Error(errorMessage);
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const isHealthy = await this.ensureApiHealthy();
    if (!isHealthy) {
      throw new Error('API server is not reachable. Please check your connection and try again.');
    }

    try {
      const response = await this.client.post('/forgot-password', { 
        email: email.trim() 
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.isApiHealthy = false;
      }
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message ||
                          'Failed to send reset email';
      throw new Error(errorMessage);
    }
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const isHealthy = await this.ensureApiHealthy();
    if (!isHealthy) {
      throw new Error('API server is not reachable. Please check your connection and try again.');
    }

    try {
      const response = await this.client.post('/reset-password', { 
        token: token.trim(), 
        password 
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.isApiHealthy = false;
      }
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message ||
                          'Failed to reset password';
      throw new Error(errorMessage);
    }
  }

  async getCurrentUser(): Promise<any> {
    const isHealthy = await this.ensureApiHealthy();
    if (!isHealthy) {
      throw new Error('API server is not reachable. Please check your connection and try again.');
    }

    try {
      const response = await this.client.get('/me');
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.isApiHealthy = false;
      }
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message ||
                          'Failed to get user information';
      throw new Error(errorMessage);
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const response = await this.client.post('/logout', { refreshToken });
    return response.data;
  }
}

export const mobileAuthAPI = new MobileAuthAPI();

