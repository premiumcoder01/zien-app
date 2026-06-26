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

    return (
        <View style={sf.inputGroup}>
            <Text style={sf.inputLabel}>
                {label}
                {required && <Text style={{ color: '#EF4444' }}> *</Text>}
            </Text>
            <View style={[
                multiline ? sf.textAreaWrap : sf.inputWrap,
                {
                    borderColor: !editable ? '#E9EEF4' : isFocused ? colors.accentTeal : '#CBD5E1',
                    backgroundColor: !editable ? '#F1F5F9' : '#fff',
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
const MyProfileTab = ({ profile, onSave, isSaving, accessToken }: any) => {
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        description: '',
        website: '',
        address: '',
    });
    const [localImageUri, setLocalImageUri] = useState<string | null>(null);
    const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    useEffect(() => {
        if (profile) {
            setForm({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                description: profile.description || '',
                website: profile.website || '',
                address: profile.address || '',
            });
        }
    }, [profile]);

    const initials = profile
        ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
        : '';

    const displayImageUri = localImageUri || profile?.image || null;

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
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.5,
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
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.5,
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
                                <Image source={{ uri: displayImageUri }} style={sf.avatarImg} />
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
                        <Text style={sf.avatarEmail}>{profile?.email?.toUpperCase()}</Text>

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

                        <InputField
                            label="Phone Number"
                            value={form.phone}
                            onChangeText={(t: string) => setForm({ ...form, phone: t })}
                            placeholder="+1 (000) 000-0000"
                            icon="phone-outline"
                            keyboardType="phone-pad"
                            editable={false}
                        />

                        <View style={sf.divider} />

                        {/* Additional Information */}
                        <View style={sf.additionalHeader}>
                            <MaterialCommunityIcons name="text-box-outline" size={18} color={DARK_NAVY} />
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
                                onPress={() => onSave(form)}
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
                    <View style={sf.pickerSheet}>
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
                allowsEditing: true,
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
                                <View style={[sf.inputWrap, { flex: 1, borderColor: '#CBD5E1', backgroundColor: '#fff' }]}>
                                    <TextInput
                                        style={[sf.textInput, { color: DARK_NAVY }]}
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
                                    style={[sf.colorSwatch, { backgroundColor: form.text_color, borderWidth: 1, borderColor: '#E2E8F0' }]}
                                    onPress={() => setTextPickerOpen(true)}
                                    activeOpacity={0.8}
                                />
                                <View style={[sf.inputWrap, { flex: 1, borderColor: '#CBD5E1', backgroundColor: '#fff' }]}>
                                    <TextInput
                                        style={[sf.textInput, { color: DARK_NAVY }]}
                                        value={form.text_color}
                                        onChangeText={(t) => setForm({ ...form, text_color: t })}
                                        placeholder="#FFFFFF"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                                <Text style={sf.colorHint}>Text color for the sidebar and buttons.</Text>
                            </View>
                        </View>

                        <InputField
                            label="Support Email"
                            value={form.support_email}
                            onChangeText={(t: string) => setForm({ ...form, support_email: t })}
                            placeholder="hello@agency.com"
                            icon="email-outline"
                            keyboardType="email-address"
                        />

                        <InputField
                            label="Public Phone"
                            value={form.public_phone}
                            onChangeText={(t: string) => setForm({ ...form, public_phone: t })}
                            placeholder="+1 310 902 4432"
                            icon="phone-outline"
                            keyboardType="phone-pad"
                        />

                        <InputField
                            label="Address"
                            value={form.address}
                            onChangeText={(t: string) => setForm({ ...form, address: t })}
                            placeholder="City, State, Country"
                            icon="map-marker-outline"
                        />

                        <InputField
                            label="Website"
                            value={form.website}
                            onChangeText={(t: string) => setForm({ ...form, website: t })}
                            placeholder="https://yourwebsite.com"
                            icon="web"
                        />

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
                        <MaterialCommunityIcons name="shield-outline" size={20} color={DARK_NAVY} />
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
                                label="Confirm New Password"
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
                    <LinearGradient colors={[DARK_NAVY, '#132F58']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sf.updatePwdInner}>
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
                                        trackColor={{ false: '#E2E8F0', true: colors.accentTeal }}
                                        thumbColor="#fff"
                                        style={{ transform: [{ scale: 0.82 }] }}
                                    />
                                </View>
                                <View style={sf.toggleGroup}>
                                    <Text style={sf.toggleLabel}>PUSH</Text>
                                    <Switch
                                        value={prefs[`${item.id}_push`]}
                                        onValueChange={() => toggle(`${item.id}_push`)}
                                        trackColor={{ false: '#E2E8F0', true: colors.accentTeal }}
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
            customHeaderBackground="#FFFFFF"
            backToMainRoute="/(main)/dashboard"
            isAgency={true}
        >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    style={sf.scroll}
                    contentContainerStyle={[sf.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
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
const sf = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

    // Page header
    pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pageTitle: { fontSize: 20, fontWeight: '900', color: DARK_NAVY, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 1 },

    // Tab bar
    tabBar: { marginBottom: 20, marginHorizontal: -16 },
    tabBarContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
    tabItem: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 10, backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    tabItemActive: { backgroundColor: DARK_NAVY, borderColor: DARK_NAVY },
    tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    tabTextActive: { color: '#fff' },

    // Content wrapper
    tabContentWrap: {},
    tabContent: { gap: 16 },

    // Section header
    sectionHeader: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 4,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: DARK_NAVY },
    sectionSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E9EEF4',
        padding: 18,
        ...Platform.select({
            ios: { shadowColor: '#0B2341', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 },
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
        backgroundColor: '#E8F0FF', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#CBD5E1',
    },
    avatarInitials: { fontSize: 28, fontWeight: '900', color: DARK_NAVY },
    avatarCamBtn: {
        position: 'absolute', bottom: -4, right: -4,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    avatarName: { fontSize: 16, fontWeight: '900', color: DARK_NAVY, marginBottom: 2 },
    avatarEmail: { fontSize: 10, color: '#F97316', fontWeight: '700', letterSpacing: 0.3, marginBottom: 14 },
    quickStats: {
        width: '100%', backgroundColor: '#F8FAFC',
        borderRadius: 12, padding: 14, gap: 10,
        borderWidth: 1, borderColor: '#E9EEF4',
    },
    quickStatsLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 6 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statKey: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    statVal: { fontSize: 12, fontWeight: '800', color: DARK_NAVY },
    activeBadge: { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
    formCol: { gap: 14 },
    twoCol: { flexDirection: 'row', gap: 10 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
    additionalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    additionalTitle: { fontSize: 15, fontWeight: '900', color: DARK_NAVY },

    // Input
    inputGroup: { gap: 6 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
    inputWrap: {
        height: 46, borderRadius: 10, borderWidth: 1.5,
        paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    textInput: { flex: 1, fontSize: 13, fontWeight: '500', height: '100%' },
    textAreaWrap: {
        minHeight: 90, borderRadius: 10, borderWidth: 1.5,
        paddingHorizontal: 12, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    },
    textArea: { flex: 1, fontSize: 13, fontWeight: '500', minHeight: 70 },
    eyeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

    // Branding
    brandingRow: { gap: 18 },
    logoCol: { alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    logoColLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.2, marginBottom: 14 },
    logoBox: { width: 140, height: 100, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, position: 'relative' },
    logoImg: { width: '100%', height: '100%' },
    logoOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4
    },
    logoOverlayText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    logoUploadBox: {
        width: 140, height: 100, borderRadius: 14, borderWidth: 2,
        borderStyle: 'dashed', borderColor: '#CBD5E1',
        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
        backgroundColor: '#F8FAFC', gap: 6,
    },
    logoUploadText: { fontSize: 10, fontWeight: '900', color: '#94A3B8' },
    logoHint: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 17 },
    brandingFieldsCol: { gap: 14 },
    colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    colorSwatch: { width: 42, height: 42, borderRadius: 10 },
    colorHint: { flex: 1, fontSize: 11, color: '#94A3B8', fontWeight: '500' },

    // Security
    securityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    secIconWrap: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
    },
    secTitle: { fontSize: 15, fontWeight: '900', color: DARK_NAVY },
    secSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 1 },

    updatePwdBtn: { marginTop: 8, borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-start' },
    updatePwdInner: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    updatePwdText: { color: '#fff', fontSize: 13, fontWeight: '800' },

    // Notifications
    notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    notifTitle: { fontSize: 13, fontWeight: '800', color: DARK_NAVY, marginBottom: 3 },
    notifDesc: { fontSize: 11, color: '#64748B', fontWeight: '500', lineHeight: 16 },
    notifToggles: { flexDirection: 'row', gap: 10 },
    notifDivider: { height: 1, backgroundColor: '#F1F5F9' },
    toggleGroup: { alignItems: 'center', gap: 4 },
    toggleLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.8 },

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
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 36,
        gap: 10,
    },
    pickerTitle: { fontSize: 18, fontWeight: '900', color: DARK_NAVY, marginBottom: 2 },
    pickerSub: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 8 },
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E9EEF4',
    },
    pickerBtnIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#EEF2FF',
        alignItems: 'center', justifyContent: 'center',
    },
    pickerBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: DARK_NAVY },
    pickerCancelBtn: {
        marginTop: 4,
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        justifyContent: 'center',
    },
    pickerCancelText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#DC2626', textAlign: 'center' },
});
