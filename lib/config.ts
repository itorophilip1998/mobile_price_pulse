// Safely import Constants with fallback
let Constants: any = null;
try {
  Constants = require('expo-constants').default;
} catch (e) {
  // Constants module not available, will use fallback values
  console.warn('expo-constants not available, using fallback values');
}

/**
 * In development, when running on a physical device, localhost points to the device.
 * Use the Expo dev server host so the app can reach the API on your machine.
 */
function getDevelopmentApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl !== 'http://localhost:3000') return envUrl;
  try {
    const hostUri = Constants?.expoConfig?.hostUri ?? Constants?.manifest?.debuggerHost;
    const host = hostUri?.split(':')[0];
    if (host) return `http://${host}:3000`;
  } catch {
    // ignore
  }
  return 'http://localhost:3000';
}

/**
 * Centralized configuration using environment variables
 * All environment variables should be prefixed with EXPO_PUBLIC_ to be accessible in the app
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: getDevelopmentApiBaseUrl(),
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000', 10),
  HEALTH_CHECK_ENDPOINT: '/health',
  AUTH_ENDPOINT: '/auth',
};

// Google OAuth Configuration
export const GOOGLE_OAUTH_CONFIG = {
  WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: Constants?.expoConfig?.name || 'PricePulse',
  APP_VERSION: Constants?.expoConfig?.version || '1.0.0',
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
  DEBUG: process.env.EXPO_PUBLIC_DEBUG === 'true',
};

// Feature Flags
export const FEATURE_FLAGS = {
  GOOGLE_OAUTH_ENABLED: !!(GOOGLE_OAUTH_CONFIG.WEB_CLIENT_ID || GOOGLE_OAUTH_CONFIG.IOS_CLIENT_ID || GOOGLE_OAUTH_CONFIG.ANDROID_CLIENT_ID),
};

/**
 * Check if Google OAuth is configured for the current platform
 */
export const isGoogleOAuthConfigured = (platform: 'ios' | 'android' | 'web'): boolean => {
  switch (platform) {
    case 'ios':
      return !!GOOGLE_OAUTH_CONFIG.IOS_CLIENT_ID;
    case 'android':
      return !!GOOGLE_OAUTH_CONFIG.ANDROID_CLIENT_ID;
    case 'web':
      return !!GOOGLE_OAUTH_CONFIG.WEB_CLIENT_ID;
    default:
      return false;
  }
};

/**
 * Validate that required environment variables are set
 */
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!API_CONFIG.BASE_URL) {
    errors.push('EXPO_PUBLIC_API_URL is not set');
  }

  if (APP_CONFIG.ENVIRONMENT === 'production' && !API_CONFIG.BASE_URL.startsWith('https://')) {
    errors.push('API URL must use HTTPS in production');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

