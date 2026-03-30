import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/ui/toast-provider';
import { vendorAPI } from '@/lib/api/vendor';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const DOC_TYPES = [
  {
    key: 'businessRegistrationUrl' as const,
    label: 'Business registration',
    hint: 'CAC certificate, business name registration, or equivalent',
  },
  {
    key: 'governmentIdUrl' as const,
    label: 'Government-issued ID',
    hint: 'Director or owner ID (national ID, passport, driver license)',
  },
  {
    key: 'proofOfAddressUrl' as const,
    label: 'Proof of address',
    hint: 'Utility bill, bank statement, or lease showing business address',
  },
];

type DocKey = (typeof DOC_TYPES)[number]['key'];

function VerificationContent() {
  const { shopId: paramShopId } = useLocalSearchParams<{ shopId?: string }>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [shopId, setShopId] = useState(paramShopId || '');
  const [docs, setDocs] = useState<Record<DocKey, string>>({
    businessRegistrationUrl: '',
    governmentIdUrl: '',
    proofOfAddressUrl: '',
  });
  const [extraUrls, setExtraUrls] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);

  const shopsQuery = useQuery({
    queryKey: ['vendor', 'shops'],
    queryFn: () => vendorAPI.getMyShops(),
  });

  useEffect(() => {
    if (paramShopId) setShopId(paramShopId);
  }, [paramShopId]);

  const listQuery = useQuery({
    queryKey: ['vendor', 'verifications'],
    queryFn: () => vendorAPI.getMyVerifications(),
  });

  const pickFileFor = useCallback(
    async (key: DocKey) => {
      try {
        const DocumentPicker = await import('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        setUploadingKey(key);
        const url = await vendorAPI.uploadVerificationDocument(result.assets[0].uri);
        setDocs((prev) => ({ ...prev, [key]: url }));
        showToast('File uploaded', 'success');
      } catch (e: unknown) {
        showToast((e as Error)?.message || 'Upload failed', 'error');
      } finally {
        setUploadingKey(null);
      }
    },
    [showToast],
  );

  const submit = useCallback(async () => {
    const business = docs.businessRegistrationUrl.trim();
    const gov = docs.governmentIdUrl.trim();
    const proof = docs.proofOfAddressUrl.trim();
    if (!shopId.trim()) {
      showToast('Select a shop', 'error');
      return;
    }
    if (!business || !gov || !proof) {
      showToast('Add all three required documents (upload or paste URL)', 'error');
      return;
    }

    const additional = extraUrls
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await vendorAPI.submitShopVerification({
        shopId: shopId.trim(),
        businessRegistrationUrl: business,
        governmentIdUrl: gov,
        proofOfAddressUrl: proof,
        additionalDocumentUrls: additional.length ? additional : undefined,
        note: note.trim() || undefined,
      });
      showToast('Verification request submitted', 'success');
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      setDocs({
        businessRegistrationUrl: '',
        governmentIdUrl: '',
        proofOfAddressUrl: '',
      });
      setExtraUrls('');
      setNote('');
      listQuery.refetch();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      showToast(msg || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [shopId, docs, extraUrls, note, showToast, queryClient, listQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.title}>Shop verification</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Verify your shop or company only. Submit three document types below (PDF or images). You can
          upload files or paste HTTPS links.
        </Text>

        <Text style={styles.label}>Shop *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickScroll}>
          {shopsQuery.data?.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.pickChip, shopId === s.id && styles.pickChipOn]}
              onPress={() => setShopId(s.id)}
            >
              <Text
                style={[styles.pickChipText, shopId === s.id && styles.pickChipTextOn]}
                numberOfLines={1}
              >
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Or paste shop ID"
          placeholderTextColor="#9CA3AF"
          value={shopId}
          onChangeText={setShopId}
        />

        {DOC_TYPES.map(({ key, label, hint }) => (
          <View key={key} style={styles.docBlock}>
            <Text style={styles.docLabel}>{label} *</Text>
            <Text style={styles.docHint}>{hint}</Text>
            <View style={styles.docActions}>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickFileFor(key)}
                disabled={uploadingKey === key}
              >
                {uploadingKey === key ? (
                  <ActivityIndicator color="#667eea" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#667eea" />
                    <Text style={styles.uploadBtnText}>Choose file</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.docUrl]}
              placeholder="Or paste document URL (https://…)"
              placeholderTextColor="#9CA3AF"
              value={docs[key]}
              onChangeText={(t) => setDocs((prev) => ({ ...prev, [key]: t }))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {docs[key] ? (
              <Text style={styles.addedOk} numberOfLines={1}>
                ✓ Attached
              </Text>
            ) : null}
          </View>
        ))}

        <Text style={styles.label}>Additional documents (optional)</Text>
        <Text style={styles.hint}>Extra URLs, one per line or comma-separated</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={extraUrls}
          onChangeText={setExtraUrls}
          placeholder="https://…"
          placeholderTextColor="#9CA3AF"
          multiline
        />

        <Text style={styles.label}>Note to reviewer</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder="Optional context"
          placeholderTextColor="#9CA3AF"
          multiline
        />

        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDis]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Submit request</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.section}>Your requests</Text>
        {listQuery.isLoading ? (
          <ActivityIndicator color="#667eea" style={{ marginVertical: 16 }} />
        ) : (
          (listQuery.data ?? []).map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {r.type === 'SHOP' ? 'Shop' : 'Product'} · {r.status}
              </Text>
              {r.shop ? <Text style={styles.cardMeta}>Shop: {r.shop.name}</Text> : null}
              {r.product ? <Text style={styles.cardMeta}>Product: {r.product.name}</Text> : null}
              <Text style={styles.cardDate}>{new Date(r.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function VerificationScreen() {
  return (
    <ProtectedScreen>
      <VerificationContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backBtn: { padding: 8, marginRight: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  pickScroll: { marginBottom: 10, maxHeight: 44 },
  pickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
    maxWidth: 200,
  },
  pickChipOn: { backgroundColor: '#667eea' },
  pickChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pickChipTextOn: { color: '#FFFFFF' },
  docBlock: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  docHint: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 10 },
  docActions: { flexDirection: 'row', marginBottom: 8 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: '#667eea' },
  docUrl: { marginBottom: 0 },
  addedOk: { fontSize: 12, color: '#059669', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  submit: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  submitDis: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  section: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
});
