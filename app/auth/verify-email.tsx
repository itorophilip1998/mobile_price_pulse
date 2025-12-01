import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
import { useToast } from '@/components/ui/toast-provider';
import { useAuth } from '@/hooks/use-auth';
import { tokenStorage } from '@/lib/auth/storage';

// Verification token expiration time (5 minutes in milliseconds)
const VERIFICATION_EXPIRY_MINUTES = 5;
const VERIFICATION_EXPIRY_MS = VERIFICATION_EXPIRY_MINUTES * 60 * 1000;

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { signin } = useAuth();
  const [token, setToken] = useState((params.token as string) || '');
  const [email, setEmail] = useState((params.email as string) || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpKey, setOtpKey] = useState(0); // Key to force OTP input reset

  // Calculate expiration time - timer that updates every second
  useEffect(() => {
    // Start countdown from 5 minutes if not already set
    if (timeRemaining === null) {
      setTimeRemaining(VERIFICATION_EXPIRY_MS);
      return;
    }
    
    // Only run timer if we have time remaining and not expired
    if (timeRemaining <= 0 || isExpired) {
      return;
    }
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          setIsExpired(true);
          return 0;
        }
        const remaining = prev - 1000;
        if (remaining <= 0) {
          setIsExpired(true);
          return 0;
        }
        return remaining;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeRemaining, isExpired]); // Restart timer when timeRemaining changes (e.g., after resend)

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
    
    // Validate OTP format
    if (!tokenToVerify || tokenToVerify.length !== 6) {
      showToast('Please enter the complete 6-digit verification code', 'error');
      return;
    }

    // Validate numeric only
    if (!/^\d{6}$/.test(tokenToVerify)) {
      showToast('Verification code must contain only numbers', 'error');
      return;
    }

    if (isExpired) {
      showToast('This verification code has expired. Please request a new one.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await mobileAuthAPI.verifyEmail(tokenToVerify);
      
      // Auto-login if tokens are provided
      if (response.accessToken && response.refreshToken && response.user) {
        await tokenStorage.setTokens(response.accessToken, response.refreshToken);
        await tokenStorage.setUser(response.user);
        showToast('Email verified successfully! Logging you in...', 'success');
        
        // Small delay for toast to show, then navigate
        setTimeout(() => {
          router.replace('/');
        }, 500);
      } else {
        showToast('Email verified successfully!', 'success');
        setTimeout(() => {
          router.replace('/auth');
        }, 1500);
      }
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to verify email';
      showToast(errorMessage, 'error');
      
      // Clear OTP on error
      if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        setIsExpired(true);
        setToken('');
        setOtpKey((prev) => prev + 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    // Validate email
    if (!email) {
      showToast('Email address is required to resend verification code. Please sign up again.', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Invalid email address format', 'error');
      return;
    }

    if (resendCooldown > 0) {
      showToast(`Please wait ${resendCooldown} seconds before requesting a new code.`, 'warning');
      return;
    }

    setIsResending(true);
    try {
      const response = await mobileAuthAPI.resendVerificationEmail(email);
      
      // Clear the OTP input so user can enter the new code
      setToken('');
      setOtpKey((prev) => prev + 1); // Force OTP component to reset
      
      // Reset timer to exactly 5 minutes
      if (response.verificationExpiresAt) {
        const expiryTime = new Date(response.verificationExpiresAt).getTime();
        const remaining = expiryTime - Date.now();
        // Always set to full 5 minutes to ensure accurate countdown
        setTimeRemaining(VERIFICATION_EXPIRY_MS);
      } else {
        // Start new 5-minute countdown
        setTimeRemaining(VERIFICATION_EXPIRY_MS);
      }
      setIsExpired(false);

      // Set cooldown (30 seconds)
      setResendCooldown(30);
      const cooldownInterval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      showToast('A new verification code has been sent to your email', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend verification code. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsResending(false);
    }
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
            key={otpKey}
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
            <TouchableOpacity 
              onPress={handleResend} 
              disabled={isLoading || isResending || resendCooldown > 0}
            >
              <Text style={[
                styles.resendLink, 
                (isLoading || isResending || resendCooldown > 0) && styles.resendLinkDisabled
              ]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
          {email && (
            <Text style={styles.emailHint}>Code will be sent to: {email}</Text>
          )}

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
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    width: '100%',
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
    paddingHorizontal: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
    maxWidth: '100%',
  },
  timerLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
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
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  emailHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
});
