import { useEffect, useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignIn, useAuth, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { GoogleLogo } from '@/components/google-logo';
import { tokenStorage } from '@/lib/auth/storage';
import { profileAPI } from '@/lib/api/profile';
import { API_CONFIG } from '@/lib/config';

type RememberedAccount = { email: string; username?: string; imageUrl?: string };

export default function AuthScreen() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberedAccount, setRememberedAccount] = useState<RememberedAccount | null>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/marketplace');
    }
  }, [isSignedIn]);

  useEffect(() => {
    tokenStorage.getRememberedAccount().then((account) => {
      setRememberedAccount(account);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;
    setIsGoogleLoading(true);
    try {
      const result = await startOAuthFlow({
        redirectUrl: Linking.createURL('/auth/callback', { scheme: 'pricepulse' }),
      });
      if (result?.createdSessionId && result?.setActive) {
        await result.setActive({ session: result.createdSessionId });
        if (rememberMe) {
          try {
            const u = await profileAPI.getCurrentUser();
            const displayName =
              [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') ||
              u.email.split('@')[0];
            await tokenStorage.setRememberedAccount({
              email: u.email,
              username: displayName || undefined,
              imageUrl: u.profile?.avatar,
            });
          } catch {
            // ignore – user is signed in
          }
        }
        router.replace('/marketplace');
      } else if (result?.authSessionResult?.type !== 'success') {
        // User cancelled or flow failed
        if (result?.authSessionResult?.type !== 'cancel') {
          Alert.alert('Sign in cancelled', 'Google sign-in was not completed.');
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      Alert.alert('Google sign-in failed', String(message));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        strategy: 'password',
        password,
      });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        if (rememberMe) {
          try {
            const u = await profileAPI.getCurrentUser();
            const displayName =
              [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') ||
              u.email.split('@')[0];
            await tokenStorage.setRememberedAccount({
              email: u.email,
              username: displayName || undefined,
              imageUrl: u.profile?.avatar,
            });
          } catch {
            // ignore – user is signed in, remember me is best-effort
          }
        }
        router.replace('/marketplace');
      } else {
        Alert.alert('Error', 'Sign-in could not be completed. Please try again.');
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: Array<{ message?: string }> }).errors?.[0]?.message
          : err instanceof Error
            ? err.message
            : 'Invalid email or password. Please try again.';
      Alert.alert('Sign in failed', String(message));
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Use your email and password, or sign in with Google.
          </Text>

          {rememberedAccount && (
            <TouchableOpacity
              style={styles.rememberedCard}
              onPress={() => {
                setEmail(rememberedAccount.email);
                setTimeout(() => passwordInputRef.current?.focus(), 100);
              }}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <View style={styles.rememberedAvatar}>
                {rememberedAccount.imageUrl ? (
                  <Image
                    source={{
                      uri: rememberedAccount.imageUrl.startsWith('http')
                        ? rememberedAccount.imageUrl
                        : `${API_CONFIG.BASE_URL.replace(/\/$/, '')}${rememberedAccount.imageUrl.startsWith('/') ? '' : '/'}${rememberedAccount.imageUrl}`,
                    }}
                    style={styles.rememberedAvatarImage}
                  />
                ) : (
                  <Text style={styles.rememberedAvatarText}>
                    {(rememberedAccount.username || rememberedAccount.email)[0].toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.rememberedInfo}>
                <Text style={styles.rememberedName} numberOfLines={1}>
                  {rememberedAccount.username || rememberedAccount.email.split('@')[0]}
                </Text>
                <Text style={styles.rememberedEmail} numberOfLines={1}>
                  {rememberedAccount.email}
                </Text>
              </View>
              <Text style={styles.continueAsHint}>Tap to sign in</Text>
            </TouchableOpacity>
          )}

          {rememberedAccount && (
            <TouchableOpacity
              onPress={async () => {
                await tokenStorage.clearRememberedAccount();
                setRememberedAccount(null);
              }}
              style={styles.useAnotherAccount}
            >
              <Text style={styles.useAnotherAccountText}>Use another account</Text>
            </TouchableOpacity>
          )}

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
              ref={passwordInputRef}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
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
              Password
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

          <TouchableOpacity
            onPress={() => router.push('/auth/forgot-password')}
            style={styles.forgotPasswordLink}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordLinkText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rememberMeRow}
            onPress={() => setRememberMe((v) => !v)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
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
              <Text style={styles.primaryButtonText}>Sign In</Text>
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
              onPress={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <>
                  <GoogleLogo width={24} height={24} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/auth/sign-up')}
              style={styles.secondaryButton}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>
                Don't have an account? <Text style={styles.secondaryButtonLink}>Sign Up</Text>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  socialSection: {
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 56,
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
  rememberedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rememberedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  rememberedAvatarImage: {
    width: 44,
    height: 44,
  },
  rememberedAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rememberedInfo: {
    flex: 1,
    marginLeft: 14,
  },
  rememberedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  rememberedEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  continueAsHint: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  useAnotherAccount: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  useAnotherAccountText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rememberMeText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 10,
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordLinkText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
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
    fontSize: 20,
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
