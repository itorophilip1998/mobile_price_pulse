import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { vendorAPI } from '@/lib/api/vendor';

function AnalyticsContent() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const days = 30;

  const q = useQuery({
    queryKey: ['vendor', 'analytics', shopId, days],
    queryFn: () => vendorAPI.getShopAnalytics(shopId, days),
    enabled: !!shopId,
  });

  const maxRev = useMemo(() => {
    const s = q.data?.series ?? [];
    return Math.max(1, ...s.map((x) => x.revenue));
  }, [q.data?.series]);

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.err}>Missing shop</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.title}>Sales analytics</Text>
      </View>
      {q.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : q.isError ? (
        <Text style={styles.err}>Could not load analytics</Text>
      ) : q.data ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sub}>
            Last {q.data.days} days · paid orders only
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>₦{q.data.summary.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.statLab}>Revenue</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{q.data.summary.orderCount}</Text>
              <Text style={styles.statLab}>Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{q.data.summary.unitsSold}</Text>
              <Text style={styles.statLab}>Units sold</Text>
            </View>
          </View>

          <Text style={styles.section}>Daily revenue</Text>
          {q.data.series.length === 0 ? (
            <Text style={styles.empty}>No sales in this period yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
              <View style={styles.chart}>
                {q.data.series.map((row) => {
                  const h = Math.max(4, (row.revenue / maxRev) * 120);
                  return (
                    <View key={row.day} style={styles.barCol}>
                      <View style={[styles.bar, { height: h }]} />
                      <Text style={styles.barLab} numberOfLines={1}>
                        {row.day.slice(5)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

export default function VendorAnalyticsScreen() {
  return (
    <ProtectedScreen>
      <AnalyticsContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backBtn: { padding: 8, marginRight: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { padding: 24, color: '#EF4444', textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statVal: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statLab: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  section: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  empty: { color: '#6B7280', fontSize: 14 },
  chartScroll: { marginBottom: 8 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 140,
    gap: 6,
    paddingRight: 20,
  },
  barCol: { alignItems: 'center', width: 36 },
  bar: {
    width: 28,
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  barLab: { fontSize: 9, color: '#9CA3AF', marginTop: 4, maxWidth: 40, textAlign: 'center' },
});
