import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onboardingStorage } from '@/lib/onboarding-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.max(240, Math.round((SCREEN_HEIGHT || 600) * 0.44));

const PAGES = [
  {
    key: 'compare',
    title: 'Compare prices',
    subtitle: 'Find the best deals across stores in one place.',
    image: require('../assets/images/onboarding/img1.jpg'),
  },
  {
    key: 'wishlist',
    title: 'Track wishlists',
    subtitle: 'Save products you love and get notified when prices drop.',
    image: require('../assets/images/onboarding/img2.jpg'),
  },
  {
    key: 'smarter',
    title: 'Shop smarter',
    subtitle: 'Make informed decisions with price history and alerts.',
    image: require('../assets/images/onboarding/img3.jpg'),
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const goNext = () => {
    if (currentIndex < PAGES.length - 1) {
      const next = currentIndex + 1;
      try {
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
      } catch {
        setCurrentIndex(next);
      }
    } else {
      finishOnboarding();
    }
  };

  const getItemLayout = (_: unknown, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const onScrollToIndexFailed = () => {
    // Fallback if scrollToIndex fails (e.g. list not laid out yet)
  };

  const finishOnboarding = async () => {
    await onboardingStorage.setHasCompletedOnboarding(true);
    router.replace('/');
  };

  const renderPage = ({ item }: { item: (typeof PAGES)[0] }) => (
    <View style={styles.page}>
      <View style={styles.imageWrap}>
        <RNImage
          source={item.image}
          style={styles.onboardingImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn} hitSlop={16}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listWrap}>
        <FlatList
          ref={flatListRef}
          data={PAGES}
          renderItem={renderPage}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          onScrollToIndexFailed={onScrollToIndexFailed}
          getItemLayout={getItemLayout}
          bounces={false}
        />
      </View>

      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.buttonWrap}
          onPress={goNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFillObject, styles.buttonGradient]}
          />
          <Text style={styles.buttonText}>
            {currentIndex === PAGES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  listWrap: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  imageWrap: {
    width: SCREEN_WIDTH - 48,
    height: IMAGE_HEIGHT,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 28,
  },
  onboardingImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#667eea',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  buttonWrap: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonGradient: {
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
