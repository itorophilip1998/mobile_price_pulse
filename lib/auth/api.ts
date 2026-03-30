import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors } from '../api/auth-interceptor';
import { checkApiHealth } from '../api/health-check';

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

    this.initializeHealthCheck();
    attachAuthInterceptors(this.client);
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

