import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
    createEmployee,
    deleteEmployee,
    Employee,
    getTeamEmployees,
    getTeamProfile,
    getTeamRoles,
    getTeamSubscription,
    updateEmployee,
    updateEmployeePassword,
    updateEmployeeStatus,
    updateTeamCapacity
} from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import PhoneInput from 'react-native-phone-number-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

const { width } = Dimensions.get('window');

const StatCard = ({ icon, value, label, color, onPress }: any) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const CardComp = onPress ? TouchableOpacity : View;
    return (
        <CardComp
            onPress={onPress}
            activeOpacity={0.75}
            style={[styles.statPanel, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
        >
            <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
                <MaterialCommunityIcons name={icon} size={20} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
        </CardComp>
    );
};

const COUNTRY_CODE_TO_ISO: Record<string, string> = {
    '+1': 'US',
    '+1-CA': 'CA',
    '+7': 'RU',
    '+20': 'EG',
    '+27': 'ZA',
    '+30': 'GR',
    '+31': 'NL',
    '+32': 'BE',
    '+33': 'FR',
    '+34': 'ES',
    '+36': 'HU',
    '+39': 'IT',
    '+40': 'RO',
    '+41': 'CH',
    '+43': 'AT',
    '+44': 'GB',
    '+45': 'DK',
    '+46': 'SE',
    '+47': 'NO',
    '+48': 'PL',
    '+49': 'DE',
    '+51': 'PE',
    '+52': 'MX',
    '+53': 'CU',
    '+54': 'AR',
    '+55': 'BR',
    '+56': 'CL',
    '+57': 'CO',
    '+58': 'VE',
    '+60': 'MY',
    '+61': 'AU',
    '+62': 'ID',
    '+63': 'PH',
    '+64': 'NZ',
    '+65': 'SG',
    '+66': 'TH',
    '+81': 'JP',
    '+82': 'KR',
    '+84': 'VN',
    '+86': 'CN',
    '+90': 'TR',
    '+91': 'IN',
    '+92': 'PK',
    '+93': 'AF',
    '+94': 'LK',
    '+95': 'MM',
    '+98': 'IR',
    '+212': 'MA',
    '+213': 'DZ',
    '+216': 'TN',
    '+234': 'NG',
    '+254': 'KE',
    '+351': 'PT',
    '+353': 'IE',
    '+358': 'FI',
    '+380': 'UA',
    '+502': 'GT',
    '+503': 'SV',
    '+504': 'HN',
    '+505': 'NI',
    '+506': 'CR',
    '+507': 'PA',
    '+593': 'EC',
    '+880': 'BD',
    '+966': 'SA',
    '+971': 'AE',
};

const getCountryISO = (countryCode?: string) => {
    if (!countryCode) return 'US';
    const code = countryCode.startsWith('+') ? countryCode : '+' + countryCode;
    return (COUNTRY_CODE_TO_ISO[code] || 'US') as any;
};

const AgentModal = ({ visible, onClose, agent, onSave, roles, isSaving }: any) => {
    const { theme, colors } = useAppTheme();
    const styles = getStyles(colors);
    const isEdit = !!agent;
    const [form, setForm] = useState<any>({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone: '',
        country_code: '+1',
        license_number: '',
        address: '',
        role_id: roles?.[0]?.id || '',
        description: '',
        status: 1,
    });

    const [showRolePicker, setShowRolePicker] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const phoneInputRef = useRef<PhoneInput>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            if (agent) {
                setForm({
                    first_name: agent.user.first_name || '',
                    last_name: agent.user.last_name || '',
                    email: agent.user.email || '',
                    password: '', // Usually don't populate password on edit
                    confirm_password: '',
                    phone: (() => {
                        let rawPhone = agent.user.phone || '';
                        const callingCode = (agent.user.country_code || '+1').replace('+', '');
                        while (true) {
                            rawPhone = rawPhone.trim().replace(/^\+/, '');
                            if (callingCode && rawPhone.startsWith(callingCode)) {
                                rawPhone = rawPhone.slice(callingCode.length);
                            } else {
                                break;
                            }
                        }
                        return rawPhone;
                    })(),
                    country_code: agent.user.country_code || '+1',
                    license_number: agent.user.license_number || '',
                    address: agent.user.address || '',
                    role_id: agent.role_id,
                    description: agent.user.description || '',
                    status: agent.status
                });
            } else {
                setForm({
                    first_name: '',
                    last_name: '',
                    email: '',
                    password: '',
                    confirm_password: '',
                    phone: '',
                    country_code: '+1',
                    license_number: '',
                    address: '',
                    role_id: roles?.[0]?.id || '',
                    description: '',
                    status: 1,
                });
            }
            setShowRolePicker(false);
        }
    }, [agent, visible, roles]);

    const handleSubmit = () => {
        let newErrors: Record<string, string> = {};

        if (!form.first_name?.trim()) newErrors.first_name = 'First name is required';
        if (!form.last_name?.trim()) newErrors.last_name = 'Last name is required';

        if (!form.email?.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!isEdit) {
            if (!form.password) newErrors.password = 'Password is required';
            else if (form.password.length < 8) newErrors.password = 'Min 8 characters required';

            if (form.password !== form.confirm_password) newErrors.confirm_password = 'Passwords must match';
        }

        if (!form.role_id) newErrors.role_id = 'Role is required';

        if (form.phone && phoneInputRef.current && !phoneInputRef.current.isValidNumber(form.phone)) {
            newErrors.phone = 'Invalid phone number';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        const callingCode = (form.country_code || '+1').replace('+', '');
        let cleanedPhone = form.phone.replace(/\D/g, '');
        if (callingCode && cleanedPhone.startsWith(callingCode)) {
            cleanedPhone = cleanedPhone.slice(callingCode.length);
        }
        onSave({
            ...form,
            phone: cleanedPhone
        });
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={{ flex: 1, backgroundColor: colors.cardBackground }}>
                <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                    <View style={{ flex: 1 }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, paddingTop: Math.max(insets.top, 16) + 12, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.cardBackground }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft }}>
                                    <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
                                </TouchableOpacity>
                                <View>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary }}>
                                        {isEdit ? "Edit Team Member" : "Add New Team Member"}
                                    </Text>
                                    <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>
                                        {isEdit ? "Update professional details" : "Register a new agency agent"}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 20 }}>
                            {/* Row 1: Name (Single Column) */}
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>First Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TextInput style={{ height: 48, borderWidth: 1, borderColor: errors.first_name ? '#EF4444' : '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.inputBackground }}
                                    value={form.first_name} onChangeText={t => { setForm({ ...form, first_name: t }); setErrors({ ...errors, first_name: '' }); }} placeholder="John" placeholderTextColor="#94A3B8" />
                                {errors.first_name && <Text style={{ fontSize: 11, color: '#EF4444' }}>{errors.first_name}</Text>}
                            </View>

                            <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Last Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TextInput style={{ height: 48, borderWidth: 1, borderColor: errors.last_name ? '#EF4444' : '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.inputBackground }}
                                    value={form.last_name} onChangeText={t => { setForm({ ...form, last_name: t }); setErrors({ ...errors, last_name: '' }); }} placeholder="Doe" placeholderTextColor="#94A3B8" />
                                {errors.last_name && <Text style={{ fontSize: 11, color: '#EF4444' }}>{errors.last_name}</Text>}
                            </View>

                            {/* Row 2: Email */}
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Email Address <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TextInput style={{ height: 48, borderWidth: 1, borderColor: errors.email ? '#EF4444' : '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.inputBackground }}
                                    value={form.email} onChangeText={t => { setForm({ ...form, email: t }); setErrors({ ...errors, email: '' }); }} placeholder="john.doe@agency.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" />
                                {errors.email && <Text style={{ fontSize: 11, color: '#EF4444' }}>{errors.email}</Text>}
                            </View>

                            {/* Row 3: Passwords (Only for Add) */}
                            {!isEdit && (
                                <>
                                    <View style={{ gap: 6 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Password <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1, borderColor: errors.password ? '#EF4444' : '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, backgroundColor: colors.inputBackground }}>
                                            <TextInput style={{ flex: 1, fontSize: 14, color: colors.textPrimary }} secureTextEntry={!showPassword}
                                                value={form.password} onChangeText={t => { setForm({ ...form, password: t }); setErrors({ ...errors, password: '' }); }} placeholder="Min 8 characters" placeholderTextColor="#94A3B8" />
                                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                                <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                                            </TouchableOpacity>
                                        </View>
                                        {errors.password && <Text style={{ fontSize: 11, color: '#EF4444' }}>{errors.password}</Text>}
                                    </View>

                                    <View style={{ gap: 6 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Confirm Password <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1, borderColor: errors.confirm_password ? '#EF4444' : '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, backgroundColor: colors.inputBackground }}>
                                            <TextInput style={{ flex: 1, fontSize: 14, color: colors.textPrimary }} secureTextEntry={!showConfirmPassword}
                                                value={form.confirm_password} onChangeText={t => { setForm({ ...form, confirm_password: t }); setErrors({ ...errors, confirm_password: '' }); }} placeholder="Repeat password" placeholderTextColor="#94A3B8" />
                                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                <MaterialCommunityIcons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                                            </TouchableOpacity>
                                        </View>
                                        {errors.confirm_password && <Text style={{ fontSize: 11, color: '#EF4444' }}>{errors.confirm_password}</Text>}
                                    </View>
                                </>
                            )}

                            {/* Row 4: Phone and License */}
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Phone Number</Text>
                                <PhoneInput
                                    key={`phone-${agent?.id || 'new'}-${visible}`}
                                    ref={phoneInputRef}
                                    defaultValue={form.phone}
                                    defaultCode={getCountryISO(form.country_code)}
                                    layout="first"
                                    onChangeText={(text) => {
                                        // Only allow digits
                                        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 15);
                                        setForm({ ...form, phone: cleaned });
                                        setErrors({ ...errors, phone: '' });
                                    }}
                                    onChangeCountry={(country) => {
                                        setForm({ ...form, country_code: '+' + country.callingCode[0] });
                                    }}
                                    containerStyle={[{ width: '100%', height: 48, borderWidth: 1, borderColor: errors.phone ? '#EF4444' : '#E2E8F0', borderRadius: 10, backgroundColor: colors.inputBackground, overflow: 'hidden' }]}
                                    textContainerStyle={{ backgroundColor: 'transparent', paddingVertical: 0, paddingHorizontal: 0 }}
                                    textInputStyle={{ fontSize: 14, color: colors.textPrimary, backgroundColor: 'transparent', marginLeft: 10, fontWeight: '500' }}
                                    codeTextStyle={{ fontSize: 14, color: colors.textPrimary, paddingHorizontal: 10, fontWeight: '600' }}
                                    flagButtonStyle={{ width: 60, height: 48, backgroundColor: 'transparent', borderRightWidth: 1, borderRightColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                                    placeholder="Phone number"
                                    withDarkTheme={theme === 'dark'}
                                    textInputProps={{
                                        placeholderTextColor: '#94A3B8',
                                        keyboardType: 'phone-pad',
                                        maxLength: 15,
                                    }}
                                    countryPickerProps={{
                                        withFilter: true,
                                        withAlphaFilter: true,
                                        closeButtonStyle: {
                                            marginTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
                                            paddingLeft: 6,
                                        },
                                        filterProps: {
                                            placeholder: 'Enter country name',
                                            style: {
                                                marginTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
                                                height: 48,
                                                width: '75%',
                                                fontSize: 15,
                                                color: theme === 'dark' ? '#FFFFFF' : '#0F172A',
                                                paddingLeft: 8,
                                            },
                                        },
                                        flatListProps: {
                                            contentContainerStyle: { paddingBottom: 40 },
                                        },
                                        renderFlagButton: (props: any) => {
                                            const code = (props.countryCode || 'US').toUpperCase();
                                            const emoji = code.replace(/./g, (c: string) =>
                                                String.fromCodePoint(0x1F1A5 + c.charCodeAt(0))
                                            );
                                            return <Text style={{ fontSize: 20, lineHeight: 26 }}>{emoji}</Text>;
                                        },
                                        theme: theme === 'dark' ? {
                                            backgroundColor: '#000000',
                                            onBackgroundTextColor: '#FFFFFF',
                                            fontSize: 15,
                                            filterPlaceholderTextColor: '#94A3B8',
                                        } : {
                                            backgroundColor: '#FFFFFF',
                                            onBackgroundTextColor: '#0F172A',
                                            fontSize: 15,
                                            filterPlaceholderTextColor: '#64748B',
                                        },
                                    }}
                                />
                                {errors.phone && <Text style={{ fontSize: 11, color: '#EF4444' }}>{errors.phone}</Text>}
                            </View>

                            <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>License Number</Text>
                                <TextInput style={{ height: 48, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.inputBackground }}
                                    value={form.license_number} onChangeText={t => setForm({ ...form, license_number: t })} placeholder="RE-123456" placeholderTextColor="#94A3B8" />
                            </View>

                            {/* Row 5: Address */}
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Address</Text>
                                <TextInput style={{ height: 48, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.inputBackground }}
                                    value={form.address} onChangeText={t => setForm({ ...form, address: t })} placeholder="123 Agency St, City, State" placeholderTextColor="#94A3B8" />
                            </View>

                            {/* Row 6: Assign Role */}
                            <View style={{ gap: 6, zIndex: 10 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Assign Role <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, borderWidth: 1, borderColor: errors.role_id ? '#EF4444' : (showRolePicker ? colors.accentTeal : '#E2E8F0'), borderRadius: 10, paddingHorizontal: 16, backgroundColor: colors.inputBackground }}
                                    onPress={() => setShowRolePicker(!showRolePicker)}
                                >
                                    <Text style={{ fontSize: 14, color: form.role_id ? colors.textPrimary : colors.textMuted }}>
                                        {roles?.find((r: any) => r.id === form.role_id)?.name || 'Select a role...'}
                                    </Text>
                                    <MaterialCommunityIcons name={showRolePicker ? "chevron-up" : "chevron-down"} size={22} color={colors.textPrimary} />
                                </TouchableOpacity>
                                {errors.role_id && <Text style={{ fontSize: 11, color: '#EF4444' }}>{errors.role_id}</Text>}

                                {showRolePicker && (
                                    <View style={{ position: 'absolute', top: errors.role_id ? 90 : 72, left: 0, right: 0, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }}>
                                        {roles?.map((r: any, idx: number) => {
                                            const isSelected = r.id === form.role_id;
                                            return (
                                                <TouchableOpacity
                                                    key={r.id}
                                                    style={{ paddingVertical: 14, paddingHorizontal: 16, backgroundColor: isSelected ? '#3B82F6' : '#fff', borderBottomWidth: idx === roles.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}
                                                    onPress={() => { setForm({ ...form, role_id: r.id }); setErrors({ ...errors, role_id: '' }); setShowRolePicker(false); }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        {isSelected && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
                                                        <Text style={{ fontSize: 14, color: isSelected ? '#fff' : '#0D1B2A', fontWeight: isSelected ? '700' : '500', marginLeft: isSelected ? 0 : 26 }}>{r.name}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            {/* Row 7: Description */}
                            <View style={{ gap: 6, zIndex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textPrimary }}>Description</Text>
                                <TextInput style={{ height: 100, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 16, paddingTop: 16, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.inputBackground, textAlignVertical: 'top' }}
                                    value={form.description} onChangeText={t => setForm({ ...form, description: t })} placeholder="Add notes about this agent..." placeholderTextColor="#94A3B8" multiline />
                            </View>

                            <View style={{ height: 20 }} />
                        </ScrollView>

                        {/* Footer */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 20,
                            paddingTop: 16,
                            borderTopWidth: 1,
                            borderTopColor: colors.divider,
                            backgroundColor: colors.cardBackground,
                            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 20 : Math.max(insets.bottom, 16) + 12
                        }}>
                            <TouchableOpacity
                                style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: '#0D1B2A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: isSaving ? 0.7 : 1 }}
                                onPress={handleSubmit}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                                ) : (
                                    <MaterialCommunityIcons name={isEdit ? "content-save-outline" : "account-plus-outline"} size={20} color="#fff" style={{ marginRight: 8 }} />
                                )}
                                <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{isSaving ? "Saving..." : (isEdit ? "Save Changes" : "Confirm Registration")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const CapacityModal = ({
    visible,
    onClose,
    basePlanSeats,
    currentExpansionUnits,
    onSave,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    basePlanSeats: number;
    currentExpansionUnits: number;
    onSave: (units: number) => void;
    isSaving: boolean;
}) => {
    const { colors } = useAppTheme();
    const [units, setUnits] = useState<number>(currentExpansionUnits);

    useEffect(() => {
        if (visible) {
            setUnits(currentExpansionUnits);
        }
    }, [visible, currentExpansionUnits]);

    const hasChanges = units !== currentExpansionUnits;
    const totalCapacity = basePlanSeats + units;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={capacityModalStyles.overlay}>
                <View style={[capacityModalStyles.container, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                    {/* Header */}
                    <View style={capacityModalStyles.header}>
                        <Text style={[capacityModalStyles.headerTitle, { color: colors.textPrimary }]}>Manage Team Capacity</Text>
                        <TouchableOpacity
                            style={capacityModalStyles.closeBtn}
                            onPress={onClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={capacityModalStyles.body}
                    >
                        {/* Orange Icon Circle */}
                        <View style={capacityModalStyles.iconBox}>
                            <MaterialCommunityIcons name="account-group" size={30} color="#F97316" />
                        </View>

                        {/* Title & Description */}
                        <Text style={[capacityModalStyles.mainTitle, { color: colors.textPrimary }]}>Adjust Agent Slots</Text>
                        <Text style={[capacityModalStyles.subtitle, { color: colors.textSecondary }]}>
                            Adjust your total number of expansion seats below.
                        </Text>

                        {/* Stepper Section */}
                        <View style={capacityModalStyles.stepperSection}>
                            <Text style={[capacityModalStyles.stepperLabel, { color: colors.textPrimary }]}>Total Expansion Units</Text>
                            <View style={capacityModalStyles.stepperRow}>
                                <TouchableOpacity
                                    style={[
                                        capacityModalStyles.stepperBtn,
                                        { borderColor: colors.cardBorder, backgroundColor: colors.inputBackground },
                                        units <= 0 && { opacity: 0.4 }
                                    ]}
                                    onPress={() => setUnits(prev => Math.max(0, prev - 1))}
                                    disabled={units <= 0 || isSaving}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="minus" size={18} color={colors.textPrimary} />
                                </TouchableOpacity>

                                <View style={[capacityModalStyles.stepperValueBox, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
                                    <Text style={[capacityModalStyles.stepperValue, { color: colors.textPrimary }]}>{units}</Text>
                                </View>

                                <TouchableOpacity
                                    style={[capacityModalStyles.stepperBtn, { borderColor: colors.cardBorder, backgroundColor: colors.inputBackground }]}
                                    onPress={() => setUnits(prev => prev + 1)}
                                    disabled={isSaving}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Breakdown Box */}
                        <View style={[capacityModalStyles.breakdownCard, { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder }]}>
                            <View style={capacityModalStyles.breakdownRow}>
                                <Text style={[capacityModalStyles.breakdownLabel, { color: colors.textSecondary }]}>Base Plan Seats</Text>
                                <Text style={[capacityModalStyles.breakdownVal, { color: colors.textPrimary }]}>{basePlanSeats}</Text>
                            </View>
                            <View style={capacityModalStyles.breakdownRow}>
                                <Text style={[capacityModalStyles.breakdownLabel, { color: colors.textSecondary }]}>Expansion Seats ({units} units)</Text>
                                <Text style={[capacityModalStyles.breakdownVal, { color: colors.textPrimary }]}>+ {units}</Text>
                            </View>

                            <View style={[capacityModalStyles.divider, { backgroundColor: colors.cardBorder }]} />

                            <View style={capacityModalStyles.breakdownRow}>
                                <Text style={[capacityModalStyles.totalLabel, { color: colors.textPrimary }]}>Total Team Capacity</Text>
                                <Text style={capacityModalStyles.totalVal}>{totalCapacity} members</Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={[capacityModalStyles.footer, { borderTopColor: colors.cardBorder }]}>
                        <TouchableOpacity
                            style={[capacityModalStyles.cancelBtn, { borderColor: colors.cardBorder }]}
                            onPress={onClose}
                            disabled={isSaving}
                        >
                            <Text style={[capacityModalStyles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                capacityModalStyles.submitBtn,
                                hasChanges
                                    ? { backgroundColor: '#4F6B58' }
                                    : { backgroundColor: '#5B7062', opacity: 0.65 }
                            ]}
                            onPress={() => {
                                if (hasChanges) {
                                    onSave(units);
                                } else {
                                    onClose();
                                }
                            }}
                            disabled={isSaving}
                            activeOpacity={0.8}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={capacityModalStyles.submitBtnText}>
                                    {hasChanges ? 'Save Changes' : 'No Changes'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AgentDetailsModal = ({ visible, onClose, agent, onEdit, onChangePassword, onDelete, onToggleStatus, isUpdating }: { visible: boolean; onClose: () => void; agent: Employee | null; onEdit: (agent: Employee) => void; onChangePassword: (agent: Employee) => void; onDelete: (agent: Employee) => void; onToggleStatus: (agent: Employee) => void; isUpdating?: boolean }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const router = useRouter();
    if (!agent) return null;

    const statusKey = agent.status === 1 ? 'active' : agent.status === 2 ? 'pending' : 'inactive';
    const sc = STATUS_CONFIG[statusKey];
    const fullName = `${agent.user.first_name} ${agent.user.last_name}`.trim();
    const joinedDate = new Date(agent.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{label}</Text>
            <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '800', flex: 1, textAlign: 'right', marginLeft: 20 }}>{value || '-'}</Text>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={{ flex: 1, backgroundColor: colors.inputBackground }}>
                {/* Header Area */}
                <View style={{ backgroundColor: colors.cardBackground, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 24, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
                    <TouchableOpacity onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <MaterialCommunityIcons name="arrow-left" size={16} color={colors.accentTeal} />
                        <Text style={{ color: colors.accentTeal, fontSize: 13, fontWeight: '700' }}>Back to team members</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary }}>Agent Details</Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{fullName}</Text>
                        </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 24 }}>
                        <TouchableOpacity
                            onPress={() => { onClose(); router.push('/(main)/agency/access-control'); }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}
                        >
                            <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.textPrimary} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Manage Role Permissions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onEdit(agent)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}
                        >
                            <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Edit Info</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onChangePassword(agent)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}
                        >
                            <MaterialCommunityIcons name="key-variant" size={16} color={colors.textPrimary} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Change Password</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onDelete(agent)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Delete Agent</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
                    {/* Basic Info Card */}
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.cardBorder }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 }}>Basic Information</Text>
                        <InfoRow label="First Name" value={agent.user.first_name} />
                        <InfoRow label="Last Name" value={agent.user.last_name} />
                        <InfoRow label="Email Address" value={agent.user.email} />
                        <InfoRow label="Phone" value={agent.user.phone} />
                        <InfoRow label="Address" value={agent.user.address} />
                    </View>

                    {/* Role and Access Card */}
                    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.cardBorder }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 }}>Role and Access</Text>
                        <InfoRow label="Role" value={agent.role?.name} />

                        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Status</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                {isUpdating ? (
                                    <ActivityIndicator size="small" color={colors.accentTeal} />
                                ) : (
                                    <Switch
                                        value={agent.status === 1}
                                        onValueChange={() => onToggleStatus(agent)}
                                        trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                                        thumbColor="#FFFFFF"
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                    />
                                )}
                                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: sc.bg }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: sc.color }}>{sc.label.toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>

                        <InfoRow label="License Number" value={agent.user.license_number} />
                        <InfoRow label="Description" value={agent.user.description} />
                        <InfoRow label="Joined Date" value={joinedDate} />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const ChangePasswordModal = ({ visible, onClose, agent, onUpdate, isUpdating }: { visible: boolean; onClose: () => void; agent: Employee | null; onUpdate: (password: string) => void; isUpdating: boolean }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [showPass, setShowPass] = useState({ new: false, confirm: false });

    if (!agent) return null;

    const handleUpdate = () => {
        if (!passwords.new || passwords.new.length < 8) {
            Alert.alert("Error", "Password must be at least 8 characters");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        onUpdate(passwords.new);
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: '90%', backgroundColor: colors.cardBackground, borderRadius: 20, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary }}>Change Password</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ padding: 20, gap: 16 }}>
                        <View style={{ gap: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>New Password <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 16, backgroundColor: colors.inputBackground }}>
                                <TextInput
                                    style={{ flex: 1, fontSize: 14, color: colors.textPrimary }}
                                    secureTextEntry={!showPass.new}
                                    value={passwords.new}
                                    onChangeText={t => setPasswords({ ...passwords, new: t })}
                                    placeholder="Enter new password"
                                />
                                <TouchableOpacity onPress={() => setShowPass({ ...showPass, new: !showPass.new })}>
                                    <MaterialCommunityIcons name={showPass.new ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ gap: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>Confirm New Password <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 16, backgroundColor: colors.inputBackground }}>
                                <TextInput
                                    style={{ flex: 1, fontSize: 14, color: colors.textPrimary }}
                                    secureTextEntry={!showPass.confirm}
                                    value={passwords.confirm}
                                    onChangeText={t => setPasswords({ ...passwords, confirm: t })}
                                    placeholder="Confirm your password"
                                />
                                <TouchableOpacity onPress={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}>
                                    <MaterialCommunityIcons name={showPass.confirm ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 20, backgroundColor: colors.inputBackground, borderTopWidth: 1, borderTopColor: colors.divider }}>
                        <TouchableOpacity
                            style={{ height: 44, paddingHorizontal: 24, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                            onPress={onClose}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ height: 44, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                            onPress={handleUpdate}
                            disabled={isUpdating}
                        >
                            {isUpdating && <ActivityIndicator size="small" color="#fff" />}
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Update Password</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AVATAR_PALETTE = ['#6366F1', '#8B5CF6', '#EC4899', '#0a2341', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; accentBorder: string }> = {
    active: { label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.1)', accentBorder: '#10B981' },
    pending: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', accentBorder: '#F59E0B' },
    inactive: { label: 'Inactive', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', accentBorder: '#EF4444' },
};

const AgentCard = ({ agent, onDelete, onEdit, onView, onChangePassword, onToggleStatus, isUpdating }: { agent: Employee; onDelete: (agent: Employee) => void; onEdit: (agent: Employee) => void; onView: () => void; onChangePassword: (agent: Employee) => void; onToggleStatus: (agent: Employee) => void; isUpdating?: boolean }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const statusKey = agent.status === 1 ? 'active' : agent.status === 2 ? 'pending' : 'inactive';
    const sc = STATUS_CONFIG[statusKey];

    const charCode = agent.user.first_name?.charCodeAt(0) || 65;
    const avatarBg = AVATAR_PALETTE[charCode % AVATAR_PALETTE.length];
    const initial = agent.user.first_name?.charAt(0).toUpperCase() || '?';
    const fullName = `${agent.user.first_name} ${agent.user.last_name}`.trim();
    const joinedDate = new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <View style={[styles.agentCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            {/* Left accent stripe */}
            <View style={[styles.cardAccentStripe, { backgroundColor: sc.accentBorder }]} />

            <View style={styles.cardInner}>
                {/* ── Top Row: Avatar + Info + Status ── */}
                <View style={styles.cardTopRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
                        <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.agentName, { color: colors.textPrimary }]} numberOfLines={1}>{fullName || 'Unknown Agent'}</Text>
                        <Text style={[styles.agentEmail, { color: colors.textSecondary }]} numberOfLines={1}>{agent.user.email || '—'}</Text>
                        {/* Role badge */}
                        <View style={styles.roleBadge}>
                            <MaterialCommunityIcons name="shield-half-full" size={10} color={colors.accentTeal} />
                            <Text style={[styles.roleBadgeText, { color: colors.accentTeal }]}>{agent.role?.name || 'No Role Assigned'}</Text>
                        </View>
                    </View>

                    {/* Status + Toggle stacked */}
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
                            <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label.toUpperCase()}</Text>
                        </View>
                        {isUpdating ? (
                            <ActivityIndicator size="small" color={colors.accentTeal} style={{ marginRight: 2 }} />
                        ) : (
                            <Switch
                                value={agent.status === 1}
                                onValueChange={() => onToggleStatus(agent)}
                                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                                thumbColor="#FFFFFF"
                                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                            />
                        )}
                    </View>
                </View>

                {/* ── Divider ── */}
                <View style={styles.agentCardDivider} />

                {/* ── Meta Grid ── */}
                <View style={styles.metaGrid}>
                    <View style={styles.metaCell}>
                        <View style={styles.metaIconWrap}>
                            <MaterialCommunityIcons name="card-account-details-outline" size={13} color={colors.accentTeal} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.metaLabel}>LICENSE</Text>
                            <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                                {agent.user.license_number || '—'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaCell}>
                        <View style={styles.metaIconWrap}>
                            <MaterialCommunityIcons name="calendar-check-outline" size={13} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.metaLabel}>JOINED</Text>
                            <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>{joinedDate}</Text>
                        </View>
                    </View>

                    <View style={styles.metaCell}>
                        <View style={styles.metaIconWrap}>
                            <MaterialCommunityIcons name="identifier" size={13} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.metaLabel}>MEMBER ID</Text>
                            <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>#{agent.id}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Divider ── */}
                <View style={styles.agentCardDivider} />

                {/* ── Action Row ── */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(agent)}>
                        <MaterialCommunityIcons name="pencil-outline" size={14} color="#fff" />
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <View style={styles.iconActions}>
                        <TouchableOpacity style={styles.iconActionBtn} onPress={onView}>
                            <MaterialCommunityIcons name="eye-outline" size={16} color={colors.accentTeal} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconActionBtn} onPress={() => onChangePassword(agent)}>
                            <MaterialCommunityIcons name="key-variant" size={16} color="#8B5CF6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => onDelete(agent)}>
                            <MaterialCommunityIcons name="delete-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function TeamManagement() {
    const router = useRouter();
    const { colors, theme } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const [selectedTab, setSelectedTab] = useState('All Agents');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Employee | null>(null);
    const [agentToDelete, setAgentToDelete] = useState<Employee | null>(null);
    const [viewingAgent, setViewingAgent] = useState<Employee | null>(null);
    const [changePasswordAgent, setChangePasswordAgent] = useState<Employee | null>(null);
    const [updatingAgentId, setUpdatingAgentId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: profile } = useQuery({
        queryKey: ['teamProfile'],
        queryFn: () => getTeamProfile(accessToken!),
        enabled: !!accessToken,
    });

    const companyId = profile?.company_id;

    const { data: subscriptionData } = useQuery({
        queryKey: ['teamSubscription'],
        queryFn: () => getTeamSubscription(accessToken!),
        enabled: !!accessToken,
    });

    const [capacityModalVisible, setCapacityModalVisible] = useState(false);

    const { data: employeeData, isLoading: loadingEmployees, refetch: refetchEmployees } = useQuery({
        queryKey: ['teamEmployees', companyId],
        queryFn: () => getTeamEmployees(accessToken!, companyId!),
        enabled: !!accessToken && !!companyId,
    });

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetchEmployees();
        setRefreshing(false);
    }, [refetchEmployees]);

    const { data: roles } = useQuery({
        queryKey: ['teamRoles', companyId],
        queryFn: () => getTeamRoles(accessToken!, companyId!),
        enabled: !!accessToken && !!companyId,
    });

    const employees = employeeData?.employees || [];
    const maxMembers = employeeData?.max_members || 10;
    const activeCount = employees.filter(e => e.status === 1).length;
    const inactiveCount = employees.length - activeCount;

    const basePlanSeats = subscriptionData?.plan?.seats
        ? parseInt(subscriptionData.plan.seats, 10)
        : 5;
    const currentExpansionUnits = Math.max(0, maxMembers - basePlanSeats);

    const stats = [
        {
            icon: 'account-group',
            value: `${employees.length} / ${maxMembers}`,
            label: 'Team Capacity',
            color: colors.accentTeal || '#0a2341',
            onPress: () => setCapacityModalVisible(true),
        },
        { icon: 'account-check', value: activeCount.toString(), label: 'Active Agents', color: '#10B981' },
        { icon: 'account-off', value: inactiveCount.toString(), label: 'Inactive Agents', color: '#F97316' },
        { icon: 'shield-check', value: (roles?.length || 0).toString(), label: 'Roles Defined', color: '#8B5CF6' },
    ];

    const updateCapacityMutation = useMutation({
        mutationFn: (units: number) => updateTeamCapacity(accessToken!, units),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['teamEmployees', companyId] });
            queryClient.invalidateQueries({ queryKey: ['teamSubscription'] });
            queryClient.invalidateQueries({ queryKey: ['agencyDashboardStats'] });
            setCapacityModalVisible(false);
            Alert.alert("Success", res?.message || "Team capacity updated successfully");
        },
        onError: (err: any) => {
            Alert.alert("Error", err?.message || "Failed to update team capacity");
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: (data: { employeeId: number, companyId: number, status: number }) =>
            updateEmployeeStatus(accessToken!, data.employeeId, data.companyId, data.status),
        onMutate: (variables) => {
            setUpdatingAgentId(variables.employeeId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamEmployees', companyId] });
            queryClient.invalidateQueries({ queryKey: ['agencyDashboardStats'] });
        },
        onError: (err) => {
            Alert.alert("Error", err.message || "Failed to update status");
        },
        onSettled: () => {
            setUpdatingAgentId(null);
        }
    });

    const updateEmployeeMutation = useMutation({
        mutationFn: (data: { employeeId: number, payload: any }) =>
            updateEmployee(accessToken!, data.employeeId, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamEmployees', companyId] });
            queryClient.invalidateQueries({ queryKey: ['agencyDashboardStats'] });
            setModalVisible(false);
            Alert.alert("Success", "Agent updated successfully");
        },
        onError: (err) => {
            Alert.alert("Error", err.message || "Failed to update agent");
        }
    });

    const createEmployeeMutation = useMutation({
        mutationFn: (data: any) => createEmployee(accessToken!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamEmployees', companyId] });
            queryClient.invalidateQueries({ queryKey: ['agencyDashboardStats'] });
            setModalVisible(false);
            Alert.alert("Success", "Team member added successfully!");
        },
        onError: (err: any) => {
            Alert.alert("Error", err.message || "Failed to create team member");
        }
    });

    const deleteEmployeeMutation = useMutation({
        mutationFn: (employeeId: number) => deleteEmployee(accessToken!, employeeId, companyId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamEmployees', companyId] });
            queryClient.invalidateQueries({ queryKey: ['agencyDashboardStats'] });
            setAgentToDelete(null);
            Alert.alert("Success", "Agent removed successfully");
        },
        onError: (err) => {
            Alert.alert("Error", err.message || "Failed to remove agent");
        }
    });
    const updatePasswordMutation = useMutation({
        mutationFn: (data: { employeeId: number, password: string }) =>
            updateEmployeePassword(accessToken!, data.employeeId, companyId!, data.password),
        onSuccess: () => {
            setChangePasswordAgent(null);
            Alert.alert("Success", "Agent password updated successfully");
        },
        onError: (err) => {
            Alert.alert("Error", err.message || "Failed to update password");
        }
    });
    const handleDeleteAgent = (agent: Employee) => {
        setAgentToDelete(agent);
    };

    const confirmDeleteAgent = () => {
        if (agentToDelete) {
            deleteEmployeeMutation.mutate(agentToDelete.id);
        }
    };

    const handleOpenAdd = () => {
        setEditingAgent(null);
        setModalVisible(true);
    };

    const handleOpenEdit = (agent: Employee) => {
        setEditingAgent(agent);
        setModalVisible(true);
    };

    const handleToggleStatus = (agent: Employee) => {
        if (!companyId) return;
        const newStatus = agent.status === 1 ? 0 : 1;
        updateStatusMutation.mutate({
            employeeId: agent.id,
            companyId: companyId,
            status: newStatus
        });
    };

    const handleSaveAgent = (formData: any) => {
        if (!companyId) return;
        const { confirm_password, ...payload } = formData;
        const cleanPayload = {
            ...payload,
            company_id: Number(companyId),
            role_id: Number(formData.role_id),
        };

        if (editingAgent) {
            updateEmployeeMutation.mutate({
                employeeId: editingAgent.id,
                payload: cleanPayload
            });
        } else {
            createEmployeeMutation.mutate(cleanPayload);
        }
    };

    return (
        <DashboardLayout
            menuItems={AGENCY_MENU_ITEMS}
            customLogo={<AgencyLogo />}
            customBackground={AGENCY_BG}
            customHeaderBackground={colors.cardBackground}
            backToMainRoute="/(main)/dashboard"
            isAgency={true}
        >
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.accentTeal]}
                        tintColor={colors.accentTeal}
                    />
                }
            >
                {/* Header Section */}
                <View style={styles.headerArea}>
                    <Text style={[styles.mainHeading, { color: colors.textPrimary }]}>Team Management</Text>
                    <Text style={[styles.mainSubheading, { color: colors.textSecondary }]}>Monitor and manage your agency's professional agent roster</Text>
                </View>

                {/* Stats Row */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsScroll}
                >
                    {stats.map((stat, i) => (
                        <StatCard key={i} {...stat} />
                    ))}
                </ScrollView>

                {/* Filter Tabs */}
                <View style={styles.tabsRow}>
                    {['All Agents', 'Active', 'Pending', 'Inactive'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setSelectedTab(tab)}
                            style={[styles.tab, selectedTab === tab && styles.tabActive]}
                        >
                            <Text style={[styles.tabText, { color: selectedTab === tab ? colors.textPrimary : colors.textSecondary }, selectedTab === tab && styles.tabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search Box */}
                <View style={[styles.searchBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, marginBottom: 12 }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder="Search by name or email..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Action Row: Manage Capacity + Add New Member */}
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                        style={[styles.manageCapacityBtn, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
                        onPress={() => setCapacityModalVisible(true)}
                        activeOpacity={0.75}
                    >
                        <MaterialCommunityIcons name="shield-account-outline" size={18} color={colors.textPrimary} />
                        <Text style={[styles.manageCapacityText, { color: colors.textPrimary }]}>Manage Capacity</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.addMemberHeaderBtn, { backgroundColor: '#0D1B2A' }]}
                        onPress={handleOpenAdd}
                        activeOpacity={0.75}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                        <Text style={styles.addMemberHeaderText}>Add New Member</Text>
                    </TouchableOpacity>
                </View>

                {/* Mobile Agent List */}
                {(() => {
                    const filtered = employees.filter(a => {
                        const fullName = `${a.user.first_name} ${a.user.last_name}`.toLowerCase();
                        const email = a.user.email?.toLowerCase() || '';
                        const q = searchQuery.toLowerCase().trim();
                        const matchesSearch = q === '' || fullName.includes(q) || email.includes(q);
                        const matchesTab =
                            selectedTab === 'All Agents' ? true :
                                selectedTab === 'Active' ? a.status === 1 :
                                    selectedTab === 'Pending' ? a.status === 2 :
                                        selectedTab === 'Inactive' ? a.status === 0 :
                                            true;
                        return matchesSearch && matchesTab;
                    });

                    if (loadingEmployees) {
                        return (
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="large" color={colors.accentTeal} />
                                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Loading team members...</Text>
                            </View>
                        );
                    }

                    if (filtered.length === 0) {
                        const isSearching = searchQuery.trim().length > 0;
                        return (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyStateIcon}>
                                    <MaterialCommunityIcons
                                        name={isSearching ? 'account-search-outline' : 'account-group-outline'}
                                        size={40}
                                        color="#CBD5E1"
                                    />
                                </View>
                                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                                    {isSearching ? 'No results found' : `No ${selectedTab === 'All Agents' ? '' : selectedTab.toLowerCase() + ' '}agents`}
                                </Text>
                                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                    {isSearching
                                        ? `No agents match "${searchQuery}". Try a different name or email.`
                                        : selectedTab === 'All Agents'
                                            ? 'Your team is empty. Add your first agent using the + button.'
                                            : `No agents with ${selectedTab.toLowerCase()} status right now.`
                                    }
                                </Text>
                                {isSearching && (
                                    <TouchableOpacity style={styles.emptyStateCta} onPress={() => setSearchQuery('')}>
                                        <Text style={{ color: colors.accentTeal, fontWeight: '700', fontSize: 13 }}>Clear Search</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }

                    return (
                        <View style={styles.agentListContainer}>
                            {filtered.map(agent => (
                                <AgentCard
                                    key={agent.id}
                                    agent={agent}
                                    onDelete={handleDeleteAgent}
                                    onEdit={handleOpenEdit}
                                    onView={() => setViewingAgent(agent)}
                                    onChangePassword={setChangePasswordAgent}
                                    onToggleStatus={handleToggleStatus}
                                    isUpdating={updatingAgentId === agent.id}
                                />
                            ))}
                        </View>
                    );
                })()}

                <CapacityModal
                    visible={capacityModalVisible}
                    onClose={() => setCapacityModalVisible(false)}
                    basePlanSeats={basePlanSeats}
                    currentExpansionUnits={currentExpansionUnits}
                    onSave={(units) => updateCapacityMutation.mutate(units)}
                    isSaving={updateCapacityMutation.isPending}
                />

                <AgentModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    agent={editingAgent}
                    onSave={handleSaveAgent}
                    roles={roles}
                    isSaving={updateEmployeeMutation.isPending || createEmployeeMutation.isPending}
                />

                <AgentDetailsModal
                    visible={!!viewingAgent}
                    onClose={() => setViewingAgent(null)}
                    agent={viewingAgent}
                    onEdit={(agent) => {
                        setViewingAgent(null);
                        handleOpenEdit(agent);
                    }}
                    onChangePassword={(agent) => {
                        setChangePasswordAgent(agent);
                    }}
                    onDelete={(agent) => {
                        setViewingAgent(null);
                        handleDeleteAgent(agent);
                    }}
                    onToggleStatus={handleToggleStatus}
                    isUpdating={updateStatusMutation.isPending}
                />

                <ChangePasswordModal
                    visible={!!changePasswordAgent}
                    onClose={() => setChangePasswordAgent(null)}
                    agent={changePasswordAgent}
                    onUpdate={(password) => {
                        if (changePasswordAgent) {
                            updatePasswordMutation.mutate({ employeeId: changePasswordAgent.id, password });
                        }
                    }}
                    isUpdating={updatePasswordMutation.isPending}
                />

                {/* Delete Confirmation Modal */}
                <Modal visible={!!agentToDelete} transparent={true} animationType="fade">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ width: '85%', backgroundColor: colors.cardBackground, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                                    <MaterialCommunityIcons name="alert-outline" size={24} color="#EF4444" />
                                </View>
                            </View>

                            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>Remove Team Member?</Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 24, paddingHorizontal: 10 }}>
                                Are you sure you want to remove <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{agentToDelete?.user?.first_name} {agentToDelete?.user?.last_name}</Text> from your agency? This action cannot be undone.
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                <TouchableOpacity
                                    style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBackground }}
                                    onPress={() => setAgentToDelete(null)}
                                    disabled={deleteEmployeeMutation.isPending}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1.2, height: 46, borderRadius: 12, backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 2 }}
                                    onPress={confirmDeleteAgent}
                                    disabled={deleteEmployeeMutation.isPending}
                                >
                                    {deleteEmployeeMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' }}>Remove</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <View style={{ height: Platform.OS === 'android' ? Math.max(insets.bottom, 36) + 80 : Math.max(insets.bottom, 16) + 80 }} />
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[
                    styles.fab,
                    {
                        backgroundColor: '#0D1B2A',
                        bottom: Platform.OS === 'android' ? Math.max(insets.bottom, 36) + 24 : Math.max(insets.bottom, 16) + 20,
                    },
                ]}
                onPress={handleOpenAdd}
                activeOpacity={0.85}
            >
                <MaterialCommunityIcons name="plus" size={28} color="#fff" />
            </TouchableOpacity>
        </DashboardLayout>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    scrollContent: {
        padding: 24,
    },
    agentListContainer: {
        gap: 14,
    },

    // ── AgentCard ──
    agentCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    cardAccentStripe: {
        width: 4,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    cardInner: {
        flex: 1,
        padding: 16,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    avatarCircle: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    avatarInitial: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    agentName: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    agentEmail: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surfaceSoft,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 5,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.accentTeal,
        letterSpacing: 0.2,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusChipText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.6,
    },
    agentCardDivider: {
        height: 1,
        backgroundColor: colors.divider,
        marginVertical: 13,
    },
    metaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    metaCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        width: '47%',
    },
    metaIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: colors.surfaceSoft,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    metaLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.textMuted,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    metaValue: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 1,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.accentTeal,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
    },
    editBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    iconActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: colors.inputBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Empty State ──
    emptyState: {
        alignItems: 'center',
        paddingVertical: 56,
        paddingHorizontal: 32,
        gap: 10,
    },
    emptyStateIcon: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: colors.inputBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    emptyStateText: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyStateCta: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(11,160,178,0.08)',
        borderRadius: 12,
    },

    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.cardShadowColor,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    headerArea: {
        marginBottom: 28,
    },
    mainHeading: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    mainSubheading: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
    },
    statsScroll: {
        gap: 5,
        marginBottom: 32,
    },
    statPanel: {
        width: width * 0.38,
        padding: 15,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statIconBox: {
        width: 30,
        height: 30,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '900',
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '700',
        opacity: 0.7,
        marginTop: 2,
    },
    searchBox: {
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    tabsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    tab: {
        paddingVertical: 8,
    },
    tabActive: {
        borderBottomWidth: 3,
        borderBottomColor: colors.accentTeal,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tabTextActive: {
        fontWeight: '900',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 24,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    modalSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    modalScroll: {
        padding: 24,
    },
    formGrid: {
        gap: 20,
        marginBottom: 24,
    },
    inputWrap: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    modalInput: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    modalPicker: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    noticeCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 32,
    },
    noticeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noticeTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 2,
    },
    noticeText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 18,
    },
    moduleSection: {
        marginBottom: 32,
    },
    moduleDesc: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 20,
        lineHeight: 18,
    },
    moduleGrid: {
        gap: 12,
    },
    moduleItem: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moduleText: {
        fontSize: 13,
        fontWeight: '700',
    },
    saveBtnFull: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    saveBtnTextFull: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '900',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    manageCapacityBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 12,
    },
    manageCapacityText: {
        fontSize: 13,
        fontWeight: '700',
    },
    addMemberHeaderBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    addMemberHeaderText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

const capacityModalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 440,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    closeBtn: {
        padding: 4,
    },
    body: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
        marginBottom: 12,
    },
    mainTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 18,
    },
    stepperSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    stepperLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepperBtn: {
        width: 42,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValueBox: {
        minWidth: 80,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    stepperValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    breakdownCard: {
        width: '100%',
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
        gap: 10,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    breakdownVal: {
        fontSize: 13,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginVertical: 4,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    totalVal: {
        fontSize: 15,
        fontWeight: '900',
        color: '#EA580C',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
        borderTopWidth: 1,
    },
    cancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    submitBtn: {
        flex: 1.4,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
