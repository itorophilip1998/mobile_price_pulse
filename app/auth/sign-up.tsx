import { useEffect, useState } from 'react';
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
import { useSignUp, useAuth, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { OTPInput } from '@/components/auth/otp-input';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength';
import { GoogleLogo } from '@/components/google-logo';
import { profileAPI } from '@/lib/api/profile';

export default function SignUpScreen() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [otpKey, setOtpKey] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;
    setIsGoogleLoading(true);
    try {
      const result = await startOAuthFlow({
        redirectUrl: Linking.createURL('/auth/callback', { scheme: 'pricepulse' }),
      });
      if (result?.createdSessionId && result?.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace('/marketplace');
      } else if (result?.authSessionResult?.type !== 'success' && result?.authSessionResult?.type !== 'cancel') {
        Alert.alert('Sign up cancelled', 'Google sign-up was not completed.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-up failed. Please try again.';
      Alert.alert('Google sign-up failed', String(message));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/marketplace');
    }
  }, [isSignedIn]);

  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Error', 'Please enter a password of at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        await saveUsernameToProfile();
        router.replace('/marketplace');
        return;
      }

      try {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } catch {
        // Already prepared or not needed — still show verify step
      }
      setStep('verify');
      setOtpKey((k) => k + 1);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: Array<{ message?: string }> }).errors?.[0]?.message
          : err instanceof Error
            ? err.message
            : 'Sign up failed. Please try again.';
      Alert.alert('Sign up failed', String(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp || resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setOtpKey((k) => k + 1);
      setResendCooldown(60);
      let remaining = 60;
      const interval = setInterval(() => {
        remaining -= 1;
        setResendCooldown(remaining);
        if (remaining <= 0) clearInterval(interval);
      }, 1000);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: Array<{ message?: string }> }).errors?.[0]?.message
          : err instanceof Error ? err.message : 'Could not resend code. Try again.';
      Alert.alert('Resend failed', String(message));
    } finally {
      setIsLoading(false);
    }
  };

  const saveUsernameToProfile = async () => {
    if (!username.trim()) return;
    try {
      const names = username.trim().split(/\s+/);
      await profileAPI.updateProfile({
        firstName: names[0] || username.trim(),
        lastName: names.slice(1).join(' ') || undefined,
      });
    } catch {
      // best-effort — user is already signed up
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!isLoaded || !signUp) return;
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code from your email');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        await saveUsernameToProfile();
        router.replace('/marketplace');
      } else {
        Alert.alert('Error', 'Verification could not be completed. Please try again.');
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: Array<{ message?: string }> }).errors?.[0]?.message
          : err instanceof Error
            ? err.message
            : 'Invalid or expired code. Please try again.';
      Alert.alert('Verification failed', String(message));
    } finally {
      setIsLoading(false);
    }
  };

  const hasUsernameValue = username.length > 0;
  const hasEmailValue = email.length > 0;
  const hasPasswordValue = password.length > 0;

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (step === 'verify') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setStep('form')}
              style={styles.backButton}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to your email. Enter it here to verify your account.
            </Text>
            <OTPInput
              key={otpKey}
              length={6}
              onComplete={handleVerifyCode}
              autoFocus
              disabled={isLoading}
            />
            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn&apos;t get the code? </Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={isLoading || resendCooldown > 0}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (isLoading || resendCooldown > 0) && styles.resendLinkDisabled,
                  ]}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#667eea"
                style={{ marginVertical: 24 }}
              />
            )}
            <TouchableOpacity
              onPress={() => router.replace('/auth')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Back to <Text style={styles.secondaryButtonLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Enter your details below or continue with Google.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                usernameFocused ? styles.inputFocused : null,
              ]}
              placeholder=""
              placeholderTextColor="transparent"
              value={username}
              onChangeText={setUsername}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              editable={!isLoading}
            />
            <Text
              style={[
                styles.floatingLabel,
                usernameFocused && styles.floatingLabelFocused,
                (usernameFocused || hasUsernameValue) && styles.floatingLabelActive,
                !usernameFocused && hasUsernameValue && styles.floatingLabelInactive,
              ]}
            >
              Username
            </Text>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                emailFocused ? styles.inputFocused : null,
              ]}
              placeholder=""
              placeholderTextColor="transparent"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!isLoading}
            />
            <Text
              style={[
                styles.floatingLabel,
                emailFocused && styles.floatingLabelFocused,
                (emailFocused || hasEmailValue) && styles.floatingLabelActive,
                !emailFocused && hasEmailValue && styles.floatingLabelInactive,
              ]}
            >
              Email Address
            </Text>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                styles.inputWithEye,
                passwordFocused ? styles.inputFocused : null,
              ]}
              placeholder=""
              placeholderTextColor="transparent"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="off"
              {...(Platform.OS === 'ios' && { textContentType: 'none' })}
              editable={!isLoading}
            />
            <Text
              style={[
                styles.floatingLabel,
                passwordFocused && styles.floatingLabelFocused,
                (passwordFocused || hasPasswordValue) &&
                  styles.floatingLabelActive,
                !passwordFocused &&
                  hasPasswordValue &&
                  styles.floatingLabelInactive,
              ]}
            >
              Password (min 8 characters)
            </Text>
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
          {(passwordFocused || hasPasswordValue) && (
            <PasswordStrengthIndicator password={password} />
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
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
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.socialSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity
              style={[styles.googleButton, (isLoading || isGoogleLoading) && styles.buttonDisabled]}
              onPress={handleGoogleSignUp}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <>
                  <GoogleLogo width={22} height={22} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/auth')}
              style={styles.secondaryButton}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>
                Already have an account? <Text style={styles.secondaryButtonLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 88,
    paddingBottom: 24,
  },
  socialSection: {
    marginTop: 8,
  },
  header: {
    marginBottom: 4,
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 28,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
    fontSize: 16,
    color: '#111827',
    height: 64,
  },
  inputWithEye: {
    paddingRight: 56,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 20,
    padding: 8,
  },
  inputFocused: {
    borderColor: '#667eea',
    borderWidth: 1,
  },
  floatingLabel: {
    position: 'absolute',
    left: 20,
    top: 22,
    fontSize: 15,
    color: '#9CA3AF',
    pointerEvents: 'none',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  floatingLabelFocused: {
    color: '#667eea',
  },
  floatingLabelActive: {
    top: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  floatingLabelInactive: {
    color: '#9CA3AF',
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  resendLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
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
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  secondaryButtonLink: {
    color: '#667eea',
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  googleButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
});
