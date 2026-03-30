import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { router, useLocalSearchParams } from 'expo-router';
import { useToast } from '@/components/ui/toast-provider';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { vendorAPI } from '@/lib/api/vendor';
import { getApiErrorMessage } from '@/lib/api-error';
import { ApiErrorModal } from '@/components/ui/api-error-modal';
import { useQueryClient } from '@tanstack/react-query';

function CreateShopContent() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<{ title: string; error: unknown } | null>(
    null,
  );

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const shop = await vendorAPI.getShop(editId);
        if (cancelled) return;
        setName(shop.name);
        setDescription(shop.description || '');
        setWebsite(shop.website || '');
        setAddress(shop.address || '');
        setCompanyPhone(shop.companyPhone || '');
        setBankName(shop.bankName || '');
        setBankAccountName(shop.bankAccountName || '');
        setBankAccountNumber(shop.bankAccountNumber || '');
        setLogo(shop.logo || null);
        setCoverImage(shop.coverImage || null);
      } catch {
        showToast('Could not load shop', 'error');
        router.back();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, showToast]);

  const pickImage = useCallback(async (field: 'logo' | 'cover') => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to set images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: field === 'logo' ? [1, 1] : [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        if (field === 'logo') setLogo(result.assets[0].uri);
        else setCoverImage(result.assets[0].uri);
      }
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Failed to pick image', 'error');
    }
  }, [showToast]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      showToast('Shop name is required', 'error');
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const isHttpUrl = (u: string | null) =>
        !!u && (u.startsWith('http://') || u.startsWith('https://'));
      const logoPayload = logo && isHttpUrl(logo) ? logo : undefined;
      const coverPayload = coverImage && isHttpUrl(coverImage) ? coverImage : undefined;

      const companyPayload = {
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
      };
      if (editId) {
        await vendorAPI.updateShop(editId, {
          name: name.trim(),
          description: description.trim() || undefined,
          logo: logoPayload,
          coverImage: coverPayload,
          ...companyPayload,
        });
        showToast('Shop updated', 'success');
      } else {
        await vendorAPI.createShop({
          name: name.trim(),
          description: description.trim() || undefined,
          logo: logoPayload,
          coverImage: coverPayload,
          ...companyPayload,
        });
        showToast('Shop created', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      setTimeout(() => router.back(), Platform.OS === 'ios' ? 500 : 300);
    } catch (e: unknown) {
      if (__DEV__) {
        console.error('[createShop]', e);
      }
      const title = editId ? 'Could not update shop' : 'Could not create shop';
      setApiError({ title, error: e });
      showToast(getApiErrorMessage(e), 'error', 8000, { noTruncate: true });
    } finally {
      setSubmitting(false);
    }
  }, [
    name,
    description,
    website,
    address,
    companyPhone,
    bankName,
    bankAccountName,
    bankAccountNumber,
    logo,
    coverImage,
    editId,
    showToast,
    queryClient,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.title}>{editId ? 'Edit shop' : 'New shop'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Shop name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your company or store name"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tell buyers about your shop"
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <Text style={styles.section}>Company & contact</Text>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholder="https://yourcompany.com"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={styles.label}>Business address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, city, state"
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <Text style={styles.label}>Company phone / support line</Text>
        <TextInput
          style={styles.input}
          value={companyPhone}
          onChangeText={setCompanyPhone}
          placeholder="+234…"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
        <Text style={styles.section}>Payout account (private)</Text>
        <Text style={styles.fieldHint}>Shown only to you in the seller hub; not on public shop page.</Text>
        <Text style={styles.label}>Bank name</Text>
        <TextInput
          style={styles.input}
          value={bankName}
          onChangeText={setBankName}
          placeholder="Bank name"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.label}>Account name</Text>
        <TextInput
          style={styles.input}
          value={bankAccountName}
          onChangeText={setBankAccountName}
          placeholder="As on bank records"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.label}>Account number</Text>
        <TextInput
          style={styles.input}
          value={bankAccountNumber}
          onChangeText={setBankAccountNumber}
          placeholder="Account number"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
        />
        <Text style={styles.label}>Logo</Text>
        <Text style={styles.fieldHint}>
          Gallery picks are for preview only until upload is added. Use https image URLs in edit, or leave empty to create the shop.
        </Text>
        <TouchableOpacity style={styles.imageBox} onPress={() => pickImage('logo')}>
          {logo ? (
            <ExpoImage source={{ uri: logo }} style={styles.imageFull} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text style={styles.imageHint}>Tap to add logo</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.label}>Cover image</Text>
        <TouchableOpacity style={styles.coverBox} onPress={() => pickImage('cover')}>
          {coverImage ? (
            <ExpoImage source={{ uri: coverImage }} style={styles.imageFull} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="images-outline" size={32} color="#9CA3AF" />
              <Text style={styles.imageHint}>Optional banner</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>{editId ? 'Save changes' : 'Create shop'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <ApiErrorModal
        visible={!!apiError}
        title={apiError?.title ?? ''}
        error={apiError?.error}
        onClose={() => setApiError(null)}
      />
    </SafeAreaView>
  );
}

export default function CreateShopScreen() {
  return (
    <ProtectedScreen>
      <CreateShopContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backBtn: { padding: 8, marginRight: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 40 },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  imageBox: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  coverBox: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  imageFull: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  imageHint: { marginTop: 8, color: '#9CA3AF', fontSize: 14 },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 17,
  },
  submit: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
