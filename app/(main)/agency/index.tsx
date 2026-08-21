import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AgencyStat, AgencyUsageDetail, getAgencyDashboardStats } from '@/services/dashboardService';
import { formatStatValue } from '@/utils/number-format';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import {
    Activity,
    ChevronRight,
    Layout,
    Package,
    Settings,
    ShieldCheck,
    TrendingUp,
    UserPlus,
    Users,
    Zap
} from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export const AGENCY_MENU_ITEMS = [
    { label: 'Agency Dashboard', icon: 'view-dashboard-outline', route: '/(main)/agency' as Href },
    { label: 'Team Management', icon: 'account-group-outline', route: '/(main)/agency/team-management' as Href },
    { label: 'Access Control', icon: 'lock-outline', route: '/(main)/agency/access-control' as Href },
    { label: 'Activity Logs', icon: 'clipboard-list-outline', route: '/(main)/agency/activity-logs' as Href },
    { label: 'Billing & Plan', icon: 'credit-card-outline', route: '/(main)/agency/billing-plan' as Href },
    { label: 'Agency Support', icon: 'help-circle-outline', route: '/(main)/agency/support' as Href },
    { label: 'Agency Settings', icon: 'cog-outline', route: '/(main)/agency/settings' as Href },
];

export const AgencyLogo = () => (
    <View style={styles.logoBlock}>
        <View style={styles.logoRow}>
            <Image source={require('@/assets/images/rem.png')} style={{ height: 28, width: 28, resizeMode: 'contain' }} />
            <Text style={styles.logoText}>Zien</Text>
        </View>
        <Text style={styles.logoSubtext}>AGENCY CONTROL</Text>
    </View>
);

export const AGENCY_BG = '#FFFFFF';

const LucideIcon = ({ name, size, color }: { name: string, size: number, color: string }) => {
    switch (name.toLowerCase()) {
        case 'users': return <Users size={size} color={color} />;
        case 'layout': return <Layout size={size} color={color} />;
        case 'zap': return <Zap size={size} color={color} />;
        case 'package': return <Package size={size} color={color} />;
        case 'userplus': return <UserPlus size={size} color={color} />;
        case 'shieldcheck': return <ShieldCheck size={size} color={color} />;
        case 'settings': return <Settings size={size} color={color} />;
        default: return <Activity size={size} color={color} />;
    }
};

const formatActivityTime = (dateString: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        return dateString;
    }
};

