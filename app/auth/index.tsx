import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/hooks/use-auth';
import { router, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useToast } from '@/components/ui/toast-provider';

// Complete Google OAuth web browser session
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup, signin, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const routerHook = useRouter();

  // Floating label animations
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Google OAuth - Use centralized config
  const { GOOGLE_OAUTH_CONFIG, isGoogleOAuthConfigured } = require('@/lib/config');
  
  const isGoogleConfigured = isGoogleOAuthConfigured(Platform.OS as 'ios' | 'android' | 'web');

  // Only initialize Google OAuth if properly configured
  const googleConfig = isGoogleConfigured
    ? {
        clientId: GOOGLE_OAUTH_CONFIG.WEB_CLIENT_ID,
        iosClientId: GOOGLE_OAUTH_CONFIG.IOS_CLIENT_ID,
        androidClientId: GOOGLE_OAUTH_CONFIG.ANDROID_CLIENT_ID,
      }
    : null;

  const [request, response, promptAsync] = Google.useAuthRequest(
    googleConfig || {
      // Provide dummy values to prevent errors, but it won't work
      clientId: 'dummy',
      iosClientId: Platform.OS === 'ios' ? 'dummy' : undefined,
      androidClientId: Platform.OS === 'android' ? 'dummy' : undefined,
    }
  );

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      routerHook.replace('/');
    }
  }, [isAuthenticated]);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleSignIn(authentication?.accessToken);
    } else if (response?.type === 'error') {
      showToast('Google sign in failed. Please try again.', 'error');
    }
  }, [response]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate password strength
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain both uppercase and lowercase letters' };
    }
    if (!/\d/.test(password) || !/[@$!%*?&]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number and one special character' };
    }
    return { valid: true };
  };

  // Handle paste for TextInput
  const handlePaste = async (setter: (value: string) => void) => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        setter(clipboardContent.trim());
        showToast('Pasted from clipboard', 'info', 2000);
      }
    } catch (error) {
      // Clipboard access failed, ignore
    }
  };

  const handleSubmit = async () => {
    // Validate email
    if (!email || !email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    // Validate password
    if (!password || !password.trim()) {
      showToast('Please enter your password', 'error');
      return;
    }

    if (isSignup) {
      // Validate full name
      const trimmedFullName = fullName.trim();
      if (!trimmedFullName || trimmedFullName.length < 2) {
        showToast('Please enter your full name', 'error');
        return;
      }
      
      // Ensure we have both first and last name
      const nameParts = trimmedFullName.split(/\s+/).filter(part => part.length > 0);
      if (nameParts.length < 2) {
        showToast('Please enter both first and last name', 'error');
        return;
      }
      
      const finalFirstName = nameParts[0];
      const finalLastName = nameParts.slice(1).join(' ');
      
      if (!finalFirstName || !finalLastName) {
        showToast('Please enter both first and last name', 'error');
        return;
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        showToast(passwordValidation.message || 'Password does not meet requirements', 'error');
        return;
      }

      setIsLoading(true);
      try {
        const result = await signup({ email: email.trim(), password, firstName: finalFirstName, lastName: finalLastName });
        // Store email for verification screen
        const verifyEmailUrl = `/auth/verify-email?email=${encodeURIComponent(email.trim())}`;
        showToast('Account created! Check your email for verification code', 'success');
        setTimeout(() => {
          router.push(verifyEmailUrl);
        }, 1000);
      } catch (error: any) {
        console.error('Signup error:', error);
        const errorMessage = error.message || error.response?.data?.message || 'Failed to create account. Please try again.';
        showToast(errorMessage, 'error');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        await signin(email.trim(), password);
        showToast('Signed in successfully!', 'success');
      } catch (error: any) {
        const errorMessage = error.message || 'Authentication failed';
        showToast(errorMessage, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Helper function for strength color
  const getStrengthColor = (strength: 'weak' | 'acceptable' | 'good' | 'strong'): string => {
    switch (strength) {
      case 'weak':
        return '#EF4444';
      case 'acceptable':
        return '#F59E0B';
      case 'good':
        return '#3B82F6';
      case 'strong':
        return '#10B981';
      default:
        return '#9CA3AF';
    }
  };

  const handleGoogleSignIn = async (accessToken?: string) => {
    if (!isGoogleConfigured) {
      showToast('Google sign in is not configured', 'error');
      return;
    }

    if (!accessToken) {
      if (!request) {
        showToast('Google sign in is not ready', 'error');
        return;
      }
      try {
        await promptAsync();
      } catch (error: any) {
        showToast('Failed to initiate Google sign in', 'error');
      }
      return;
    }

    // TODO: Send accessToken to backend for verification and token exchange
    showToast('Google sign in will be fully implemented with backend integration', 'info');
  };

  const hasNameValue = fullName.trim().length > 0;
  const hasEmailValue = email.length > 0;
  const hasPasswordValue = password.length > 0;

  // Password strength checker
  const getPasswordStrength = (pwd: string): { strength: 'weak' | 'acceptable' | 'good' | 'strong'; score: number } => {
    if (!pwd) return { strength: 'weak', score: 0 };
    
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[@$!%*?&]/.test(pwd),
    };

    if (checks.length) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.number) score += 1;
    if (checks.special) score += 1;

    if (score <= 2) return { strength: 'weak', score };
    if (score === 3) return { strength: 'acceptable', score };
    if (score === 4) return { strength: 'good', score };
    return { strength: 'strong', score };
  };

  // Password rules checker
  const passwordRules = {
    length: password.length >= 8,
    case: /[A-Z]/.test(password) && /[a-z]/.test(password),
    numberSpecial: /\d/.test(password) && /[@$!%*?&]/.test(password),
  };

  const passwordStrength = getPasswordStrength(password);
  const showPasswordIndicator = isSignup && (passwordFocused || hasPasswordValue);

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ExpoImage
              source={require('@/assets/images/applogo.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <Text style={styles.tagline}>
            {isSignup
              ? 'Join thousands of smart shoppers'
              : 'Sign in to continue to PricePulse AI'}
          </Text>
        </View>

        {/* Auth Form - Full Screen */}
        <View style={styles.formContainer}>
          {isSignup && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  nameFocused ? styles.inputFocused : null,
                ]}
                placeholder=""
                placeholderTextColor="transparent"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text
                style={[
                  styles.floatingLabel,
                  nameFocused && styles.floatingLabelFocused,
                  (nameFocused || hasNameValue) && styles.floatingLabelActive,
                  !nameFocused && hasNameValue && styles.floatingLabelInactive,
                ]}
              >
                Full Name
              </Text>
            </View>
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
              onChangeText={(text) => {
                // Trim and validate email format as user types
                setEmail(text.trim().toLowerCase());
              }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => {
                setEmailFocused(false);
                // Validate email on blur
                if (email && !validateEmail(email)) {
                  showToast('Please enter a valid email address', 'error', 2000);
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              onLongPress={async () => {
                // Long press to paste
                await handlePaste(setEmail);
              }}
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
                passwordFocused ? styles.inputFocused : null,
              ]}
              placeholder=""
              placeholderTextColor="transparent"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => {
                setPasswordFocused(false);
                // Validate password on blur (only for signup)
                if (isSignup && password) {
                  const passwordValidation = validatePassword(password);
                  if (!passwordValidation.valid) {
                    showToast(passwordValidation.message || 'Password does not meet requirements', 'warning', 3000);
                  }
                }
              }}
              secureTextEntry
              autoComplete={isSignup ? 'password-new' : 'password'}
              onLongPress={async () => {
                // Long press to paste
                await handlePaste(setPassword);
              }}
            />
            <Text
              style={[
                styles.floatingLabel,
                passwordFocused && styles.floatingLabelFocused,
                (passwordFocused || hasPasswordValue) && styles.floatingLabelActive,
                !passwordFocused && hasPasswordValue && styles.floatingLabelInactive,
              ]}
            >
              Password
            </Text>
            {!isSignup && (
              <TouchableOpacity
                onPress={() => router.push('/auth/forgot-password')}
                style={styles.forgotPasswordLink}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Password Strength Indicator - Only show on signup */}
          {showPasswordIndicator && (
            <View style={styles.passwordStrengthContainer}>
              {/* Strength Bar */}
              <View style={styles.strengthBarContainer}>
                <View style={[styles.strengthBar, { width: `${(passwordStrength.score / 5) * 100}%`, backgroundColor: getStrengthColor(passwordStrength.strength) }]} />
              </View>
              
              {/* Strength Text */}
              <Text style={[styles.strengthText, { color: getStrengthColor(passwordStrength.strength) }]}>
                {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
              </Text>

              {/* Password Rules */}
              <View style={styles.rulesContainer}>
                <View style={styles.ruleItem}>
                  <Text style={[styles.ruleIcon, passwordRules.length && styles.ruleIconValid]}>
                    {passwordRules.length ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.ruleText, passwordRules.length && styles.ruleTextValid]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={[styles.ruleIcon, passwordRules.case && styles.ruleIconValid]}>
                    {passwordRules.case ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.ruleText, passwordRules.case && styles.ruleTextValid]}>
                    Uppercase & lowercase letters
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={[styles.ruleIcon, passwordRules.numberSpecial && styles.ruleIconValid]}>
                    {passwordRules.numberSpecial ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.ruleText, passwordRules.numberSpecial && styles.ruleTextValid]}>
                    Number & special character
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Primary Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
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
              <Text style={styles.primaryButtonText}>
                {isSignup ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleGoogleSignIn()}
            activeOpacity={0.7}
            disabled={!request}
          >
            <Image
              source={require('@/assets/images/googleG.png')}
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Switch Auth Mode */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
              <Text style={styles.switchLink}>
                {isSignup ? 'Sign In' : 'Sign Up'}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 56,
    marginTop: 24,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 200,
    height: 60,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    fontSize: 18,
    color: '#111827',
    height: 80,
  },
  inputFocused: {
    borderColor: '#667eea',
    borderWidth: 1,
  },
  floatingLabel: {
    position: 'absolute',
    left: 24,
    top: 28,
    fontSize: 18,
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
    top: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  floatingLabelInactive: {
    color: '#9CA3AF',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 22,
    marginBottom: 20,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 14,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
    color: '#6B7280',
  },
  switchLink: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  passwordStrengthContainer: {
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  strengthBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  rulesContainer: {
    gap: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ruleIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    color: '#9CA3AF',
    fontWeight: '600',
  },
  ruleIconValid: {
    color: '#10B981',
  },
  ruleText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  ruleTextValid: {
    color: '#374151',
    fontWeight: '500',
  },
});
