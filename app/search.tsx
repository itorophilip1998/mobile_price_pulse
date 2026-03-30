import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router } from 'expo-router';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/components/ui/toast-provider';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '@/hooks/use-products';
import { useDebounce } from '@/hooks/use-debounce';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { wishlistAPI } from '@/lib/api/wishlist';
import { useAuth } from '@/hooks/use-auth';
import { ProductCard } from '@/components/product-card';
import { Product } from '@/lib/api/products';
import { searchAPI, type GlobalSearchResponse } from '@/lib/api/search';
import * as ImagePicker from 'expo-image-picker';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;

function SearchContent() {
  const { user } = useAuth();
  const { cart, addToCart, busyProductIds } = useCart();
  const { showToast } = useToast();

  const isInCart = useCallback(
    (productId: string) => cart?.items.some((item) => item.product.id === productId) ?? false,
    [cart],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [imageSearchResult, setImageSearchResult] = useState<GlobalSearchResponse | null>(null);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Voice search state
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) return;
      try {
        const [items] = await Promise.all([wishlistAPI.getAll()]);
        setWishlist(new Set(items.map((item) => item.productId)));
      } catch {
        // ignore
      }
    };
    loadWishlist();
  }, [user]);

  // ── Speech recognition event wiring ──
  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('result', (ev) => {
    const text = ev.results[0]?.transcript ?? '';
    setVoiceTranscript(text);
    if (ev.isFinal && text.trim()) {
      setSearchQuery(text.trim());
      setVoiceModalVisible(false);
      setVoiceTranscript('');
      setImageSearchResult(null);
      setImagePreview(null);
    }
  });
  useSpeechRecognitionEvent('error', (ev) => {
    setIsListening(false);
    const msg = ev.error === 'no-speech'
      ? 'No speech detected. Tap the mic to try again.'
      : ev.error === 'not-allowed'
        ? 'Microphone permission denied.'
        : 'Could not recognize speech. Try again.';
    setVoiceError(msg);
  });

  const startVoiceSearch = useCallback(async () => {
    setVoiceError(null);
    setVoiceTranscript('');
    Keyboard.dismiss();

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      showToast('Microphone permission is required for voice search', 'error');
      return;
    }
    setVoiceModalVisible(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
  }, [showToast]);

  const stopVoiceSearch = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    if (voiceTranscript.trim()) {
      setSearchQuery(voiceTranscript.trim());
      clearImageSearchResult();
    }
    setVoiceModalVisible(false);
    setVoiceTranscript('');
  }, [voiceTranscript]);

  const cancelVoiceSearch = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
    setVoiceModalVisible(false);
    setVoiceTranscript('');
    setVoiceError(null);
  }, []);

  const hasQuery = !!(debouncedSearch && debouncedSearch.trim().length > 0);

  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading: productsLoading,
  } = useProducts({
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    limit: 20,
    enabled: hasQuery,
  });

  const products = hasQuery ? (productsData?.pages ?? []).flatMap((p) => p.products) : [];

  const { data: globalSearchData, isLoading: globalSearchLoading } = useGlobalSearch({
    q: debouncedSearch || undefined,
    limit: 20,
  });

  const isGlobalSearchMode = hasQuery || !!imageSearchResult;
  const sourceData = imageSearchResult ?? globalSearchData;
  const internalProducts = sourceData?.internal?.products ?? [];
  const suggestedProducts = sourceData?.suggested?.products ?? [];
  const suggestedSources = sourceData?.suggested?.sources ?? [];
  const isFromImageSearch = !!imageSearchResult;

  const handleProductPress = useCallback(
    (item: Product) => {
      router.push({ pathname: '/product/[slug]', params: { slug: item.slug || item.id } });
    },
    []
  );

  const handleAddToCart = useCallback(
    async (item: Product) => {
      try {
        await addToCart(item.id, 1);
        showToast('Added to cart', 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not add to cart', 'error');
      }
    },
    [addToCart, showToast],
  );

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!user) {
      showToast('Sign in to save items to wishlist', 'info');
      return;
    }
    const has = wishlist.has(productId);
    try {
      if (has) await wishlistAPI.remove(productId);
      else await wishlistAPI.add(productId);
      setWishlist((prev) => {
        const next = new Set(prev);
        if (has) next.delete(productId);
        else next.add(productId);
        return next;
      });
    } catch {
      showToast('Could not update wishlist', 'error');
    }
  }, [user, wishlist, showToast]);

  const sendImageForSearch = useCallback(
    async (uri: string) => {
      setImagePreview(uri);
      setImageSearchLoading(true);
      setImageSearchResult(null);
      setSearchQuery('');
      try {
        const formData = new FormData();
        formData.append('image', {
          uri,
          type: 'image/jpeg',
          name: 'image.jpg',
        } as unknown as Blob);
        const data = await searchAPI.searchByImage(formData);
        setImageSearchResult(data);
      } catch {
        showToast('Image search failed. Please try again.', 'error');
      } finally {
        setImageSearchLoading(false);
      }
    },
    [showToast],
  );

  const handleSearchByFile = useCallback(async () => {
    Keyboard.dismiss();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Gallery permission required', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await sendImageForSearch(result.assets[0].uri);
  }, [sendImageForSearch, showToast]);

  const handleSearchByScanner = useCallback(async () => {
    Keyboard.dismiss();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera permission required to scan objects', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await sendImageForSearch(result.assets[0].uri);
  }, [sendImageForSearch, showToast]);

  const clearImageSearchResult = useCallback(() => {
    setImageSearchResult(null);
    setImagePreview(null);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!isGlobalSearchMode && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [isGlobalSearchMode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        type="internal"
        product={item}
        isInCart={isInCart(item.id)}
        isBusy={busyProductIds.has(item.id)}
        isWishlisted={wishlist.has(item.id)}
        onPress={() => handleProductPress(item)}
        onAddToCart={handleAddToCart}
        onToggleWishlist={toggleWishlist}
      />
    ),
    [wishlist, handleProductPress, handleAddToCart, toggleWishlist, isInCart, busyProductIds]
  );

  const showEmptyState = !hasQuery && !imageSearchResult;
  const loading = hasQuery && productsLoading && products.length === 0 && !isGlobalSearchMode;
  const loadingMore = isFetchingNextPage;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <View style={styles.headerSearchRow}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search products worldwide..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              clearImageSearchResult();
              setSearchQuery(text);
            }}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchActionButton}
            onPress={handleSearchByFile}
            disabled={imageSearchLoading}
          >
            <Ionicons name="images-outline" size={21} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchActionButton}
            onPress={handleSearchByScanner}
            disabled={imageSearchLoading}
          >
            <Ionicons name="camera-outline" size={21} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchActionButton}
            onPress={startVoiceSearch}
            disabled={imageSearchLoading}
          >
            <Ionicons name="mic-outline" size={21} color="#667eea" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice Search Modal */}
      <Modal visible={voiceModalVisible} transparent animationType="fade">
        <View style={styles.voiceOverlay}>
          <View style={styles.voiceCard}>
            <Text style={styles.voiceTitle}>
              {isListening ? 'Listening...' : voiceError ? 'Try again' : 'Starting...'}
            </Text>
            <TouchableOpacity
              style={[styles.voiceMicButton, isListening && styles.voiceMicButtonActive]}
              onPress={isListening ? stopVoiceSearch : startVoiceSearch}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={48}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            {voiceTranscript ? (
              <Text style={styles.voiceTranscript} numberOfLines={3}>
                {voiceTranscript}
              </Text>
            ) : voiceError ? (
              <Text style={styles.voiceErrorText}>{voiceError}</Text>
            ) : (
              <Text style={styles.voiceHint}>Say a product name or description</Text>
            )}
            <TouchableOpacity style={styles.voiceCancelButton} onPress={cancelVoiceSearch}>
              <Text style={styles.voiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image analyzing overlay */}
      {imageSearchLoading && imagePreview ? (
        <View style={styles.imageAnalyzeContainer}>
          <Image
            source={{ uri: imagePreview }}
            style={styles.imageAnalyzePreview}
            contentFit="cover"
          />
          <View style={styles.imageAnalyzeOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.imageAnalyzeText}>Analyzing image...</Text>
            <Text style={styles.imageAnalyzeSubtext}>Finding matching products</Text>
          </View>
        </View>
      ) : null}

      {/* Filters and Sort bar */}
      <View style={styles.filterSortBar}>
        <TouchableOpacity
          style={styles.filterSortButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={18} color="#667eea" />
          <Text style={styles.filterSortButtonText}>Filters</Text>
          {(minPrice || maxPrice) ? (
            <View style={styles.filterDot} />
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterSortButton}
          onPress={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
        >
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={18}
            color="#667eea"
          />
          <Text style={styles.filterSortButtonText}>
            Sort {sortOrder === 'asc' ? 'A–Z' : 'Newest'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilters(false)}
          />
          <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Filters</Text>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price range</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInputWrap}>
                <Text style={styles.priceLabel}>Min (₦)</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInputWrap}>
                <Text style={styles.priceLabel}>Max (₦)</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Any"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort by</Text>
            {(['createdAt', 'price', 'rating'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
                onPress={() => setSortBy(option)}
              >
                <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionTextActive]}>
                  {option === 'createdAt' ? 'Newest' : option === 'price' ? 'Price' : 'Rating'}
                </Text>
                {sortBy === option && (
                  <Ionicons name="checkmark" size={20} color="#667eea" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalClearButton}
              onPress={() => {
                setMinPrice('');
                setMaxPrice('');
                setSortBy('createdAt');
                setSortOrder('desc');
              }}
            >
              <Text style={styles.modalClearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalApplyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.modalApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </Modal>

      {/* Results */}
      {showEmptyState && !imageSearchLoading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Search for products</Text>
          <Text style={styles.emptySubtext}>
            Type, use your camera, upload a photo, or speak
          </Text>
        </View>
      ) : isGlobalSearchMode ? (
        (globalSearchLoading && !imageSearchResult) && !imageSearchLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isFromImageSearch ? 'From your image' : 'Our products'}
              </Text>
            </View>
            {internalProducts.length === 0 ? (
              <Text style={styles.sectionEmpty}>No matching products</Text>
            ) : (
              <View style={styles.productsGrid}>
                {internalProducts.map((item) => (
                  <ProductCard
                    key={item.id}
                    type="internal"
                    product={item}
                    isInCart={isInCart(item.id)}
                    isBusy={busyProductIds.has(item.id)}
                    isWishlisted={wishlist.has(item.id)}
                    onPress={() => handleProductPress(item)}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </View>
            )}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested</Text>
              {suggestedSources.length > 0 ? (
                <Text style={styles.sectionSubtitle}>From: {suggestedSources.join(', ')}</Text>
              ) : null}
            </View>
            {suggestedProducts.length === 0 ? (
              <Text style={styles.sectionEmpty}>Suggestions appear here when available.</Text>
            ) : (
              <View style={styles.productsGrid}>
                {suggestedProducts.slice(0, 6).map((item) => (
                  <ProductCard
                    key={`${item.sourceId}-${item.id}`}
                    type="suggested"
                    product={item}
                    onPress={() => {}}
                  />
                ))}
              </View>
            )}
            {suggestedProducts.length > 0 ? (
              <TouchableOpacity
                style={styles.viewSuggestedButton}
                onPress={() =>
                  router.push({
                    pathname: '/search/suggested',
                    params: { q: debouncedSearch || (isFromImageSearch ? 'from image' : '') },
                  })
                }
              >
                <Text style={styles.viewSuggestedText}>View full suggested page</Text>
                <Ionicons name="open-outline" size={18} color="#667eea" />
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        )
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try a different search term or adjust filters</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.listRow}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#667eea" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

export default function SearchScreen() {
  return (
    <ProtectedScreen>
      <SearchContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  backButton: {
    padding: 6,
    marginRight: 0,
  },
  headerSearchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
    minHeight: 24,
  },
  searchActionButton: {
    padding: 6,
    marginLeft: 2,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSortBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  filterSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  filterSortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputWrap: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalClearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  modalApplyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionEmpty: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productsGrid: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: GRID_GAP,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  listContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: GRID_GAP,
    paddingBottom: 24,
  },
  listRow: {
    justifyContent: 'space-between',
  },
  viewSuggestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  viewSuggestedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  // Voice search modal
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  voiceMicButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  voiceMicButtonActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  voiceTranscript: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 26,
  },
  voiceHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  voiceErrorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  voiceCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginTop: 4,
  },
  voiceCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Image analyze overlay
  imageAnalyzeContainer: {
    flex: 1,
    position: 'relative',
  },
  imageAnalyzePreview: {
    width: '100%',
    height: '100%',
  },
  imageAnalyzeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageAnalyzeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  imageAnalyzeSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
});
