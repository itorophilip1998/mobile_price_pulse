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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { OTPInput } from '@/components/auth/otp-input';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength';
import { maskEmail } from '@/lib/utils/mask-email';

export default function ForgotPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeEntered, setCodeEntered] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasEmailValue = email.length > 0;
  const hasPasswordValue = password.length > 0;
  const hasConfirmValue = confirmPassword.length > 0;

  const handleCodeComplete = (otp: string) => {
    setCode(otp);
    setCodeEntered(true);
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setCodeSent(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: Array<{ longMessage?: string; message?: string }> }).errors?.[0]
              ?.longMessage ||
            (err as { errors: Array<{ message?: string }> }).errors?.[0]?.message
          : err instanceof Error
            ? err.message
            : 'Failed to send reset code. Please try again.';
      Alert.alert('Error', String(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code from your email');
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Error', 'Please enter a new password (at least 8 characters)');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    try {
      let result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
      });
      if (result.status === 'needs_new_password' || result.status === 'complete') {
        result = await signIn.resetPassword({ password });
      }
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace('/marketplace');
        return;
      }
      if (result.status === 'needs_second_factor') {
        Alert.alert('Security check', 'Two-factor authentication is required. Please sign in again and complete 2FA.');
        router.replace('/auth');
        return;
      }
      Alert.alert('Error', 'Could not complete password reset. Please try again.');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: Array<{ longMessage?: string; message?: string }> }).errors?.[0]
              ?.longMessage ||
            (err as { errors: Array<{ message?: string }> }).errors?.[0]?.message
          : err instanceof Error
            ? err.message
            : 'Failed to reset password. Please try again.';
      Alert.alert('Error', String(msg));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </View>
    );
  }

  if (codeSent) {
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailText}>{maskEmail(email)}</Text>
              {'\n'}
              {codeEntered
                ? 'Now enter your new password below.'
                : 'Enter it below.'}
            </Text>

            <View style={styles.otpWrapper}>
              <OTPInput
                length={6}
                onComplete={handleCodeComplete}
                autoFocus={true}
                disabled={codeEntered}
              />
            </View>

            {codeEntered && (
              <>
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
                    autoComplete="new-password"
                  />
                  <Text
                    style={[
                      styles.floatingLabel,
                      passwordFocused && styles.floatingLabelFocused,
                      (passwordFocused || hasPasswordValue) && styles.floatingLabelActive,
                      !passwordFocused && hasPasswordValue && styles.floatingLabelInactive,
                    ]}
                  >
                    New password
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

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithEye,
                      confirmFocused ? styles.inputFocused : null,
                    ]}
                    placeholder=""
                    placeholderTextColor="transparent"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                  />
                  <Text
                    style={[
                      styles.floatingLabel,
                      confirmFocused && styles.floatingLabelFocused,
                      (confirmFocused || hasConfirmValue) && styles.floatingLabelActive,
                      !confirmFocused && hasConfirmValue && styles.floatingLabelInactive,
                    ]}
                  >
                    Confirm password
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
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
                    <Text style={styles.primaryButtonText}>Reset password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                setCodeSent(false);
                setCodeEntered(false);
                setCode('');
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Use a different email</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Forgot your password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset code.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, emailFocused ? styles.inputFocused : null]}
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

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSendCode}
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
              <Text style={styles.primaryButtonText}>Send reset code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 15,
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
    marginTop: 16,
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
  emailText: {
    fontWeight: '600',
    color: '#111827',
  },
  otpWrapper: {
    marginBottom: 24,
    width: '100%',
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
    height: 56,
  },
  inputWithEye: {
    paddingRight: 56,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 17,
    padding: 8,
  },
  inputFocused: {
    borderColor: '#667eea',
    borderWidth: 1,
  },
  floatingLabel: {
    position: 'absolute',
    left: 20,
    top: 20,
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
    marginBottom: 24,
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
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
});