const StatCard = ({ stat, index }: { stat: AgencyStat, index: number }) => {
    const { colors } = useAppTheme();

    const getBadgeStyle = (grow: string) => {
        const g = grow?.toLowerCase() || '';
        if (g.startsWith('+') || g === 'active') {
            return { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' };
        }
        if (g === 'available') {
            return { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' };
        }
        if (g === 'trialing') {
            return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
        }
        return { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
    };

    const badgeStyle = getBadgeStyle(stat.grow);
    const iconColors = ['#0EA5E9', '#F97316', '#6366F1', '#10B981'];
    const cardColor = iconColors[index % iconColors.length];

    return (
        <View style={[styles.statPanel, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <View style={styles.statHeader}>
                <View style={[styles.statIconBox, { backgroundColor: cardColor + '18' }]}>
                    <LucideIcon name={stat.icon} size={20} color={cardColor} />
                </View>

                {stat.grow ? (
                    <View style={[styles.growBadge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border, borderWidth: 1 }]}>
                        <Text style={[styles.growText, { color: badgeStyle.text }]}>
                            {stat.grow}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>

            <View style={[styles.statDecorative, { backgroundColor: cardColor, opacity: 0.04 }]} />
        </View>
    );
};

const ActivityItem = ({ item }: { item: any }) => {
    const { colors } = useAppTheme();
    const dotColor = item.color || '#94a3b8';

    return (
        <View style={styles.activityRow}>
            <View style={[styles.activityDot, { backgroundColor: dotColor }]} />
            <View style={styles.activityMain}>
                <Text style={[styles.activityTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.event || 'New Activity'}
                </Text>
                <Text style={[styles.activitySubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.agent || 'System'}
                </Text>
            </View>
            <View style={styles.timeWrapper}>
                <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                    {formatActivityTime(item.time)}
                </Text>
            </View>
        </View>
    );
};

const UsageBar = ({ detail }: { detail: AgencyUsageDetail }) => {
    const { colors } = useAppTheme();
    return (
        <View style={styles.usageBarGroup}>
            <View style={styles.usageBarHeader}>
                <Text style={[styles.usageBarLabel, { color: colors.textSecondary }]}>{detail.label}</Text>
                <Text style={[styles.usageBarValue, { color: colors.textPrimary }]}>{detail.value}%</Text>
            </View>
            <View style={[styles.usageBarTrack, { backgroundColor: colors.surfaceSoft }]}>
                <LinearGradient
                    colors={[detail.color, detail.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.usageBarFill, { width: `${Math.max(detail.value, 2)}%` }]}
                />
            </View>
        </View>
    );
};

export default function AgencyDashboard() {
    const { colors } = useAppTheme();
    const { accessToken } = useAuth();
    const router = useRouter();

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['agencyDashboardStats', accessToken],
        queryFn: () => getAgencyDashboardStats(accessToken!),
        enabled: !!accessToken,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: 'always',
    });

    useFocusEffect(
        React.useCallback(() => {
            if (accessToken) {
                refetch();
            }
        }, [accessToken, refetch])
    );

    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

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
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Agency Data...</Text>
                </View>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout
                menuItems={AGENCY_MENU_ITEMS}
                customLogo={<AgencyLogo />}
                customBackground={AGENCY_BG}
                customHeaderBackground={colors.cardBackground}
                backToMainRoute="/(main)/dashboard"
                isAgency={true}
            >
                <View style={styles.errorContainer}>
                    <View style={[styles.errorCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                        <View style={[styles.errorIconWrap, { backgroundColor: colors.surfaceSoft }]}>
                            <MaterialCommunityIcons name="cloud-off-outline" size={42} color={colors.accentTeal || '#0B2341'} />
                        </View>
                        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Connection Error</Text>
                        <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
                            We're having trouble connecting to the server. Please check your connection or try again.
                        </Text>
                        <TouchableOpacity 
                            onPress={() => refetch()} 
                            style={styles.retryBtnWrapper}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={(colors.brandGradient || [colors.accentTeal || '#0B2341', '#1A365D']) as [string, string, ...string[]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.retryBtnInner}
                            >
                                <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" />
                                <Text style={styles.retryBtnText}>Try Again</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </DashboardLayout>
        );
    }

    const stats = data?.stats || [];
    const activity = data?.activity || [];
    const usage = data?.usage || { overallPercentage: 0, totalCredits: 0, usedCredits: 0, details: [] };

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
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.accentTeal]} // Android
                        tintColor={colors.accentTeal} // iOS
                    />
                }
            >
                {/* Header */}
                <View style={styles.headerArea}>
                    <View>
                        <Text style={[styles.mainHeading, { color: colors.textPrimary }]}>Agency Control Center</Text>
                        <Text style={[styles.mainSubheading, { color: colors.textSecondary }]}>Real-time performance & resource overview</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <StatCard key={index} stat={stat} index={index} />
                    ))}
                </View>

                {/* Main Content Area */}
                <View style={styles.contentLayout}>
                    {/* Activity Feed */}
                    <View style={[styles.mainCard, { flex: 1.6, backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleRow}>
                                <TrendingUp size={20} color={colors.accentTeal} />
                                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>My & Team Activity</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.viewAllRow}
                                onPress={() => router.push('/(main)/agency/activity-logs')}
                            >
                                <Text style={[styles.viewAllBtn, { color: colors.accentTeal }]}>View All</Text>
                                <ChevronRight size={14} color={colors.accentTeal} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.activityList}>
                            {activity.length > 0 ? (
                                activity.map((item, index) => (
                                    <ActivityItem key={index} item={item} />
                                ))
                            ) : (
                                <View style={styles.emptyActivity}>
                                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent activities found.</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Usage Insights */}
                    <View style={[styles.mainCard, { flex: 1, backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleRow}>
                                <Activity size={20} color={colors.accentTeal} />
                                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>My Package Usage</Text>
                            </View>
                        </View>

                        <View style={styles.usageCenterArea}>
                            <View style={[styles.usageRing, { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }]}>
                                <View style={[styles.usageCircleInner, { backgroundColor: colors.cardBackground }]}>
                                    <Text style={[styles.usagePct, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                                        {usage.usedCredits ?? 0}/{usage.totalCredits ?? 0}
                                    </Text>
                                    <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>CREDITS USED</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.usageBarsArea}>
                            {usage.details?.map((detail, index) => (
                                <UsageBar key={index} detail={detail} />
                            ))}
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 24,
    },
    headerArea: {
        marginBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mainHeading: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.8,
    },
    mainSubheading: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 32,
    },
    statPanel: {
        flex: 1,
        minWidth: (width - 48 - 16) / 2,
        padding: 20,
        borderRadius: 28,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    growBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    growText: {
        fontSize: 11,
        fontWeight: '800',
    },
    statContent: {
        marginTop: 4,
    },
    statValue: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -1,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
        opacity: 0.8,
    },
    statDecorative: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    contentLayout: {
        flexDirection: 'row',
        gap: 20,
        flexWrap: 'wrap',
    },
    mainCard: {
        borderRadius: 32,
        borderWidth: 1,
        padding: 28,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 20,
        elevation: 2,
        minWidth: 320,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        fontSize: 19,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    viewAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllBtn: {
        fontSize: 13,
        fontWeight: '700',
    },
    activityList: {
        gap: 20,
    },
    activityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 2,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    activityMain: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    activitySubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 2,
    },
    timeWrapper: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    activityTime: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    emptyActivity: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
    },
    usageCenterArea: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    usageRing: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    usageCircleInner: {
        width: 130,
        height: 130,
        borderRadius: 65,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    usagePct: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    usageLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginTop: 2,
        opacity: 0.7,
        textAlign: 'center',
    },
    usageBarsArea: {
        marginTop: 24,
        gap: 22,
    },
    usageBarGroup: {
        gap: 10,
    },
    usageBarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    usageBarLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    usageBarValue: {
        fontSize: 13,
        fontWeight: '800',
    },
    usageBarTrack: {
        height: 8,
        borderRadius: 4,
        width: '100%',
        overflow: 'hidden',
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    logoBlock: {
        alignItems: 'flex-start',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#fff',
    },
    logoSubtext: {
        fontSize: 10,
        fontWeight: '900',
        color: '#F97316',
        letterSpacing: 1.2,
        marginTop: 5,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    errorCard: {
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#E9EEF4',
        ...Platform.select({
            ios: { shadowColor: '#0B2341', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16 },
            android: { elevation: 3 },
        }),
    },
    errorIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 20,
    },
    retryBtnWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        width: '100%',
    },
    retryBtnInner: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    retryBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    }
});

