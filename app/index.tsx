import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { onboardingStorage } from '@/lib/onboarding-storage';

function DashboardContent() {
  useEffect(() => {
    router.replace('/marketplace');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
  );
}

export default function IndexScreen() {
  const [gateState, setGateState] = useState<'loading' | 'splash' | 'app'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const completed = await onboardingStorage.getHasCompletedOnboarding();
        if (cancelled) return;
        if (completed) {
          setGateState('app');
        } else {
          setGateState('splash');
          router.replace('/splash');
        }
      } catch {
        if (!cancelled) setGateState('app');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (gateState === 'loading') {
    return <View style={styles.loadingGate} />;
  }

  if (gateState === 'splash') {
    return <View style={styles.loadingGate} />;
  }

  return (
    <ProtectedScreen>
      <DashboardContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  loadingGate: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
