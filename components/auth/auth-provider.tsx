import React, { createContext, useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { mobileAuthAPI } from '@/lib/auth/api';
import { tokenStorage } from '@/lib/auth/storage';
import { AuthContextType, User } from '@/lib/auth/types';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = await tokenStorage.getUser();
      const accessToken = await tokenStorage.getAccessToken();

      if (storedUser && accessToken) {
        setUser(storedUser);
        try {
          const currentUser = await mobileAuthAPI.getCurrentUser();
          setUser(currentUser);
          await tokenStorage.setUser(currentUser);
        } catch (error) {
          await tokenStorage.clearTokens();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const signup = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      try {
        const result = await mobileAuthAPI.signup(data);
        // Don't navigate automatically - let the UI handle it
        return result;
      } catch (error: any) {
        throw error; // Re-throw to let the UI handle the error message
      }
    },
    [],
  );

  const signin = useCallback(async (email: string, password: string) => {
    try {
      const response = await mobileAuthAPI.signin(email, password);
      
      // Validate response structure
      if (!response.accessToken) {
        throw new Error('Sign in response missing access token');
      }
      if (!response.refreshToken) {
        throw new Error('Sign in response missing refresh token');
      }
      if (!response.user) {
        throw new Error('Sign in response missing user data');
      }
      
      // Store tokens and user
      await tokenStorage.setTokens(response.accessToken, response.refreshToken);
      await tokenStorage.setUser(response.user);
      setUser(response.user);
      router.replace('/');
    } catch (error: any) {
      // Extract error message from various possible error formats
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to sign in';
      throw new Error(errorMessage);
    }
  }, []);

  const signout = useCallback(async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        await mobileAuthAPI.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await tokenStorage.clearTokens();
      setUser(null);
      router.push('/auth');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await mobileAuthAPI.getCurrentUser();
      setUser(currentUser);
      await tokenStorage.setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signup,
    signin,
    signout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

