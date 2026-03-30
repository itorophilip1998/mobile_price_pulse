import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedScreenProps {
  children: React.ReactNode;
}

export function ProtectedScreen({ children }: ProtectedScreenProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const [canNavigate, setCanNavigate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCanNavigate(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!canNavigate || isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [canNavigate, isLoading, isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

