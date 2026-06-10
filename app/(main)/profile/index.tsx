import {
  AccountStatusCard,
  DangerZoneCard,
  ProfileCard,
  ProfileTabs,
  type ProfileTabKey,
  type StatusItem,
} from '@/components/profile';
import { PageHeader } from '@/components/ui';
import LabeledInput from '@/components/ui/labeled-input';
import { Theme } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/services/authService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────
const ACCOUNT_STATUS_ITEMS: StatusItem[] = [
  { label: 'Email Verified', verified: true },
  { label: 'License Active', verified: true },
  { label: 'Enterprise Linked', verified: true },
];

const DEFAULT_SPECIALIZATIONS = [
  'Luxury Homes',
  'Commercial Retail',
  'Urban Lofts',
  'New Construction',
];

const LANGUAGE_OPTIONS = [
  'English (US)', 'English (UK)', 'Spanish', 'French',
  'German', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Other',
];

const AVAILABLE_SPECIALIZATION_OPTIONS = [
  'Luxury Homes', 'Commercial Retail', 'Urban Lofts', 'New Construction',
  'Coastal Properties', 'Investment Properties', 'First-Time Buyers',
  'Land & Development', 'Rental Management', 'International',
];

const INTERFACE_COLORS = [
  { label: 'Midnight', hex: '#1A1A1B' },
  { label: 'Teal', hex: '#0a2341' },
  { label: 'Navy', hex: '#1B5E9A' },
  { label: 'Ember', hex: '#EA580C' },
  { label: 'Forest', hex: '#16A34A' },
  { label: 'Slate', hex: '#475569' },
];

const MAX_YEARS_EXPERIENCE = 50;

function formatLicenseExpiry(date: Date): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
}

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
            <MaterialCommunityIcons name="upload-outline" size={14} color={Theme.accentTeal} />
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

const bStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Theme.surfaceIcon,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.cardBorder,
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
    color: Theme.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: Theme.textSecondary,
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
    borderColor: Theme.accentTeal,
    backgroundColor: `${Theme.accentTeal}10`,
  },
  uploadBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Theme.accentTeal,
  },
  removeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
  },
});

