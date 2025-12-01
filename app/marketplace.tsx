import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';
import { Product } from '@/lib/api/products';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/components/ui/toast-provider';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useCategories } from '@/hooks/use-products';
import { useDebounce } from '@/hooks/use-debounce';
import { wishlistAPI } from '@/lib/api/wishlist';

const { width } = Dimensions.get('window');

function MarketplaceContent() {
  const { user, signout } = useAuth();
  const { cart, addToCart } = useCart();
  const { showToast } = useToast();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loadingWishlist, setLoadingWishlist] = useState(true);

  // Load wishlist from API on mount
  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) return;
      try {
        setLoadingWishlist(true);
        const [items, count] = await Promise.all([
          wishlistAPI.getAll(),
          wishlistAPI.getCount(),
        ]);
        setWishlist(new Set(items.map((item) => item.productId)));
        setWishlistCount(count);
      } catch (error) {
        console.error('Error loading wishlist:', error);
      } finally {
        setLoadingWishlist(false);
      }
    };
    loadWishlist();
  }, [user]);

  // Debounce search query for better performance
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch categories with React Query
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  // Fetch products with React Query infinite scroll
  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading: productsLoading,
    refetch,
  } = useProducts({
    category: selectedCategory || undefined,
    search: debouncedSearch || undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    sortBy,
    sortOrder,
    limit: 20,
  });

  // Flatten products from all pages
  const products = useMemo(() => {
    return productsData?.pages.flatMap((page) => page.products) || [];
  }, [productsData]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Apply filters
  const applyFilters = useCallback(() => {
    setShowFilters(false);
    refetch();
  }, [refetch]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setMinPrice('');
    setMaxPrice('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setSelectedCategory('');
    setSearchQuery('');
    setShowFilters(false);
  }, []);

  // Add to cart
  const handleAddToCart = useCallback(
    async (product: Product) => {
      try {
        await addToCart(product.id, 1);
        showToast(`${product.name} added to cart`, 'success');
      } catch (error) {
        showToast('Failed to add to cart', 'error');
      }
    },
    [addToCart, showToast],
  );

  // Toggle wishlist
  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) {
        showToast('Please sign in to add items to wishlist', 'error');
        return;
      }

      try {
        const isInWishlist = wishlist.has(productId);
        if (isInWishlist) {
          await wishlistAPI.remove(productId);
          setWishlist((prev) => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });
          setWishlistCount((prev) => Math.max(0, prev - 1));
          showToast('Removed from wishlist', 'success');
        } else {
          await wishlistAPI.add(productId);
          setWishlist((prev) => {
            const newSet = new Set(prev);
            newSet.add(productId);
            return newSet;
          });
          setWishlistCount((prev) => prev + 1);
          showToast('Added to wishlist', 'success');
        }
      } catch (error: any) {
        console.error('Error toggling wishlist:', error);
        showToast(error?.response?.data?.message || 'Failed to update wishlist', 'error');
      }
    },
    [user, wishlist, showToast],
  );

  // Render product card
  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const hasDiscount = item.discount && item.discount > 0;
      const imageUrl = item.image || item.images?.[0] || 'https://via.placeholder.com/400x400?text=No+Image';
      const isWishlisted = wishlist.has(item.id);

      return (
        <View style={styles.productCard}>
          <TouchableOpacity style={styles.productImageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              contentFit="cover"
              transition={200}
              placeholder={{ uri: 'https://via.placeholder.com/400x400?text=Loading...' }}
              cachePolicy="memory-disk"
            />
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{item.discount}%</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={() => toggleWishlist(item.id)}
            >
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={isWishlisted ? '#EF4444' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </TouchableOpacity>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productVendor}>{item.vendor}</Text>
            
            {/* Ratings */}
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({item.reviews})</Text>
            </View>
            
            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₦{item.price.toLocaleString()}</Text>
              {item.originalPrice && (
                <Text style={styles.originalPrice}>
                  ₦{item.originalPrice.toLocaleString()}
                </Text>
              )}
            </View>
            
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => handleAddToCart(item)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="cart" size={18} color="#FFFFFF" style={styles.cartIcon} />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleAddToCart, toggleWishlist, wishlist],
  );

  const loading = productsLoading && products.length === 0;
  const loadingMore = isFetchingNextPage;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Click outside to close menu */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        />
      )}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>PricePulse</Text>
            <Text style={styles.headerSubtitle}>Best Deals</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.cartIconButton}
              onPress={() => router.push('/cart')}
            >
              <Ionicons name="cart" size={24} color="#667eea" />
              {cart && cart.count > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cart.count}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenu(!showMenu)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Menu Dropdown */}
        {showMenu && (
          <View style={styles.menuDropdown}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                showToast('Orders feature coming soon', 'info');
              }}
            >
              <Ionicons name="receipt-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                showToast('Track items feature coming soon', 'info');
              }}
            >
              <Ionicons name="location-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Track Items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/wishlist');
              }}
            >
              <Ionicons name="heart-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Wishlist</Text>
              {wishlistCount > 0 && (
                <View style={styles.wishlistBadge}>
                  <Text style={styles.wishlistBadgeText}>{wishlistCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setSelectedCategory('');
              }}
            >
              <Ionicons name="grid-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/become-vendor');
              }}
            >
              <Ionicons name="storefront-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Become a Vendor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/profile');
              }}
            >
              <Ionicons name="person-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/settings');
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={async () => {
                setShowMenu(false);
                await signout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            multiline={false}
            numberOfLines={1}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'All', slug: '' }, ...categories]}
          keyExtractor={(item) => item.id || item.slug || `cat-${item.name}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.slug && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item.slug || '')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item.slug && styles.categoryTextActive,
                ]}
                numberOfLines={1}
              >
                {item.name || 'Unknown'}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoriesContainer}
          ListEmptyComponent={
            categoriesLoading ? (
              <View style={styles.categoryLoadingContainer}>
                <ActivityIndicator size="small" color="#667eea" />
              </View>
            ) : null
          }
        />
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={18} color="#667eea" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={18}
            color="#667eea"
          />
          <Text style={styles.filterButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            {debouncedSearch || selectedCategory
              ? 'Try adjusting your filters'
              : 'Products will appear here once loaded'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsGrid}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#667eea" />
              </View>
            ) : null
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <FlatList
              style={styles.modalBody}
              data={[
                { type: 'price' },
                { type: 'sort' },
              ]}
              renderItem={({ item }) => (
                <>
                  {item.type === 'price' && (
                    <View style={styles.filterSection}>
                      <Text style={styles.filterSectionTitle}>Price Range</Text>
                      <View style={styles.priceInputContainer}>
                        <View style={styles.priceInput}>
                          <Text style={styles.priceLabel}>Min</Text>
                          <TextInput
                            style={styles.priceInputField}
                            placeholder="0"
                            value={minPrice}
                            onChangeText={setMinPrice}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.priceInput}>
                          <Text style={styles.priceLabel}>Max</Text>
                          <TextInput
                            style={styles.priceInputField}
                            placeholder="100000"
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {item.type === 'sort' && (
                    <View style={styles.filterSection}>
                      <Text style={styles.filterSectionTitle}>Sort By</Text>
                      {['createdAt', 'price', 'rating', 'reviews'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.sortOption,
                            sortBy === option && styles.sortOptionActive,
                          ]}
                          onPress={() => setSortBy(option)}
                        >
                          <Text
                            style={[
                              styles.sortOptionText,
                              sortBy === option && styles.sortOptionTextActive,
                            ]}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </Text>
                          {sortBy === option && (
                            <Ionicons name="checkmark" size={20} color="#667eea" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
              keyExtractor={(item) => item.type}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function MarketplaceScreen() {
  return (
    <ProtectedScreen>
      <MarketplaceContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cartIconButton: {
    position: 'relative',
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    zIndex: 1001,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemTextDanger: {
    color: '#EF4444',
  },
  wishlistBadge: {
    marginLeft: 'auto',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  wishlistBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
    margin: 0,
    minHeight: 20,
    maxHeight: 44,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  categoriesScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 60,
    maxHeight: 60,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryLoadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    width: '100%',
  },
  categoryEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    includeFontPadding: false,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  productsGrid: {
    padding: 8,
  },
  productCard: {
    width: (width - 32) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    margin: 8,
    overflow: 'hidden',
  },
  productImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  wishlistButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  addToCartButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cartIcon: {
    marginRight: 6,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  productInfo: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 22,
  },
  productVendor: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 2,
  },
  reviewsText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  priceInputField: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  sortOptionTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
