import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { ordersAPI, Order } from '@/lib/api/orders';
import { formatPaymentMethodLabel } from '@/lib/payment-methods';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';

function OrderDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useClerkAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const data = await ordersAPI.getById(id, token ?? undefined);
        if (!cancelled) setOrder(data);
      } catch {
        if (!cancelled) setError('Failed to load order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getToken]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColor = (status: Order['status']) => {
    switch (status) {
      case 'DELIVERED':
        return '#10B981';
      case 'SHIPPED':
        return '#3B82F6';
      case 'CONFIRMED':
        return '#8B5CF6';
      default:
        return '#F59E0B';
    }
  };

  const trackUrl = order?.trackingNumber && order?.carrier
    ? `https://www.google.com/search?q=${encodeURIComponent(order.carrier + ' track ' + order.trackingNumber)}`
    : null;

  const paymentStatus = order?.paymentStatus ?? 'PAID';
  const paymentMethodLabel = formatPaymentMethodLabel(order?.paymentMethod);
  const paymentLabel =
    paymentStatus === 'PAID'
      ? `Paid · ${paymentMethodLabel}`
      : `Payment pending · ${paymentMethodLabel}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>{error ?? 'Order not found'}</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.back()}
          >
            <Text style={styles.shopButtonText}>Back to orders</Text>
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
        <Text style={styles.headerTitle}>
          #{order.id.slice(-8).toUpperCase()}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor(order.status)}20` },
            ]}
          >
            <Text
              style={[styles.statusText, { color: statusColor(order.status) }]}
            >
              {order.status}
            </Text>
          </View>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          {order.trackingNumber ? (
            <View style={styles.trackingRow}>
              <Text style={styles.trackingLabel}>Tracking:</Text>
              <Text style={styles.trackingValue}>{order.trackingNumber}</Text>
              {order.carrier && (
                <Text style={styles.carrierText}> · {order.carrier}</Text>
              )}
            </View>
          ) : null}
          {trackUrl ? (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => Linking.openURL(trackUrl)}
            >
              <Ionicons name="location-outline" size={18} color="#667eea" />
              <Text style={styles.trackButtonText}>Track shipment</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment</Text>
            <Text style={styles.paymentValue}>{paymentLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <TouchableOpacity
              style={styles.itemImageWrap}
              onPress={() => router.push(`/product/${item.product.slug}`)}
            >
              {item.product.image ? (
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text style={styles.itemMeta}>
                Qty: {item.quantity} × ₦
                {item.priceAtOrder.toLocaleString()}
              </Text>
              <Text style={styles.itemTotal}>
                ₦{(item.quantity * item.priceAtOrder).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            ₦{order.total.toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function OrderDetailScreen() {
  return (
    <ProtectedScreen>
      <OrderDetailContent />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  trackingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  trackingLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 4,
  },
  trackingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  carrierText: {
    fontSize: 13,
    color: '#6B7280',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 6,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paymentLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImageWrap: {
    marginRight: 12,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  shopButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#667eea',
    borderRadius: 12,
  },
  shopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
