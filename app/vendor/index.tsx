import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { vendorAPI, ShopSummary } from '@/lib/api/vendor';
import type { Product } from '@/lib/api/products';
import { useToast } from '@/components/ui/toast-provider';

const { width } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_W = (width - 32 - GRID_GAP) / 2;

function VendorDashboardContent() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'shops' | 'products'>('shops');
  const [shopFilter, setShopFilter] = useState<string | undefined>(undefined);

  const shopsQuery = useQuery({
    queryKey: ['vendor', 'shops'],
    queryFn: () => vendorAPI.getMyShops(),
  });

  const productsQuery = useQuery({
    queryKey: ['vendor', 'products', shopFilter],
    queryFn: () => vendorAPI.getMyProducts(shopFilter),
  });

  const refreshing =
    (tab === 'shops' ? shopsQuery.isRefetching : productsQuery.isRefetching) &&
    !shopsQuery.isLoading &&
    !productsQuery.isLoading;

  const onRefresh = useCallback(() => {
    if (tab === 'shops') shopsQuery.refetch();
    else productsQuery.refetch();
  }, [tab, shopsQuery, productsQuery]);

  const renderShop = ({ item }: { item: ShopSummary }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => router.push(`/vendor/shop/${item.id}`)}
      activeOpacity={0.85}
    >
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={styles.shopLogo} contentFit="cover" />
      ) : (
        <View style={styles.shopLogoPlaceholder}>
          <Ionicons name="storefront" size={28} color="#667eea" />
        </View>
      )}
      <View style={styles.shopCardBody}>
        <Text style={styles.shopName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.shopMeta}>
          {item.productCount} product{item.productCount !== 1 ? 's' : ''}
        </Text>
        {item.isVerified ? (
          <View style={styles.verifiedPill}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : item.verificationStatus === 'PENDING' ? (
          <Text style={styles.pendingText}>Verification pending</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        onPress={() => router.push(`/vendor/edit-product/${item.id}`)}
        activeOpacity={0.85}
      >
        {item.image || item.images?.[0] ? (
          <Image
            source={{ uri: item.image || item.images![0] }}
            style={styles.productImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color="#D1D5DB" />
          </View>
        )}
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>₦{Number(item.price).toLocaleString()}</Text>
        <Text style={[styles.stockText, item.stock === 0 && styles.outOfStock]}>
          {item.stock === 0 ? 'Out of stock' : `Stock: ${item.stock}`}
        </Text>
      </TouchableOpacity>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.miniBtn}
          onPress={() => {
            vendorAPI
              .setProductStock(item.id, 0)
              .then(() => {
                showToast('Marked out of stock', 'success');
                productsQuery.refetch();
              })
              .catch(() => showToast('Could not update stock', 'error'));
          }}
        >
          <Ionicons name="remove-circle-outline" size={18} color="#D97706" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.miniBtn}
          onPress={() => {
            vendorAPI
              .deleteProduct(item.id)
              .then(() => {
                showToast('Product removed', 'success');
                productsQuery.refetch();
                shopsQuery.refetch();
              })
              .catch(() => showToast('Could not remove product', 'error'));
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.title}>My Shop</Text>
        <TouchableOpacity
          onPress={() => router.push('/vendor/verification')}
          style={styles.headerIcon}
        >
          <Ionicons name="shield-checkmark-outline" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'shops' && styles.tabActive]}
          onPress={() => setTab('shops')}
        >
          <Text style={[styles.tabText, tab === 'shops' && styles.tabTextActive]}>Shops</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'products' && styles.tabActive]}
          onPress={() => setTab('products')}
        >
          <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>
            Products
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'shops' ? (
        <FlatList
          data={shopsQuery.data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={renderShop}
          contentContainerStyle={styles.scrollPad}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#667eea" />
          }
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/vendor/create-shop')}
            >
              <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Create new shop</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            shopsQuery.isLoading ? (
              <Text style={styles.muted}>Loading shops…</Text>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="storefront-outline" size={56} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No shops yet</Text>
                <Text style={styles.emptySub}>Create a shop, then add products.</Text>
              </View>
            )
          }
        />
      ) : (
        <View style={styles.flex1}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterRowInner}
          >
            <TouchableOpacity
              style={[styles.filterChip, !shopFilter && styles.filterChipActive]}
              onPress={() => setShopFilter(undefined)}
            >
              <Text style={[styles.filterChipText, !shopFilter && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {shopsQuery.data?.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.filterChip, shopFilter === s.id && styles.filterChipActive]}
                onPress={() => setShopFilter(s.id)}
              >
                <Text
                  style={[styles.filterChipText, shopFilter === s.id && styles.filterChipTextActive]}
                  numberOfLines={1}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryBtn, styles.primaryBtnMargin]}
            onPress={() =>
              router.push({
                pathname: '/vendor/create-product',
                params: shopFilter ? { shopId: shopFilter } : {},
              })
            }
          >
            <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Add product</Text>
          </TouchableOpacity>

          {productsQuery.isLoading ? (
            <Text style={styles.mutedPad}>Loading products…</Text>
          ) : productsQuery.data?.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySub}>Add a product to your catalog.</Text>
            </View>
          ) : (
            <FlatList
              data={productsQuery.data}
              keyExtractor={(p) => p.id}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              contentContainerStyle={styles.productList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#667eea" />
              }
              renderItem={renderProduct}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function VendorIndexScreen() {
  return (
    <ProtectedScreen>
      <VendorDashboardContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: { padding: 8 },
  headerIcon: { padding: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#111827' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#667eea' },
  scrollPad: { padding: 16, paddingBottom: 40 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryBtnMargin: { marginHorizontal: 16, marginBottom: 12 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shopLogo: { width: 56, height: 56, borderRadius: 12 },
  shopLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCardBody: { flex: 1, marginLeft: 12 },
  shopName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  shopMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  verifiedText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  pendingText: { fontSize: 12, color: '#D97706', marginTop: 4 },
  muted: { textAlign: 'center', color: '#9CA3AF', marginTop: 24 },
  mutedPad: { textAlign: 'center', color: '#9CA3AF', padding: 24 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  filterRow: { maxHeight: 48, marginBottom: 4 },
  filterRowInner: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#667eea' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  filterChipTextActive: { color: '#FFFFFF' },
  productList: { paddingHorizontal: 16, paddingBottom: 32 },
  productRow: { justifyContent: 'space-between', marginBottom: GRID_GAP },
  productCard: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#F3F4F6' },
  productImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 8, minHeight: 34 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#667eea', marginTop: 4 },
  stockText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  outOfStock: { color: '#DC2626', fontWeight: '600' },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  miniBtn: { padding: 4 },
});
