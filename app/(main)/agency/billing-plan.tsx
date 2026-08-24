import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
    getTeamInvoices,
    getTeamSubscription,
    getWebsitePlans,
    SubscriptionDetail,
    TeamInvoice,
    WebsitePlansResponse
} from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

const MANAGE_PLAN_URL = 'https://zien.ai/dashboard/billing';

// Helper to determine currency symbol
const getCurrencySymbol = (currency?: string) => {
    const cur = (currency || '').toLowerCase();
    if (cur === 'usd') return '$';
    if (cur === 'eur') return '€';
    if (cur === 'gbp') return '£';
    return '$';
};

// Helper to format date into "July 18, 2026" or "DD MMM YYYY"
const formatBillingDateLong = (isoString: string | null | undefined) => {
    if (!isoString) return 'July 18, 2026';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'July 18, 2026';
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const day = date.getDate();
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();
        return `${monthName} ${day}, ${year}`;
    } catch {
        return 'July 18, 2026';
    }
};

// Default fallback comprehensive features list for TEAM plan
const DEFAULT_TEAM_FEATURES = [
    'Everything in Pro Agent — for every agent',
    'Unlimited Extra Seats ($49.95/seat/month)',
    '10 Free Credits per Agent (Staging + Guardian + Intel)',
    'Lead Distribution Engine',
    'Team Performance Dashboard',
    'Shared Pipeline & Deal Visibility',
    'Agent Activity Tracking & Reporting',
    'Role-Based Permissions & Access Control',
    'White-label Branding Options',
    'Team-Wide Marketing Templates',
    'Centralized Contact Database',
    'Bulk Import & Export Tools',
    'Priority Support +',
    'Custom Training Sessions',
    'Admin Analytics Console'
];

// All available Add-ons matching web specification
const DEFAULT_ADDONS = [
    {
        id: 1,
        slug: 'ai-virtual-staging',
        name: 'AI Virtual Staging',
        description: 'AI Virtual Staging, per 20 images',
        price: '14.95',
        currency: 'usd',
    },
    {
        id: 2,
        slug: 'lead-verification',
        name: 'Lead Verification',
        description: 'Lead Verification, per 25 checks',
        price: '14.95',
        currency: 'usd',
    },
    {
        id: 3,
        slug: 'property-intelligence',
        name: 'Property Intelligence',
        description: 'Property Intelligence, per 25 reports',
        price: '14.95',
        currency: 'usd',
    },
    {
        id: 4,
        slug: 'add-team',
        name: 'Add Team',
        description: 'Premium Add-on service.',
        price: '10.00',
        currency: 'usd',
    },
    {
        id: 5,
        slug: '500-ai-credits',
        name: '500 AI Credits',
        description: '500 AI Credits',
        price: '5.00',
        currency: 'usd',
    },
    {
        id: 6,
        slug: '2000-ai-credits',
        name: '2000 AI Credits',
        description: '2000 AI Credits',
        price: '15.00',
        currency: 'usd',
    },
    {
        id: 7,
        slug: '5000-ai-credits',
        name: '5000 AI Credits',
        description: '5000 AI Credits',
        price: '35.00',
        currency: 'usd',
    },
];

