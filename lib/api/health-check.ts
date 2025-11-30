import axios, { AxiosError } from 'axios';
import { API_CONFIG } from '../config';

export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  details?: {
    status: number;
    message?: string;
  };
}

/**
 * Test if the API endpoint is reachable and healthy
 */
export const checkApiHealth = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.HEALTH_CHECK_ENDPOINT}`, {
      timeout: API_CONFIG.TIMEOUT,
      validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx as "reachable"
    });

    const responseTime = Date.now() - startTime;

    return {
      isHealthy: response.status >= 200 && response.status < 400,
      responseTime,
      details: {
        status: response.status,
        message: response.data?.message || 'OK',
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED') {
      return {
        isHealthy: false,
        responseTime,
        error: 'Request timeout - API server may be unreachable',
      };
    }

    if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
      return {
        isHealthy: false,
        responseTime,
        error: `Cannot connect to API at ${API_CONFIG.BASE_URL}`,
      };
    }

    if (axiosError.response) {
      // Server responded with error status
      return {
        isHealthy: false,
        responseTime,
        error: `API returned error: ${axiosError.response.status}`,
        details: {
          status: axiosError.response.status,
          message: axiosError.response.data?.message || axiosError.message,
        },
      };
    }

    return {
      isHealthy: false,
      responseTime,
      error: axiosError.message || 'Unknown error occurred',
    };
  }
};

/**
 * Test a specific endpoint before making actual requests
 */
export const testEndpoint = async (endpoint: string, method: 'GET' | 'POST' = 'GET'): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  try {
    const config = {
      timeout: API_CONFIG.TIMEOUT,
      validateStatus: (status: number) => status < 500,
    };

    const response = method === 'POST' 
      ? await axios.post(url, {}, config)
      : await axios.get(url, config);

    const responseTime = Date.now() - startTime;

    return {
      isHealthy: response.status >= 200 && response.status < 500,
      responseTime,
      details: {
        status: response.status,
        message: response.data?.message || 'Endpoint reachable',
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;

    return {
      isHealthy: false,
      responseTime,
      error: axiosError.message || 'Endpoint test failed',
      details: {
        status: axiosError.response?.status || 0,
      },
    };
  }
};

