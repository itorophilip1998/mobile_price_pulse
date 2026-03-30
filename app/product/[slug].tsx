import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/components/ui/toast-provider';
import { TipToast } from '@/components/ui/tip-toast';
import { Ionicons } from '@expo/vector-icons';
import { productsAPI, Product } from '@/lib/api/products';
import { wishlistAPI } from '@/lib/api/wishlist';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { useProductReviews } from '@/hooks/use-reviews';
import type { Review } from '@/lib/api/reviews';
import { ImageCarouselModal } from '@/components/ui/image-carousel-modal';
import {
  formatProductCondition,
  formatDeliveryMode,
  formatDeliveryFulfillment,
} from '@/lib/product-meta';

const { width } = Dimensions.get('window');

function ProductDetailContent() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { cart, addToCart, busyProductIds } = useCart();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [tipToast, setTipToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showImageCarousel, setShowImageCarousel] = useState(false);

  // Fetch product details
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsAPI.getProduct(slug!),
    enabled: !!slug,
  });

  // Check if product is in cart (must be after useQuery so `product` is defined)
  const isInCart = product ? cart?.items.some((item) => item.product.id === product.id) || false : false;
  const isBusy = product ? busyProductIds.has(product.id) : false;

  // Fetch reviews
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    fetchNextPage: fetchNextReviews,
    hasNextPage: hasMoreReviews,
    isFetchingNextPage: isLoadingMoreReviews,
  } = useProductReviews(product?.id || '', 10);

  // Check if product is in wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      if (product && user) {
        try {
          const inWishlist = await wishlistAPI.check(product.id);
          setIsWishlisted(inWishlist);
        } catch (error) {
          // Silently fail - user might not be logged in
        }
      }
    };
    checkWishlist();
  }, [product, user]);

  // Toggle wishlist
  const toggleWishlist = useCallback(async () => {
    if (!user) {
      showToast('Please sign in to add items to wishlist', 'error');
      return;
    }

    if (!product) return;

    try {
      if (isWishlisted) {
        await wishlistAPI.remove(product.id);
        setIsWishlisted(false);
        showToast('Removed from wishlist', 'success');
      } else {
        await wishlistAPI.add(product.id);
        setIsWishlisted(true);
        showToast('Added to wishlist', 'success');
      }
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Failed to update wishlist', 'error');
    }
  }, [product, isWishlisted, user, showToast]);

  // Add to cart or go to cart if already there
  const handleAddToCart = useCallback(async () => {
    if (!product) return;

    if (isInCart) {
      router.push('/cart');
      return;
    }

    try {
      await addToCart(product.id, quantity);
      setTipToast({ message: 'Added to cart', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to cart';
      setTipToast({ message, type: 'error' });
    }
  }, [product, quantity, addToCart, isInCart]);

  // Update quantity
  const updateQuantity = useCallback((delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(10, prev + delta)));
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : product.image 
      ? [product.image] 
      : ['https://via.placeholder.com/400x400?text=No+Image'];

  const hasDiscount = product.discount && product.discount > 0;
  const conditionLabel = formatProductCondition(product.condition);
  const fulfillmentLabel = formatDeliveryFulfillment(product.deliveryFulfillment);
  const deliveryLabel = formatDeliveryMode(product.deliveryMode);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleWishlist}
            style={styles.wishlistButton}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={24}
              color={isWishlisted ? '#EF4444' : '#667eea'}
            />
          </TouchableOpacity>
        </View>

        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <TouchableOpacity
            style={styles.mainImageContainer}
            onPress={() => setShowImageCarousel(true)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: images[selectedImageIndex] }}
              style={styles.mainImage}
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
            <View style={styles.imageOverlay}>
              <Ionicons name="expand" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          {images.length > 1 && (
            <FlatList
              horizontal
              data={images}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.thumbnailActive,
                  ]}
                  onPress={() => setSelectedImageIndex(index)}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.thumbnailContainer}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.vendor}>by {product.vendor}</Text>

          {(conditionLabel || fulfillmentLabel || deliveryLabel || product.deliveryNotes) ? (
            <View style={styles.metaChips}>
              {conditionLabel ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{conditionLabel}</Text>
                </View>
              ) : null}
              {fulfillmentLabel ? (
                <View style={[styles.metaChip, styles.metaChipFulfillment]}>
                  <Ionicons name="business-outline" size={14} color="#7C3AED" />
                  <Text style={[styles.metaChipText, styles.metaChipTextFulfillment]}>
                    {fulfillmentLabel}
                  </Text>
                </View>
              ) : null}
              {deliveryLabel ? (
                <View style={[styles.metaChip, styles.metaChipDelivery]}>
                  <Ionicons name="cube-outline" size={14} color="#0369A1" />
                  <Text style={[styles.metaChipText, styles.metaChipTextDelivery]}>{deliveryLabel}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {(fulfillmentLabel || deliveryLabel) ? (
            <Text style={styles.deliveryFixedNote}>
              Delivery responsibility and method are fixed for this listing and cannot be changed by the seller.
            </Text>
          ) : null}
          {product.deliveryNotes ? (
            <View style={styles.deliveryNotesBox}>
              <Text style={styles.deliveryNotesTitle}>Delivery & pickup</Text>
              <Text style={styles.deliveryNotesBody}>{product.deliveryNotes}</Text>
            </View>
          ) : null}

          {/* Ratings */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color="#FBBF24" />
              <Text style={styles.ratingText}>
                {product.rating ? product.rating.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.reviewsText}>
                ({product.reviews || 0} {product.reviews === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
            <View style={styles.stockContainer}>
              <Ionicons
                name={product.stock > 0 ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={product.stock > 0 ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.stockText,
                  { color: product.stock > 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₦{product.price.toLocaleString()}</Text>
              {product.originalPrice && (
                <Text style={styles.originalPrice}>
                  ₦{product.originalPrice.toLocaleString()}
                </Text>
              )}
            </View>
            {hasDiscount && (
              <View style={styles.discountInfo}>
                <Text style={styles.discountInfoText}>
                  Save ₦{((product.originalPrice! - product.price) * quantity).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(-1)}
                disabled={quantity <= 1}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={quantity <= 1 ? '#9CA3AF' : '#667eea'}
                />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(1)}
                disabled={quantity >= 10}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={quantity >= 10 ? '#9CA3AF' : '#667eea'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {product.description || `High quality ${product.name.toLowerCase()} from ${product.vendor}. This product offers excellent value and quality.`}
            </Text>
          </View>

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{product.category.name}</Text>
              </View>
              {conditionLabel ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Condition:</Text>
                  <Text style={styles.detailValue}>{conditionLabel}</Text>
                </View>
              ) : null}
              {fulfillmentLabel ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Delivery responsibility:</Text>
                  <Text style={styles.detailValue}>{fulfillmentLabel}</Text>
                </View>
              ) : null}
              {deliveryLabel ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>How delivery works:</Text>
                  <Text style={styles.detailValue}>{deliveryLabel}</Text>
                </View>
              ) : null}
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Vendor:</Text>
                <Text style={styles.detailValue}>{product.vendor}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Rating:</Text>
                <Text style={styles.detailValue}>
                  {product.rating ? product.rating.toFixed(1) : '0.0'} / 5.0 ({product.reviews || 0} reviews)
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Stock:</Text>
                <Text style={styles.detailValue}>
                  {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                </Text>
              </View>
              {hasDiscount && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Discount:</Text>
                  <Text style={styles.detailValue}>{product.discount}% off</Text>
                </View>
              )}
            </View>
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>
              Reviews ({product.reviews})
            </Text>
            <View style={styles.reviewsSummary}>
              <View style={styles.reviewsRating}>
                <Text style={styles.reviewsRatingNumber}>
                  {product.rating ? product.rating.toFixed(1) : '0.0'}
                </Text>
                <View style={styles.reviewsStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(product.rating || 0) ? 'star' : 'star-outline'}
                      size={16}
                      color="#FBBF24"
                    />
                  ))}
                </View>
                <Text style={styles.reviewsCount}>
                  Based on {product.reviews || 0} {(product.reviews || 0) === 1 ? 'review' : 'reviews'}
                </Text>
              </View>
            </View>

            {/* Reviews List */}
            {reviewsLoading && product.reviews > 0 ? (
              <View style={styles.reviewsLoadingContainer}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
              </View>
            ) : reviewsData && reviewsData.pages.length > 0 && reviewsData.pages[0].reviews.length > 0 ? (
              <>
                <FlatList
                  data={reviewsData.pages.flatMap((page) => page.reviews)}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item: review }) => (
                    <View style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewUserInfo}>
                          <View style={styles.reviewAvatar}>
                            <Text style={styles.reviewAvatarText}>
                              {review.user.profile?.firstName?.[0]?.toUpperCase() || 
                               review.user.profile?.lastName?.[0]?.toUpperCase() ||
                               review.user.email[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.reviewUserDetails}>
                            <Text style={styles.reviewUserName}>
                              {review.user.profile?.firstName && review.user.profile?.lastName
                                ? `${review.user.profile.firstName} ${review.user.profile.lastName}`
                                : review.user.email.split('@')[0]}
                            </Text>
                            <View style={styles.reviewRating}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                  key={star}
                                  name={star <= review.rating ? 'star' : 'star-outline'}
                                  size={14}
                                  color="#FBBF24"
                                />
                              ))}
                            </View>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      )}
                    </View>
                  )}
                  scrollEnabled={false}
                  ListFooterComponent={
                    hasMoreReviews ? (
                      <TouchableOpacity
                        style={styles.loadMoreReviewsButton}
                        onPress={() => fetchNextReviews()}
                        disabled={isLoadingMoreReviews}
                      >
                        {isLoadingMoreReviews ? (
                          <ActivityIndicator size="small" color="#667eea" />
                        ) : (
                          <Text style={styles.loadMoreReviewsText}>Load More Reviews</Text>
                        )}
                      </TouchableOpacity>
                    ) : null
                  }
                />
              </>
            ) : (
              <View style={styles.noReviewsNote}>
                <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
                <Text style={styles.noReviewsText}>
                  Be the first to review this product!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.priceBottom}>
            <Text style={styles.priceBottomLabel}>Total:</Text>
            <Text style={styles.priceBottomValue}>
              ₦{(product.price * quantity).toLocaleString()}
            </Text>
          </View>
          <View style={isInCart && product.stock > 0 ? styles.addToCartButtonWrapper : undefined}>
            {isInCart && product.stock > 0 && (
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <TouchableOpacity
              style={[
                styles.addToCartButton,
                product.stock === 0 && styles.addToCartButtonDisabled,
                isInCart && product.stock > 0 && styles.addToCartButtonInCart,
                isBusy && styles.addToCartButtonBusy,
              ]}
              onPress={handleAddToCart}
              disabled={product.stock === 0 || isBusy}
              activeOpacity={0.8}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={isInCart ? '#667eea' : '#FFFFFF'} />
              ) : product.stock === 0 ? (
                <Text style={styles.addToCartText}>Out of Stock</Text>
              ) : isInCart ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#667eea" style={styles.cartIcon} />
                  <Text style={styles.removeFromCartText}>View Cart</Text>
                </>
              ) : (
                <>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Ionicons name="cart" size={20} color="#FFFFFF" style={styles.cartIcon} />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tip Toast */}
      {tipToast && (
        <TipToast
          message={tipToast.message}
          type={tipToast.type}
          duration={2000}
          onHide={() => setTipToast(null)}
        />
      )}

      {/* Image Carousel Modal */}
      {product && (
        <ImageCarouselModal
          visible={showImageCarousel}
          images={images}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageCarousel(false)}
        />
      )}
    </SafeAreaView>
  );
}

