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
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useCategories } from '@/hooks/use-products';
import { useToast } from '@/components/ui/toast-provider';
import { vendorAPI, ShopSummary } from '@/lib/api/vendor';
import type { Product } from '@/lib/api/products';
import { useQueryClient } from '@tanstack/react-query';
import {
  PRODUCT_CONDITION_OPTIONS,
  DELIVERY_MODE_OPTIONS,
  DELIVERY_FULFILLMENT_OPTIONS,
  formatDeliveryFulfillment,
  formatDeliveryMode,
  type ProductCondition,
  type DeliveryMode,
  type DeliveryFulfillment,
} from '@/lib/product-meta';

type Props = {
  mode: 'create' | 'edit';
  productId?: string;
  initialShopId?: string;
};

const productImagePickerOptions = {
  allowsEditing: true,
  aspect: [4, 3] as [number, number],
  quality: 0.85,
};

export function VendorProductForm({ mode, productId, initialShopId }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: catLoading } = useCategories();

  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopId, setShopId] = useState<string | null>(initialShopId ?? null);
  const [shopNameStandalone, setShopNameStandalone] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [stock, setStock] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [imageSourceOpen, setImageSourceOpen] = useState(false);
  const [condition, setCondition] = useState<ProductCondition | null>(null);
  const [deliveryFulfillment, setDeliveryFulfillment] = useState<DeliveryFulfillment | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  useEffect(() => {
    vendorAPI.getMyShops().then(setShops).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialShopId) setShopId(initialShopId);
  }, [initialShopId]);

  useEffect(() => {
    if (mode !== 'edit' || !productId) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await vendorAPI.getProductForEdit(productId);
        if (cancelled) return;
        setProductName(p.name);
        setDescription(p.description || '');
        setPrice(String(p.price));
        setOriginalPrice(p.originalPrice != null ? String(p.originalPrice) : '');
        setDiscount(p.discount != null ? String(p.discount) : '');
        setStock(String(p.stock));
        setSelectedCategory(p.category.id);
        setProductImage(p.image || p.images?.[0] || null);
        setShopId(p.shopId ?? null);
        if (!p.shopId) setShopNameStandalone(p.vendor || '');
        setCondition((p.condition as ProductCondition | undefined) ?? null);
        setDeliveryFulfillment(p.deliveryFulfillment ?? 'PRODUCT_OWNER');
        setDeliveryMode((p.deliveryMode as DeliveryMode | undefined) ?? 'FLEXIBLE');
        setDeliveryNotes(p.deliveryNotes || '');
      } catch {
        showToast('Could not load product', 'error');
        router.back();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, productId, showToast]);

  const pickFromCamera = useCallback(async () => {
    setImageSourceOpen(false);
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera access',
          'Allow camera access in Settings to take a product photo.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync(productImagePickerOptions);
      if (!result.canceled && result.assets[0]) {
        setProductImage(result.assets[0].uri);
      }
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Could not open camera', 'error');
    }
  }, [showToast]);

  const pickFromLibrary = useCallback(async () => {
    setImageSourceOpen(false);
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo library',
          'Allow photo library access in Settings to choose an image.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        ...productImagePickerOptions,
      });
      if (!result.canceled && result.assets[0]) {
        setProductImage(result.assets[0].uri);
      }
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Could not open photos', 'error');
    }
  }, [showToast]);

  const pickFromFiles = useCallback(async () => {
    setImageSourceOpen(false);
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setProductImage(result.assets[0].uri);
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Could not open file picker', 'error');
    }
  }, [showToast]);

  const runAiScan = useCallback(async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') {
        Alert.alert('Camera', 'Camera access is needed to scan a product.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      setAiPreview(uri);
      setAiLoading(true);
      setProductImage(uri);
      try {
        const scan = await vendorAPI.aiScanProductImage(uri);
        setProductName(scan.name);
        setDescription(scan.description);
        if (scan.categoryId) setSelectedCategory(scan.categoryId);
        if (scan.estimatedPrice != null) setPrice(String(scan.estimatedPrice));
        showToast('AI suggestions applied — review before saving', 'success');
      } catch {
        showToast('AI scan failed — fill fields manually', 'error');
      } finally {
        setAiLoading(false);
        setAiPreview(null);
      }
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Scan failed', 'error');
      setAiLoading(false);
      setAiPreview(null);
    }
  }, [showToast]);

  const submit = useCallback(async () => {
    if (!productName.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (!price.trim()) {
      showToast('Price is required', 'error');
      return;
    }
    if (!selectedCategory) {
      showToast('Select a category', 'error');
      return;
    }
    if (!productImage) {
      showToast('Add a product image', 'error');
      return;
    }
    if (!shopId && !shopNameStandalone.trim()) {
      showToast('Select a shop or enter a seller / shop name', 'error');
      return;
    }
    if (mode === 'create') {
      if (!deliveryFulfillment) {
        showToast('Choose who is responsible for delivery: Company (App) or you as the product owner', 'error');
        return;
      }
      if (!deliveryMode) {
        showToast('Choose how delivery will work', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        await vendorAPI.createProduct({
          ...(shopId ? { shopId } : { shopName: shopNameStandalone.trim() }),
          name: productName.trim(),
          description: description.trim() || undefined,
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
          discount: discount ? parseInt(discount, 10) : undefined,
          categoryId: selectedCategory,
          stock: stock ? parseInt(stock, 10) : 0,
          image: productImage || undefined,
          images: productImage ? [productImage] : undefined,
          ...(condition ? { condition } : {}),
          deliveryFulfillment: deliveryFulfillment!,
          deliveryMode: deliveryMode!,
          ...(deliveryNotes.trim() ? { deliveryNotes: deliveryNotes.trim() } : {}),
        });
        showToast('Product created', 'success');
      } else if (productId) {
        await vendorAPI.updateProduct(productId, {
          name: productName.trim(),
          description: description.trim() || undefined,
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
          discount: discount ? parseInt(discount, 10) : undefined,
          categoryId: selectedCategory,
          stock: stock ? parseInt(stock, 10) : 0,
          image: productImage || undefined,
          images: productImage ? [productImage] : undefined,
          shopId: shopId ?? null,
          shopName: !shopId ? shopNameStandalone.trim() : undefined,
          condition: condition ?? null,
          deliveryNotes: deliveryNotes.trim(),
        });
        showToast('Product updated', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.back();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      showToast(msg || 'Request failed', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    mode,
    productId,
    shopId,
    shopNameStandalone,
    productName,
    description,
    price,
    originalPrice,
    discount,
    stock,
    selectedCategory,
    productImage,
    showToast,
    queryClient,
    condition,
    deliveryFulfillment,
    deliveryMode,
    deliveryNotes,
  ]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  const selectedShopLabel =
    shopId === null
      ? 'No shop (standalone)'
      : shops.find((s) => s.id === shopId)?.name || 'Select shop';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.aiBtn} onPress={runAiScan} disabled={aiLoading}>
          <Ionicons name="scan-outline" size={22} color="#FFFFFF" />
          <Text style={styles.aiBtnText}>
            {aiLoading ? 'Analyzing…' : 'Scan with AI (camera)'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Shop / company</Text>
        <TouchableOpacity style={styles.selectRow} onPress={() => setShopPickerOpen(true)}>
          <Text style={styles.selectText}>{selectedShopLabel}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {!shopId ? (
          <>
            <Text style={styles.hint}>Shown as vendor name when not using a shop</Text>
            <TextInput
              style={styles.input}
              placeholder="Seller or brand name"
              placeholderTextColor="#9CA3AF"
              value={shopNameStandalone}
              onChangeText={setShopNameStandalone}
            />
          </>
        ) : null}

        <Text style={styles.label}>Product name *</Text>
        <TextInput
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
          placeholder="Product name"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor="#9CA3AF"
          multiline
        />

        <Text style={styles.label}>Category *</Text>
        {catLoading ? (
          <ActivityIndicator color="#667eea" style={{ marginBottom: 16 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, selectedCategory === c.id && styles.catChipOn]}
                onPress={() => setSelectedCategory(c.id)}
              >
                <Text style={[styles.catChipText, selectedCategory === c.id && styles.catChipTextOn]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>Image *</Text>
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={() => setImageSourceOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Add product image"
        >
          {productImage ? (
            <ExpoImage source={{ uri: productImage }} style={styles.imagePreview} contentFit="cover" />
          ) : (
            <View style={styles.imagePh}>
              <Ionicons name="images-outline" size={32} color="#9CA3AF" />
              <Text style={styles.imagePhText}>Tap to add</Text>
              <Text style={styles.imagePhSub}>Camera, photos, or files</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Price (₦) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Original (₦)</Text>
            <TextInput
              style={styles.input}
              value={originalPrice}
              onChangeText={setOriginalPrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Discount %</Text>
            <TextInput
              style={styles.input}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Stock</Text>
            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <Text style={styles.label}>Condition (optional)</Text>
        <Text style={styles.hint}>e.g. brand new, foreign used, or local used — great for cars & big-ticket items</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catChip, condition === null && styles.catChipOn]}
            onPress={() => setCondition(null)}
          >
            <Text style={[styles.catChipText, condition === null && styles.catChipTextOn]}>Not set</Text>
          </TouchableOpacity>
          {PRODUCT_CONDITION_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[styles.catChip, condition === o.value && styles.catChipOn]}
              onPress={() => setCondition(o.value)}
            >
              <Text style={[styles.catChipText, condition === o.value && styles.catChipTextOn]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {mode === 'create' ? (
          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>Delivery & responsibility</Text>
            <View style={styles.permanentBanner}>
              <Ionicons name="warning-outline" size={20} color="#B45309" />
              <Text style={styles.permanentBannerText}>
                Choose carefully: who handles delivery and how it works are saved when you create this listing
                and cannot be changed later. This keeps expectations clear for everyone.
              </Text>
            </View>

            <Text style={styles.label}>Who is responsible for delivery? *</Text>
            <Text style={styles.hint}>
              Company (App) = coordinated through PricePulse. Product owner = you arrange pickup or delivery
              yourself.
            </Text>
            {DELIVERY_FULFILLMENT_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[
                  styles.fulfillmentCard,
                  deliveryFulfillment === o.value && styles.fulfillmentCardOn,
                ]}
                onPress={() => setDeliveryFulfillment(o.value)}
                activeOpacity={0.88}
              >
                <View style={styles.fulfillmentCardHeader}>
                  <View
                    style={[styles.radioOuter, deliveryFulfillment === o.value && styles.radioOuterOn]}
                  >
                    {deliveryFulfillment === o.value ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={styles.fulfillmentTitle}>{o.title}</Text>
                </View>
                <Text style={styles.fulfillmentSubtitle}>{o.subtitle}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>How will delivery work? *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {DELIVERY_MODE_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.catChip, deliveryMode === o.value && styles.catChipOn]}
                  onPress={() => setDeliveryMode(o.value)}
                >
                  <Text style={[styles.catChipText, deliveryMode === o.value && styles.catChipTextOn]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Delivery notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="Pickup location, timing, fees, inspection, etc."
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>
        ) : (
          <View style={styles.deliveryLocked}>
            <View style={styles.deliveryLockedHeader}>
              <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
              <Text style={styles.deliveryLockedTitle}>Delivery (locked)</Text>
            </View>
            <Text style={styles.deliveryLockedExplainer}>
              Responsibility and delivery method were set when this listing was created and cannot be modified.
            </Text>
            <View style={styles.lockedRow}>
              <Text style={styles.lockedLabel}>Responsibility</Text>
              <Text style={styles.lockedValue}>
                {formatDeliveryFulfillment(deliveryFulfillment) ?? '—'}
              </Text>
            </View>
            <View style={styles.lockedRow}>
              <Text style={styles.lockedLabel}>How delivery works</Text>
              <Text style={styles.lockedValue}>{formatDeliveryMode(deliveryMode) ?? '—'}</Text>
            </View>
            <Text style={styles.label}>Delivery notes</Text>
            <Text style={styles.hint}>You can still update notes for buyers.</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="Pickup location, timing, fees, inspection, etc."
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDis]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>{mode === 'create' ? 'Create product' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={imageSourceOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setImageSourceOpen(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetFlexDim} onPress={() => setImageSourceOpen(false)} />
          <SafeAreaView edges={['bottom']} style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Product image</Text>
            <Text style={styles.sheetSubtitle}>Choose how to add a picture</Text>
            <Pressable style={styles.sheetRow} onPress={pickFromCamera} android_ripple={{ color: '#E5E7EB' }}>
              <Ionicons name="camera-outline" size={22} color="#374151" />
              <Text style={styles.sheetRowText}>Take photo</Text>
            </Pressable>
            <Pressable style={styles.sheetRow} onPress={pickFromLibrary} android_ripple={{ color: '#E5E7EB' }}>
              <Ionicons name="images-outline" size={22} color="#374151" />
              <Text style={styles.sheetRowText}>Choose from photos</Text>
            </Pressable>
            <Pressable style={styles.sheetRow} onPress={pickFromFiles} android_ripple={{ color: '#E5E7EB' }}>
              <Ionicons name="document-outline" size={22} color="#374151" />
              <Text style={styles.sheetRowText}>Choose from files</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetRow, styles.sheetCancel]}
              onPress={() => setImageSourceOpen(false)}
              android_ripple={{ color: '#E5E7EB' }}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={shopPickerOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShopPickerOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attach shop</Text>
            <TouchableOpacity
              style={styles.modalRow}
              onPress={() => {
                setShopId(null);
                setShopPickerOpen(false);
              }}
            >
              <Text style={styles.modalRowText}>No shop (standalone)</Text>
            </TouchableOpacity>
            {shops.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.modalRow}
                onPress={() => {
                  setShopId(s.id);
                  setShopPickerOpen(false);
                }}
              >
                <Text style={styles.modalRowText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {aiLoading && aiPreview ? (
        <View style={styles.aiOverlay}>
          <ExpoImage source={{ uri: aiPreview }} style={styles.aiOverlayImg} contentFit="cover" />
          <View style={styles.aiOverlayInner}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.aiOverlayText}>Analyzing image…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 20, paddingBottom: 40 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  aiBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
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
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectText: { fontSize: 16, color: '#111827', flex: 1 },
  catScroll: { marginBottom: 16, maxHeight: 44 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catChipOn: { backgroundColor: '#667eea', borderColor: '#667eea' },
  catChipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  catChipTextOn: { color: '#FFFFFF' },
  imagePicker: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePh: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  imagePhText: { marginTop: 8, color: '#6B7280', fontSize: 15, fontWeight: '600' },
  imagePhSub: { marginTop: 4, color: '#9CA3AF', fontSize: 12 },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetFlexDim: { flex: 1 },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sheetRowText: { fontSize: 16, color: '#111827', fontWeight: '500' },
  sheetCancel: { justifyContent: 'center', marginTop: 4, marginBottom: 4 },
  sheetCancelText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  submit: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDis: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', padding: 12, color: '#111827' },
  modalRow: { paddingVertical: 14, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  modalRowText: { fontSize: 16, color: '#374151' },
  aiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiOverlayImg: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  aiOverlayInner: { alignItems: 'center' },
  aiOverlayText: { color: '#FFFFFF', marginTop: 16, fontSize: 16, fontWeight: '600' },
  deliverySection: {
    marginTop: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  permanentBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  permanentBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  fulfillmentCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  fulfillmentCardOn: {
    borderColor: '#667eea',
    backgroundColor: '#F5F3FF',
  },
  fulfillmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: { borderColor: '#667eea' },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#667eea',
  },
  fulfillmentTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  fulfillmentSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 22,
    marginLeft: 30,
  },
  deliveryLocked: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 8,
  },
  deliveryLockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deliveryLockedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  deliveryLockedExplainer: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 20,
  },
  lockedRow: {
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lockedLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4, fontWeight: '600' },
  lockedValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
});
