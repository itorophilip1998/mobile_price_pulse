import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { useAuth } from '@/hooks/use-auth';
import { biometricAuth } from '@/lib/auth/biometric';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { profileAPI } from '@/lib/api/profile';
import { useToast } from '@/components/ui/toast-provider';
import { Ionicons } from '@expo/vector-icons';

function ProfileContent() {
  const { user, signout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState(user?.profile?.firstName || '');
  const [lastName, setLastName] = useState(user?.profile?.lastName || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [address1, setAddress1] = useState(user?.profile?.address1 || '');
  const [address2, setAddress2] = useState(user?.profile?.address2 || '');
  const [state, setState] = useState(user?.profile?.state || '');
  const [localGovernment, setLocalGovernment] = useState(user?.profile?.localGovernment || '');
  const [country, setCountry] = useState(user?.profile?.country || '');
  const [deliveryLocation, setDeliveryLocation] = useState(user?.profile?.deliveryLocation || '');

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricAuth.isAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, []);

  useEffect(() => {
    if (user?.profile) {
      setFirstName(user.profile.firstName || '');
      setLastName(user.profile.lastName || '');
      setPhone(user.profile.phone || '');
      setBio(user.profile.bio || '');
      setAddress1(user.profile.address1 || '');
      setAddress2(user.profile.address2 || '');
      setState(user.profile.state || '');
      setLocalGovernment(user.profile.localGovernment || '');
      setCountry(user.profile.country || '');
      setDeliveryLocation(user.profile.deliveryLocation || '');
    }
  }, [user?.profile]);

  const handleBiometricAuth = async () => {
    const success = await biometricAuth.authenticate();
    if (success) {
      Alert.alert('Success', 'Biometric authentication successful');
    } else {
      Alert.alert('Failed', 'Biometric authentication failed');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileAPI.updateProfile({
        firstName,
        lastName,
        phone,
        bio,
        address1,
        address2,
        state,
        localGovernment,
        country,
        deliveryLocation,
      });
      await refreshUser();
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast(error?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (user?.profile) {
      setFirstName(user.profile.firstName || '');
      setLastName(user.profile.lastName || '');
      setPhone(user.profile.phone || '');
      setBio(user.profile.bio || '');
      setAddress1(user.profile.address1 || '');
      setAddress2(user.profile.address2 || '');
      setState(user.profile.state || '');
      setLocalGovernment(user.profile.localGovernment || '');
      setCountry(user.profile.country || '');
      setDeliveryLocation(user.profile.deliveryLocation || '');
    }
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          {!isEditing && (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={24} color="#667eea" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.profile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.userName}>
              {user?.profile?.firstName && user?.profile?.lastName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email || 'Loading...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{user?.role || 'USER'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>First Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.value}>{firstName || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Last Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.value}>{lastName || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{phone || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Enter bio"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.value}>{bio || 'Not set'}</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address Line 1</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address1}
                onChangeText={setAddress1}
                placeholder="Enter address line 1"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{address1 || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address Line 2</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address2}
                onChangeText={setAddress2}
                placeholder="Enter address line 2 (optional)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{address2 || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>State</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="Enter state"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.value}>{state || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Local Government / City</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={localGovernment}
                onChangeText={setLocalGovernment}
                placeholder="Enter local government or city"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.value}>{localGovernment || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Country</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={country}
                onChangeText={setCountry}
                placeholder="Enter country"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.value}>{country || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Delivery Location</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={deliveryLocation}
                onChangeText={setDeliveryLocation}
                placeholder="Enter preferred delivery location"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{deliveryLocation || 'Not set'}</Text>
            )}
          </View>
        </View>

        {biometricAvailable && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Security</Text>
            <TouchableOpacity
              style={styles.securityButton}
              onPress={handleBiometricAuth}
              activeOpacity={0.7}
            >
              <Ionicons name="finger-print-outline" size={24} color="#667eea" />
              <Text style={styles.securityText}>Test Biometric Authentication</Text>
            </TouchableOpacity>
          </View>
        )}

        {isEditing && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCancel}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isEditing && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={signout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <ProtectedScreen>
      <ProfileContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    flex: 1,
    marginLeft: 8,
  },
  editButton: {
    padding: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 24,
  },
  infoSection: {
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  value: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    paddingVertical: 4,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  securityText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  signOutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
