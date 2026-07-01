import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getTeamSubscription, getWebsitePlans, SubscriptionDetail, WebsitePlan } from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

// Helper to determine currency symbol
const getCurrencySymbol = (currency: string) => {
    const cur = (currency || '').toLowerCase();
    if (cur === 'usd') return '$';
    if (cur === 'eur') return '€';
    if (cur === 'gbp') return '£';
    return '$';
};

// Helper to format numeric date into "DD MMM YYYY"
const formatBillingDate = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'N/A';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate().toString().padStart(2, '0');
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${monthName} ${year}`;
    } catch {
        return 'N/A';
    }
};

// Helper to calculate trial days remaining
const getTrialDaysLeft = (trialEndIso: string | null) => {
    if (!trialEndIso) return 'N/A';
    try {
        const end = new Date(trialEndIso);
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? `${diffDays} Days` : 'Ended';
    } catch {
        return 'N/A';
    }
};

// Helper to safely parse plan description JSON string array
const parsePlanDescription = (descString: string | null): string[] => {
    if (!descString) return [];
    try {
        if (descString.trim().startsWith('[')) {
            return JSON.parse(descString);
        }
        return [descString];
    } catch {
        return [descString];
    }
};

const PlanMetricRow = ({ label, value, icon }: { label: string; value: string; icon: any }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    return (
        <View style={styles.metricItemRow}>
            <View style={styles.metricIconWrap}>
                <MaterialCommunityIcons name={icon} size={15} color="#A5F3FC" />
            </View>
            <View style={styles.metricTextWrap}>
                <Text style={styles.metricLabel}>{label}</Text>
                <Text style={styles.metricValue}>{value}</Text>
            </View>
        </View>
    );
};

export default function BillingPlan() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();
    const router = useRouter();

    // Modal view states
    const [isUpgradeModalVisible, setIsUpgradeModalVisible] = React.useState(false);
    const [isYearly, setIsYearly] = React.useState(false);

    // 1. Fetch live subscription information
    const { data: billingData, isLoading } = useQuery<SubscriptionDetail>({
        queryKey: ['teamSubscription'],
        queryFn: () => getTeamSubscription(accessToken!),
        enabled: !!accessToken,
    });

    // 2. Fetch all available website plans when modal is opened
    const { data: plansData, isLoading: isLoadingPlans } = useQuery({
        queryKey: ['websitePlans'],
        queryFn: () => getWebsitePlans(),
        enabled: isUpgradeModalVisible,
    });

    if (isLoading) {
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
                        Retrieving subscription packages...
                    </Text>
                </View>
            </DashboardLayout>
        );
    }

    const subscription = billingData?.subscription || {
        id: 0,
        status: 0,
        status_text: 'Inactive',
        currency: 'usd',
        price: null,
        total_price: '0.00',
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
        name: 'No Plan',
        description: '[]',
        benefits: [],
        seats: 'N/A',
        aiCredits: 'N/A',
    };

    const price = billingData?.price || null;
    const addons = billingData?.addons || [];

    const currencySymbol = getCurrencySymbol(subscription.currency);
    const planFeatures = parsePlanDescription(plan.description);

    // Calculate total features count dynamically
    const addonFeaturesCount = addons.reduce((sum, ad) => sum + (ad.metadata?.available_for_names?.length || 0), 0);
    const totalFeaturesActive = planFeatures.length + addonFeaturesCount;

    // Helper to evaluate active status of a plan card in modal
    const isPlanActive = (itemPlan: WebsitePlan) => {
        const nameMatch = (itemPlan.name || '').toUpperCase() === (plan.name || '').toUpperCase();
        const currentInterval = price ? price.billing_interval : 'monthly';
        const toggleInterval = isYearly ? 'annually' : 'monthly';
        return nameMatch && (currentInterval === toggleInterval);
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
                keyboardShouldPersistTaps="handled"
            >
                {/* --- HEADER TITLE & SUBTITLE --- */}
                <View style={styles.header}>
                    <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>My Subscription Packages</Text>
                    <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
                        Overview of your current plan, active modules, and usage
                    </Text>
                </View>

                {/* --- PRIMARY PLAN DOCK CARD (Deep blue/slate space) --- */}
                <LinearGradient
                    colors={['#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.planCard}
                >
                    {/* Status Badge */}
                    <View style={styles.cardStatusRow}>
                        <View style={[styles.cardStatusBadge, { backgroundColor: 'rgba(11, 160, 178, 0.15)' }]}>
                            <Text style={styles.cardStatusBadgeText}>
                                {subscription.is_trial ? 'TRIALING PLAN' : 'ACTIVE PLAN'}
                            </Text>
                        </View>
                        <MaterialCommunityIcons
                            name={subscription.is_trial ? "star-circle" : "shield-check"}
                            size={28}
                            color={subscription.is_trial ? "#F59E0B" : "#10B981"}
                        />
                    </View>

                    {/* Main Name and pricing */}
                    <View style={styles.planIdentityRow}>
                        <View style={styles.cubeIconWrap}>
                            <MaterialCommunityIcons name="cube-outline" size={28} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.planNameText}>{plan.name}</Text>
                            <Text style={styles.planPriceValue}>
                                {currencySymbol}
                                {price ? price.amount : subscription.total_price}
                                <Text style={styles.planPricePeriod}>
                                    /{price ? price.billing_interval : 'monthly'}
                                </Text>
                            </Text>
                        </View>
                    </View>

                    {/* Stats Metrics Sub-grid */}
                    <View style={styles.metricsGridContainer}>
                        {subscription.is_trial && (
                            <PlanMetricRow
                                label="Trial Ends In"
                                value={getTrialDaysLeft(subscription.trial_end)}
                                icon="clock-alert-outline"
                            />
                        )}
                        <PlanMetricRow
                            label="Next Billing"
                            value={subscription.is_trial ? formatBillingDate(subscription.trial_end) : formatBillingDate(subscription.next_payment_at)}
                            icon="calendar-sync-outline"
                        />
                        <PlanMetricRow
                            label="Plan Status"
                            value={subscription.status_text || 'Active'}
                            icon="information-outline"
                        />
                    </View>

                    {/* ACTIVE ADD-ONS ROW ITEMS */}
                    {addons.length > 0 && (
                        <View style={styles.addonsCardInner}>
                            <Text style={styles.addonsSectionTitle}>ACTIVE ADD-ONS</Text>
                            <View style={styles.addonsListStack}>
                                {addons.map((addon) => (
                                    <View key={addon.id} style={styles.addonItemRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                            <MaterialCommunityIcons name="plus-circle-outline" size={14} color="#64748B" />
                                            <Text style={styles.addonNameText} numberOfLines={1}>
                                                {addon.name}
                                            </Text>
                                        </View>
                                        <Text style={styles.addonPriceText}>
                                            {getCurrencySymbol(addon.currency)}
                                            {addon.price}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Call to action buttons inside dock card */}
                    <View style={styles.planActionsWrapper}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setIsUpgradeModalVisible(true)}
                        >
                            <LinearGradient
                                colors={['#F97316', '#EA580C']}
                                style={styles.upgradeGradientBtn}
                            >
                                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFFFFF" />
                                <Text style={styles.upgradeGradientBtnText}>Upgrade Plan</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.manageBillingOutlineBtn}
                            activeOpacity={0.8}
                            onPress={() => router.push('/(main)/agency/team-management')}
                        >
                            <MaterialCommunityIcons name="account-multiple-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.manageBillingOutlineBtnText}>Manage Members</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* --- ACTIVE PLAN BENEFITS (Structured grid matching mockup) --- */}
                <View style={styles.benefitsSectionHeader}>
                    <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>Active Plan Benefits</Text>
                    <View style={[styles.totalFeaturesBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={styles.totalFeaturesBadgeText}>{totalFeaturesActive} Features Active</Text>
                    </View>
                </View>

                {/* Benefits lists stack */}
                <View style={styles.benefitsStackContainer}>
                    {/* Block 1: TEAM Plan Summary */}
                    {planFeatures.length > 0 && (
                        <View style={[styles.benefitBlockCard, { borderColor: colors.cardBorder }]}>
                            <View style={styles.benefitBlockHeaderRow}>
                                <View style={[styles.benefitIconBox, { backgroundColor: '#FFEAD4' }]}>
                                    <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F97316" />
                                </View>
                                <Text style={styles.benefitBlockTitleText}>{plan.name} Summary</Text>
                            </View>

                            <View style={styles.benefitsBulletsWrap}>
                                {planFeatures.map((feat, idx) => (
                                    <View key={idx} style={styles.bulletItemRow}>
                                        <Text style={styles.bulletMarker}>•</Text>
                                        <Text style={[styles.bulletContentText, { color: colors.textSecondary }]}>{feat}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Sibling blocks: Add-on Enhancements */}
                    {addons.map((addon) => {
                        const addonFeatures = addon.metadata?.available_for_names || [];
                        if (addonFeatures.length === 0) return null;
                        return (
                            <View key={addon.id} style={[styles.benefitBlockCard, { borderColor: colors.cardBorder }]}>
                                <View style={styles.benefitBlockHeaderRow}>
                                    <View style={[styles.benefitIconBox, { backgroundColor: '#DCFCE7' }]}>
                                        <MaterialCommunityIcons name="check" size={16} color="#16A34A" />
                                    </View>
                                    <Text style={styles.benefitBlockTitleText}>{addon.name} Enhancement</Text>
                                </View>

                                <View style={styles.benefitsBulletsWrap}>
                                    {addonFeatures.map((feat, idx) => (
                                        <View key={idx} style={styles.bulletItemRow}>
                                            <Text style={styles.bulletMarker}>•</Text>
                                            <Text style={[styles.bulletContentText, { color: colors.textSecondary }]}>{feat}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* --- UPGRADE PLAN DYNAMIC MODAL (Full-screen overlay matching user screenshots) --- */}
            <Modal
                visible={isUpgradeModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setIsUpgradeModalVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardBackground }}>
                    {/* Modal Header */}
                    <View style={styles.modalHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={styles.orangeFlashBox}>
                                <MaterialCommunityIcons name="flash" size={18} color="#F97316" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Choose Your Agency Scale</Text>
                                <Text style={styles.modalSubtitle} numberOfLines={1}>
                                    Select the plan that fits your growing professional team
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setIsUpgradeModalVisible(false)}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {isLoadingPlans ? (
                        <View style={styles.modalLoadingWrapper}>
                            <ActivityIndicator size="large" color={colors.accentTeal} />
                            <Text style={styles.modalLoadingText}>Loading available agency plans...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Monthly / Yearly Toggle */}
                            <View style={styles.toggleWrapper}>
                                <View style={styles.toggleRowContainer}>
                                    <Text style={[styles.toggleLabel, !isYearly && styles.toggleLabelActive]}>Monthly</Text>

                                    <TouchableOpacity
                                        style={[
                                            styles.toggleSwitchBg,
                                            { backgroundColor: isYearly ? colors.accentTeal : '#CBD5E1' }
                                        ]}
                                        activeOpacity={0.9}
                                        onPress={() => setIsYearly(!isYearly)}
                                    >
                                        <View style={[styles.toggleThumb, isYearly ? styles.toggleThumbRight : styles.toggleThumbLeft]} />
                                    </TouchableOpacity>

                                    <Text style={[styles.toggleLabel, isYearly && styles.toggleLabelActive]}>Yearly</Text>
                                    <View style={styles.saveBadge}>
                                        <Text style={styles.saveBadgeText}>SAVE 15%</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Plans Container Stack */}
                            <View style={styles.plansContainerStack}>
                                {plansData?.plans.filter(p => (p.slug || '').toLowerCase() === 'team').map((itemPlan) => {
                                    const active = isPlanActive(itemPlan);
                                    const selectedPrice = itemPlan.prices.find(
                                        p => p.billing_interval === (isYearly ? 'annually' : 'monthly')
                                    );
                                    const amountStr = selectedPrice ? selectedPrice.price : '0.00';
                                    const intervalLabel = isYearly ? '/yr' : '/mo';

                                    return (
                                        <View
                                            key={itemPlan.id}
                                            style={[
                                                styles.planOutlineCard,
                                                active && styles.planOutlineCardActive
                                            ]}
                                        >
                                            {/* Active Subscription Banner Overlay */}
                                            {active && (
                                                <View style={styles.activeSubscriptionOverlayBadge}>
                                                    <Text style={styles.activeSubscriptionOverlayBadgeText}>ACTIVE SUBSCRIPTION</Text>
                                                </View>
                                            )}

                                            {/* Plan Identity Block */}
                                            <View style={styles.modalPlanIdentityHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <MaterialCommunityIcons name="account-multiple-outline" size={16} color={colors.textPrimary} />
                                                    <Text style={styles.modalPlanNameText}>{itemPlan.name}</Text>
                                                    <MaterialCommunityIcons name="information-outline" size={12} color="#94A3B8" />
                                                </View>
                                                <Text style={styles.modalPlanPriceValue}>
                                                    ${amountStr}
                                                    <Text style={styles.modalPlanPricePeriod}>{intervalLabel}</Text>
                                                </Text>
                                            </View>

                                            {/* Plan Features Bullet list */}
                                            <View style={styles.modalFeaturesListWrap}>
                                                {itemPlan.features.map((feature, fIdx) => (
                                                    <View key={fIdx} style={styles.modalFeatureBulletRow}>
                                                        <MaterialCommunityIcons name="check" size={14} color="#16A34A" style={{ marginTop: 1 }} />
                                                        <Text style={styles.modalFeatureBulletText}>{feature}</Text>
                                                    </View>
                                                ))}
                                            </View>

                                            {/* Thin Clean Card Divider */}
                                            <View style={styles.modalCardDivider} />

                                            {/* Optional Enhancements */}
                                            <View style={styles.modalEnhancementsSection}>
                                                <Text style={styles.modalEnhancementsTitle}>OPTIONAL ENHANCEMENTS</Text>
                                                <View style={styles.modalEnhancementsList}>
                                                    {itemPlan.addons.map((addon) => {
                                                        const activeAddon = addons.some(ad => ad.slug === addon.slug);
                                                        const addonPriceObj = addon.prices.find(
                                                            p => p.billing_interval === (isYearly ? 'annually' : 'monthly')
                                                        );
                                                        const addonPriceStr = addonPriceObj ? `$${addonPriceObj.price}` : '+$14.95';

                                                        return (
                                                            <View key={addon.id} style={styles.modalEnhancementItemRow}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                                    <View style={[styles.addonCheckbox, activeAddon && [styles.addonCheckboxChecked, { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal }]]}>
                                                                        {activeAddon && (
                                                                            <MaterialCommunityIcons name="check" size={8} color="#FFFFFF" />
                                                                        )}
                                                                    </View>
                                                                    <Text style={styles.modalEnhancementName}>{addon.name}</Text>
                                                                    {activeAddon && (
                                                                        <View style={styles.addonActiveBadge}>
                                                                            <Text style={styles.addonActiveBadgeText}>ACTIVE</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={[styles.modalEnhancementPrice, activeAddon && styles.modalEnhancementPriceActive]}>
                                                                    {activeAddon ? 'Included' : addonPriceStr}
                                                                </Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>

                                            {/* Card Select Plan / Current Plan Button */}
                                            {active ? (
                                                <View style={styles.modalCurrentPlanBtn}>
                                                    <Text style={styles.modalCurrentPlanBtnText}>Current Plan</Text>
                                                </View>
                                            ) : (
                                                <TouchableOpacity style={[styles.modalSelectPlanBtn, { borderColor: colors.accentTeal }]} activeOpacity={0.8}>
                                                    <Text style={[styles.modalSelectPlanBtnText, { color: colors.accentTeal }]}>Select Plan</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                            <View style={{ height: 60 }} />
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>
        </DashboardLayout>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    scrollContent: {
        padding: 20,
    },
    header: {
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    mainSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 6,
        lineHeight: 18,
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
    planCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        ...Platform.select({
            ios: {
                shadowColor: colors.cardShadowColor,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.1,
                shadowRadius: 15,
            },
            android: {
                elevation: 6,
            }
        })
    },
    cardStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    cardStatusBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    planIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    cubeIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    planNameText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    planPriceValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        marginTop: 2,
    },
    planPricePeriod: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.6,
    },
    metricsGridContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        padding: 14,
        gap: 12,
        marginBottom: 20,
    },
    metricItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    metricIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: 'rgba(11, 160, 178, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricTextWrap: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
    },
    metricValue: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    addonsCardInner: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        paddingTop: 16,
        marginBottom: 20,
    },
    addonsSectionTitle: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.textSecondary,
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    addonsListStack: {
        gap: 8,
    },
    addonItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    addonNameText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#E2E8F0',
    },
    addonPriceText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#34D399',
    },
    planActionsWrapper: {
        gap: 10,
    },
    upgradeGradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 48,
        borderRadius: 14,
    },
    upgradeGradientBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    manageBillingOutlineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    manageBillingOutlineBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    benefitsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitleText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    totalFeaturesBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    totalFeaturesBadgeText: {
        color: '#16A34A',
        fontSize: 10,
        fontWeight: '900',
    },
    benefitsStackContainer: {
        gap: 16,
    },
    benefitBlockCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: colors.cardShadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.02,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            }
        })
    },
    benefitBlockHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    benefitIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    benefitBlockTitleText: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    benefitsBulletsWrap: {
        gap: 8,
        paddingLeft: 4,
    },
    bulletItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    bulletMarker: {
        fontSize: 12,
        color: colors.textMuted,
        lineHeight: 18,
    },
    bulletContentText: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
        flex: 1,
    },

    // Upgrade Modal Styles
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    orangeFlashBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFEAD4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    modalSubtitle: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalLoadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    modalLoadingText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    modalScrollContent: {
        paddingBottom: 40,
    },
    toggleWrapper: {
        alignItems: 'center',
        marginVertical: 20,
    },
    toggleRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toggleLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    toggleLabelActive: {
        color: colors.textPrimary,
    },
    toggleSwitchBg: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
        justifyContent: 'center',
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.cardBackground,
    },
    toggleThumbLeft: {
        alignSelf: 'flex-start',
    },
    toggleThumbRight: {
        alignSelf: 'flex-end',
    },
    saveBadge: {
        backgroundColor: '#FEF08A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    saveBadgeText: {
        color: colors.textPrimary,
        fontSize: 9,
        fontWeight: '900',
    },
    plansContainerStack: {
        paddingHorizontal: 20,
        gap: 24,
    },
    planOutlineCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: colors.cardBorder,
        padding: 20,
        position: 'relative',
        marginTop: 10,
    },
    planOutlineCardActive: {
        borderColor: '#0F172A',
    },
    activeSubscriptionOverlayBadge: {
        position: 'absolute',
        top: -11,
        alignSelf: 'center',
        backgroundColor: colors.accentTeal,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeSubscriptionOverlayBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    modalPlanIdentityHeader: {
        gap: 8,
        marginBottom: 20,
        marginTop: 4,
    },
    modalPlanNameText: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    modalPlanPriceValue: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    modalPlanPricePeriod: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    modalFeaturesListWrap: {
        gap: 10,
        marginBottom: 20,
    },
    modalFeatureBulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    modalFeatureBulletText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        lineHeight: 18,
        flex: 1,
    },
    modalCardDivider: {
        height: 1,
        backgroundColor: colors.surfaceSoft,
        marginVertical: 20,
    },
    modalEnhancementsSection: {
        marginBottom: 24,
    },
    modalEnhancementsTitle: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.textSecondary,
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    modalEnhancementsList: {
        gap: 12,
    },
    modalEnhancementItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    addonCheckbox: {
        width: 15,
        height: 15,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addonCheckboxChecked: {
        backgroundColor: colors.accentTeal,
        borderColor: colors.accentTeal,
    },
    modalEnhancementName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    addonActiveBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    addonActiveBadgeText: {
        color: '#16A34A',
        fontSize: 8,
        fontWeight: '900',
    },
    modalEnhancementPrice: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    modalEnhancementPriceActive: {
        color: '#16A34A',
        fontWeight: '900',
    },
    modalCurrentPlanBtn: {
        backgroundColor: colors.surfaceSoft,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCurrentPlanBtnText: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '800',
    },
    modalSelectPlanBtn: {
        borderWidth: 1.5,
        borderColor: colors.accentTeal,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSelectPlanBtnText: {
        color: colors.accentTeal,
        fontSize: 13,
        fontWeight: '800',
    },
});
