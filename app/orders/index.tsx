import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { ordersAPI, Order } from '@/lib/api/orders';
import { formatPaymentMethodLabel } from '@/lib/payment-methods';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

function OrdersContent() {
  const { getToken } = useClerkAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await ordersAPI.list(token ?? undefined);
      setOrders(data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
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

  const paymentLabel = (order: Order) => {
    const status = order.paymentStatus ?? 'PAID';
    const methodStr = formatPaymentMethodLabel(order.paymentMethod);
    return status === 'PAID' ? `Paid · ${methodStr}` : `Payment pending · ${methodStr}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
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
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            Place an order from your cart to see it here
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/marketplace')}
          >
            <Text style={styles.shopButtonText}>Browse products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
            />
          }
        >
          {orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/orders/${order.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.orderRow}>
                <Text style={styles.orderId}>
                  #{order.id.slice(-8).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${statusColor(order.status)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColor(order.status) },
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
              <Text style={styles.orderTotal}>
                ₦{order.total.toLocaleString()} · {order.items.length} item
                {order.items.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.paymentText}>{paymentLabel(order)}</Text>
              <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function OrdersScreen() {
  return (
    <ProtectedScreen>
      <OrdersContent />
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
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  paymentText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: 16,
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
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
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
