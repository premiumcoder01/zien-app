import { DashboardLayout } from '@/components/main';
import ColorPickerModal from '@/components/ui/ColorPickerModal';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
    getTeamBrandingSettings,
    getTeamProfile,
    TeamBrandingSettings,
    updateTeamBrandingSettings,
    updateTeamProfile,
    uploadTeamProfileImage,
    uploadBrandingLogo,
    updateTeamSecurity,
} from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PhoneInput from 'react-native-phone-number-input';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const DARK_NAVY = '#0B2341';
const TABS = [
    { key: 'profile', label: 'My Profile', icon: 'account-outline' },
    { key: 'branding', label: 'Branding', icon: 'web' },
    { key: 'security', label: 'Security & Access', icon: 'shield-outline' },
    { key: 'notifications', label: 'Notifications', icon: 'bell-outline' },
];

// ─────────────────────────────────────────────
// Reusable Input
// ─────────────────────────────────────────────
const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    secureTextEntry = false,
    icon,
    required = false,
    editable = true,
    keyboardType = 'default',
}: any) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const isSecure = secureTextEntry && !showPwd;
    const { colors } = useAppTheme();
    const sf = getStyles(colors);

    return (
        <View style={sf.inputGroup}>
            <Text style={sf.inputLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {label}
                {required && <Text style={{ color: '#EF4444' }}> *</Text>}
            </Text>
            <View style={[
                multiline ? sf.textAreaWrap : sf.inputWrap,
                {
                    borderColor: !editable ? colors.divider : isFocused ? colors.accentTeal : colors.cardBorder,
                    backgroundColor: !editable ? colors.surfaceMuted : colors.inputBackground,
                }
            ]}>
                {icon && (
                    <MaterialCommunityIcons
                        name={icon}
                        size={17}
                        color={isFocused ? colors.accentTeal : '#94A3B8'}
                        style={multiline ? { marginTop: 2 } : undefined}
                    />
                )}
                <TextInput
                    style={[multiline ? sf.textArea : sf.textInput, { color: colors.textPrimary }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    multiline={multiline}
                    secureTextEntry={isSecure}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    editable={editable}
                    keyboardType={keyboardType}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {secureTextEntry && (
                    <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={sf.eyeBtn}>
                        <MaterialCommunityIcons
                            name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#94A3B8"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// Save Button
// ─────────────────────────────────────────────
const SaveButton = ({ label, onPress, loading, icon = 'content-save-outline' }: any) => {
    const { colors } = useAppTheme();
    const sf = getStyles(colors);
    return (
        <TouchableOpacity style={sf.saveBtn} onPress={onPress} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={colors.brandGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sf.saveBtnInner}>
                {loading ? (
                    <ActivityIndicator color={colors.gradientButtonText || '#fff'} size="small" />
                ) : (
                    <>
                        <MaterialCommunityIcons name={icon} size={17} color={colors.gradientButtonText || '#fff'} />
                        <Text style={[sf.saveBtnText, { color: colors.gradientButtonText || '#fff' }]}>{label}</Text>
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

// ─────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle, rightSlot }: any) => {
    const { colors } = useAppTheme();
    const sf = getStyles(colors);
    return (
        <View style={sf.sectionHeader}>
            <View style={{ flex: 1 }}>
                <View style={sf.sectionTitleRow}>
                    <MaterialCommunityIcons name={icon} size={20} color={colors.accentTeal} />
                    <Text style={[sf.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
                </View>
                {subtitle && <Text style={[sf.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            {rightSlot}
        </View>
    );
};

// ─────────────────────────────────────────────
// MY PROFILE TAB
// ─────────────────────────────────────────────
const getCountryISO = (code?: string) => {
    if (!code) return 'IN';
    const clean = code.replace(/[^\d]/g, '');
    if (clean === '1') return 'US';
    if (clean === '91') return 'IN';
    if (clean === '44') return 'GB';
    if (clean === '971') return 'AE';
    if (clean === '61') return 'AU';
    return 'IN';
};

function MyProfileTab({ profile, onSave, isSaving, accessToken }: { profile: any; onSave: (data: any, silent?: boolean) => void; isSaving: boolean; accessToken: string | null }) {
    const { colors, theme } = useAppTheme();
    const insets = useSafeAreaInsets();
    const sf = getStyles(colors);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        description: '',
        website: '',
        address: '',
    });
    const [countryCode, setCountryCode] = useState('+91');
    const [countryCodeISO, setCountryCodeISO] = useState<any>('IN');
    const phoneInputRef = useRef<PhoneInput>(null);

    const [localImageUri, setLocalImageUri] = useState<string | null>(null);
    const [isImageRemoved, setIsImageRemoved] = useState(false);
    const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    useEffect(() => {
        if (profile) {
            setIsImageRemoved(false);
            setLocalImageUri(null);
            let rawPhone = profile.phone || '';
            let rawCC = profile.country_code || (profile as any)?.countryCode || '+91';

            let cleanPhone = rawPhone.replace(/[^\d]/g, '');
            let ccDigits = rawCC.replace(/[^\d]/g, '');

            if (ccDigits && cleanPhone.startsWith(ccDigits)) {
                cleanPhone = cleanPhone.slice(ccDigits.length);
            }

            const formattedCC = rawCC.startsWith('+') ? rawCC : `+${rawCC}`;
            setCountryCode(formattedCC);
            setCountryCodeISO(getCountryISO(formattedCC));

            const displayPhone = rawPhone.startsWith('+') ? rawPhone : `${formattedCC} ${cleanPhone}`;

            setForm({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                email: profile.email || '',
                phone: displayPhone,
                description: profile.description || '',
                website: profile.website || '',
                address: profile.address || '',
            });
        }
    }, [profile]);

    const initials = profile
        ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
        : '';

    const displayImageUri = isImageRemoved ? null : (localImageUri || profile?.image || (profile as any)?.image_url || (profile as any)?.avatar || (profile as any)?.photo || null);

    const handleRemovePhoto = () => {
        setIsImageRemoved(true);
        setLocalImageUri(null);
    };

    const handlePhotoSelect = async (source: 'gallery' | 'camera') => {
        setPhotoPickerVisible(false);
        try {
            if (source === 'gallery') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Please allow access to your photo library.');
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: Platform.OS === 'ios',
                    aspect: [1, 1],
                    quality: 0.7,
                });
                if (!result.canceled && result.assets[0]) {
                    await uploadPhoto(result.assets[0].uri);
                }
            } else {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Please allow camera access.');
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: Platform.OS === 'ios',
                    aspect: [1, 1],
                    quality: 0.7,
                });
                if (!result.canceled && result.assets[0]) {
                    await uploadPhoto(result.assets[0].uri);
                }
            }
        } catch (err) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
    };

    const uploadPhoto = async (uri: string) => {
        setLocalImageUri(uri);
        setIsImageRemoved(false);
        if (!accessToken) return;
        setIsUploadingPhoto(true);
        try {
            const result = await uploadTeamProfileImage(accessToken, uri);
            // Save the returned URL back via onSave so the profile is updated
            onSave({ ...form, image: result.url }, true);
        } catch (err) {
            Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
            setLocalImageUri(null);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    return (
        <View style={sf.tabContent}>
            <SectionHeader
                icon="account-circle-outline"
                title="My Profile"
                subtitle="Manage your personal details and contact information."
            />

            <View style={sf.card}>
                <View style={sf.profileCardRow}>
                    {/* Avatar */}
                    <View style={sf.avatarCol}>
                        <View style={sf.avatarWrap}>
                            {displayImageUri ? (
                                <>
                                    <Image source={{ uri: displayImageUri }} style={sf.avatarImg} />
                                    <TouchableOpacity
                                        style={sf.avatarDeleteBtn}
                                        activeOpacity={0.8}
                                        onPress={handleRemovePhoto}
                                    >
                                        <MaterialCommunityIcons name="trash-can-outline" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={sf.avatarPlaceholder}>
                                    <Text style={sf.avatarInitials}>{initials}</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={sf.avatarCamBtn}
                                activeOpacity={0.8}
                                onPress={() => setPhotoPickerVisible(true)}
                                disabled={isUploadingPhoto}
                            >
                                {isUploadingPhoto ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <MaterialCommunityIcons name="camera" size={16} color="#fff" />
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={sf.avatarName}>{profile?.first_name} {profile?.last_name}</Text>
                        <Text style={sf.avatarEmail}>{profile?.email}</Text>

                        {/* Quick stats */}
                        <View style={sf.quickStats}>
                            <Text style={sf.quickStatsLabel}>QUICK STATS</Text>
                            <View style={sf.statRow}>
                                <Text style={sf.statKey}>Account Status</Text>
                                <View style={sf.activeBadge}>
                                    <Text style={sf.activeBadgeText}>ACTIVE</Text>
                                </View>
                            </View>
                            <View style={sf.statRow}>
                                <Text style={sf.statKey}>Role</Text>
                                <Text style={sf.statVal}>Agency</Text>
                            </View>
                        </View>
                    </View>

                    {/* Form fields */}
                    <View style={sf.formCol}>
                        <View style={sf.twoCol}>
                            <View style={{ flex: 1 }}>
                                <InputField label="First Name" value={form.first_name} onChangeText={(t: string) => setForm({ ...form, first_name: t })} placeholder="Vishal" required />
                            </View>
                            <View style={{ flex: 1 }}>
                                <InputField label="Last Name" value={form.last_name} onChangeText={(t: string) => setForm({ ...form, last_name: t })} placeholder="Pandey" required />
                            </View>
                        </View>

                        <InputField
                            label="Email Address (Primary)"
                            value={form.email}
                            placeholder="you@example.com"
                            icon="email-outline"
                            editable={false}
                        />

                        <View style={{ gap: 6, marginBottom: 4 }}>
                            <Text style={sf.inputLabel}>Phone Number</Text>
                            <PhoneInput
                                ref={phoneInputRef}
                                defaultValue={form.phone}
                                defaultCode={countryCodeISO || 'IN'}
                                layout="first"
                                onChangeText={(text) => {
                                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 15);
                                    setForm({ ...form, phone: cleaned });
                                }}
                                onChangeFormattedText={(_text) => {
                                    const callingCode = phoneInputRef.current?.getCallingCode();
                                    const iso = phoneInputRef.current?.getCountryCode();
                                    if (callingCode) setCountryCode(`+${callingCode}`);
                                    if (iso) setCountryCodeISO(iso);
                                }}
                                onChangeCountry={(country) => {
                                    if (country.cca2) setCountryCodeISO(country.cca2);
                                    if (country.callingCode && country.callingCode[0]) {
                                        setCountryCode(`+${country.callingCode[0]}`);
                                    }
                                }}
                                containerStyle={sf.phoneContainer}
                                textContainerStyle={sf.phoneTextContainer}
                                textInputStyle={sf.phoneTextInput}
                                codeTextStyle={{ display: 'none' }}
                                flagButtonStyle={sf.phoneFlagButton}
                                placeholder="Phone Number"
                                withDarkTheme={theme === 'dark'}
                                textInputProps={{
                                    placeholderTextColor: colors.textMuted,
                                    keyboardType: 'phone-pad',
                                    maxLength: 15,
                                    editable: false,
                                }}
                                countryPickerProps={{
                                    withFilter: true,
                                    withAlphaFilter: true,
                                    renderFlagButton: (props: any) => {
                                        const code = (props.countryCode || countryCodeISO || 'IN').toUpperCase();
                                        const emoji = code.replace(/./g, (c: string) =>
                                            String.fromCodePoint(0x1F1A5 + c.charCodeAt(0))
                                        );
                                        return <Text style={{ fontSize: 18, lineHeight: 22 }}>{emoji}</Text>;
                                    },
                                    theme: theme === 'dark' ? {
                                        backgroundColor: '#000000',
                                        onBackgroundTextColor: '#FFFFFF',
                                        fontSize: 16,
                                        filterPlaceholderTextColor: '#94A3B8',
                                    } : {
                                        backgroundColor: '#FFFFFF',
                                        onBackgroundTextColor: '#0F172A',
                                        fontSize: 16,
                                        filterPlaceholderTextColor: '#64748B',
                                    },
                                }}
                            />
                        </View>

                        <View style={sf.divider} />

                        {/* Additional Information */}
                        <View style={sf.additionalHeader}>
                            <MaterialCommunityIcons name="text-box-outline" size={18} color={colors.accentTeal} />
                            <Text style={sf.additionalTitle}>Additional Information</Text>
                        </View>

                        <InputField
                            label="Bio / Short Description"
                            value={form.description}
                            onChangeText={(t: string) => setForm({ ...form, description: t })}
                            placeholder="Brief professional summary..."
                            multiline
                        />

                        <View style={sf.twoCol}>
                            <View style={{ flex: 1 }}>
                                <InputField
                                    label="Personal Website"
                                    value={form.website}
                                    onChangeText={(t: string) => setForm({ ...form, website: t })}
                                    placeholder="https://yourlink.com"
                                    icon="web"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <InputField
                                    label="Work Address"
                                    value={form.address}
                                    onChangeText={(t: string) => setForm({ ...form, address: t })}
                                    placeholder="City, State, Country"
                                    icon="map-marker-outline"
                                />
                            </View>
                        </View>

                        {/* Save Profile Details Button */}
                        <View style={{ marginTop: 22, alignSelf: 'flex-end' }}>
                            <SaveButton
                                label="Save Profile Details"
                                onPress={() => onSave({
                                    ...form,
                                    country_code: countryCode,
                                    image: isImageRemoved ? null : (localImageUri || profile?.image || null),
                                })}
                                loading={isSaving}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Photo Source Picker Modal */}
            <Modal
                visible={photoPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPhotoPickerVisible(false)}
            >
                <Pressable style={sf.pickerOverlay} onPress={() => setPhotoPickerVisible(false)}>
                    <View style={[sf.pickerSheet, { paddingBottom: Math.max(36, insets.bottom + 24) }]}>
                        <Text style={sf.pickerTitle}>Update Profile Photo</Text>
                        <Text style={sf.pickerSub}>Choose a source</Text>

                        <TouchableOpacity style={sf.pickerBtn} activeOpacity={0.8} onPress={() => handlePhotoSelect('camera')}>
                            <View style={sf.pickerBtnIcon}>
                                <MaterialCommunityIcons name="camera-outline" size={22} color={DARK_NAVY} />
                            </View>
                            <Text style={sf.pickerBtnText}>Take a Photo</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                        </TouchableOpacity>

                        <TouchableOpacity style={sf.pickerBtn} activeOpacity={0.8} onPress={() => handlePhotoSelect('gallery')}>
                            <View style={sf.pickerBtnIcon}>
                                <MaterialCommunityIcons name="image-multiple-outline" size={22} color={DARK_NAVY} />
                            </View>
                            <Text style={sf.pickerBtnText}>Choose from Gallery</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                        </TouchableOpacity>

                        {!!displayImageUri && (
                            <TouchableOpacity
                                style={[sf.pickerBtn, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setPhotoPickerVisible(false);
                                    handleRemovePhoto();
                                }}
                            >
                                <View style={[sf.pickerBtnIcon, { backgroundColor: '#FEE2E2' }]}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
                                </View>
                                <Text style={[sf.pickerBtnText, { color: '#EF4444' }]}>Remove Photo</Text>
                                <MaterialCommunityIcons name="chevron-right" size={20} color="#FCA5A5" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[sf.pickerBtn, sf.pickerCancelBtn]} activeOpacity={0.8} onPress={() => setPhotoPickerVisible(false)}>
                            <Text style={sf.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

// ─────────────────────────────────────────────
// BRANDING TAB
// ─────────────────────────────────────────────
const BrandingTab = ({ branding, onSave, isSaving, accessToken }: any) => {
    const { colors } = useAppTheme();
    const sf = getStyles(colors);
    const [form, setForm] = useState({
        legal_name: '',
        website: '',
        description: '',
        support_email: '',
        public_phone: '',
        address: '',
        theme_color: '#0B2341',
        text_color: '#ffffff',
        logo_url: '',
    });
    const [themePickerOpen, setThemePickerOpen] = useState(false);
    const [textPickerOpen, setTextPickerOpen] = useState(false);
    const [logoLoading, setLogoLoading] = useState(false);

    useEffect(() => {
        if (branding) {
            setForm({
                legal_name: branding.legal_name || '',
                website: branding.website || '',
                description: branding.description || '',
                support_email: branding.support_email || '',
                public_phone: branding.public_phone || '',
                address: branding.address || '',
                theme_color: branding.theme_color || '#0B2341',
                text_color: branding.text_color || '#ffffff',
                logo_url: branding.logo_url || '',
            });
        }
    }, [branding]);

    const handleLogoSelect = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to your photo library.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: Platform.OS === 'ios',
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                await uploadLogo(result.assets[0].uri);
            }
        } catch (err) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
    };

    const uploadLogo = async (uri: string) => {
        if (!accessToken) return;
        setLogoLoading(true);
        try {
            const result = await uploadBrandingLogo(accessToken, uri);
            setForm(f => ({ ...f, logo_url: result.url }));
        } catch (err) {
            Alert.alert('Upload Failed', 'Could not upload logo. Please try again.');
        } finally {
            setLogoLoading(false);
        }
    };

    return (
        <View style={sf.tabContent}>
            <SectionHeader
                icon="palette-outline"
                title="White-label Branding"
                subtitle="Customize the platform to match your agency's brand."
            />

            <View style={sf.card}>
                <View style={sf.brandingRow}>
                    {/* Logo Column */}
                    <View style={sf.logoCol}>
                        <Text style={sf.logoColLabel}>AGENCY LOGO</Text>
                        {form.logo_url ? (
                            <TouchableOpacity style={sf.logoBox} onPress={handleLogoSelect} activeOpacity={0.8} disabled={logoLoading}>
                                {logoLoading ? (
                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                        <ActivityIndicator size="small" color="#0B2341" />
                                    </View>
                                ) : (
                                    <Image source={{ uri: form.logo_url }} style={sf.logoImg} resizeMode="contain" />
                                )}
                                <View style={sf.logoOverlay}>
                                    <MaterialCommunityIcons name="camera-outline" size={14} color="#fff" />
                                    <Text style={sf.logoOverlayText}>Change Logo</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={sf.logoUploadBox} onPress={handleLogoSelect} activeOpacity={0.7} disabled={logoLoading}>
                                {logoLoading ? (
                                    <ActivityIndicator size="small" color="#0B2341" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="camera-outline" size={32} color="#94A3B8" />
                                        <Text style={sf.logoUploadText}>UPLOAD LOGO</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        <Text style={sf.logoHint}>PNG or SVG recommended.{'\n'}Transparent background looks best.</Text>
                    </View>

                    {/* Fields Column */}
                    <View style={sf.brandingFieldsCol}>
                        <InputField
                            label="Agency Name"
                            value={form.legal_name}
                            onChangeText={(t: string) => setForm({ ...form, legal_name: t })}
                            placeholder="Agency Name"
                            icon="domain"
                            required
                        />

                        {/* Theme Color */}
                        <View style={sf.inputGroup}>
                            <Text style={sf.inputLabel}>Theme Color</Text>
                            <View style={sf.colorRow}>
                                <TouchableOpacity
                                    style={[sf.colorSwatch, { backgroundColor: form.theme_color }]}
                                    onPress={() => setThemePickerOpen(true)}
                                    activeOpacity={0.8}
                                />
                                <View style={[sf.inputWrap, { flex: 1, borderColor: colors.cardBorder, backgroundColor: colors.inputBackground }]}>
                                    <TextInput
                                        style={[sf.textInput, { color: colors.textPrimary }]}
                                        value={form.theme_color}
                                        onChangeText={(t) => setForm({ ...form, theme_color: t })}
                                        placeholder="#0B2341"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                                <Text style={sf.colorHint}>Primary background color for your portal.</Text>
                            </View>
                        </View>

                        {/* Text Color */}
                        <View style={sf.inputGroup}>
                            <Text style={sf.inputLabel}>Text Color</Text>
                            <View style={sf.colorRow}>
                                <TouchableOpacity
                                    style={[sf.colorSwatch, { backgroundColor: form.text_color, borderWidth: 1, borderColor: colors.cardBorder }]}
                                    onPress={() => setTextPickerOpen(true)}
                                    activeOpacity={0.8}
                                />
                                <View style={[sf.inputWrap, { flex: 1, borderColor: colors.cardBorder, backgroundColor: colors.inputBackground }]}>
                                    <TextInput
                                        style={[sf.textInput, { color: colors.textPrimary }]}
                                        value={form.text_color}
                                        onChangeText={(t) => setForm({ ...form, text_color: t })}
                                        placeholder="#FFFFFF"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                                <Text style={sf.colorHint}>Text color for the sidebar and buttons.</Text>
                            </View>
                        </View>

                        {/* Save Changes Button */}
                        <View style={{ marginTop: 10, alignSelf: 'flex-end' }}>
                            <SaveButton
                                label="Save Changes"
                                onPress={() => onSave(form)}
                                loading={isSaving}
                            />
                        </View>
                    </View>
                </View>
            </View>

            <ColorPickerModal
                visible={themePickerOpen}
                initialColor={form.theme_color}
                onClose={() => setThemePickerOpen(false)}
                onSelectColor={(c: string) => { setForm({ ...form, theme_color: c }); setThemePickerOpen(false); }}
                title="Theme Color"
            />
            <ColorPickerModal
                visible={textPickerOpen}
                initialColor={form.text_color}
                onClose={() => setTextPickerOpen(false)}
                onSelectColor={(c: string) => { setForm({ ...form, text_color: c }); setTextPickerOpen(false); }}
                title="Text Color"
            />
        </View>
    );
};

// ─────────────────────────────────────────────
// SECURITY & ACCESS TAB
// ─────────────────────────────────────────────
const SecurityTab = ({
    onToast,
    onSave,
    isSaving
}: {
    onToast: (msg: string, type: 'success' | 'error') => void;
    onSave: (data: any) => Promise<void>;
    isSaving: boolean;
}) => {
    const { colors } = useAppTheme();
    const sf = getStyles(colors);
    const [form, setForm] = useState({ current: '', newPwd: '', confirm: '' });

    const handleUpdate = async () => {
        if (!form.current) { onToast('Current password is required!', 'error'); return; }
        if (!form.newPwd) { onToast('New password is required!', 'error'); return; }
        if (form.newPwd !== form.confirm) { onToast('Passwords do not match!', 'error'); return; }
        
        try {
            await onSave({
                current_password: form.current,
                password: form.newPwd,
                new_password: form.newPwd,
                confirm_password: form.confirm,
                password_confirmation: form.confirm
            });
            setForm({ current: '', newPwd: '', confirm: '' });
        } catch (err) {
            // Error is handled by parent/mutation
        }
    };

    return (
        <View style={sf.tabContent}>
            <SectionHeader
                icon="shield-outline"
                title="Security Settings"
                subtitle="Manage your password and authentication preferences."
            />

            <View style={sf.card}>
                {/* Change Password header */}
                <View style={sf.securityCardHeader}>
                    <View style={sf.secIconWrap}>
                        <MaterialCommunityIcons name="shield-outline" size={20} color={colors.accentTeal} />
                    </View>
                    <View>
                        <Text style={sf.secTitle}>Change Password</Text>
                        <Text style={sf.secSubtitle}>Ensure your account uses a long, random password.</Text>
                    </View>
                </View>

                {/* Form fields with spacing */}
                <View style={{ gap: 16, marginVertical: 12 }}>
                    <InputField
                        label="Current Password"
                        value={form.current}
                        onChangeText={(t: string) => setForm({ ...form, current: t })}
                        placeholder="••••••••"
                        secureTextEntry
                        required
                    />

                    <View style={sf.twoCol}>
                        <View style={{ flex: 1 }}>
                            <InputField
                                label="New Password"
                                value={form.newPwd}
                                onChangeText={(t: string) => setForm({ ...form, newPwd: t })}
                                placeholder="••••••••"
                                secureTextEntry
                                required
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <InputField
                                label="Confirm Password"
                                value={form.confirm}
                                onChangeText={(t: string) => setForm({ ...form, confirm: t })}
                                placeholder="••••••••"
                                secureTextEntry
                                required
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[sf.updatePwdBtn, { marginTop: 14 }]} 
                    onPress={handleUpdate} 
                    disabled={isSaving}
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={colors.brandGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sf.updatePwdInner}>
                        {isSaving ? (
                            <ActivityIndicator color="#fff" size="small" style={{ width: 104, height: 18 }} />
                        ) : (
                            <Text style={sf.updatePwdText}>Update Password</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// NOTIFICATIONS TAB
// ─────────────────────────────────────────────
const NOTIF_ITEMS = [
    { id: 'team', title: 'Team & Member Activity', desc: 'Notify when members join, leave, or change roles within the agency.' },
    { id: 'lead', title: 'Agency Lead Distribution', desc: 'Alert when high-value leads are unassigned or routed to members.' },
    { id: 'security', title: 'Security & Access Alerts', desc: 'Notify of unusual logins or changed permissions for agency users.' },
    { id: 'billing', title: 'Agency Billing & Limits', desc: 'Alert when team plan limits are reached or invoices process.' },
];

const NotificationsTab = ({ onSave, isSaving, initialPrefs }: { onSave: (prefs: any) => void; isSaving: boolean; initialPrefs?: any }) => {
    const { colors } = useAppTheme();
    const sf = getStyles(colors);
    const [prefs, setPrefs] = useState<Record<string, boolean>>({
        team_email: false, team_push: false,
        lead_email: false, lead_push: false,
        security_email: false, security_push: false,
        billing_email: false, billing_push: false,
    });

    useEffect(() => {
        if (initialPrefs) {
            setPrefs({
                team_email: !!initialPrefs.member_activity?.email,
                team_push: !!initialPrefs.member_activity?.push,
                lead_email: !!initialPrefs.lead_distribution?.email,
                lead_push: !!initialPrefs.lead_distribution?.push,
                security_email: !!initialPrefs.agency_security?.email,
                security_push: !!initialPrefs.agency_security?.push,
                billing_email: !!initialPrefs.agency_billing?.email,
                billing_push: !!initialPrefs.agency_billing?.push,
            });
        }
    }, [initialPrefs]);

    const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }));

    return (
        <View style={sf.tabContent}>
            <SectionHeader
                icon="bell-outline"
                title="Notification Preferences"
                subtitle="Choose how and when you want to be alerted."
            />

            <View style={sf.card}>
                {NOTIF_ITEMS.map((item, idx) => (
                    <View key={item.id}>
                        <View style={sf.notifRow}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                <Text style={sf.notifTitle}>{item.title}</Text>
                                <Text style={sf.notifDesc}>{item.desc}</Text>
                            </View>
                            <View style={sf.notifToggles}>
                                <View style={sf.toggleGroup}>
                                    <Text style={sf.toggleLabel}>EMAIL</Text>
                                    <Switch
                                        value={prefs[`${item.id}_email`]}
                                        onValueChange={() => toggle(`${item.id}_email`)}
                                        trackColor={{ false: colors.divider, true: colors.accentTeal }}
                                        thumbColor="#fff"
                                        style={{ transform: [{ scale: 0.82 }] }}
                                    />
                                </View>
                                <View style={sf.toggleGroup}>
                                    <Text style={sf.toggleLabel}>PUSH</Text>
                                    <Switch
                                        value={prefs[`${item.id}_push`]}
                                        onValueChange={() => toggle(`${item.id}_push`)}
                                        trackColor={{ false: colors.divider, true: colors.accentTeal }}
                                        thumbColor="#fff"
                                        style={{ transform: [{ scale: 0.82 }] }}
                                    />
                                </View>
                            </View>
                        </View>
                        {idx < NOTIF_ITEMS.length - 1 && <View style={sf.notifDivider} />}
                    </View>
                ))}

                {/* Save Preferences Button */}
                <TouchableOpacity
                    style={[sf.updatePwdBtn, { marginTop: 20, alignSelf: 'flex-end' }]}
                    onPress={() => onSave({
                        member_activity: {
                            email: !!prefs.team_email,
                            push: !!prefs.team_push,
                        },
                        lead_distribution: {
                            email: !!prefs.lead_email,
                            push: !!prefs.lead_push,
                        },
                        agency_security: {
                            email: !!prefs.security_email,
                            push: !!prefs.security_push,
                        },
                        agency_billing: {
                            email: !!prefs.billing_email,
                            push: !!prefs.billing_push,
                        },
                    })}
                    disabled={isSaving}
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={colors.brandGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sf.updatePwdInner}>
                        {isSaving ? (
                            <ActivityIndicator color={colors.gradientButtonText || '#fff'} size="small" style={{ width: 110, height: 18 }} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialCommunityIcons name="content-save-outline" size={16} color={colors.gradientButtonText || '#fff'} />
                                <Text style={[sf.updatePwdText, { color: colors.gradientButtonText || '#fff' }]}>Save Preferences</Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' }) => {
    const { colors } = useAppTheme();
    const sf = getStyles(colors);
    const translateY = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    }, []);

    const isSuccess = type === 'success';
    return (
        <Animated.View style={[sf.toast, isSuccess ? sf.toastSuccess : sf.toastError, { transform: [{ translateY }] }]}>
            <MaterialCommunityIcons
                name={isSuccess ? 'check-circle' : 'alert-circle'}
                size={18}
                color={isSuccess ? '#065F46' : '#991B1B'}
            />
            <Text style={[sf.toastText, { color: isSuccess ? '#065F46' : '#991B1B' }]}>{message}</Text>
        </Animated.View>
    );
};

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function AgencySettings() {
    const { accessToken } = useAuth();
    const { colors } = useAppTheme();
    const sf = getStyles(colors);
    const router = useRouter();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState('profile');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3200);
    }, []);

    // ── Queries ──────────────────────────────────────────────────
    const { data: profileData } = useQuery({
        queryKey: ['agencyProfile'],
        queryFn: () => getTeamProfile(accessToken!),
        enabled: !!accessToken,
    });

    const { data: brandingData } = useQuery({
        queryKey: ['teamBrandingSettings'],
        queryFn: () => getTeamBrandingSettings(accessToken!),
        enabled: !!accessToken,
    });

    // ── Mutations ────────────────────────────────────────────────
    const profileMutation = useMutation({
        mutationFn: (data: any) => updateTeamProfile(accessToken!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agencyProfile'] });
            showToast('Profile saved successfully!', 'success');
        },
        onError: (err: any) => showToast(err.message || 'Failed to save profile', 'error'),
    });

    const brandingMutation = useMutation({
        mutationFn: (data: Partial<TeamBrandingSettings>) => updateTeamBrandingSettings(accessToken!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamBrandingSettings'] });
            showToast('Branding saved successfully!', 'success');
        },
        onError: (err: any) => showToast(err.message || 'Failed to save branding', 'error'),
    });

    const notifMutation = useMutation({
        mutationFn: (prefs: any) => updateTeamProfile(accessToken!, { ...profileData, notification_preferences: prefs }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agencyProfile'] });
            showToast('Preferences saved successfully!', 'success');
        },
        onError: (err: any) => showToast(err.message || 'Failed to save preferences', 'error'),
    });

    const securityMutation = useMutation({
        mutationFn: (data: any) => updateTeamSecurity(accessToken!, data),
        onSuccess: () => {
            showToast('Password updated successfully!', 'success');
        },
        onError: (err: any) => showToast(err.message || 'Failed to update password', 'error'),
    });

    return (
        <DashboardLayout
            menuItems={AGENCY_MENU_ITEMS}
            customLogo={<AgencyLogo />}
            customBackground={AGENCY_BG}
            customHeaderBackground={colors.cardBackground}
            backToMainRoute="/(main)/dashboard"
            isAgency={true}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    style={sf.scroll}
                    contentContainerStyle={[sf.scrollContent, { paddingBottom: insets.bottom + 160 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Page Header ── */}
                    <View style={sf.pageHeader}>
                        <View style={sf.pageHeaderLeft}>
                            <MaterialCommunityIcons name="cog-outline" size={26} color={colors.accentTeal} />
                            <View>
                                <Text style={[sf.pageTitle, { color: colors.textPrimary }]}>Agency Settings</Text>
                                <Text style={sf.pageSubtitle}>Configure your agency-wide preferences</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Tab Bar ── */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={sf.tabBar}
                        contentContainerStyle={sf.tabBarContent}
                    >
                        {TABS.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[sf.tabItem, isActive && [sf.tabItemActive, { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal }]]}
                                    onPress={() => setActiveTab(tab.key)}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons
                                        name={tab.icon as any}
                                        size={15}
                                        color={isActive ? (colors.gradientButtonText || '#fff') : '#64748B'}
                                    />
                                    <Text style={[sf.tabText, isActive && [sf.tabTextActive, { color: colors.gradientButtonText || '#fff' }]]}>{tab.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* ── Tab Content ── */}
                    <View style={sf.tabContentWrap}>
                        {activeTab === 'profile' && (
                            <MyProfileTab
                                profile={profileData}
                                onSave={(data: any, silent?: boolean) => profileMutation.mutate({ ...profileData, ...data })}
                                isSaving={profileMutation.isPending}
                                accessToken={accessToken}
                            />
                        )}
                        {activeTab === 'branding' && (
                            <BrandingTab
                                branding={brandingData}
                                onSave={(data: any) => brandingMutation.mutate(data)}
                                isSaving={brandingMutation.isPending}
                                accessToken={accessToken}
                            />
                        )}
                        {activeTab === 'security' && (
                            <SecurityTab
                                onToast={showToast}
                                onSave={(data: any) => securityMutation.mutateAsync(data)}
                                isSaving={securityMutation.isPending}
                            />
                        )}
                        {activeTab === 'notifications' && (
                            <NotificationsTab
                                initialPrefs={profileData?.notification_preferences}
                                onSave={(prefs: any) => notifMutation.mutate(prefs)}
                                isSaving={notifMutation.isPending}
                            />
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Toast ── */}
            {toast && (
                <View style={[sf.toastWrapper, { top: insets.top + 12 }]}>
                    <Toast message={toast.message} type={toast.type} />
                </View>
            )}
        </DashboardLayout>
    );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const getStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.surfaceSoft },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

    // Page header
    pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pageTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 1 },

    // Tab bar
    tabBar: { marginBottom: 20, marginHorizontal: -16 },
    tabBarContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
    tabItem: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 10, backgroundColor: colors.cardBackground,
        borderWidth: 1, borderColor: colors.cardBorder,
    },
    tabItemActive: { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal },
    tabText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: colors.gradientButtonText || '#fff' },

    // Content wrapper
    tabContentWrap: {},
    tabContent: { gap: 16 },

    // Section header
    sectionHeader: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 4,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.textPrimary },
    sectionSubtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

    // Card
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 18,
        ...Platform.select({
            ios: { shadowColor: colors.cardShadowColor || '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 },
            android: { elevation: 2 },
        }),
    },

    // Profile tab
    profileCardRow: { flexDirection: 'column', gap: 20 },
    avatarCol: { alignItems: 'center' },
    avatarWrap: { position: 'relative', marginBottom: 10 },
    avatarImg: { width: 90, height: 90, borderRadius: 24 },
    avatarPlaceholder: {
        width: 90, height: 90, borderRadius: 24,
        backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.cardBorder,
    },
    avatarInitials: { fontSize: 28, fontWeight: '900', color: colors.textPrimary },
    avatarCamBtn: {
        position: 'absolute', bottom: -4, right: -4,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.cardBackground,
    },
    avatarDeleteBtn: {
        position: 'absolute', top: -4, right: -4,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.cardBackground,
        zIndex: 10,
    },
    avatarName: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginBottom: 2 },
    avatarEmail: { fontSize: 10, color: '#F97316', fontWeight: '700', letterSpacing: 0.3, marginBottom: 14 },
    quickStats: {
        width: '100%', backgroundColor: colors.surfaceSoft,
        borderRadius: 12, padding: 14, gap: 10,
        borderWidth: 1, borderColor: colors.cardBorder,
    },
    quickStatsLabel: { fontSize: 9, fontWeight: '900', color: colors.textMuted, letterSpacing: 1, marginBottom: 6 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statKey: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    statVal: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
    activeBadge: { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
    formCol: { gap: 14 },
    twoCol: { flexDirection: 'row', gap: 10 },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 },
    additionalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    additionalTitle: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },

    // Input
    inputGroup: { gap: 6 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, minHeight: 18, lineHeight: 18 },
    inputWrap: {
        height: 46, borderRadius: 10, borderWidth: 1.5,
        paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    textInput: { flex: 1, fontSize: 13, fontWeight: '500', height: '100%' },
    textAreaWrap: {
        minHeight: 90, borderRadius: 10, borderWidth: 1.5,
        paddingHorizontal: 12, paddingVertical: 10, alignItems: 'flex-start',
    },
    phoneContainer: {
        width: '100%',
        height: 48,
        borderWidth: 1.5,
        borderColor: colors.inputBorder,
        borderRadius: 10,
        backgroundColor: colors.inputBackground,
        overflow: 'hidden',
    },
    phoneTextContainer: {
        backgroundColor: 'transparent',
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
    phoneTextInput: {
        fontSize: 13,
        color: colors.textPrimary,
        backgroundColor: 'transparent',
        marginLeft: 8,
        fontWeight: '500',
    },
    phoneCodeText: {
        fontSize: 13,
        color: colors.textPrimary,
        paddingHorizontal: 8,
        fontWeight: '600',
    },
    phoneFlagButton: {
        width: 58,
        height: 48,
        backgroundColor: 'transparent',
        borderRightWidth: 1,
        borderRightColor: colors.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textArea: { flex: 1, fontSize: 13, fontWeight: '500', minHeight: 70 },
    eyeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

    // Branding
    brandingRow: { gap: 18 },
    logoCol: { alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
    logoColLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 14 },
    logoBox: { width: 140, height: 100, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 10, position: 'relative' },
    logoImg: { width: '100%', height: '100%' },
    logoOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4
    },
    logoOverlayText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    logoUploadBox: {
        width: 140, height: 100, borderRadius: 14, borderWidth: 2,
        borderStyle: 'dashed', borderColor: colors.cardBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
        backgroundColor: colors.surfaceSoft, gap: 6,
    },
    logoUploadText: { fontSize: 10, fontWeight: '900', color: colors.textMuted },
    logoHint: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
    brandingFieldsCol: { gap: 14 },
    colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    colorSwatch: { width: 42, height: 42, borderRadius: 10 },
    colorHint: { flex: 1, fontSize: 11, color: colors.textMuted, fontWeight: '500' },

    // Security
    securityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    secIconWrap: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
    },
    secTitle: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
    secSubtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 1 },

    updatePwdBtn: { marginTop: 8, borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-start' },
    updatePwdInner: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    updatePwdText: { color: '#fff', fontSize: 13, fontWeight: '800' },

    // Notifications
    notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    notifTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 3 },
    notifDesc: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', lineHeight: 16 },
    notifToggles: { flexDirection: 'row', gap: 10 },
    notifDivider: { height: 1, backgroundColor: colors.divider },
    toggleGroup: { alignItems: 'center', gap: 4 },
    toggleLabel: { fontSize: 9, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.8 },

    // Save button
    saveBtn: { borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-end' },
    saveBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11 },
    saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    // Toast
    toastWrapper: { position: 'absolute', left: 16, right: 16, zIndex: 999 },
    toast: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 12, borderWidth: 1,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
            android: { elevation: 8 },
        }),
    },
    toastSuccess: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
    toastError: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
    toastText: { flex: 1, fontSize: 13, fontWeight: '700' },

    // Photo Picker Sheet
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 36,
        gap: 10,
    },
    pickerTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginBottom: 2 },
    pickerSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 8 },
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: colors.surfaceSoft,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    pickerBtnIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.surfaceIcon,
        alignItems: 'center', justifyContent: 'center',
    },
    pickerBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    pickerCancelBtn: {
        marginTop: 4,
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        justifyContent: 'center',
    },
    pickerCancelText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#DC2626', textAlign: 'center' },
});
