import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';

/**
 * Legacy verify-email route.
 * Email verification is now handled inline during Clerk sign-up (sign-up.tsx).
 * Redirect to the sign-up screen so users land in the right flow.
 */
export default function VerifyEmailScreen() {
  useEffect(() => {
    router.replace('/auth/sign-up');
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
