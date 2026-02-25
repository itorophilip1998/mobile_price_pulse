import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { ProductCard } from '@/components/product-card';

export default function SearchSuggestedScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const query = typeof q === 'string' ? q : '';

  const { data, isLoading, error } = useGlobalSearch({
    q: query,
    limit: 50,
    page: 1,
  });

  const suggested = data?.suggested ?? { products: [], sources: [] };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Suggested for &quot;{query || 'search'}&quot;
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading suggestions...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Could not load suggestions</Text>
        </View>
      ) : suggested.products.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No suggested results yet</Text>
          <Text style={styles.emptySubtext}>
            External suggestions (e.g. Jumia, eBay) will appear here when available.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {suggested.sources.length > 0 && (
            <Text style={styles.sourcesLabel}>
              From: {suggested.sources.join(', ')}
            </Text>
          )}
          <View style={styles.grid}>
            {suggested.products.map((item) => (
              <ProductCard
                key={`${item.sourceId}-${item.id}`}
                type="suggested"
                product={item}
                onPress={() => {}}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },
  sourcesLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
