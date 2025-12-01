import { useEffect } from 'react';
import { router } from 'expo-router';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

function DashboardContent() {
  useEffect(() => {
    // Redirect to marketplace
    router.replace('/marketplace');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <ProtectedScreen>
      <DashboardContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
