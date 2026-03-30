import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router } from 'expo-router';
import { Category } from '@/lib/api/products';
import { useToast } from '@/components/ui/toast-provider';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '@/hooks/use-products';
import { useDebounce } from '@/hooks/use-debounce';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (width - CARD_MARGIN * (CARDS_PER_ROW + 1)) / CARDS_PER_ROW;

function CategoriesContent() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories with React Query
  const { data: categories = [], isLoading, error } = useCategories();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sort categories: pinned first, then alphabetically
  const sortedCategories = categories.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.name.localeCompare(b.name);
  });

  // Filter categories based on search
  const filteredCategories = sortedCategories.filter((category) =>
    category.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Handle category selection
  const handleCategoryPress = useCallback(
    (category: Category) => {
      router.push({
        pathname: '/marketplace',
        params: { category: category.slug },
      });
    },
    []
  );

  // Get category image with better fallback
  const getCategoryImage = useCallback((category: Category) => {
    if (category.image) {
      return category.image;
    }
    
    // Use category-specific Unsplash images based on slug/name
    const searchTerm = category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
    const categoryImageMap: Record<string, string> = {
      'smartphones': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
      'laptops': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
      'fragrances': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
      'skincare': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
      'groceries': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
      'home-decoration': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
      'furniture': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
      'tops': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
      'womens-dresses': 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop',
      'womens-shoes': 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop',
      'mens-shirts': 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&h=400&fit=crop',
      'mens-shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      'mens-watches': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
      'womens-watches': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
      'womens-bags': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
      'womens-jewellery': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
      'sunglasses': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
      'automotive': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop',
      'motorcycle': 'https://images.unsplash.com/photo-1558980663-3685c1d673c4?w=400&h=400&fit=crop',
      'lighting': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
      'beauty': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop',
      'kitchen-accessories': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
      'mobile-accessories': 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop',
      'sports-accessories': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
      'tablets': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
      'vehicle': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop',
    };
    
    return categoryImageMap[searchTerm] || 
      `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&q=80`;
  }, []);

  // Render category card
  const renderCategory = useCallback(
    ({ item }: { item: Category }) => {
      const categoryImage = getCategoryImage(item);

      return (
        <TouchableOpacity
          style={styles.categoryCard}
          onPress={() => handleCategoryPress(item)}
          activeOpacity={0.8}
        >
          <View style={styles.categoryImageContainer}>
            <Image
              source={{ uri: categoryImage }}
              style={styles.categoryImage}
              contentFit="cover"
              transition={200}
              placeholder={{ uri: 'https://via.placeholder.com/400x400?text=Category' }}
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.categoryGradient}
            />
            <View style={styles.categoryInfo}>
              <View style={styles.categoryNameRow}>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
              {item.description && (
                <Text style={styles.categoryDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleCategoryPress]
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load categories</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.backButton} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="grid-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No categories found' : 'No categories available'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? 'Try searching with different keywords'
              : 'Check back later for new categories'}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchButtonText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          numColumns={CARDS_PER_ROW}
          contentContainerStyle={styles.categoriesGrid}
          columnWrapperStyle={styles.categoryRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerInfo}>
              <Text style={styles.headerInfoText}>
                {filteredCategories.length}{' '}
                {filteredCategories.length === 1 ? 'category' : 'categories'}
                {searchQuery && ` found`}
              </Text>
            </View>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
        />
      )}
    </SafeAreaView>
  );
}

export default function CategoriesScreen() {
  return (
    <ProtectedScreen>
      <CategoriesContent />
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
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  headerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerInfoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoriesGrid: {
    padding: CARD_MARGIN,
  },
  categoryRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_MARGIN,
  },
  categoryCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryImageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  categoryInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#E5E7EB',
    lineHeight: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearSearchButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
});

