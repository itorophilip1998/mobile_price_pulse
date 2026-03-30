import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@/lib/api/products';
import type { SuggestedProduct } from '@/lib/api/search';
import { formatProductCondition } from '@/lib/product-meta';

const GRID_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP) / 2;

type ProductCardInternal = {
  type: 'internal';
  product: Product;
  isInCart?: boolean;
  isBusy?: boolean;
  isWishlisted?: boolean;
  onPress: () => void;
  onAddToCart?: (p: Product) => void;
  onToggleWishlist?: (productId: string) => void;
};

type ProductCardSuggested = {
  type: 'suggested';
  product: SuggestedProduct;
  onPress: () => void;
};

type ProductCardProps = ProductCardInternal | ProductCardSuggested;

export function ProductCard(props: ProductCardProps) {
  if (props.type === 'suggested') {
    return <SuggestedProductCard product={props.product} onPress={props.onPress} />;
  }
  return (
    <InternalProductCard
      product={props.product}
      isInCart={props.isInCart}
      isBusy={props.isBusy}
      isWishlisted={props.isWishlisted}
      onPress={props.onPress}
      onAddToCart={props.onAddToCart}
      onToggleWishlist={props.onToggleWishlist}
    />
  );
}

function InternalProductCard({
  product,
  isInCart,
  isBusy,
  isWishlisted,
  onPress,
  onAddToCart,
  onToggleWishlist,
}: {
  product: Product;
  isInCart?: boolean;
  isBusy?: boolean;
  isWishlisted?: boolean;
  onPress: () => void;
  onAddToCart?: (p: Product) => void;
  onToggleWishlist?: (productId: string) => void;
}) {
  const hasDiscount = product.discount && product.discount > 0;
  const conditionLabel = formatProductCondition(product.condition);
  const imageUrl =
    product.image || product.images?.[0] || 'https://via.placeholder.com/400x400?text=No+Image';

  return (
    <View style={styles.productCard}>
      <TouchableOpacity
        style={styles.productImageContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.productImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discount}%</Text>
          </View>
        )}
        {onToggleWishlist && (
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={() => onToggleWishlist(product.id)}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={isWishlisted ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      <View style={styles.productInfo}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
        </TouchableOpacity>
        {conditionLabel ? (
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionBadgeText} numberOfLines={1}>
              {conditionLabel}
            </Text>
          </View>
        ) : null}
        <Text style={styles.productVendor}>{product.vendor}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FBBF24" />
          <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
          <Text style={styles.reviewsText}>({String(product.reviews || 0)})</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₦{product.price.toLocaleString()}</Text>
          {product.originalPrice && (
            <Text style={styles.originalPrice}>
              ₦{product.originalPrice.toLocaleString()}
            </Text>
          )}
        </View>
        {onAddToCart && (
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              isInCart && styles.addToCartButtonInCart,
              isBusy && styles.addToCartButtonBusy,
            ]}
            onPress={() => onAddToCart(product)}
            activeOpacity={0.8}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={isInCart ? '#667eea' : '#FFFFFF'} />
            ) : !isInCart ? (
              <>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons name="cart" size={18} color="#FFFFFF" style={styles.cartIcon} />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#667eea" style={styles.cartIcon} />
                <Text style={styles.removeFromCartText}>In Cart</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SuggestedProductCard({
  product,
  onPress,
}: {
  product: SuggestedProduct;
  onPress: () => void;
}) {
  const imageUrl =
    product.image || 'https://via.placeholder.com/400x400?text=No+Image';

  const handleBuy = () => {
    if (product.url) {
      Linking.openURL(product.url);
    }
  };

  return (
    <View style={styles.productCard}>
      <TouchableOpacity
        style={styles.productImageContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.productImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>{product.sourceName}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.productInfo}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
        </TouchableOpacity>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {product.currency || '₦'}{product.price.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity style={styles.viewButton} onPress={handleBuy} activeOpacity={0.8}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.viewButtonText}>View / Buy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  conditionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  productVendor: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  reviewsText: {
    fontSize: 11,
    color: '#6B7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  addToCartButtonInCart: {
    backgroundColor: '#E5E7EB',
  },
  addToCartButtonBusy: {
    opacity: 0.7,
  },
  cartIcon: {
    marginRight: 4,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  removeFromCartText: {
    color: '#667eea',
    fontSize: 13,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
