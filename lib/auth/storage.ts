import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';
const REMEMBER_ME_KEY = 'remember_me_account';

export const tokenStorage = {
  getAccessToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  setAccessToken: async (token: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting access token:', error);
    }
  },

  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  setRefreshToken: async (token: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting refresh token:', error);
    }
  },

  setTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
    await Promise.all([
      tokenStorage.setAccessToken(accessToken),
      tokenStorage.setRefreshToken(refreshToken),
    ]);
  },

  clearTokens: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  getUser: async (): Promise<any> => {
    try {
      const userStr = await AsyncStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  setUser: async (user: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  },

  /** Remember me: save account so user can tap to re-login (email pre-filled). */
  setRememberedAccount: async (accountInfo: {
    email: string;
    username?: string;
    imageUrl?: string;
  }): Promise<void> => {
    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(accountInfo));
    } catch (error) {
      console.error('Error setting remembered account:', error);
    }
  },

  getRememberedAccount: async (): Promise<{
    email: string;
    username?: string;
    imageUrl?: string;
  } | null> => {
    try {
      const accountStr = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (!accountStr) return null;
      const parsed = JSON.parse(accountStr) as { email?: string; username?: string; imageUrl?: string };
      if (!parsed?.email) return null;
      return {
        email: parsed.email,
        username: parsed.username,
        imageUrl: parsed.imageUrl,
      };
    } catch (error) {
      console.error('Error getting remembered account:', error);
      return null;
    }
  },

  clearRememberedAccount: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);
    } catch (error) {
      console.error('Error clearing remembered account:', error);
    }
  },
};

