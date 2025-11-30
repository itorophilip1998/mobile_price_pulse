import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mobileAuthAPI } from '@/lib/auth/api';
import { router, useLocalSearchParams } from 'expo-router';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const [token, setToken] = useState((params.token as string) || '');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenFocused, setTokenFocused] = useState(false);

  const handleVerify = async () => {
    if (!token) {
      Alert.alert('Error', 'Please enter verification token');
      return;
    }

    setIsLoading(true);
    try {
      await mobileAuthAPI.verifyEmail(token);
      Alert.alert('Success', 'Email verified successfully!', [
        { text: 'OK', onPress: () => router.replace('/auth') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to verify email');
    } finally {
      setIsLoading(false);
    }
  };

  const hasTokenValue = token.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/auth')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>✉️</Text>
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to your email address. Please enter it below to verify your account.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                tokenFocused && styles.inputFocused,
                hasTokenValue && styles.inputFilled,
              ]}
              placeholder=""
              placeholderTextColor="transparent"
              value={token}
              onChangeText={setToken}
              onFocus={() => setTokenFocused(true)}
              onBlur={() => setTokenFocused(false)}
              autoCapitalize="none"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text
              style={[
                styles.floatingLabel,
                (tokenFocused || hasTokenValue) && styles.floatingLabelActive,
              ]}
            >
              Verification Code
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>Didn't receive the code?</Text>
            <TouchableOpacity>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/auth')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconText: {
    fontSize: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    marginBottom: 56,
    textAlign: 'center',
    lineHeight: 26,
  },
  inputWrapper: {
    marginBottom: 40,
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    paddingTop: 36,
    fontSize: 28,
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
    height: 80,
  },
  inputFocused: {
    borderColor: '#667eea',
  },
  inputFilled: {
    borderColor: '#667eea',
  },
  floatingLabel: {
    position: 'absolute',
    left: 24,
    top: 28,
    fontSize: 20,
    color: '#9CA3AF',
    pointerEvents: 'none',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  floatingLabelActive: {
    top: 14,
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  helpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  helpText: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 4,
  },
  resendLink: {
    fontSize: 15,
    color: '#667eea',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
});