export default function ProductDetailScreen() {
  return (
    <ProtectedScreen>
      <ProductDetailContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  wishlistButton: {
    padding: 8,
  },
  imageSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
  },
  mainImageContainer: {
    width: '100%',
    height: width,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#C4B5FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    overflow: 'hidden',
    marginRight: 8,
  },
  thumbnailActive: {
    borderColor: '#667eea',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 36,
  },
  vendor: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaChipDelivery: {
    backgroundColor: '#E0F2FE',
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  metaChipTextDelivery: {
    color: '#0369A1',
  },
  metaChipFulfillment: {
    backgroundColor: '#F5F3FF',
  },
  metaChipTextFulfillment: {
    color: '#7C3AED',
  },
  deliveryFixedNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 18,
  },
  deliveryNotesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deliveryNotesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  deliveryNotesBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  reviewsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceSection: {
    marginBottom: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountInfo: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  discountInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 30,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsSummary: {
    marginBottom: 20,
  },
  reviewsRating: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  reviewsRatingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  reviewsStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  reviewsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  noReviewsNote: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  reviewsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  reviewsLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewItem: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewUserDetails: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  loadMoreReviewsButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreReviewsText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceBottom: {
    flex: 1,
  },
  priceBottomLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceBottomValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addToCartButtonWrapper: {
    flex: 2,
    borderRadius: 14,
    padding: 1.5,
    overflow: 'hidden',
  },
  addToCartButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  addToCartButtonInCart: {
    backgroundColor: '#F3F4F6',
    shadowColor: '#10B981',
  },
  addToCartButtonBusy: {
    opacity: 0.7,
  },
  removeFromCartText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '700',
  },
  cartIcon: {
    marginRight: 8,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

