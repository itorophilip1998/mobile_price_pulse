import { AxiosInstance } from 'axios';
import { getClerkToken } from '../clerk-token';

const AUTH_TOKEN_KEY = 'authToken';
const RETRY_KEY = '__retried';

/**
 * Attaches Clerk auth to every request and retries once with a fresh
 * token on 401 responses (handles short-lived Clerk session JWTs).
 *
 * Supports an optional per-request `authToken` override passed via config.
 */
export function attachAuthInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(async (config) => {
    const passedToken = (config as Record<string, unknown>)[AUTH_TOKEN_KEY];
    const token =
      typeof passedToken === 'string' ? passedToken : await getClerkToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    delete (config as Record<string, unknown>)[AUTH_TOKEN_KEY];
    return config;
  });

  client.interceptors.response.use(undefined, async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original[RETRY_KEY]) {
      original[RETRY_KEY] = true;
      const freshToken = await getClerkToken();
      if (freshToken) {
        original.headers.Authorization = `Bearer ${freshToken}`;
        return client.request(original);
      }
    }
    return Promise.reject(error);
  });
}

export function withAuth(
  config: Record<string, unknown> | undefined,
  token: string | null,
): Record<string, unknown> | undefined {
  if (!token) return config;
  return { ...config, [AUTH_TOKEN_KEY]: token };
}
