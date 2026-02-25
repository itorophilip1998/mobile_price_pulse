import React, { createContext, useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { profileAPI } from '@/lib/api/profile';
import { AuthContextType, User } from '@/lib/auth/types';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoaded, isSignedIn, signOut: clerkSignOut } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      return;
    }
    let cancelled = false;
    setUserLoading(true);
    profileAPI
      .getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setUserLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const signup = useCallback(
    async (_data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      router.push('/auth');
    },
    [],
  );

  const signin = useCallback(async (_email: string, _password: string) => {
    router.push('/auth');
  }, []);

  const signout = useCallback(async () => {
    await clerkSignOut();
    setUser(null);
    router.push('/auth');
  }, [clerkSignOut]);

  const refreshUser = useCallback(async () => {
    if (!isSignedIn) return null;
    const u = await profileAPI.getCurrentUser();
    setUser(u);
    return u;
  }, [isSignedIn]);

  const isLoading = !isLoaded || (isSignedIn && userLoading);
  const isAuthenticated = isSignedIn && !!user;

  const value: AuthContextType = {
    user: isSignedIn ? user : null,
    isLoading,
    isAuthenticated,
    signup,
    signin,
    signout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
