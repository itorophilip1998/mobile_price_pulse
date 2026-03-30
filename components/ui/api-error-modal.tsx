import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiErrorDetail } from '@/lib/api-error';

interface ApiErrorModalProps {
  visible: boolean;
  title: string;
  error: unknown;
  onClose: () => void;
}

export function ApiErrorModal({ visible, title, error, onClose }: ApiErrorModalProps) {
  const detail = getApiErrorDetail(error);

  const share = () => {
    Share.share({
      title,
      message: `${title}\n\n${detail}`,
    }).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{title}</Text>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.body} selectable>
                {detail}
              </Text>
            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={share}>
                <Text style={styles.secondaryLabel}>Share details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryLabel}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  safe: { width: '100%' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: Platform.OS === 'ios' ? '88%' : '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  scroll: { maxHeight: 420 },
  scrollContent: { paddingBottom: 8 },
  body: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  secondaryLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  primaryLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
