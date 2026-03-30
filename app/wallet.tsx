import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { walletAPI } from '@/lib/api/wallet';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useToast } from '@/components/ui/toast-provider';

function WalletContent() {
  const { getToken } = useClerkAuth();
  const { showToast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState('NGN');
  const [loading, setLoading] = useState(true);
  const [fundAmount, setFundAmount] = useState('');
  const [funding, setFunding] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await walletAPI.getBalance(token ?? undefined);
      setBalance(data.balance);
      setCurrency(data.currency || 'NGN');
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleFund = async () => {
    const amount = parseFloat(fundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    setFunding(true);
    try {
      const token = await getToken();
      const data = await walletAPI.addFunds(amount, token ?? undefined);
      setBalance(data.balance);
      setFundAmount('');
      showToast(`₦${amount.toLocaleString()} added to wallet`, 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      showToast(msg || 'Failed to add funds', 'error');
    } finally {
      setFunding(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
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
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>
              ₦{(balance ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.balanceCurrency}>{currency}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fund wallet</Text>
            <Text style={styles.sectionDesc}>
              Add money to your wallet to pay for orders. You can also add a card below.
            </Text>
            <TextInput
              style={styles.input}
              value={fundAmount}
              onChangeText={setFundAmount}
              placeholder="Amount (e.g. 5000)"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.fundButton, funding && styles.fundButtonDisabled]}
              onPress={handleFund}
              disabled={funding}
            >
              <Text style={styles.fundButtonText}>
                {funding ? 'Adding...' : 'Add funds'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add card / Payment methods</Text>
            <Text style={styles.sectionDesc}>
              Link a card to fund your wallet or pay at checkout. Coming soon.
            </Text>
            <TouchableOpacity
              style={styles.addCardButton}
              onPress={() => showToast('Payment methods coming soon', 'info')}
            >
              <Ionicons name="card-outline" size={22} color="#667eea" />
              <Text style={styles.addCardButtonText}>Add card</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function WalletScreen() {
  return (
    <ProtectedScreen>
      <WalletContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
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
  balanceCard: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceCurrency: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  fundButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fundButtonDisabled: {
    opacity: 0.6,
  },
  fundButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 12,
  },
  addCardButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
});
