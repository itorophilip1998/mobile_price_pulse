import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';

/**
 * Legacy reset-password route.
 * Password reset is now handled through Clerk in forgot-password.tsx.
 */
export default function ResetPasswordScreen() {
  useEffect(() => {
    router.replace('/auth/forgot-password');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
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
