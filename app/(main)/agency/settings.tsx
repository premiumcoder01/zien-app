import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
    getTeamBrandingSettings,
    getTeamPaymentMethods,
    getTeamSubscription,
    TeamBrandingSettings,
    updateTeamBrandingSettings
} from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

const TABS = ['Branding', 'Security & Access', 'Notifications', 'Billing Methods'];

const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    secureTextEntry = false,
    icon,
    required = false
}: any) => {
    const { colors } = useAppTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isSecure = secureTextEntry && !showPassword;

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {label}
                {required && <Text style={{ color: '#EF4444' }}> *</Text>}
            </Text>
            <View style={[
                multiline ? styles.textAreaContainerRow : styles.inputContainerRow,
                { backgroundColor: '#F8FAFC', borderColor: isFocused ? '#0a2341' : '#E2E8F0' }
            ]}>
                {icon && (
                    <MaterialCommunityIcons
                        name={icon}
                        size={18}
                        color={isFocused ? '#0a2341' : '#64748B'}
                        style={multiline && { marginTop: 2 }}
                    />
                )}
                <TextInput
                    style={[multiline ? styles.textAreaStyle : styles.textInputStyle, { color: colors.textPrimary }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    multiline={multiline}
                    secureTextEntry={isSecure}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIconBtn}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#64748B"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const BrandingTab = ({ branding, onSave, isSaving }: any) => {
    const { colors } = useAppTheme();
    const [form, setForm] = useState({
        legal_name: '',
        website: '',
        description: '',
        support_email: '',
        public_phone: '',
        address: ''
    });

    useEffect(() => {
        if (branding) {
            setForm({
                legal_name: branding.legal_name || '',
                website: branding.website || '',
                description: branding.description || '',
                support_email: branding.support_email || '',
                public_phone: branding.public_phone || '',
                address: branding.address || ''
            });
        }
    }, [branding]);

    return (
        <View style={styles.tabContent}>
            <View style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: '#F1F5F9' }]}>
                <Text style={[styles.formHeader, { color: colors.textPrimary }]}>Agency Identity</Text>

                <View style={styles.logoSection}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>AGENCY LOGO</Text>
                    {branding?.logo_url ? (
                        <View style={[styles.logoContainer, { borderColor: '#E2E8F0' }]}>
                            <Image
                                source={{ uri: branding.logo_url }}
                                style={styles.logoImage}
                                resizeMode="cover"
                            />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.uploadBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder, borderStyle: 'dashed' }]}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="camera-plus-outline" size={32} color={colors.textMuted} />
                            <Text style={[styles.uploadText, { color: colors.textMuted }]}>UPLOAD</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.uploadHint, { color: colors.textMuted }]}>PNG or SVG recommended. Transparent background looks best.</Text>
                </View>

                <InputField
                    label="Agency Name"
                    value={form.legal_name}
                    onChangeText={(text: string) => setForm({ ...form, legal_name: text })}
                    placeholder="Becker & Co Properties"
                    icon="domain"
                    required
                />

                <InputField
                    label="Website"
                    value={form.website}
                    onChangeText={(text: string) => setForm({ ...form, website: text })}
                    placeholder="www.zien.ai"
                    icon="web"
                    required
                />

                <InputField
                    label="Description"
                    value={form.description}
                    onChangeText={(text: string) => setForm({ ...form, description: text })}
                    placeholder="Briefly describe your agency's mission and expertise..."
                    multiline={true}
                    icon="text-box-outline"
                    required
                />

                <InputField
                    label="Email"
                    value={form.support_email}
                    onChangeText={(text: string) => setForm({ ...form, support_email: text })}
                    placeholder="hello@beckerpro.com"
                    icon="email-outline"
                    required
                />

                <InputField
                    label="Phone"
                    value={form.public_phone}
                    onChangeText={(text: string) => setForm({ ...form, public_phone: text })}
                    placeholder="+1 310 902 4432"
                    icon="phone"
                    required
                />

                <InputField
                    label="Address"
                    value={form.address}
                    onChangeText={(text: string) => setForm({ ...form, address: text })}
                    placeholder="23400 Pacific Coast Hwy, Malibu, CA 90265"
                    icon="map-marker-outline"
                    required
                />

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#0F172A' }]}
                    onPress={() => onSave(form)}
                    disabled={isSaving}
                    activeOpacity={0.85}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Save Branding Details</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const SecurityTab = ({ onShowToast }: any) => {
    const { colors } = useAppTheme();
    const [tfa, setTfa] = useState(false);
    const [form, setForm] = useState({
        current: '••••••••••••',
        new: '',
        confirm: ''
    });

    const handleUpdate = () => {
        if (!form.new || !form.confirm) {
            onShowToast('New passwords are required!', 'error');
            return;
        }
        if (form.new !== form.confirm) {
            onShowToast('New passwords do not match!', 'error');
            return;
        }
        onShowToast('Password Updated Successfully!', 'success');
        setForm({ current: '••••••••••••', new: '', confirm: '' });
    };

    return (
        <View style={styles.tabContent}>
            <View style={[styles.settingCard, { backgroundColor: colors.cardBackground, borderColor: '#F1F5F9' }]}>
                <View style={styles.settingRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Two-Factor Authentication</Text>
                        <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Secure your account with an additional verification layer.</Text>
                    </View>
                    <Switch
                        value={tfa}
                        onValueChange={setTfa}
                        trackColor={{ false: 'rgba(0,0,0,0.1)', true: '#10B981' }}
                    />
                </View>
            </View>

            <View style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: '#F1F5F9' }]}>
                <Text style={[styles.formHeader, { color: colors.textPrimary }]}>Change Password</Text>

                <InputField
                    label="Current Password"
                    value={form.current}
                    onChangeText={(text: string) => setForm({ ...form, current: text })}
                    placeholder="••••••••••••"
                    secureTextEntry={true}
                    icon="shield-lock-outline"
                    required
                />

                <InputField
                    label="New Password"
                    value={form.new}
                    onChangeText={(text: string) => setForm({ ...form, new: text })}
                    placeholder="New password"
                    secureTextEntry={true}
                    icon="lock-outline"
                    required
                />

                <InputField
                    label="Confirm New Password"
                    value={form.confirm}
                    onChangeText={(text: string) => setForm({ ...form, confirm: text })}
                    placeholder="Confirm new password"
                    secureTextEntry={true}
                    icon="lock-check-outline"
                    required
                />

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#0F172A' }]}
                    onPress={handleUpdate}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons name="key-variant" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Update Security Key</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const NotificationsTab = () => {
    const { colors } = useAppTheme();
    const NOTIFS = [
        { id: 'lead', title: 'Lead Activity', desc: 'Notify when a new lead is captured or assigned.' },
        { id: 'campaign', title: 'Campaign Updates', desc: 'Alert when a scheduled campaign starts or completes.' },
        { id: 'system', title: 'System Alerts', desc: 'Critical infrastructure and billing notifications.' },
        { id: 'news', title: 'AI Assistant News', desc: 'Updates on neural processing and new AI features.' },
    ];

    const [states, setStates] = useState<any>({
        lead_email: true, lead_push: true,
        campaign_email: true, campaign_push: true,
        system_email: true, system_push: true,
        news_email: false, news_push: true,
    });

    const toggle = (id: string, type: 'email' | 'push') => {
        const key = `${id}_${type}`;
        setStates((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <View style={styles.tabContent}>
            <View style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: '#F1F5F9' }]}>
                {NOTIFS.map((item, i) => (
                    <View key={i} style={styles.notifItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                            <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                        </View>
                        <View style={styles.notifToggles}>
                            <View style={styles.toggleGroup}>
                                <Text style={[styles.toggleTag, { color: colors.textMuted }]}>EMAIL</Text>
                                <Switch
                                    value={states[`${item.id}_email`]}
                                    onValueChange={() => toggle(item.id, 'email')}
                                    trackColor={{ false: 'rgba(0,0,0,0.1)', true: '#10B981' }}
                                    style={{ transform: [{ scale: 0.8 }] }}
                                />
                            </View>
                            <View style={styles.toggleGroup}>
                                <Text style={[styles.toggleTag, { color: colors.textMuted }]}>PUSH</Text>
                                <Switch
                                    value={states[`${item.id}_push`]}
                                    onValueChange={() => toggle(item.id, 'push')}
                                    trackColor={{ false: 'rgba(0,0,0,0.1)', true: '#10B981' }}
                                    style={{ transform: [{ scale: 0.8 }] }}
                                />
                            </View>
                        </View>
                        {i < NOTIFS.length - 1 && <View style={[styles.divider, { backgroundColor: '#F1F5F9' }]} />}
                    </View>
                ))}
            </View>
        </View>
    );
};

