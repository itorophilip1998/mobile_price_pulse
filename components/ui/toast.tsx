import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
  /** When true, message is not capped to a few lines (full error text). */
  noTruncate?: boolean;
}

export function Toast({
  message,
  type = 'info',
  duration = 2000,
  onHide,
  noTruncate = false,
}: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Fade in and scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onHide]);

  const getColors = () => {
    switch (type) {
      case 'success':
        return ['#10B981', '#059669'];
      case 'error':
        return ['#EF4444', '#DC2626'];
      case 'warning':
        return ['#F59E0B', '#D97706'];
      case 'info':
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={getColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, noTruncate && styles.gradientWide]}
      >
        <View style={[styles.content, noTruncate && styles.contentStack]}>
          <Text style={styles.icon}>{getIcon()}</Text>
          <Text
            style={styles.message}
            numberOfLines={noTruncate ? undefined : 3}
          >
            {message}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
    maxWidth: Dimensions.get('window').width - 32,
    alignSelf: 'center',
  },
  gradient: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  gradientWide: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contentStack: {
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  message: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
  },
});

