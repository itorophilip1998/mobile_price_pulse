import { useState, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/use-auth';
import { router, useRouter } from 'expo-router';

export default function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup, signin, isAuthenticated } = useAuth();
  const routerHook = useRouter();

  // Floating label animations
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      routerHook.replace('/');
    }
  }, [isAuthenticated]);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isSignup && (!firstName || !lastName)) {
      Alert.alert('Error', 'Please fill in your name');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignup) {
        await signup({ email, password, firstName, lastName });
        router.push('/auth/verify-email');
      } else {
        await signin(email, password);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    Alert.alert('Coming Soon', 'Google sign in will be available soon');
  };

  const hasNameValue = `${firstName} ${lastName}`.trim().length > 0;
  const hasEmailValue = email.length > 0;
  const hasPasswordValue = password.length > 0;

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
          <Text style={styles.logo}>PricePulse AI</Text>
          <Text style={styles.tagline}>
          {isSignup
              ? 'Join thousands of smart shoppers'
              : 'Sign in to continue to PricePulse AI'}
          </Text>
        </View>

        {/* Auth Form - Full Screen */}
        <View style={styles.formContainer}>
          {/* <Text style={styles.subtitle}>
            {isSignup
              ? 'Join thousands of smart shoppers'
              : 'Sign in to continue to PricePulse AI'}
          </Text> */}

          {isSignup && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  nameFocused && styles.inputFocused,
                  hasNameValue && styles.inputFilled,
                ]}
                placeholder=""
                placeholderTextColor="transparent"
                value={`${firstName} ${lastName}`.trim() || ''}
                onChangeText={(text) => {
                  const parts = text.trim().split(' ');
                  setFirstName(parts[0] || '');
                  setLastName(parts.slice(1).join(' ') || '');
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text
                style={[
                  styles.floatingLabel,
                  (nameFocused || hasNameValue) && styles.floatingLabelActive,
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
                emailFocused && styles.inputFocused,
                hasEmailValue && styles.inputFilled,
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
            />
            <Text
              style={[
                styles.floatingLabel,
                (emailFocused || hasEmailValue) && styles.floatingLabelActive,
              ]}
            >
              Email Address
            </Text>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                passwordFocused && styles.inputFocused,
                hasPasswordValue && styles.inputFilled,
              ]}
              placeholder=""
              placeholderTextColor="transparent"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry
              autoComplete={isSignup ? 'password-new' : 'password'}
            />
            <Text
              style={[
                styles.floatingLabel,
                (passwordFocused || hasPasswordValue) && styles.floatingLabelActive,
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
            onPress={handleGoogleSignIn}
            activeOpacity={0.7}
          >
            <Text style={styles.googleIcon}>G</Text>
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
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
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
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 48,
    lineHeight: 24,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
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
    fontSize: 20,
    color: '#111827',
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
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 22,
    marginBottom: 20,
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4285F4',
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
});