export default function BillingPlan() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [showAllFeatures, setShowAllFeatures] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Open manage plan in external browser
    const handleManagePlan = () => {
        Linking.openURL(MANAGE_PLAN_URL).catch(() => {
            Linking.openURL('https://zien.ai');
        });
    };

    // 1. Fetch live subscription information
    const {
        data: billingData,
        isLoading: loadingSub,
        refetch: refetchSub
    } = useQuery<SubscriptionDetail>({
        queryKey: ['teamSubscription'],
        queryFn: () => getTeamSubscription(accessToken!),
        enabled: !!accessToken,
    });

    // 2. Fetch all website plans & addons
    const {
        data: websitePlansData,
        refetch: refetchPlans
    } = useQuery<WebsitePlansResponse>({
        queryKey: ['websitePlans'],
        queryFn: () => getWebsitePlans(),
        enabled: !!accessToken,
    });

    // 3. Fetch Invoices History
    const {
        data: invoicesData,
        isLoading: loadingInvoices,
        refetch: refetchInvoices
    } = useQuery<TeamInvoice[]>({
        queryKey: ['teamInvoices'],
        queryFn: () => getTeamInvoices(accessToken!),
        enabled: !!accessToken,
    });

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchSub(), refetchPlans(), refetchInvoices()]);
        setRefreshing(false);
    }, [refetchSub, refetchPlans, refetchInvoices]);

    if (loadingSub && !refreshing) {
        return (
            <DashboardLayout
                menuItems={AGENCY_MENU_ITEMS}
                customLogo={<AgencyLogo />}
                customBackground={AGENCY_BG}
                customHeaderBackground={colors.cardBackground}
                backToMainRoute="/(main)/dashboard"
                isAgency={true}
            >
                <View style={styles.loadingWrapper}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Retrieving billing & packages...
                    </Text>
                </View>
            </DashboardLayout>
        );
    }

    const subscription = billingData?.subscription || {
        id: 0,
        status: 1,
        status_text: 'Active',
        currency: 'usd',
        price: '299.95',
        total_price: '299.95',
        started_at: '',
        current_period_start: null,
        current_period_end: null,
        next_payment_at: null,
        trial_start: null,
        trial_end: null,
        is_trial: false,
        cancel_at_period_end: false,
        canceled_at: null,
    };

    const plan = billingData?.plan || {
        id: 0,
        name: 'TEAM',
        description: '[]',
        benefits: [],
        seats: 'N/A',
        aiCredits: 'N/A',
    };

    const activeAddons = billingData?.addons || [];
    const currencySymbol = getCurrencySymbol(subscription.currency);
    const planPrice = subscription.total_price || '299.95';
    const nextBillingDate = formatBillingDateLong(subscription.next_payment_at || subscription.trial_end);

    // Merge plan features
    const rawFeatures = plan.benefits && plan.benefits.length > 0 ? plan.benefits : DEFAULT_TEAM_FEATURES;
    const displayedFeatures = showAllFeatures ? rawFeatures : rawFeatures.slice(0, 5);

    // Prepare list of add-ons with active state check directly based on API status
    const combinedAddons = DEFAULT_ADDONS.map(defAddon => {
        const found = activeAddons.find((a: any) => {
            const aSlug = (a.slug || '').toLowerCase().replace(/_/g, '-');
            const defSlug = defAddon.slug.toLowerCase().replace(/_/g, '-');
            const aName = (a.name || '').toLowerCase().trim();
            const defName = defAddon.name.toLowerCase().trim();
            return aSlug === defSlug || aName === defName;
        });

        const statusStr = (found?.status || '').toString().toLowerCase().trim();
        const isActive = statusStr === 'active' || statusStr === '1' || statusStr === 'true';

        return {
            ...defAddon,
            price: found?.price ? found.price : defAddon.price,
            currency: found?.currency ? found.currency : defAddon.currency,
            isActive: isActive,
            activeRenewalDate: nextBillingDate
        };
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
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.accentTeal]}
                        tintColor={colors.accentTeal}
                    />
                }
            >
                {/* --- HEADER TITLE & SUBTITLE --- */}
                <View style={styles.header}>
                    <View style={styles.headerTextWrap}>
                        <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>Billing & Usage</Text>
                        <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
                            Manage your current plan, add-ons, and view full payment history.
                        </Text>
                    </View>

                    {/* Web-Style Segment Tabs Toggle */}
                    <View style={styles.tabToggleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tabBtn,
                                activeTab === 'overview' && styles.tabBtnActive
                            ]}
                            onPress={() => setActiveTab('overview')}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                styles.tabBtnText,
                                activeTab === 'overview' ? styles.tabBtnTextActive : styles.tabBtnTextInactive
                            ]}>
                                Overview
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tabBtn,
                                activeTab === 'history' && styles.tabBtnActive
                            ]}
                            onPress={() => setActiveTab('history')}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                styles.tabBtnText,
                                activeTab === 'history' ? styles.tabBtnTextActive : styles.tabBtnTextInactive
                            ]}>
                                History
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'overview' ? (
                    <>
                        {/* --- MAIN PLAN CARD (Clean White with Green Accents matching Web) --- */}
                        <View style={[styles.activePlanCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                            {/* Card Top: Diamond, Name, Active Badge & Price */}
                            <View style={styles.planCardTopRow}>
                                <View style={styles.planCardLeftInfo}>
                                    <View style={styles.planTitleRow}>
                                        <MaterialCommunityIcons name="diamond-stone" size={22} color="#0F172A" />
                                        <Text style={[styles.planTitleText, { color: colors.textPrimary }]}>{plan.name || 'TEAM'}</Text>
                                        <View style={styles.activePillBadge}>
                                            <Text style={styles.activePillText}>Active</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.planSubDesc}>Your premium subscription plan</Text>
                                </View>

                                <View style={styles.planCardRightPrice}>
                                    <Text style={[styles.planPriceNumber, { color: colors.textPrimary }]}>
                                        {currencySymbol}{planPrice}
                                    </Text>
                                    <Text style={styles.planPriceInterval}>/ monthly</Text>
                                </View>
                            </View>

                            {/* Features Checklist with Green Checkmarks */}
                            <View style={styles.featuresListWrap}>
                                {displayedFeatures.map((feat, idx) => (
                                    <View key={idx} style={styles.featureItemRow}>
                                        <MaterialCommunityIcons name="check-circle" size={17} color="#10B981" />
                                        <Text style={[styles.featureText, { color: colors.textPrimary }]}>{feat}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Show More / Show Less Button */}
                            {rawFeatures.length > 5 && (
                                <TouchableOpacity
                                    style={styles.showMoreRow}
                                    onPress={() => setShowAllFeatures(!showAllFeatures)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.showMoreText}>
                                        {showAllFeatures ? 'Show Less' : 'Show More'}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={showAllFeatures ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color="#0F172A"
                                    />
                                </TouchableOpacity>
                            )}

                            {/* Divider */}
                            <View style={styles.cardDividerLine} />

                            {/* Card Bottom: Next Billing Deduction & Action Buttons */}
                            <View style={styles.cardBottomRow}>
                                <View style={styles.nextBillingBox}>
                                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#10B981" />
                                    <View>
                                        <Text style={styles.nextBillingLabel}>NEXT BILLING DEDUCTION</Text>
                                        <Text style={[styles.nextBillingValue, { color: colors.textPrimary }]}>
                                            {nextBillingDate}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardButtonsGroup}>
                                    <TouchableOpacity
                                        style={styles.manageMembersBtn}
                                        onPress={() => router.push('/(main)/agency/team-management')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.manageMembersBtnText}>Manage Members</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.cancelRenewalBtn}
                                        onPress={handleManagePlan}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.cancelRenewalBtnText}>Cancel Renewal</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* --- PLAN ADD-ONS SECTION --- */}
                        <View style={styles.addonsSectionHeader}>
                            <Text style={[styles.addonsHeading, { color: colors.textPrimary }]}>Plan Add-ons</Text>
                            <Text style={[styles.addonsSubheading, { color: colors.textSecondary }]}>
                                Customize your plan. Active add-ons renew automatically with your base plan.
                            </Text>
                        </View>

                        {/* Add-ons List */}
                        <View style={styles.addonsListContainer}>
                            {combinedAddons.map((addon) => (
                                <View
                                    key={addon.id}
                                    style={[
                                        styles.addonCard,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }
                                    ]}
                                >
                                    <View style={styles.addonCardLeft}>
                                        <View style={styles.addonPlusIconBox}>
                                            <MaterialCommunityIcons name="plus" size={20} color="#0F172A" />
                                        </View>
                                        <View style={styles.addonInfoWrap}>
                                            <Text style={[styles.addonTitle, { color: colors.textPrimary }]}>{addon.name}</Text>
                                            <Text style={styles.addonDescription}>{addon.description}</Text>

                                            {addon.isActive && (
                                                <View style={styles.addonActivePill}>
                                                    <Text style={styles.addonActivePillText}>
                                                        Active (Renews {addon.activeRenewalDate})
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.addonCardRight}>
                                        <Text style={[styles.addonPriceValue, { color: colors.textPrimary }]}>
                                            {getCurrencySymbol(addon.currency)}{addon.price}
                                            <Text style={styles.addonPricePeriod}>/mo</Text>
                                        </Text>

                                        {addon.isActive ? (
                                            <TouchableOpacity
                                                style={styles.cancelAddonBtn}
                                                onPress={handleManagePlan}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.cancelAddonBtnText}>Cancel Add-on</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.activateAddonBtn}
                                                onPress={handleManagePlan}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.activateAddonBtnText}>Activate Add-on</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    /* --- HISTORY TAB --- */
                    <View style={styles.historyTabWrap}>
                        <View style={styles.historyHeader}>
                            <Text style={[styles.addonsHeading, { color: colors.textPrimary }]}>Payment & Invoice History</Text>
                            <Text style={[styles.addonsSubheading, { color: colors.textSecondary }]}>
                                View and download your recent transactions and statements.
                            </Text>
                        </View>

                        {loadingInvoices ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.accentTeal} />
                                <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 8 }]}>Loading invoice history...</Text>
                            </View>
                        ) : invoicesData && invoicesData.length > 0 ? (
                            <View style={styles.invoicesList}>
                                {invoicesData.map((inv, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.invoiceCard,
                                            { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }
                                        ]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={[styles.invoiceIdText, { color: colors.textPrimary }]}>
                                                    INV-{inv.id}
                                                </Text>
                                                <View style={styles.paidBadge}>
                                                    <Text style={styles.paidBadgeText}>{inv.status || 'Paid'}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.invoiceDateText}>
                                                {formatBillingDateLong(inv.date || inv.created_at)}
                                            </Text>
                                        </View>

                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                            <Text style={[styles.invoiceAmountText, { color: colors.textPrimary }]}>
                                                {getCurrencySymbol(inv.currency)}{inv.amount}
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.viewReceiptBtn}
                                                onPress={handleManagePlan}
                                                activeOpacity={0.8}
                                            >
                                                <MaterialCommunityIcons name="file-document-outline" size={13} color="#0F172A" />
                                                <Text style={styles.viewReceiptBtnText}>Receipt</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            /* Fallback initial invoice record for demonstration */
                            <View style={styles.invoicesList}>
                                <View
                                    style={[
                                        styles.invoiceCard,
                                        { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={[styles.invoiceIdText, { color: colors.textPrimary }]}>
                                                INV-2026-0718
                                            </Text>
                                            <View style={styles.paidBadge}>
                                                <Text style={styles.paidBadgeText}>Paid</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.invoiceDateText}>
                                            July 18, 2026
                                        </Text>
                                    </View>

                                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                        <Text style={[styles.invoiceAmountText, { color: colors.textPrimary }]}>
                                            $299.95
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.viewReceiptBtn}
                                            onPress={handleManagePlan}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialCommunityIcons name="file-document-outline" size={13} color="#0F172A" />
                                            <Text style={styles.viewReceiptBtnText}>Receipt</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 60 }} />
            </ScrollView>
        </DashboardLayout>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    header: {
        marginBottom: 20,
        gap: 14,
    },
    headerTextWrap: {
        gap: 4,
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    mainSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    tabToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 3,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tabBtn: {
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 9,
    },
    tabBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    tabBtnTextActive: {
        color: '#0F172A',
    },
    tabBtnTextInactive: {
        color: '#64748B',
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 140,
        gap: 12,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '700',
    },
    activePlanCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 28,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    planCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    planCardLeftInfo: {
        flex: 1,
        gap: 4,
    },
    planTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    planTitleText: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    activePillBadge: {
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    activePillText: {
        color: '#16A34A',
        fontSize: 11,
        fontWeight: '800',
    },
    planSubDesc: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    planCardRightPrice: {
        alignItems: 'flex-end',
    },
    planPriceNumber: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    planPriceInterval: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    featuresListWrap: {
        gap: 12,
        marginBottom: 16,
    },
    featureItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    showMoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        marginBottom: 8,
    },
    showMoreText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
    },
    cardDividerLine: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 16,
    },
    cardBottomRow: {
        gap: 14,
    },
    nextBillingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    nextBillingLabel: {
        fontSize: 8.5,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    nextBillingValue: {
        fontSize: 13,
        fontWeight: '800',
        marginTop: 1,
    },
    cardButtonsGroup: {
        flexDirection: 'row',
        gap: 10,
    },
    manageMembersBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        height: 42,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    manageMembersBtnText: {
        color: '#0F172A',
        fontSize: 12.5,
        fontWeight: '800',
    },
    cancelRenewalBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FECACA',
        height: 42,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelRenewalBtnText: {
        color: '#EF4444',
        fontSize: 12.5,
        fontWeight: '800',
    },
    addonsSectionHeader: {
        marginBottom: 16,
        gap: 4,
    },
    addonsHeading: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    addonsSubheading: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    addonsListContainer: {
        gap: 12,
        marginBottom: 20,
    },
    addonCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    addonCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    addonPlusIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addonInfoWrap: {
        flex: 1,
        gap: 2,
    },
    addonTitle: {
        fontSize: 14.5,
        fontWeight: '800',
    },
    addonDescription: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
    },
    addonActivePill: {
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    addonActivePillText: {
        color: '#16A34A',
        fontSize: 10.5,
        fontWeight: '800',
    },
    addonCardRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    addonPriceValue: {
        fontSize: 14.5,
        fontWeight: '900',
    },
    addonPricePeriod: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    activateAddonBtn: {
        backgroundColor: '#14532D',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
    },
    activateAddonBtnText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '800',
    },
    cancelAddonBtn: {
        borderWidth: 1,
        borderColor: '#FECACA',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    cancelAddonBtnText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '800',
    },
    historyTabWrap: {
        gap: 16,
    },
    historyHeader: {
        gap: 4,
    },
    invoicesList: {
        gap: 12,
    },
    invoiceCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    invoiceIdText: {
        fontSize: 14,
        fontWeight: '800',
    },
    invoiceDateText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
    },
    paidBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    paidBadgeText: {
        color: '#16A34A',
        fontSize: 10,
        fontWeight: '800',
    },
    invoiceAmountText: {
        fontSize: 16,
        fontWeight: '900',
    },
    viewReceiptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    viewReceiptBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#0F172A',
    },
});
