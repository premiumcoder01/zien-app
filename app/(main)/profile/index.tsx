import {
  AccountStatusCard,
  ProfileCard,
  ProfileTabs,
  type ProfileTabKey
} from '@/components/profile';
import { PageHeader } from '@/components/ui';
import LabeledInput from '@/components/ui/labeled-input';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { sendOtp, updateProfile, verifyOtp } from '@/services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



const LANGUAGE_OPTIONS = [
  'English (US)', 'English (UK)', 'Spanish', 'French',
  'German', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Other',
];






// ─────────────────────────────────────────────────────
// Branding Upload Card
// ─────────────────────────────────────────────────────
type BrandingUploadCardProps = {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  previewUri?: string | null;
  previewLabel?: string;
  onUpload: () => void;
  onRemove?: () => void;
  uploadLabel?: string;
};

function BrandingUploadCard({
  icon, iconColor, iconBg, title, subtitle,
  previewUri, previewLabel, onUpload, onRemove, uploadLabel = 'Upload',
}: BrandingUploadCardProps) {
  const { colors } = useAppTheme();
  const bStyles = getBStyles(colors);
  return (
    <View style={bStyles.card}>
      {/* Preview box */}
      <Pressable
        style={[bStyles.preview, { backgroundColor: iconBg }]}
        onPress={onUpload}
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={bStyles.previewImg} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={28} color={iconColor} />
        )}
      </Pressable>

      {/* Info */}
      <View style={bStyles.info}>
        <Text style={bStyles.cardTitle}>{title}</Text>
        <Text style={bStyles.cardSub}>{subtitle}</Text>
        <View style={bStyles.actions}>
          <Pressable
            style={({ pressed }) => [bStyles.uploadBtn, pressed && { opacity: 0.75 }]}
            onPress={onUpload}
          >
            <MaterialCommunityIcons name="upload-outline" size={14} color={colors.accentTeal} />
            <Text style={bStyles.uploadBtnText}>{uploadLabel}</Text>
          </Pressable>
          {onRemove && previewUri && (
            <Pressable onPress={onRemove}>
              <Text style={bStyles.removeText}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function getBStyles(colors: any) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: colors.surfaceIcon,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    preview: {
      width: 72,
      height: 72,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    },
    previewImg: {
      width: '100%',
      height: '100%',
    },
    info: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    cardSub: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 8,
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.accentTeal,
      backgroundColor: `${colors.accentTeal}10`,
    },
    uploadBtnText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    removeText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#EF4444',
    },
  });
}

