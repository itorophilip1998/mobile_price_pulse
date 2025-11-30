import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/components/auth/auth-provider';
import { validateConfig } from '@/lib/config';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Validate configuration on app startup
  useEffect(() => {
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      console.warn('Configuration validation failed:', configValidation.errors);
      // In production, you might want to show an alert or disable certain features
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
