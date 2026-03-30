import axios, { type AxiosError } from 'axios';

function buildRequestUrl(config: AxiosError['config']): string {
  if (!config) return '(unknown URL)';
  const url = config.url ?? '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (config.baseURL ?? '').replace(/\/$/, '');
  if (!base) return url || '(unknown URL)';
  if (!url) return base;
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

function stringifyResponseBody(data: unknown): string {
  if (data === undefined || data === null) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Multi-line diagnostic: summary, HTTP method/URL, status, response body, network code.
 * Use in a scrollable modal; Alert may truncate long text on some OS versions.
 */
export function getApiErrorDetail(error: unknown): string {
  const parts: string[] = [];
  parts.push(getApiErrorMessage(error));

  if (axios.isAxiosError(error)) {
    const method = (error.config?.method ?? 'get').toUpperCase();
    const fullUrl = buildRequestUrl(error.config);
    parts.push('');
    parts.push(`Request: ${method} ${fullUrl}`);

    if (error.response) {
      const { status, statusText } = error.response;
      const line =
        statusText && String(statusText).trim()
          ? `HTTP ${status} ${statusText}`
          : `HTTP ${status}`;
      parts.push(line);
      const body = stringifyResponseBody(error.response.data);
      if (body) {
        parts.push('');
        parts.push('Response body:');
        parts.push(body);
      }
    } else {
      parts.push('');
      parts.push(
        `No response (${error.code ?? 'unknown code'}): ${error.message || 'network error'}`,
      );
    }
  } else if (error instanceof Error && error.stack) {
    parts.push('');
    parts.push(error.stack);
  }

  return parts.join('\n');
}

/**
 * Human-readable message from axios/network errors (NestJS validation arrays, Prisma, etc.).
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (data && typeof data === 'object') {
      const raw = (data as { message?: unknown; error?: string }).message;
      if (typeof raw === 'string' && raw.trim()) return raw;
      if (Array.isArray(raw) && raw.length) {
        return raw.map((x) => String(x)).join('. ');
      }
      const err = (data as { error?: string }).error;
      if (typeof err === 'string' && err.trim()) return err;
    }

    if (status === 401) {
      return 'Please sign in again. Your session may have expired.';
    }
    if (status === 403) {
      return 'You do not have permission to do this.';
    }
    if (status === 404) {
      return 'Service not found. Check that the backend is running and the API URL is correct.';
    }
    if (status === 500 || status === 503) {
      return 'Server error. If this persists, ensure the database migration has been applied on the backend.';
    }

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Check your network and that the backend is reachable.';
    }
    if (!error.response) {
      return 'Cannot reach the server. Check EXPO_PUBLIC_API_URL / your machine IP and that the API is running.';
    }

    return error.message || 'Request failed';
  }

  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
