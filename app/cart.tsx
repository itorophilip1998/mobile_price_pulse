import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/components/ui/toast-provider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { ordersAPI, type PaymentMethod } from '@/lib/api/orders';
import { walletAPI } from '@/lib/api/wallet';
import { CHECKOUT_PAYMENT_OPTIONS } from '@/lib/payment-methods';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

function CartContent() {
  const { cart, loading, updateQuantity, removeItem, clearCart, refreshCart } = useCart();
  const { showToast } = useToast();
  const { getToken } = useClerkAuth();
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WALLET');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await handleRemoveItem(itemId);
      return;
    }
    try {
      await updateQuantity(itemId, quantity);
    } catch (error) {
      showToast('Failed to update quantity', 'error');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      showToast('Item removed from cart', 'success');
    } catch (error) {
      showToast('Failed to remove item', 'error');
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      showToast('Cart cleared', 'success');
    } catch (error) {
      showToast('Failed to clear cart', 'error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const w = await walletAPI.getBalance(token ?? undefined);
        if (!cancelled) setWalletBalance(w.balance);
      } catch {
        if (!cancelled) setWalletBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const handlePlaceOrder = async () => {
    if (!cart || cart.items.length === 0) return;
    if (
      paymentMethod === 'WALLET' &&
      walletBalance != null &&
      walletBalance < cart.total
    ) {
      showToast('Wallet balance is too low for this order. Choose another payment method or add funds.', 'error');
      return;
    }
    setPlacing(true);
    try {
      const token = await getToken();
      await ordersAPI.createFromCart(paymentMethod, token ?? undefined);
      await refreshCart();
      showToast('Order placed successfully', 'success');
      router.push('/orders');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      showToast(message || 'Failed to place order', 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </SafeAreaView>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart</Text>
        <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Add items to get started</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/marketplace')}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart ({cart.count})</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {cart.items.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <TouchableOpacity
              style={styles.itemImageContainer}
              onPress={() => router.push(`/product/${item.product.slug}`)}
              activeOpacity={0.7}
            >
              {item.product.image ? (
                <ExpoImage
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                  contentFit="cover"
                  transition={200}
                  placeholder={{ uri: 'https://via.placeholder.com/80x80?text=Loading...' }}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.itemInfo}>
              <TouchableOpacity
                onPress={() => router.push(`/product/${item.product.slug}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
              </TouchableOpacity>
              <Text style={styles.itemVendor}>{item.product.vendor}</Text>
              <View style={styles.itemPriceContainer}>
                <Text style={styles.itemPrice}>₦{item.product.price.toLocaleString()}</Text>
                {item.product.originalPrice && (
                  <Text style={styles.itemOriginalPrice}>
                    ₦{item.product.originalPrice.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.itemActions}>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={18} color="#667eea" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Ionicons name="add" size={18} color="#667eea" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.paymentSection}>
          <Text style={styles.paymentSectionTitle}>Payment method</Text>
          <Text style={styles.paymentSectionHint}>
            Choose how you want to pay. Wallet payments are taken immediately if your balance is enough.
            Other methods are marked as pending until payment is confirmed.
          </Text>
          {CHECKOUT_PAYMENT_OPTIONS.map((opt) => {
            const selected = paymentMethod === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
                onPress={() => setPaymentMethod(opt.value)}
                activeOpacity={0.85}
              >
                <View style={styles.paymentOptionRow}>
                  <Ionicons
                    name={opt.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={selected ? '#667eea' : '#6B7280'}
                  />
                  <View style={styles.paymentOptionText}>
                    <Text style={[styles.paymentOptionTitle, selected && styles.paymentOptionTitleOn]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.paymentOptionSub}>{opt.subtitle}</Text>
                  </View>
                  <View style={[styles.radioOuter, selected && styles.radioOuterOn]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </View>
                {opt.value === 'WALLET' && walletBalance != null ? (
                  <Text style={styles.walletBalanceLine}>
                    Balance: ₦{walletBalance.toLocaleString()}
                    {walletBalance < cart.total ? (
                      <Text style={styles.walletLow}> · Insufficient for this total</Text>
                    ) : null}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₦{cart.total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            (placing ||
              (paymentMethod === 'WALLET' &&
                walletBalance != null &&
                walletBalance < cart.total)) &&
              styles.checkoutButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={
            placing ||
            (paymentMethod === 'WALLET' &&
              walletBalance != null &&
              walletBalance < cart.total)
          }
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.checkoutButtonText}>
            {placing ? 'Placing order...' : 'Proceed to Checkout'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function CartScreen() {
  return (
    <ProtectedScreen>
      <CartContent />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  clearText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 24,
  },
  shopButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemVendor: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  itemPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  itemOriginalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
  },
  checkoutButton: {
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentSection: {
    marginTop: 8,
    marginBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paymentSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  paymentSectionHint: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 14,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  paymentOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#F5F3FF',
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  paymentOptionTitleOn: {
    color: '#4F46E5',
  },
  paymentOptionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOuterOn: {
    borderColor: '#667eea',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#667eea',
  },
  walletBalanceLine: {
    marginTop: 10,
    marginLeft: 32,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  walletLow: {
    color: '#DC2626',
    fontWeight: '600',
  },
});

