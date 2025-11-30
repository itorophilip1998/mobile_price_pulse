import { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { OTPInput } from '@/components/auth/otp-input';

// Verification token expiration time (24 hours in milliseconds)
const VERIFICATION_EXPIRY_HOURS = 24;
const VERIFICATION_EXPIRY_MS = VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000;

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const [token, setToken] = useState((params.token as string) || '');
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Calculate expiration time
  useEffect(() => {
    // If token is provided via URL, calculate expiration from now
    // In a real app, you'd get the expiration time from the backend
    if (params.token) {
      // For URL tokens, assume they expire in 24 hours from now
      const expiryTime = Date.now() + VERIFICATION_EXPIRY_MS;
      const interval = setInterval(() => {
        const remaining = expiryTime - Date.now();
        if (remaining <= 0) {
          setIsExpired(true);
          setTimeRemaining(0);
          clearInterval(interval);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // For manual entry, start countdown from 24 hours
      const expiryTime = Date.now() + VERIFICATION_EXPIRY_MS;
      const interval = setInterval(() => {
        const remaining = expiryTime - Date.now();
        if (remaining <= 0) {
          setIsExpired(true);
          setTimeRemaining(0);
          clearInterval(interval);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleOTPComplete = (otp: string) => {
    setToken(otp);
    // Auto-verify when OTP is complete
    handleVerify(otp);
  };

  const handleVerify = async (otpValue?: string) => {
    const tokenToVerify = otpValue || token;
    
    if (!tokenToVerify || tokenToVerify.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit verification code');
      return;
    }

    if (isExpired) {
      Alert.alert('Expired', 'This verification code has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      await mobileAuthAPI.verifyEmail(tokenToVerify);
      Alert.alert('Success', 'Email verified successfully!', [
        { text: 'OK', onPress: () => router.replace('/auth') },
      ]);
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to verify email';
      Alert.alert('Error', errorMessage);
      
      // Clear OTP on error
      if (errorMessage.includes('expired')) {
        setIsExpired(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    Alert.alert('Resend Code', 'Please sign up again to receive a new verification code.');
  };

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
            We've sent a 6-digit verification code to your email address. Please enter it below to verify your account.
          </Text>

          {/* OTP Input Boxes */}
          <OTPInput
            length={6}
            onComplete={handleOTPComplete}
            autoFocus={true}
            disabled={isLoading || isExpired}
          />

          {/* Expiration Timer */}
          {timeRemaining !== null && (
            <View style={styles.timerContainer}>
              {isExpired ? (
                <Text style={styles.expiredText}>Verification code has expired</Text>
              ) : (
                <>
                  <Text style={styles.timerLabel}>Code expires in:</Text>
                  <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, (isLoading || isExpired) && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={isLoading || isExpired}
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
              <Text style={styles.primaryButtonText}>
                {isExpired ? 'Code Expired' : 'Verify Email'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={isLoading}>
              <Text style={[styles.resendLink, isLoading && styles.resendLinkDisabled]}>
                Resend Code
              </Text>
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
  timerContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timerLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: 0.5,
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
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
  resendLinkDisabled: {
    opacity: 0.5,
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
