import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router, useFocusEffect } from 'expo-router';
import { Product } from '@/lib/api/products';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/components/ui/toast-provider';
import { Ionicons } from '@expo/vector-icons';
import { wishlistAPI, WishlistItem } from '@/lib/api/wishlist';

const { width } = Dimensions.get('window');

function WishlistContent() {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wishlist from API
  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const items = await wishlistAPI.getAll();
      setWishlistItems(items);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      showToast('Failed to load wishlist', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadWishlist();
    }, [loadWishlist])
  );

  // Remove from wishlist
  const removeFromWishlist = useCallback(
    async (productId: string) => {
      try {
        await wishlistAPI.remove(productId);
        setWishlistItems((prev) => prev.filter((item) => item.productId !== productId));
        showToast('Removed from wishlist', 'success');
      } catch (error: any) {
        console.error('Error removing from wishlist:', error);
        showToast(error?.response?.data?.message || 'Failed to remove from wishlist', 'error');
      }
    },
    [showToast],
  );

  // Clear all wishlist
  const handleClearWishlist = useCallback(async () => {
    try {
      await wishlistAPI.clear();
      setWishlistItems([]);
      showToast('Wishlist cleared', 'success');
    } catch (error: any) {
      console.error('Error clearing wishlist:', error);
      showToast(error?.response?.data?.message || 'Failed to clear wishlist', 'error');
    }
  }, [showToast]);

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

  // Render product card
  const renderProduct = useCallback(
    ({ item }: { item: WishlistItem }) => {
      const product = item.product;
      const hasDiscount = product.discount && product.discount > 0;
      const imageUrl = product.image || product.images?.[0] || 'https://via.placeholder.com/400x400?text=No+Image';

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
                <Text style={styles.discountText}>-{product.discount}%</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={() => removeFromWishlist(product.id)}
            >
              <Ionicons name="heart" size={20} color="#EF4444" />
            </TouchableOpacity>
          </TouchableOpacity>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.productVendor}>{product.vendor}</Text>
            
            {/* Ratings */}
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({product.reviews})</Text>
            </View>
            
            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₦{product.price.toLocaleString()}</Text>
              {product.originalPrice && (
                <Text style={styles.originalPrice}>
                  ₦{product.originalPrice.toLocaleString()}
                </Text>
              )}
            </View>
            
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => handleAddToCart(product)}
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
    [handleAddToCart, removeFromWishlist],
  );

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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Wishlist</Text>
          {wishlistItems.length > 0 && (
            <Text style={styles.headerSubtitle}>{wishlistItems.length} items</Text>
          )}
        </View>
        {wishlistItems.length > 0 && (
          <TouchableOpacity onPress={handleClearWishlist} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading wishlist...</Text>
        </View>
      ) : wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtext}>
            Start adding items you love to your wishlist
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/marketplace')}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsGrid}
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

export default function WishlistScreen() {
  return (
    <ProtectedScreen>
      <WishlistContent />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
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
    backgroundColor: '#C4B5FD',
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
    paddingHorizontal: 24,
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
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