const BillingTab = ({ subscription, paymentMethods, onUpgrade }: any) => {
    const { colors } = useAppTheme();

    return (
        <View style={styles.tabContent}>
            {/* Current Plan Card */}
            <View style={[styles.planCard, { backgroundColor: '#0F172A' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.planBadge}>CURRENT PLAN</Text>
                    <Text style={styles.planTitle}>
                        {subscription?.plan?.name || 'TEAM'}
                    </Text>
                    <Text style={styles.planInfo}>
                        Next billing cycle: {subscription?.subscription?.trial_end ? new Date(subscription.subscription.trial_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.upgradeBtn}
                    onPress={onUpgrade}
                    activeOpacity={0.8}
                >
                    <Text style={styles.upgradeText}>UPGRADE PLAN</Text>
                </TouchableOpacity>
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentSection}>
                <Text style={[styles.formHeader, { color: colors.textPrimary }]}>Payment Methods</Text>

                {paymentMethods && paymentMethods.map((pm: any) => (
                    <View
                        key={pm.id}
                        style={[
                            styles.cardItem,
                            { backgroundColor: colors.cardBackground, borderColor: '#F1F5F9' }
                        ]}
                    >
                        <View style={styles.visaBox}>
                            <Text style={styles.visaText}>{pm.brand.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardNumber, { color: colors.textPrimary }]}>
                                {pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ending in {pm.last4}
                            </Text>
                            <Text style={[styles.cardExpiry, { color: colors.textSecondary }]}>
                                Expires {pm.exp_month}/{pm.exp_year}
                            </Text>
                        </View>
                        <TouchableOpacity activeOpacity={0.7}>
                            <Text style={[styles.editText, { color: '#0a2341' }]}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    style={[styles.addCardBtn, { borderColor: '#E2E8F0' }]}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="plus" size={20} color={colors.textSecondary} />
                    <Text style={[styles.addCardText, { color: colors.textSecondary }]}>Add New Card</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AgencySettings() {
    const { colors } = useAppTheme();
    const { accessToken } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('Branding');
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Branding Settings query
    const { data: brandingData, refetch: refetchBranding } = useQuery({
        queryKey: ['teamBrandingSettings'],
        queryFn: () => getTeamBrandingSettings(accessToken!),
        enabled: !!accessToken,
    });

    // Branding Settings Mutation
    const updateBrandingMutation = useMutation({
        mutationFn: (data: Partial<TeamBrandingSettings>) => updateTeamBrandingSettings(accessToken!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamBrandingSettings'] });
            refetchBranding();
            showToast('Branding Saved Successfully!', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Failed to save branding details', 'error');
        }
    });

    // Subscriptions query
    const { data: subData } = useQuery({
        queryKey: ['teamSubscriptionDetail'],
        queryFn: () => getTeamSubscription(accessToken!),
        enabled: !!accessToken,
    });

    // Payment Methods query
    const { data: paymentMethods } = useQuery({
        queryKey: ['teamPaymentMethods'],
        queryFn: () => getTeamPaymentMethods(accessToken!),
        enabled: !!accessToken,
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <MaterialCommunityIcons name="cog-outline" size={26} color={colors.textPrimary} />
                            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>Agency Settings</Text>
                        </View>
                        <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>Configure your agency-wide preferences</Text>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                            {TABS.map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setActiveTab(tab)}
                                    style={[
                                        styles.tab,
                                        { backgroundColor: colors.surfaceSoft },
                                        activeTab === tab && { backgroundColor: '#0F172A' }
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        { color: colors.textSecondary },
                                        activeTab === tab && { color: '#FFFFFF', fontWeight: '900' }
                                    ]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {activeTab === 'Branding' && (
                            <BrandingTab
                                branding={brandingData}
                                onSave={(data: any) => updateBrandingMutation.mutate(data)}
                                isSaving={updateBrandingMutation.isPending}
                            />
                        )}
                        {activeTab === 'Security & Access' && <SecurityTab onShowToast={showToast} />}
                        {activeTab === 'Notifications' && <NotificationsTab />}
                        {activeTab === 'Billing Methods' && (
                            <BillingTab
                                subscription={subData}
                                paymentMethods={paymentMethods}
                                onUpgrade={() => router.push('/(main)/agency/billing-plan')}
                            />
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Custom Notch-Safe Animated Toaster */}
            {toast?.visible && (
                <View
                    style={[
                        styles.toastContainer,
                        toast.type === 'success' ? styles.toastSuccess : styles.toastError
                    ]}
                >
                    <View style={styles.toastInner}>
                        <MaterialCommunityIcons
                            name={toast.type === 'success' ? 'check-circle' : 'alert-circle'}
                            size={20}
                            color={toast.type === 'success' ? '#065F46' : '#991B1B'}
                        />
                        <Text style={[styles.toastText, { color: toast.type === 'success' ? '#065F46' : '#991B1B' }]}>
                            {toast.message}
                        </Text>
                    </View>
                </View>
            )}
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 24,
    },
    header: {
        marginBottom: 28,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    mainSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    tabsContainer: {
        marginBottom: 28,
        marginLeft: -24,
        marginRight: -24,
    },
    tabsScroll: {
        paddingHorizontal: 24,
        gap: 12,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
    },
    content: {
        gap: 24,
    },
    tabContent: {
        gap: 28,
    },
    logoSection: {
        alignItems: 'center',
        marginVertical: 10,
    },
    sectionHeading: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 24,
        borderWidth: 1.5,
        overflow: 'hidden',
        marginBottom: 12,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    uploadBox: {
        width: 120,
        height: 120,
        borderRadius: 24,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    uploadText: {
        fontSize: 10,
        fontWeight: '900',
        marginTop: 4,
    },
    uploadHint: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 40,
    },
    formCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 15,
            },
            android: {
                elevation: 3,
            }
        })
    },
    formHeader: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '800',
    },
    inputContainerRow: {
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    textInputStyle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        height: '100%',
    },
    textAreaContainerRow: {
        height: 100,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    textAreaStyle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        height: '100%',
    },
    eyeIconBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtn: {
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '900',
    },
    settingCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.02,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            }
        })
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    settingTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 4,
    },
    settingDesc: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 18,
    },
    notifItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        position: 'relative',
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 4,
    },
    notifDesc: {
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
    },
    notifToggles: {
        flexDirection: 'row',
        gap: 12,
    },
    toggleGroup: {
        alignItems: 'center',
        gap: 4,
    },
    toggleTag: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    planCard: {
        padding: 24,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
            },
            android: {
                elevation: 4,
            }
        })
    },
    planBadge: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 6,
    },
    planTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 4,
    },
    planInfo: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '500',
    },
    upgradeBtn: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    upgradeText: {
        color: '#0F172A',
        fontSize: 11,
        fontWeight: '900',
    },
    paymentSection: {
        gap: 16,
    },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.02,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            }
        })
    },
    visaBox: {
        width: 48,
        height: 32,
        backgroundColor: '#0F172A',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    visaText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    cardNumber: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    cardExpiry: {
        fontSize: 11,
        fontWeight: '500',
    },
    editText: {
        fontSize: 12,
        fontWeight: '800',
    },
    addCardBtn: {
        height: 52,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addCardText: {
        fontSize: 13,
        fontWeight: '800',
    },
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderRadius: 0,
        borderBottomWidth: 2,
        ...Platform.select({
            ios: {
                paddingTop: 48,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                paddingTop: 16,
                elevation: 10,
            },
        }),
    },
    toastInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        paddingBottom: 16,
        paddingTop: Platform.OS === 'android' ? 12 : 8,
    },
    toastSuccess: {
        backgroundColor: '#ECFDF5',
        borderBottomColor: '#10B981',
    },
    toastError: {
        backgroundColor: '#FEF2F2',
        borderBottomColor: '#EF4444',
    },
    toastText: {
        fontSize: 13,
        fontWeight: '800',
        flex: 1,
    },
});