// ─────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);

  const { data: profile } = useProfile();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ProfileTabKey>('identity');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Personal Info fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [professionalEmail, setProfessionalEmail] = useState('');

  // Phone input country calling code state
  const [countryCallingCode, setCountryCallingCode] = useState('91');

  // Verification states
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // OTP Verification Modal states
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpType, setOtpType] = useState<'email' | 'phone'>('email');
  const [otpTarget, setOtpTarget] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  // Refs for OTP TextInput fields to manage focus
  const otpRef0 = useRef<TextInput>(null);
  const otpRef1 = useRef<TextInput>(null);
  const otpRef2 = useRef<TextInput>(null);
  const otpRef3 = useRef<TextInput>(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3];

  const handleSendOtp = async (type: 'email' | 'phone') => {
    let target = '';
    if (type === 'email') {
      target = professionalEmail;
      if (!target) {
        Alert.alert('Error', 'Please enter a valid email address first.');
        return;
      }
    } else {
      target = '+' + countryCallingCode + mobilePhone.replace(/[^\d]/g, '');
      if (!mobilePhone) {
        Alert.alert('Error', 'Please enter a valid mobile number first.');
        return;
      }
    }

    setIsOtpSending(true);
    setOtpError('');
    try {
      await sendOtp(accessToken!, { type, target });
      setOtpType(type);
      setOtpTarget(target);
      setOtpCode(['', '', '', '']);
      setIsOtpSending(false);
      setOtpModalVisible(true);
      setTimeout(() => {
        otpRef0.current?.focus();
      }, 250);
    } catch (error: any) {
      setIsOtpSending(false);
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    const otp = otpCode.join('');
    if (otp.length < 4) {
      setOtpError('Please enter the full 4-digit code.');
      return;
    }

    setIsOtpVerifying(true);
    setOtpError('');
    try {
      await verifyOtp(accessToken!, {
        type: otpType,
        otp,
        target: otpTarget,
      });
      setIsOtpVerifying(false);
      setOtpModalVisible(false);

      if (otpType === 'email') {
        setIsEmailVerified(true);
        Alert.alert('Success', 'Email verified successfully!');
      } else {
        setIsPhoneVerified(true);
        Alert.alert('Success', 'Phone number verified successfully!');
      }
    } catch (error: any) {
      setIsOtpVerifying(false);
      setOtpError(error.message || 'Incorrect OTP.');
    }
  };

  // Professional fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [primaryMarket, setPrimaryMarket] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English (US)');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Branding fields
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);

  // Security fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setProfessionalEmail(profile.email || '');

      // Use profile.country_code if present, otherwise parse from phone number
      let phoneStr = profile.phone || '';
      let detectedCallingCode = '91';

      if (profile.country_code) {
        detectedCallingCode = profile.country_code.replace('+', '');
      } else {
        if (phoneStr.startsWith('+')) {
          if (phoneStr.startsWith('+91')) {
            detectedCallingCode = '91';
            phoneStr = phoneStr.substring(3);
          } else {
            // If it starts with + but is not India, try stripping +
            phoneStr = phoneStr.substring(1);
          }
        } else if (phoneStr.startsWith('91') && phoneStr.length > 10) {
          detectedCallingCode = '91';
          phoneStr = phoneStr.substring(2);
        }
      }

      setMobilePhone(phoneStr);
      setCountryCallingCode(detectedCallingCode);

      setLicenseNumber(profile.license_number || '');
      setPrimaryMarket(profile.address || '');
      setAvatarUri(profile.image || null);
    }
  }, [profile]);

  const accountStatusItems = useMemo(() => [
    { label: 'Email Verified', verified: isEmailVerified },
    { label: 'Phone Verified', verified: isPhoneVerified },
  ], [isEmailVerified, isPhoneVerified]);

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateProfile>[1]) =>
      updateProfile(accessToken!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      Alert.alert('Success', 'Profile updated successfully.');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: mobilePhone.replace(/[^\d]/g, ''),
      country_code: '+' + countryCallingCode,
      license_number: licenseNumber,
      address: primaryMarket,
      image: avatarUri,
    });
  }, [firstName, lastName, mobilePhone, countryCallingCode, licenseNumber, primaryMarket, avatarUri, saveMutation]);

  const pickImage = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // allowsEditing: true,
      quality: 0.85,
    });
    return result.canceled ? null : result.assets[0]?.uri ?? null;
  }, []);

  const showAvatarOptions = useCallback(() => {
    Alert.alert('Change photo', 'Choose source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Gallery', onPress: async () => { const uri = await pickImage(); if (uri) setAvatarUri(uri); } },
      {
        text: 'Camera', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) setAvatarUri(res.assets[0].uri);
        }
      },
    ]);
  }, [pickImage]);

  const userInitials = useMemo(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (fn && ln) {
      return (fn[0] + ln[0]).toUpperCase();
    } else if (fn) {
      return fn.substring(0, 2).toUpperCase();
    } else if (ln) {
      return ln.substring(0, 2).toUpperCase();
    }
    return '--';
  }, [firstName, lastName]);

  const handleChangePassword = () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }
    Alert.alert('Success', 'Password changed successfully.');
    setNewPassword('');
    setConfirmPassword('');
  };

  const tabContent = useMemo(() => {
    switch (activeTab) {

      // ── Personal Info ─────────────────────────────
      case 'identity':
        return (
          <ProfileCard style={styles.mainCard}>
            {/* Avatar hero */}
            <View style={styles.avatarHero}>
              <Pressable style={styles.avatarWrap} onPress={showAvatarOptions}>
                <LinearGradient colors={colors.brandGradient as any} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {avatarUri
                    ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
                    : <Text style={styles.avatarText}>{userInitials}</Text>
                  }
                </LinearGradient>
                <View style={styles.avatarCameraBtn}>
                  <MaterialCommunityIcons name="camera" size={13} color="#fff" />
                </View>
              </Pressable>
              <View style={styles.avatarMeta}>
                <Text style={styles.sectionTitle}>Personal Identity</Text>
                <Text style={styles.cardSubtitle}>Your public profile photo is visible to clients and team members.</Text>
                <View style={styles.avatarActions}>
                  <Pressable style={styles.avatarActionBtn} onPress={showAvatarOptions}>
                    <MaterialCommunityIcons name="upload-outline" size={14} color={colors.accentTeal} />
                    <Text style={styles.avatarActionText}>Replace Avatar</Text>
                  </Pressable>
                  <Pressable onPress={() => setAvatarUri(null)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              {/* First Name & Last Name in Row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="First Name"
                    required
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    leftInputElement={
                      <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSecondary} />
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Last Name"
                    required
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    leftInputElement={
                      <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSecondary} />
                    }
                  />
                </View>
              </View>

              {/* Email with Verify Button */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Email"
                    required
                    value={professionalEmail}
                    onChangeText={setProfessionalEmail}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={false}
                    inputRowStyle={{ opacity: 0.7 }}
                    leftInputElement={
                      <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} />
                    }
                  />
                </View>
                <Pressable
                  style={[styles.verifyBtn, isEmailVerified && styles.verifiedBtn]}
                  onPress={() => handleSendOtp('email')}
                  disabled={isEmailVerified || isOtpSending}
                >
                  {isOtpSending && otpType === 'email' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.verifyBtnText}>{isEmailVerified ? 'Verified' : 'Verify'}</Text>
                  )}
                </Pressable>
              </View>

              {/* Mobile Phone with flag, country code and Verify Button */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={styles.phoneInputContainer}>
                    <Text style={styles.phoneLabel}>
                      Mobile Phone <Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.flagContainer}>
                        <Text style={styles.flagEmoji}>
                          {countryCallingCode === '1' ? '🇺🇸' : countryCallingCode === '44' ? '🇬🇧' : '🇮🇳'}
                        </Text>
                        <Text style={styles.countryCodeText}>+{countryCallingCode}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={14} color={colors.textSecondary} />
                      </View>
                      <TextInput
                        style={styles.phoneTextInput}
                        value={mobilePhone}
                        editable={false}
                        placeholder="Mobile Phone"
                        placeholderTextColor={colors.inputPlaceholder}
                      />
                    </View>
                  </View>
                </View>
                <Pressable
                  style={[styles.verifyBtn, isPhoneVerified && styles.verifiedBtn]}
                  onPress={() => handleSendOtp('phone')}
                  disabled={isPhoneVerified || isOtpSending}
                >
                  {isOtpSending && otpType === 'phone' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.verifyBtnText}>{isPhoneVerified ? 'Verified' : 'Verify'}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ProfileCard>
        );

      // ── Professional Info ─────────────────────────
      case 'professional':
        return (
          <ProfileCard style={styles.mainCard}>
            <Text style={styles.sectionTitle}>Professional Info</Text>
            <View style={styles.fieldGroup}>
              <LabeledInput
                label="License Number"
                required
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="e.g. 123456"
              />

              <LabeledInput
                label="Primary Market"
                required
                value={primaryMarket}
                onChangeText={setPrimaryMarket}
                placeholder="e.g. Los Angeles, CA"
              />

              <View style={styles.labeledInputContainer}>
                <Text style={styles.inputLabel}>
                  Preferred Language <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <Pressable style={styles.pickerRow} onPress={() => setShowLanguageModal(true)}>
                  <Text style={styles.pickerText}>{preferredLanguage}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.iconMuted} />
                </Pressable>
              </View>
            </View>

            {/* Language modal */}
            <Modal visible={showLanguageModal} transparent animationType="slide">
              <View style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLanguageModal(false)} />
                <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>Preferred Language</Text>
                  <ScrollView style={{ maxHeight: 320, marginTop: 12 }} keyboardShouldPersistTaps="handled">
                    {LANGUAGE_OPTIONS.map(lang => (
                      <Pressable key={lang} style={styles.modalOption} onPress={() => { setPreferredLanguage(lang); setShowLanguageModal(false); }}>
                        <Text style={styles.modalOptionText}>{lang}</Text>
                        {preferredLanguage === lang && <MaterialCommunityIcons name="check" size={20} color={colors.accentTeal} />}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </ProfileCard>
        );

      // ── Branding ──────────────────────────────────
      case 'branding':
        return (
          <ProfileCard style={styles.mainCard}>
            <Text style={styles.sectionTitle}>Branding</Text>
            {/* Logo upload */}
            <Text style={styles.fieldLabel}>Logo</Text>
            <BrandingUploadCard
              icon="image-outline"
              iconColor={colors.accentTeal}
              iconBg={`${colors.accentTeal}12`}
              title="Logo"
              subtitle="SVG or PNG, max 2MB."
              previewUri={logoUri}
              onUpload={async () => { const uri = await pickImage(); if (uri) setLogoUri(uri); }}
              onRemove={() => setLogoUri(null)}
              uploadLabel="Upload Logo"
            />

            {/* Signature upload */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Email Signature</Text>
            <BrandingUploadCard
              icon="draw-pen"
              iconColor="#7C3AED"
              iconBg="#7C3AED12"
              title="Email Signature"
              subtitle="Used for document signing and high-priority internal communications."
              previewUri={signatureUri}
              onUpload={async () => { const uri = await pickImage(); if (uri) setSignatureUri(uri); }}
              onRemove={() => setSignatureUri(null)}
              uploadLabel="Upload Signature"
            />
          </ProfileCard>
        );

      // ── Security ──────────────────────────────────
      case 'security':
        return (
          <ProfileCard style={styles.mainCard}>
            <View style={styles.securityHeader}>
              <View style={styles.securityIconWrap}>
                <MaterialCommunityIcons name="key-variant" size={20} color={colors.accentTeal} />
              </View>
              <Text style={styles.sectionTitle}>Password Architecture</Text>
            </View>
            <View style={[styles.fieldGroup, { marginTop: 4, marginBottom: 16 }]}>
              <LabeledInput
                label="New Password"
                required
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                secureTextEntry={!showNewPassword}
                rightInputElement={
                  <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
                    <MaterialCommunityIcons name={showNewPassword ? "eye" : "eye-off"} size={20} color={colors.iconMuted} />
                  </Pressable>
                }
              />
              <LabeledInput
                label="Confirm Password"
                required
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry={!showConfirmPassword}
                rightInputElement={
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <MaterialCommunityIcons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={colors.iconMuted} />
                  </Pressable>
                }
              />
            </View>
            <Pressable style={styles.changePasswordBtn} onPress={handleChangePassword}>
              <Text style={styles.changePasswordBtnText}>Change Password</Text>
            </Pressable>
          </ProfileCard>
        );

      default:
        return null;
    }
  }, [
    activeTab, avatarUri, showAvatarOptions,
    firstName, lastName, mobilePhone, professionalEmail,
    licenseNumber, primaryMarket, preferredLanguage,
    showLanguageModal, logoUri, signatureUri, pickImage, userInitials, colors,
    isEmailVerified, isPhoneVerified, newPassword, confirmPassword, showNewPassword, showConfirmPassword
  ]);

  const bottomBarHeight = 56 + insets.bottom + 16;

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.bg, { paddingTop: insets.top }]}
    >
      {/* ── Page Header ── */}
      <PageHeader
        title="Profile"
        subtitle="Manage your digital identity, security protocols, and brokerage credentials."
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {tabContent}

          <View style={styles.sideCards}>
            <AccountStatusCard items={accountStatusItems} />
          </View>
        </ScrollView>

        {/* ── Save button ── */}
        <View style={[styles.fixedBottom, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.88 }]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            <LinearGradient colors={colors.brandGradient as any} style={styles.saveBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── OTP Verification Modal ── */}
        <Modal
          visible={otpModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setOtpModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {otpType === 'email' ? 'Verify Email' : 'Verify Phone'}
              </Text>
              <Text style={styles.modalMessage}>
                {otpType === 'email'
                  ? 'Enter the 4-digit code sent to your email address.'
                  : 'Enter the 4-digit code sent to your mobile phone.'}
              </Text>

              <View style={styles.otpInputContainer}>
                {otpCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={otpRefs[index]}
                    style={[
                      styles.otpBox,
                      otpError ? { borderColor: '#ef4444' } : null
                    ]}
                    value={digit}
                    onChangeText={(text) => {
                      const val = text.replace(/[^\d]/g, '').substring(text.length - 1);
                      const newCode = [...otpCode];
                      newCode[index] = val;
                      setOtpCode(newCode);

                      if (val && index < 3) {
                        otpRefs[index + 1].current?.focus();
                      }
                      if (otpError) setOtpError('');
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                        const newCode = [...otpCode];
                        newCode[index - 1] = '';
                        setOtpCode(newCode);
                        otpRefs[index - 1].current?.focus();
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {otpError ? (
                <Text style={styles.otpErrorText}>{otpError}</Text>
              ) : null}

              <View style={styles.modalActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalConfirmBtn,
                    pressed && { opacity: 0.85 },
                    isOtpVerifying && { opacity: 0.7 }
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={isOtpVerifying}
                >
                  {isOtpVerifying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Verify & Confirm</Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelBtn,
                    pressed && { opacity: 0.85 }
                  ]}
                  onPress={() => setOtpModalVisible(false)}
                  disabled={isOtpVerifying}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────
function getStyles(colors: any, theme: string) {
  return StyleSheet.create({
    bg: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, gap: 16, paddingTop: 4 },

    // Save bar
    fixedBottom: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingHorizontal: 18, paddingTop: 12,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1, borderTopColor: colors.cardBorder,
    },
    saveBtn: { borderRadius: 16, overflow: 'hidden' },
    saveBtnGradient: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, paddingVertical: 15,
    },
    saveBtnText: { fontSize: 15.5, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

    // Main card
    mainCard: { marginBottom: 0 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    hintText: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 10 },
    divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 16 },
    fieldGroup: { gap: 14 },
    sideCards: { gap: 16 },

    // Identity avatar
    avatarHero: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginBottom: 4 },
    avatarWrap: { position: 'relative' },
    avatar: {
      width: 76, height: 76, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      shadowColor: colors.accentTeal, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
    avatarCameraBtn: {
      position: 'absolute', right: -4, bottom: -4, width: 26, height: 26,
      borderRadius: 9, backgroundColor: colors.accentTeal,
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cardBackground,
    },
    avatarMeta: { flex: 1 },
    avatarActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
    avatarActionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
      borderWidth: 1.5, borderColor: colors.accentTeal, backgroundColor: `${colors.accentTeal}10`,
    },
    avatarActionText: { fontSize: 12.5, fontWeight: '800', color: colors.accentTeal },
    removeText: { fontSize: 12.5, fontWeight: '700', color: '#EF4444' },

    // Bio
    bioInput: {
      backgroundColor: colors.inputBackground, borderRadius: 14,
      borderWidth: 1, borderColor: colors.borderInput,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, color: colors.textPrimary, minHeight: 100,
    },

    // Picker rows
    pickerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.inputBackground, borderRadius: 14,
      borderWidth: 1, borderColor: colors.borderInput,
      paddingHorizontal: 14, paddingVertical: 13,
    },
    pickerText: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },

    // Chips
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.surfaceIcon, borderRadius: 999,
      paddingVertical: 8, paddingLeft: 14, paddingRight: 10,
      borderWidth: 1, borderColor: colors.cardBorder,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, maxWidth: 140 },
    addChipBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 12, borderRadius: 14,
      borderWidth: 1.5, borderColor: colors.accentTeal, borderStyle: 'dashed',
    },
    addChipText: { fontSize: 13.5, fontWeight: '700', color: colors.accentTeal },

    // Branding
    brandingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    brandingIconWrap: {
      width: 40, height: 40, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.accentTeal, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
    colorSwatch: {
      width: 40, height: 40, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    },
    colorSwatchActive: {
      shadowOpacity: 0.3, shadowRadius: 10,
      borderWidth: 2.5, borderColor: '#fff',
    },
    colorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    colorPreviewDot: { width: 20, height: 20, borderRadius: 6 },
    colorHexText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    colorNameText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },

    // Security
    securityHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    securityIconWrap: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: `${colors.accentTeal}12`, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: `${colors.accentTeal}25`,
    },
    mfaRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    mfaIcon: {
      width: 48, height: 48, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      shadowColor: colors.accentTeal, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    outlineButton: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 16,
      borderRadius: 12, borderWidth: 1.5, borderColor: colors.accentTeal,
      backgroundColor: `${colors.accentTeal}10`, marginTop: 10,
    },
    outlineButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.accentTeal },

    // Organization
    orgBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 16, padding: 16, marginBottom: 4,
    },
    orgIconWrap: {
      width: 44, height: 44, borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    },
    orgTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    orgSubtitle: { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    orgBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999,
      paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    orgBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    valueBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surfaceIcon, borderRadius: 14,
      borderWidth: 1, borderColor: colors.cardBorder,
      paddingVertical: 13, paddingHorizontal: 14,
    },
    valueBoxText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

    // Bottom sheet modals
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    bottomSheet: {
      backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 12,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme === 'dark' ? '#324256' : '#D1D9E0', alignSelf: 'center', marginBottom: 18 },
    sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
    sheetDoneBtn: { paddingVertical: 6, paddingHorizontal: 14 },
    sheetDoneText: { fontSize: 15, fontWeight: '700', color: colors.accentTeal },
    modalOption: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 4,
      borderBottomWidth: 1, borderBottomColor: colors.rowBorder,
    },
    modalOptionText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },

    // Web layouts extra styling
    verifyBtn: {
      height: 50,
      backgroundColor: colors.accentTeal,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    verifyBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    verifiedBtn: {
      backgroundColor: colors.accentGreen || '#16A34A',
    },
    phoneInputContainer: {
      gap: 8,
    },
    phoneLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    phoneInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: colors.inputBorderRadius || 12,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      height: 50,
      opacity: 0.7,
    },
    flagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginRight: 10,
      borderRightWidth: 1,
      borderRightColor: colors.cardBorder,
      paddingRight: 10,
    },
    flagEmoji: {
      fontSize: 16,
    },
    countryCodeText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    phoneTextInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textSecondary,
    },
    labeledInputContainer: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    changePasswordBtn: {
      backgroundColor: colors.accentTeal,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignSelf: 'flex-start',
    },
    changePasswordBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    otpInputContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: 10,
      marginBottom: 16,
    },
    otpBox: {
      flex: 1,
      height: 55,
      borderWidth: 1,
      borderColor: colors.borderInput,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    otpErrorText: {
      color: '#ef4444',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 16,
      textAlign: 'center',
    },
    modalActionRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    modalConfirmBtn: {
      flex: 1,
      height: 48,
      backgroundColor: colors.accentTeal || '#00a7b5',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalConfirmText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    modalCancelBtn: {
      flex: 1,
      height: 48,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCancelText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
