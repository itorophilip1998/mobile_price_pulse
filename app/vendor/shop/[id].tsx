import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { vendorAPI } from '@/lib/api/vendor';
import { useToast } from '@/components/ui/toast-provider';
import type { Product } from '@/lib/api/products';

function ShopDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const shopQuery = useQuery({
    queryKey: ['vendor', 'shop', id],
    queryFn: () => vendorAPI.getShop(id),
    enabled: !!id,
  });

  const onRefresh = useCallback(() => {
    shopQuery.refetch();
  }, [shopQuery]);

  const markOutOfStock = useCallback(
    (p: Product) => {
      Alert.alert(
        'Out of stock',
        `Set "${p.name}" stock to 0?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set to 0',
            style: 'destructive',
            onPress: async () => {
              try {
                await vendorAPI.setProductStock(p.id, 0);
                showToast('Stock updated', 'success');
                queryClient.invalidateQueries({ queryKey: ['vendor'] });
                shopQuery.refetch();
              } catch {
                showToast('Failed to update stock', 'error');
              }
            },
          },
        ],
      );
    },
    [showToast, queryClient, shopQuery],
  );

  const deleteProduct = useCallback(
    (p: Product) => {
      Alert.alert('Remove product', `Remove "${p.name}" from the catalog?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorAPI.deleteProduct(p.id);
              showToast('Product removed', 'success');
              queryClient.invalidateQueries({ queryKey: ['vendor'] });
              shopQuery.refetch();
            } catch {
              showToast('Failed to remove', 'error');
            }
          },
        },
      ]);
    },
    [showToast, queryClient, shopQuery],
  );

  if (shopQuery.isLoading || !shopQuery.data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          {shopQuery.isError ? (
            <Text style={styles.err}>Could not load shop</Text>
          ) : (
            <ActivityIndicator size="large" color="#667eea" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const shop = shopQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {shop.name}
        </Text>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={shopQuery.isRefetching} onRefresh={onRefresh} />
        }
      >
        {shop.coverImage ? (
          <Image source={{ uri: shop.coverImage }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
        <View style={styles.body}>
          <View style={styles.row}>
            {shop.logo ? (
              <Image source={{ uri: shop.logo }} style={styles.logo} contentFit="cover" />
            ) : (
              <View style={[styles.logo, styles.logoPh]}>
                <Ionicons name="storefront" size={28} color="#667eea" />
              </View>
            )}
            <View style={styles.flex1}>
              {shop.isVerified ? (
                <View style={styles.verifiedRow}>
                  <Ionicons name="shield-checkmark" size={18} color="#059669" />
                  <Text style={styles.verified}>Verified shop</Text>
                </View>
              ) : null}
              <Text style={styles.desc}>{shop.description || 'No description yet.'}</Text>
              {shop.website ? (
                <Text style={styles.metaLine} numberOfLines={1}>
                  Web: {shop.website}
                </Text>
              ) : null}
              {shop.address ? (
                <Text style={styles.metaLine} numberOfLines={2}>
                  Address: {shop.address}
                </Text>
              ) : null}
              {shop.companyPhone ? (
                <Text style={styles.metaLine}>Phone: {shop.companyPhone}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push({ pathname: '/vendor/create-shop', params: { id: shop.id } })}
            >
              <Ionicons name="create-outline" size={20} color="#667eea" />
              <Text style={styles.secondaryBtnText}>Edit shop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() =>
                router.push({
                  pathname: '/vendor/verification',
                  params: { shopId: shop.id },
                })
              }
            >
              <Ionicons name="shield-outline" size={20} color="#667eea" />
              <Text style={styles.secondaryBtnText}>Verify shop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push(`/vendor/analytics/${shop.id}`)}
            >
              <Ionicons name="bar-chart-outline" size={20} color="#667eea" />
              <Text style={styles.secondaryBtnText}>Analytics</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              router.push({ pathname: '/vendor/create-product', params: { shopId: shop.id } })
            }
          >
            <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Add product in this shop</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Products ({shop.products.length})</Text>
          {shop.products.length === 0 ? (
            <Text style={styles.muted}>No products in this shop yet.</Text>
          ) : (
            shop.products.map((p) => (
              <View key={p.id} style={styles.productRow}>
                {p.image || p.images?.[0] ? (
                  <Image
                    source={{ uri: p.image || p.images![0] }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]}>
                    <Ionicons name="cube-outline" size={24} color="#D1D5DB" />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.pName} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={styles.pPrice}>₦{Number(p.price).toLocaleString()}</Text>
                  <Text style={p.stock === 0 ? styles.outStock : styles.inStock}>
                    {p.stock === 0 ? 'Out of stock' : `Stock: ${p.stock}`}
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    onPress={() => router.push(`/vendor/edit-product/${p.id}`)}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="pencil" size={20} color="#667eea" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => markOutOfStock(p)} style={styles.iconBtn}>
                    <Ionicons name="remove-circle-outline" size={20} color="#D97706" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteProduct(p)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ShopDetailScreen() {
  return (
    <ProtectedScreen>
      <ShopDetailContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: '#DC2626' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backBtn: { padding: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  cover: { width: '100%', height: 160 },
  coverPlaceholder: { backgroundColor: '#E5E7EB' },
  body: { padding: 16 },
  row: { flexDirection: 'row', marginBottom: 16 },
  logo: { width: 72, height: 72, borderRadius: 14 },
  logoPh: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1, marginLeft: 12 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  verified: { fontSize: 14, fontWeight: '600', color: '#059669' },
  desc: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  metaLine: { fontSize: 12, color: '#4B5563', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  secondaryBtn: {
    flexGrow: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#667eea',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#667eea' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  muted: { color: '#9CA3AF', marginBottom: 16 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbPh: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, marginLeft: 10 },
  pName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  pPrice: { fontSize: 13, color: '#667eea', marginTop: 4, fontWeight: '700' },
  inStock: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  outStock: { fontSize: 12, color: '#DC2626', marginTop: 2, fontWeight: '600' },
  productActions: { flexDirection: 'row' },
  iconBtn: { padding: 8 },
});
