import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { DigitalCard, updateDigitalCard, uploadCardAsset } from '@/services/digitalCardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ProfileCard,
  type ProfileCardData
} from '../_components/ProfileCard';
import { ImagePickerModal } from '../_components/ImagePickerModal';

type FormTab = 'personal' | 'branding' | 'contact' | 'additional';

const TABS: { id: FormTab; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'personal', label: 'Personal Details', icon: 'account-outline' },
  { id: 'branding', label: 'Branding & Media', icon: 'image-outline' },
  { id: 'contact', label: 'Contact & Social', icon: 'card-account-phone-outline' },
  { id: 'additional', label: 'Additional Info', icon: 'file-document-outline' },
];



type FormState = ProfileCardData & {
  bio: string;
  twitter: string;
  facebook: string;
  profilePhotoUri: string;
  companyLogoUri: string;
};



interface BasicInfoSectionProps {
  onSectionChange?: (section: string) => void;
  activeCard: DigitalCard;
  refetch: () => Promise<any>;
  saveTrigger: number;
}

export function BasicInfoSection({ onSectionChange, activeCard, refetch, saveTrigger }: BasicInfoSectionProps) {
  const { colors } = useAppTheme();
  const { accessToken } = useAuth();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FormTab>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<DigitalCard>(activeCard);
  const [uploadingField, setUploadingField] = useState<'image' | 'logo' | null>(null);
  const [pickerState, setPickerState] = useState<{ isVisible: boolean; field: 'image' | 'logo' | null }>({ isVisible: false, field: null });
  const [errors, setErrors] = useState<{ name?: string; title?: string; phone?: string; email?: string; website?: string }>({});
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [localLogoUri, setLocalLogoUri] = useState<string | null>(null);

  console.log(activeCard)

  // Track previous saveTrigger to avoid firing on mount
  const lastSaveTrigger = useRef(saveTrigger);

  // Sync form when activeCard changes (e.g. from Dashboard)
  useEffect(() => {
    setForm(activeCard);
    setLocalPhotoUri(null);
    setLocalLogoUri(null);
  }, [activeCard]);

  // Handle save from header trigger
  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
      lastSaveTrigger.current = saveTrigger;
    }
  }, [saveTrigger]);

  const validateEmail = (v: string) => {
    if (!v) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : 'Enter a valid email address';
  };

  const validatePhone = (v: string) => {
    if (!v) return undefined;
    return /^[\d\s()\-+]{7,}$/.test(v) ? undefined : 'Enter a valid phone number';
  };

  const validateWebsite = (v: string) => {
    if (!v) return undefined;
    return /^https?:\/\/.+/.test(v) ? undefined : 'Must start with http:// or https://';
  };

  const handleSave = async () => {
    if (!accessToken) return;

    const nameErr = !form.name?.trim() ? 'This field is required.' : undefined;
    const titleErr = !form.title?.trim() ? 'This field is required.' : undefined;
    const phoneErr = validatePhone(form.phone);
    const emailErr = validateEmail(form.email);
    const websiteErr = validateWebsite(form.website);
    const newErrors = { name: nameErr, title: titleErr, phone: phoneErr, email: emailErr, website: websiteErr };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      if (nameErr || titleErr) {
        setActiveTab('personal');
      } else {
        setActiveTab('contact');
      }
      Alert.alert('Validation Error', 'Please fix the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Pick only editable fields to send back
      const updateData: Partial<DigitalCard> = {
        name: form.name,
        title: form.title,
        role: form.role,
        company_name: form.company_name,
        image: form.image,
        phone: form.phone,
        email: form.email,
        website: form.website,
        license: form.license,
        bio: form.bio,
        instagram: form.instagram,
        linkedin: form.linkedin,
        facebook: form.facebook,
        tiktok: form.tiktok,
        logo: form.logo,
        profile_name: form.profile_name,
        profile_type: form.profile_type,
        card_color: form.card_color,
        template: form.template,
        font: form.font,
      };

      await updateDigitalCard(accessToken, String(activeCard.id), updateData);
      await refetch();
      Alert.alert('Success', 'Your profile card has been updated.');
    } catch (error: any) {
      console.error('Save failed:', error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const performUpload = async (fileUri: string, field: 'image' | 'logo') => {
    if (!accessToken) return;
    setUploadingField(field);
    try {
      const result = await uploadCardAsset(accessToken, fileUri, field);
      setForm(p => ({ ...p, [field]: result.url }));
    } catch (error: any) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleImagePick = (field: 'image' | 'logo') => {
    setPickerState({ isVisible: true, field });
  };

  const handleImageRemove = (field: 'image' | 'logo') => {
    setForm(p => ({ ...p, [field]: '' }));
    if (field === 'image') setLocalPhotoUri(null);
    if (field === 'logo') setLocalLogoUri(null);
  };

  const handlePickerSelect = async (source: 'gallery' | 'camera') => {
    const field = pickerState.field;
    setPickerState({ isVisible: false, field: null });
    
    if (!field) return;

    if (source === 'gallery') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [1, 1],
        quality: 0.3,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (field === 'image') setLocalPhotoUri(uri);
        if (field === 'logo') setLocalLogoUri(uri);
        performUpload(uri, field);
      }
    } else if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        aspect: [1, 1],
        quality: 0.3,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (field === 'image') setLocalPhotoUri(uri);
        if (field === 'logo') setLocalLogoUri(uri);
        performUpload(uri, field);
      }
    }
  };

  if (!activeCard) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="card-bulleted-off-outline" size={36} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No Card Found</Text>
        <Text style={styles.emptySub}>
          Please create your first digital business card from the Dashboard to configure your basic information.
        </Text>
        <Pressable 
          style={({ pressed }) => [styles.emptyGoBtn, pressed && { opacity: 0.9 }]}
          onPress={() => onSectionChange?.('/(main)/zien-card')}>
          <Text style={styles.emptyGoBtnText}>Go to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  const cardData: ProfileCardData = {
    fullName: form.name || form.profile_name || '',
    title: form.title || '',
    legalRole: form.role || '',
    license: form.license || '',
    company: form.company_name || '',
    address: '',
    phone: form.phone || '',
    email: form.email || '',
    website: form.website || '',
    instagram: form.instagram || '',
    linkedin: form.linkedin || '',
    facebook: form.facebook || '',
    tiktok: form.tiktok || '',
  };



  return (
    <View style={styles.main}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Card preview */}
        <View style={styles.cardWrap}>
          <ProfileCard
            card={cardData}
            accentColor={form.card_color || undefined}
            template={(form.template as any) || 'modern'}
            avatarUri={localPhotoUri || form.image?.trim() || undefined}
            companyLogoUri={localLogoUri || form.logo?.trim() || undefined}
          />
        </View>


        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsWrap}
          style={styles.tabsScroll}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}>
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={18}
                  color={active ? '#FFFFFF' : '#5B6B7A'}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Form sections */}
        <View style={styles.formCard}>
          {activeTab === 'personal' && (
            <>
              <View style={styles.sectionHeaderCol}>
                <Text style={styles.sectionTitle}>Who are you?</Text>
                <View style={styles.typeToggleRow}>
                  <Pressable
                    style={[styles.typeToggleBtn, form.profile_type === 'work' && styles.typeToggleBtnActive]}
                    onPress={() => setForm(p => ({ ...p, profile_type: 'work' }))}>
                    <MaterialCommunityIcons
                      name="briefcase-outline"
                      size={14}
                      color={form.profile_type === 'work' ? colors.accentTeal : colors.textSecondary}
                    />
                    <Text style={[styles.typeToggleText, form.profile_type === 'work' && styles.typeToggleTextActive]}>Work</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.typeToggleBtn, form.profile_type === 'personal' && styles.typeToggleBtnActive]}
                    onPress={() => setForm(p => ({ ...p, profile_type: 'personal' }))}>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={14}
                      color={form.profile_type === 'personal' ? colors.accentTeal : colors.textSecondary}
                    />
                    <Text style={[styles.typeToggleText, form.profile_type === 'personal' && styles.typeToggleTextActive]}>Personal</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  value={form.name}
                  onChangeText={(v) => {
                    setForm((p) => ({ ...p, name: v }));
                    if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                  }}
                  placeholder="e.g. Sarah Connor"
                  placeholderTextColor="#9AA7B6"
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Professional Title *</Text>
                <TextInput
                  style={[styles.input, errors.title ? styles.inputError : null]}
                  value={form.title}
                  onChangeText={(v) => {
                    setForm((p) => ({ ...p, title: v }));
                    if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
                  }}
                  placeholder="e.g. Senior Agent"
                  placeholderTextColor="#9AA7B6"
                />
                {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
              </View>

              {form.profile_type === 'work' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Role / Designation</Text>
                    <TextInput
                      style={styles.input}
                      value={form.role}
                      onChangeText={(v) => setForm((p) => ({ ...p, role: v }))}
                      placeholder="e.g. REALTOR"
                      placeholderTextColor="#9AA7B6"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Company Name</Text>
                    <TextInput
                      style={styles.input}
                      value={form.company_name}
                      onChangeText={(v) => setForm((p) => ({ ...p, company_name: v }))}
                      placeholder="e.g. Luxury Estates"
                      placeholderTextColor="#9AA7B6"
                    />
                  </View>
                </>
              )}
            </>
          )}

          {activeTab === 'branding' && (
            <>
              <Text style={styles.sectionTitle}>Visual Identity</Text>

              {/* Profile Photo Section */}
              <View style={styles.uploadRow}>
                <View style={[styles.avatarPreview, { backgroundColor: colors.accentTeal + '20' }]}>
                  {uploadingField === 'image' ? (
                    <ActivityIndicator color={colors.accentTeal} />
                  ) : (localPhotoUri || form.image) ? (
                    <Image source={{ uri: localPhotoUri || form.image }} style={styles.previewImg} />
                  ) : (
                    <Text style={styles.initialsText}>{getInitials(form.name || form.profile_name)}</Text>
                  )}
                </View>
                <View style={styles.uploadInfo}>
                  <Text style={styles.uploadTitle}>Profile Photo</Text>
                  <Text style={styles.uploadDescription}>
                    Upload a professional photo. Recommended size 400×400px.
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    <Pressable
                      style={styles.uploadActionButton}
                      onPress={() => handleImagePick('image')}>
                      <MaterialCommunityIcons name={(localPhotoUri || form.image) ? "refresh" : "upload-outline"} size={16} color={colors.accentTeal} />
                      <Text style={styles.uploadActionText}>{(localPhotoUri || form.image) ? 'Update Photo' : 'Upload Photo'}</Text>
                    </Pressable>
                    {!!(localPhotoUri || form.image) && (
                      <Pressable
                        style={[styles.uploadActionButton, { borderColor: '#EF4444' }]}
                        onPress={() => handleImageRemove('image')}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                        <Text style={[styles.uploadActionText, { color: '#EF4444' }]}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.horizontalDivider} />

              {/* Company Logo Section */}
              <View style={styles.uploadRow}>
                <View style={styles.logoPreview}>
                  {uploadingField === 'logo' ? (
                    <ActivityIndicator color={colors.accentTeal} />
                  ) : (localLogoUri || form.logo) ? (
                    <Image source={{ uri: localLogoUri || form.logo }} style={styles.previewImg} resizeMode="contain" />
                  ) : (
                    <View style={styles.noLogoWrap}>
                      <MaterialCommunityIcons name="image-outline" size={24} color={colors.textSecondary} />
                      <Text style={styles.noLogoText}>No Logo</Text>
                    </View>
                  )}
                </View>
                <View style={styles.uploadInfo}>
                  <Text style={styles.uploadTitle}>Company Logo</Text>
                  <Text style={styles.uploadDescription}>
                    Upload your business logo. PNG with transparent background recommended.
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    <Pressable
                      style={[styles.uploadActionButton, styles.uploadActionButtonOutline, { marginTop: 0 }]}
                      onPress={() => handleImagePick('logo')}>
                      <MaterialCommunityIcons name={(localLogoUri || form.logo) ? "refresh" : "upload-outline"} size={16} color={colors.textPrimary} />
                      <Text style={[styles.uploadActionText, { color: colors.textPrimary }]}>{(localLogoUri || form.logo) ? 'Update Logo' : 'Upload Logo'}</Text>
                    </Pressable>
                    {!!(localLogoUri || form.logo) && (
                      <Pressable
                        style={[styles.uploadActionButton, { borderColor: '#EF4444', marginTop: 0 }]}
                        onPress={() => handleImageRemove('logo')}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                        <Text style={[styles.uploadActionText, { color: '#EF4444' }]}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}

          {activeTab === 'contact' && (
            <>
              <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>How can people reach you?</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={[styles.input, errors.phone ? styles.inputError : null]}
                  value={form.phone}
                  onChangeText={(v) => {
                    setForm((p) => ({ ...p, phone: v }));
                    if (errors.phone) setErrors((e) => ({ ...e, phone: validatePhone(v) }));
                  }}
                  onBlur={() => setErrors((e) => ({ ...e, phone: validatePhone(form.phone) }))}
                  placeholder="(000) 000-0000"
                  keyboardType="phone-pad"
                  maxLength={15}
                  placeholderTextColor="#9AA7B6"
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, errors.email ? styles.inputError : null]}
                  value={form.email}
                  onChangeText={(v) => {
                    setForm((p) => ({ ...p, email: v }));
                    if (errors.email) setErrors((e) => ({ ...e, email: validateEmail(v) }));
                  }}
                  onBlur={() => setErrors((e) => ({ ...e, email: validateEmail(form.email) }))}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9AA7B6"
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={[styles.input, errors.website ? styles.inputError : null]}
                  value={form.website}
                  onChangeText={(v) => {
                    setForm((p) => ({ ...p, website: v }));
                    if (errors.website) setErrors((e) => ({ ...e, website: validateWebsite(v) }));
                  }}
                  onBlur={() => setErrors((e) => ({ ...e, website: validateWebsite(form.website) }))}
                  placeholder="https://..."
                  autoCapitalize="none"
                  placeholderTextColor="#9AA7B6"
                />
                {errors.website ? <Text style={styles.errorText}>{errors.website}</Text> : null}
              </View>

              <Text style={styles.subSectionTitle}>Social Profiles</Text>

              <View style={styles.field}>
                <View style={styles.socialLabelRow}>
                  <MaterialCommunityIcons name="instagram" size={16} color="#E1306C" />
                  <Text style={styles.socialLabel}>Instagram</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.instagram}
                  onChangeText={(v) => setForm((p) => ({ ...p, instagram: v }))}
                  placeholder="https://instagram.com/..."
                  autoCapitalize="none"
                  placeholderTextColor="#9AA7B6"
                />
              </View>

              <View style={styles.field}>
                <View style={styles.socialLabelRow}>
                  <MaterialCommunityIcons name="linkedin" size={16} color="#0077B5" />
                  <Text style={styles.socialLabel}>LinkedIn</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.linkedin}
                  onChangeText={(v) => setForm((p) => ({ ...p, linkedin: v }))}
                  placeholder="https://linkedin.com/in/..."
                  autoCapitalize="none"
                  placeholderTextColor="#9AA7B6"
                />
              </View>

              <View style={styles.field}>
                <View style={styles.socialLabelRow}>
                  <MaterialCommunityIcons name="facebook" size={16} color="#1877F2" />
                  <Text style={styles.socialLabel}>Facebook</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.facebook}
                  onChangeText={(v) => setForm((p) => ({ ...p, facebook: v }))}
                  placeholder="https://facebook.com/..."
                  autoCapitalize="none"
                  placeholderTextColor="#9AA7B6"
                />
              </View>

              <View style={[styles.field, { marginBottom: 0 }]}>
                <View style={styles.socialLabelRow}>
                  <MaterialCommunityIcons name="music-note" size={16} color="#000000" />
                  <Text style={styles.socialLabel}>TikTok</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={form.tiktok}
                  onChangeText={(v) => setForm((p) => ({ ...p, tiktok: v }))}
                  placeholder="https://tiktok.com/@..."
                  autoCapitalize="none"
                  placeholderTextColor="#9AA7B6"
                />
              </View>
            </>
          )}

          {activeTab === 'additional' && (
            <>
              <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Tell us more</Text>
              <View style={styles.field}>
                <Text style={styles.label}>License / ID Number</Text>
                <TextInput
                  style={styles.input}
                  value={form.license}
                  onChangeText={(v) => setForm((p) => ({ ...p, license: v }))}
                  placeholder="e.g. DRE #01928374"
                  placeholderTextColor="#9AA7B6"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Professional Bio</Text>
                <TextInput
                  style={styles.bioInput}
                  value={form.bio}
                  onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
                  placeholder="Short bio for your card..."
                  placeholderTextColor="#9AA7B6"
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                />
                <Text style={styles.charCount}>{form.bio.length} / 200</Text>
              </View>
            </>
          )}
        </View>

        <View style={{ height: 250 }} />
      </ScrollView>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.savingText}>Saving changes...</Text>
        </View>
      )}

      <ImagePickerModal
        isVisible={pickerState.isVisible}
        onClose={() => setPickerState({ isVisible: false, field: null })}
        onSelect={handlePickerSelect}
        title={`Update ${pickerState.field === 'image' ? 'Photo' : 'Logo'}`}
      />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  main: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  savingText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 12,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  togglePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardWrap: {
    marginBottom: 20,
    alignSelf: 'center',
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  gridField: {
    flex: 1,
  },
  sectionHeaderCol: {
    marginBottom: 24,
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '100%',
    marginTop: 12,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  initialsText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.accentTeal,
  },
  noLogoWrap: {
    alignItems: 'center',
    gap: 4,
  },
  noLogoText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  uploadInfo: {
    flex: 1,
    gap: 6,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  uploadDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    fontWeight: '700',
  },
  uploadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accentTeal,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  uploadActionButtonOutline: {
    borderColor: colors.cardBorder,
  },
  uploadActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accentTeal,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
    width: '100%',
  },
  typeToggleBtnActive: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.accentTeal,
  },
  typeToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  typeToggleTextActive: {
    color: colors.textPrimary,
  },
  tabsScroll: { marginHorizontal: -18 },
  tabsWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabActive: {
    backgroundColor: '#0BA0B2',
    borderColor: '#0BA0B2',
    elevation: 2,
    shadowColor: '#0BA0B2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    elevation: 2,
    shadowColor: colors.cardShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.04)',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 5,
  },
  socialLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  readOnlyInput: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  bioInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'right',
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  uploadHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  uploadBoxText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  imagePreviewWrap: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 250,
    backgroundColor: 'transparent',
  },
  previewImageLogo: {
    width: '100%',
    height: 250,
    backgroundColor: 'transparent',
  },
  previewActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  previewActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewActionBtnDanger: {
    borderColor: 'rgba(220, 38, 38, 0.3)',
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
  },
  previewActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  previewActionTextDanger: {
    color: '#DC2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyGoBtn: {
    backgroundColor: colors.accentTeal,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyGoBtnText: {
    color: '#0B2D3E',
    fontWeight: '900',
    fontSize: 14,
  },
});
