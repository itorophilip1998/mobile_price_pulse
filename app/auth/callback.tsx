import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

/**
 * OAuth callback route. Clerk redirects here after social sign-in.
 * This route must exist to avoid 404. We complete the auth session
 * and redirect to the app root so the OAuth promise can resolve.
 */
export default function AuthCallbackScreen() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await WebBrowser.maybeCompleteAuthSession();
      } catch {
        // ignore
      }
      if (!cancelled) {
        router.replace('/marketplace');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
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
