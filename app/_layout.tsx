import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/clerk-expo';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ToastProvider } from '@/components/ui/toast-provider';
import { CartProvider } from '@/contexts/cart-context';
import { validateConfig } from '@/lib/config';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
}
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore
    }
  },
};

// Create a query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // Noise from dependencies / transient backend HTML responses in development.
    LogBox.ignoreLogs([
      'SafeAreaView has been deprecated',
      'JSON Parse error: Unexpected character: <',
    ]);
  }, []);

  // Validate configuration on app startup
  useEffect(() => {
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      console.warn('Configuration validation failed:', configValidation.errors);
      // In production, you might want to show an alert or disable certain features
    }
  }, []);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="splash" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="auth" />
                  <Stack.Screen name="marketplace" />
                  <Stack.Screen name="search" />
                  <Stack.Screen name="cart" />
                  <Stack.Screen name="orders" />
                  <Stack.Screen name="wishlist" />
                  <Stack.Screen name="categories" />
                  <Stack.Screen name="vendor" />
                  <Stack.Screen name="product/[slug]" />
                  <Stack.Screen name="search/suggested" />
                  <Stack.Screen name="profile" />
                  <Stack.Screen name="settings" options={{ title: 'Settings' }} />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="wallet" />
                  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                </Stack>
                <StatusBar style="dark" />
              </ThemeProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
    </ClerkProvider>
  );
}
