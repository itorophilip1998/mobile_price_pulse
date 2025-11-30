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
        await mobileAuthAPI.signup(data);
        router.push('/auth/verify-email');
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to create account');
      }
    },
    [],
  );

  const signin = useCallback(async (email: string, password: string) => {
    try {
      const response = await mobileAuthAPI.signin(email, password);
      await tokenStorage.setTokens(response.accessToken, response.refreshToken);
      await tokenStorage.setUser(response.user);
      setUser(response.user);
      router.replace('/');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to sign in');
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signup,
    signin,
    signout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