// ─────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: profile } = useProfile();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ProfileTabKey>('identity');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Identity fields
  const [fullName, setFullName] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [professionalEmail, setProfessionalEmail] = useState('');
  const [personalWebsite, setPersonalWebsite] = useState('');
  const [professionalBio, setProfessionalBio] = useState('');

  // Professional fields
  const [licenseId, setLicenseId] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [yearsExperience, setYearsExperience] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English (US)');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSpecializationModal, setShowSpecializationModal] = useState(false);

  // Branding fields
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [interfaceColor, setInterfaceColor] = useState(INTERFACE_COLORS[0].hex);

  useEffect(() => {
    if (profile) {
      setFullName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
      setProfessionalEmail(profile.email || '');

      const phoneStr = profile.phone
        ? `${profile.country_code ? '+' + profile.country_code + ' ' : ''}${profile.phone}`
        : '';
      setMobilePhone(phoneStr);

      setLicenseId(profile.license_number || '');
      setAvatarUri(profile.image || null);
      setPersonalWebsite(profile.website || '');
      setProfessionalBio(profile.description || '');
    }
  }, [profile]);

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
    const names = fullName.trim().split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    saveMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: mobilePhone.replace(/[^\d]/g, ''),
      website: personalWebsite,
      description: professionalBio,
      image: avatarUri,
    });
  }, [fullName, mobilePhone, personalWebsite, professionalBio, avatarUri, saveMutation]);

  const handleYearsChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits === '') { setYearsExperience(''); return; }
    const num = parseInt(digits, 10);
    setYearsExperience(num > MAX_YEARS_EXPERIENCE ? String(MAX_YEARS_EXPERIENCE) : digits);
  }, []);

  const removeSkill = (index: number) => setSpecializations(prev => prev.filter((_, i) => i !== index));

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
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else if (names.length === 1 && names[0].length > 0) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return '--';
  }, [fullName]);

  const tabContent = useMemo(() => {
    switch (activeTab) {

      // ── Identity ──────────────────────────────────
      case 'identity':
        return (
          <ProfileCard style={styles.mainCard}>
            {/* Avatar hero */}
            <View style={styles.avatarHero}>
              <Pressable style={styles.avatarWrap} onPress={showAvatarOptions}>
                <LinearGradient colors={['#0D2F45', '#0a2341']} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
                    <MaterialCommunityIcons name="upload-outline" size={14} color={Theme.accentTeal} />
                    <Text style={styles.avatarActionText}>Replace</Text>
                  </Pressable>
                  <Pressable onPress={() => setAvatarUri(null)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <LabeledInput label="Full Legal Name" value={fullName} onChangeText={setFullName} placeholder="Full legal name"
                rightInputElement={<MaterialCommunityIcons name="account" size={18} color={Theme.iconMuted} />} />
              <LabeledInput label="Mobile Phone" value={mobilePhone} onChangeText={setMobilePhone} placeholder="+1 (555) 000-0000"
                keyboardType="phone-pad"
                rightInputElement={<MaterialCommunityIcons name="phone" size={18} color={Theme.iconMuted} />} />
              <LabeledInput label="Professional Email" value={professionalEmail} onChangeText={setProfessionalEmail}
                placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                rightInputElement={<MaterialCommunityIcons name="email-outline" size={18} color={Theme.iconMuted} />} />
              <LabeledInput label="Personal Website" value={personalWebsite} onChangeText={setPersonalWebsite}
                placeholder="www.example.com" keyboardType="url" autoCapitalize="none" autoCorrect={false}
                rightInputElement={<MaterialCommunityIcons name="web" size={18} color={Theme.iconMuted} />} />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Professional Biography</Text>
            <TextInput
              style={styles.bioInput}
              placeholder="Tell clients about your experience..."
              placeholderTextColor={Theme.inputPlaceholder}
              value={professionalBio}
              onChangeText={setProfessionalBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ProfileCard>
        );

      // ── Professional ──────────────────────────────
      case 'professional':
        return (
          <ProfileCard style={styles.mainCard}>
            <Text style={styles.sectionTitle}>Licensing & Accreditation</Text>
            <View style={styles.fieldGroup}>
              <LabeledInput label="Real Estate License ID" value={licenseId} onChangeText={setLicenseId} placeholder="e.g. CA-BROKER-98210" />

              <View>
                <Text style={styles.fieldLabel}>License Expiry</Text>
                <Pressable style={styles.pickerRow} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.pickerText}>{formatLicenseExpiry(licenseExpiry)}</Text>
                  <MaterialCommunityIcons name="calendar" size={18} color={Theme.iconMuted} />
                </Pressable>
              </View>

              <LabeledInput label={`Years of Experience (max ${MAX_YEARS_EXPERIENCE})`} value={yearsExperience}
                onChangeText={handleYearsChange} placeholder="0" keyboardType="number-pad" maxLength={2} />

              <View>
                <Text style={styles.fieldLabel}>Preferred Language</Text>
                <Pressable style={styles.pickerRow} onPress={() => setShowLanguageModal(true)}>
                  <Text style={styles.pickerText}>{preferredLanguage}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={Theme.iconMuted} />
                </Pressable>
              </View>
            </View>

            {/* Specializations */}
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Specializations</Text>
            <Text style={styles.hintText}>Tap × to remove · "Add" to select more</Text>
            <View style={styles.chipsWrap}>
              {specializations.map((label, idx) => (
                <View key={`${label}-${idx}`} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                  <Pressable hitSlop={8} onPress={() => removeSkill(idx)}>
                    <MaterialCommunityIcons name="close" size={13} color={Theme.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable style={styles.addChipBtn} onPress={() => setShowSpecializationModal(true)}>
              <MaterialCommunityIcons name="plus" size={18} color={Theme.accentTeal} />
              <Text style={styles.addChipText}>Add specialization</Text>
            </Pressable>

            {/* Date picker modal */}
            <Modal visible={showDatePicker} transparent animationType="slide">
              <View style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDatePicker(false)} />
                <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
                  <View style={styles.sheetHandle} />
                  <View style={styles.sheetHeaderRow}>
                    <Text style={styles.sheetTitle}>License Expiry</Text>
                    <Pressable onPress={() => setShowDatePicker(false)} style={styles.sheetDoneBtn}>
                      <Text style={styles.sheetDoneText}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker value={licenseExpiry} mode="date" display="spinner"
                    onChange={(_, d) => { if (d) setLicenseExpiry(d); }}
                    minimumDate={new Date()}
                    style={Platform.OS === 'ios' ? { height: 200 } : undefined} />
                </View>
              </View>
            </Modal>

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
                        {preferredLanguage === lang && <MaterialCommunityIcons name="check" size={20} color={Theme.accentTeal} />}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Specialization modal */}
            <Modal visible={showSpecializationModal} transparent animationType="slide">
              <View style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSpecializationModal(false)} />
                <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>Add Specialization</Text>
                  <Text style={styles.hintText}>Choose one to add to your list.</Text>
                  <ScrollView style={{ maxHeight: 320, marginTop: 12 }} keyboardShouldPersistTaps="handled">
                    {AVAILABLE_SPECIALIZATION_OPTIONS.filter(s => !specializations.includes(s)).map(opt => (
                      <Pressable key={opt} style={styles.modalOption} onPress={() => { setSpecializations(p => [...p, opt]); setShowSpecializationModal(false); }}>
                        <Text style={styles.modalOptionText}>{opt}</Text>
                        <MaterialCommunityIcons name="plus" size={18} color={Theme.accentTeal} />
                      </Pressable>
                    ))}
                    {AVAILABLE_SPECIALIZATION_OPTIONS.filter(s => !specializations.includes(s)).length === 0 &&
                      <Text style={styles.hintText}>All specializations added.</Text>}
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
            {/* Header */}
            <View style={styles.brandingHeader}>
              <LinearGradient colors={['#0a2341', '#1B5E9A']} style={styles.brandingIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialCommunityIcons name="palette-outline" size={18} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Branding</Text>
                <Text style={styles.cardSubtitle}>Manage your visual identity and signature protocols.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Logo upload */}
            <Text style={styles.fieldLabel}>Logo</Text>
            <BrandingUploadCard
              icon="image-outline"
              iconColor={Theme.accentTeal}
              iconBg={`${Theme.accentTeal}12`}
              title="Brand Logo"
              subtitle="SVG or PNG, max 2MB. Used in documents and reports."
              previewUri={logoUri}
              onUpload={async () => { const uri = await pickImage(); if (uri) setLogoUri(uri); }}
              onRemove={() => setLogoUri(null)}

            />

            {/* Signature upload */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Email Signature</Text>
            <BrandingUploadCard
              icon="draw-pen"
              iconColor="#7C3AED"
              iconBg="#7C3AED12"
              title="Digital Signature"
              subtitle="Used for document signing and high-priority communications."
              previewUri={signatureUri}
              onUpload={async () => { const uri = await pickImage(); if (uri) setSignatureUri(uri); }}
              onRemove={() => setSignatureUri(null)}

            />

            {/* Interface color */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Interface Color</Text>
            <View style={styles.colorRow}>
              {INTERFACE_COLORS.map(c => {
                const isSelected = interfaceColor === c.hex;
                return (
                  <Pressable
                    key={c.hex}
                    onPress={() => setInterfaceColor(c.hex)}
                    style={[styles.colorSwatch, { backgroundColor: c.hex }, isSelected && styles.colorSwatchActive]}
                  >
                    {isSelected && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.colorPreviewRow}>
              <View style={[styles.colorPreviewDot, { backgroundColor: interfaceColor }]} />
              <Text style={styles.colorHexText}>{interfaceColor.toUpperCase()}</Text>
              <Text style={styles.colorNameText}>
                {INTERFACE_COLORS.find(c => c.hex === interfaceColor)?.label}
              </Text>
            </View>
          </ProfileCard>
        );

      // ── Security ──────────────────────────────────
      case 'security':
        return (
          <>
            <ProfileCard style={styles.mainCard}>
              <View style={styles.securityHeader}>
                <View style={styles.securityIconWrap}>
                  <MaterialCommunityIcons name="key-variant" size={20} color={Theme.accentTeal} />
                </View>
                <Text style={styles.sectionTitle}>Password Architecture</Text>
              </View>
              <View style={[styles.fieldGroup, { marginTop: 4 }]}>
                <LabeledInput label="Current Security Key" placeholder="••••••••" secureTextEntry />
                <LabeledInput label="New Security Key" placeholder="Min. 12 characters" secureTextEntry />
              </View>
            </ProfileCard>

            <ProfileCard style={styles.mainCard}>
              <View style={styles.mfaRow}>
                <LinearGradient colors={['#0a2341', '#1B5E9A']} style={styles.mfaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <MaterialCommunityIcons name="shield-check" size={22} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
                  <Text style={styles.cardSubtitle}>Add an extra layer of protection to your brokerage account.</Text>
                  <Pressable style={styles.outlineButton}>
                    <MaterialCommunityIcons name="cellphone-key" size={16} color={Theme.accentTeal} />
                    <Text style={styles.outlineButtonText}>Configure MFA</Text>
                  </Pressable>
                </View>
              </View>
            </ProfileCard>
          </>
        );

      // ── Organization ──────────────────────────────
      case 'organization':
        return (
          <ProfileCard style={styles.mainCard}>
            <LinearGradient colors={['#0D2F45', '#0a2341']} style={styles.orgBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.orgIconWrap}>
                <MaterialCommunityIcons name="office-building" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgTitle}>ZIEN Global Enterprise</Text>
                <Text style={styles.orgSubtitle}>Enterprise License · zien.ai/internal-ops</Text>
              </View>
              <View style={styles.orgBadge}>
                <Text style={styles.orgBadgeText}>Active</Text>
              </View>
            </LinearGradient>

            <View style={[styles.fieldGroup, { marginTop: 16 }]}>
              <View>
                <Text style={styles.fieldLabel}>Associated Brokerage</Text>
                <View style={styles.valueBox}>
                  <MaterialCommunityIcons name="office-building-outline" size={16} color={Theme.textMuted} />
                  <Text style={styles.valueBoxText}>Zien Real Estate Group Inc.</Text>
                </View>
              </View>
              <View>
                <Text style={styles.fieldLabel}>Account Manager</Text>
                <View style={styles.valueBox}>
                  <MaterialCommunityIcons name="account-tie-outline" size={16} color={Theme.textMuted} />
                  <Text style={styles.valueBoxText}>Sarah Thompson</Text>
                </View>
              </View>
            </View>
          </ProfileCard>
        );

      default:
        return null;
    }
  }, [
    activeTab, specializations, avatarUri, showAvatarOptions,
    fullName, mobilePhone, professionalEmail, personalWebsite, professionalBio,
    licenseId, licenseExpiry, showDatePicker, yearsExperience, preferredLanguage,
    showLanguageModal, showSpecializationModal, handleYearsChange, insets.bottom,
    logoUri, signatureUri, interfaceColor, pickImage, userInitials
  ]);

  const bottomBarHeight = 56 + insets.bottom + 16;

  return (
    <LinearGradient
      colors={Theme.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.bg, { paddingTop: insets.top }]}
    >
      {/* ── Page Header ── */}
      <PageHeader
        title="Professional Profile"
        subtitle="Manage your digital identity and brokerage credentials."
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
            <AccountStatusCard profileStrengthPercent={92} items={ACCOUNT_STATUS_ITEMS} />
            <DangerZoneCard onButtonPress={() => { }} />
          </View>
        </ScrollView>

        {/* ── Save button ── */}
        <View style={[styles.fixedBottom, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.88 }]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            <LinearGradient colors={['#0D2F45', '#0B3B50']} style={styles.saveBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                  <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, gap: 16, paddingTop: 4 },

  // Save bar
  fixedBottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 18, paddingTop: 12,
    backgroundColor: 'rgba(244,247,251,0.97)',
    borderTopWidth: 1, borderTopColor: Theme.cardBorder,
  },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15,
  },
  saveBtnText: { fontSize: 15.5, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  // Main card
  mainCard: { marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Theme.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Theme.textSecondary, lineHeight: 18, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Theme.textPrimary, marginBottom: 8 },
  hintText: { fontSize: 12, color: Theme.textSecondary, marginTop: 2, marginBottom: 10 },
  divider: { height: 1, backgroundColor: Theme.cardBorder, marginVertical: 16 },
  fieldGroup: { gap: 14 },
  sideCards: { gap: 16 },

  // Identity avatar
  avatarHero: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginBottom: 4 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 76, height: 76, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#0a2341', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  avatarCameraBtn: {
    position: 'absolute', right: -4, bottom: -4, width: 26, height: 26,
    borderRadius: 9, backgroundColor: Theme.accentTeal,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  avatarMeta: { flex: 1 },
  avatarActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  avatarActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1.5, borderColor: Theme.accentTeal, backgroundColor: `${Theme.accentTeal}10`,
  },
  avatarActionText: { fontSize: 12.5, fontWeight: '800', color: Theme.accentTeal },
  removeText: { fontSize: 12.5, fontWeight: '700', color: '#EF4444' },

  // Bio
  bioInput: {
    backgroundColor: Theme.inputBackground, borderRadius: 14,
    borderWidth: 1, borderColor: Theme.borderInput,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Theme.textPrimary, minHeight: 100,
  },

  // Picker rows
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Theme.inputBackground, borderRadius: 14,
    borderWidth: 1, borderColor: Theme.borderInput,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  pickerText: { fontSize: 15, color: Theme.textPrimary, fontWeight: '500' },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Theme.surfaceIcon, borderRadius: 999,
    paddingVertical: 8, paddingLeft: 14, paddingRight: 10,
    borderWidth: 1, borderColor: Theme.cardBorder,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textPrimary, maxWidth: 140 },
  addChipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: Theme.accentTeal, borderStyle: 'dashed',
  },
  addChipText: { fontSize: 13.5, fontWeight: '700', color: Theme.accentTeal },

  // Branding
  brandingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  brandingIconWrap: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0a2341', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
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
  colorHexText: { fontSize: 13, fontWeight: '800', color: Theme.textPrimary },
  colorNameText: { fontSize: 12.5, fontWeight: '600', color: Theme.textSecondary },

  // Security
  securityHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  securityIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: `${Theme.accentTeal}12`, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${Theme.accentTeal}25`,
  },
  mfaRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  mfaIcon: {
    width: 48, height: 48, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: '#0a2341', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  outlineButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: Theme.accentTeal,
    backgroundColor: `${Theme.accentTeal}10`, marginTop: 10,
  },
  outlineButtonText: { fontSize: 13.5, fontWeight: '700', color: Theme.accentTeal },

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
    backgroundColor: Theme.surfaceIcon, borderRadius: 14,
    borderWidth: 1, borderColor: Theme.cardBorder,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  valueBoxText: { fontSize: 14, fontWeight: '600', color: Theme.textPrimary },

  // Bottom sheet modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D9E0', alignSelf: 'center', marginBottom: 18 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: Theme.textPrimary },
  sheetDoneBtn: { paddingVertical: 6, paddingHorizontal: 14 },
  sheetDoneText: { fontSize: 15, fontWeight: '700', color: Theme.accentTeal },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Theme.rowBorder,
  },
  modalOptionText: { fontSize: 15, fontWeight: '600', color: Theme.textPrimary },
});
