import { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { onboardingStorage } from '@/lib/onboarding-storage';

const SPLASH_DURATION_MS = 2000;

export default function SplashScreenRoute() {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const bounceScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    logoOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    logoScale.value = withDelay(
      200,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    textOpacity.value = withDelay(
      800,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    textTranslateY.value = withDelay(
      800,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    bounceScale.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [logoOpacity, logoScale, bounceScale, textOpacity, textTranslateY]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const completed = await onboardingStorage.getHasCompletedOnboarding();
        router.replace(completed ? '/' : '/onboarding');
      } catch {
        router.replace('/onboarding');
      }
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value * bounceScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar style="light" />
      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
          <Image
            source={require('../assets/images/applogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.tagline, textAnimatedStyle]}>
          Shop smarter. Compare prices.
        </Animated.Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 24,
  },
  logo: {
    width: 160,
    height: 160,
    tintColor: '#ffffff',
  },
  tagline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
