import {
  ActionPillsRow,
  DarkSectionCard,
  LeadRow,
  SearchBar,
  SectionCard,
  UpdateRow
} from '@/components/dashboard';
import type { NavMenuItem } from '@/components/main';
import { DashboardLayout } from '@/components/main';
import { MaintenanceBanner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useProfile } from '@/hooks/useProfile';
import { getSoloInvoices, getSoloSubscription, type SoloSubscriptionResponse } from '@/services/billingService';
import { ServiceUnavailableError } from '@/services/dashboardService';
import { formatStatValue } from '@/utils/number-format';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';


const MENU_ITEMS: NavMenuItem[] = [
  { label: 'Dashboard', icon: 'view-grid-outline', route: '/(main)/dashboard' as const },
  { label: 'Property Intelligence', icon: 'domain', route: '/(main)/property-intelligence' as const },
  { label: 'Inbox', icon: 'inbox-outline', route: '/(main)/inbox' as const },
  { label: 'Calendar', icon: 'calendar-blank-outline', route: '/(main)/calendar' as const },
  { label: 'CRM', icon: 'account-group-outline', route: '/(main)/crm' as const },
  { label: 'Properties', icon: 'home-outline', route: '/(main)/properties' as const },
  { label: 'Open House', icon: 'map-marker-radius-outline', route: '/(main)/open-house' as const },
  { label: 'Social Media', icon: 'share-variant-outline', route: '/(main)/social-hub' as const },
  { label: 'AI Sweep', icon: 'brain', route: '/(main)/ai-content' as const },
  { label: 'Leads Capture', icon: 'form-select', route: '/(main)/leads-capture' as const },
  { label: 'Zien Card', icon: 'card-account-details-outline', route: '/(main)/zien-card' as const },
  { label: 'Zien Guardian', icon: 'target', route: '/(main)/guardian-ai' as const },
  { label: 'Billing & Usage', icon: 'credit-card-outline', route: '/(main)/billing-usage' as const }
];



const QUICK_ACTIONS = [
  { label: 'Add Property', icon: 'home-outline', route: '/(main)/properties/create' as Href },
  { label: 'Open House', icon: 'map-marker-outline', route: '/(main)/open-house' as Href },
  { label: 'Zien Guardian', icon: 'shield-outline', route: '/(main)/guardian-ai' as Href },
  { label: 'Social Media', icon: 'share-variant-outline', route: '/(main)/social-hub' as Href },
  { label: 'Zien Card', icon: 'card-text-outline', route: '/(main)/zien-card' as Href },
];

const STATS_CONFIG = [
  {
    key: 'totalLeads',
    title: 'Total Leads',
    icon: 'account-group-outline',
    gradient: ['#0a2341', '#1B5E9A'] as [string, string],
    route: '/(main)/crm/leads' as Href,
  },
  {
    key: 'activeListings',
    title: 'Active Listings',
    icon: 'home-city-outline',
    gradient: ['#6B4EFF', '#9A7BFF'] as [string, string],
    route: '/(main)/properties' as Href,
  },
  {
    key: 'estRevenue',
    title: 'Est. Revenue',
    icon: 'cash-multiple',
    gradient: ['#10B981', '#059669'] as [string, string],
    route: '/(main)/crm/deals' as Href,
  },
  {
    key: 'guardianAlerts',
    title: 'Guardian Alerts',
    icon: 'shield-check-outline',
    gradient: ['#F59E0B', '#D97706'] as [string, string],
    route: '/(main)/guardian-ai' as Href,
  },
];





const CONTENT_PADDING_H = 18;
const CARD_GAP = 14;

function getStyles(colors: any) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: CONTENT_PADDING_H,
      paddingTop: 8,
    },

    // ── Greeting ───────────────────────────────────────
    greetingCard: {
      borderRadius: 24,
      padding: 18,
      marginBottom: 16,
      overflow: 'hidden',
      shadowColor: '#0A2F48',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    greetingTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    greetingTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    greetingTagText: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
      letterSpacing: 0.5,
    },
    greetingDateText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: 'rgba(190,220,240,0.8)',
    },
    greetingTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    greetingName: {
      color: '#0ECFDF',
    },
    greetingSubtitle: {
      fontSize: 13,
      color: 'rgba(190,220,240,0.85)',
      fontWeight: '500',
      lineHeight: 18,
    },

    // ── Stats ───────────────────────────────────────────
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      borderRadius: 22,
      padding: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    statCardInner: {
      flex: 1,
    },
    statCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    statIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    statBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.2,
    },
    statValue: {
      fontSize: 26,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    statTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 0.2,
    },

    // ── Two-col layout ──────────────────────────────────
    twoCol: {
      gap: CARD_GAP,
      marginBottom: CARD_GAP,
    },
    twoColRow: { flexDirection: 'row' },
    twoColCol: { flexDirection: 'column' },

    // ── Segment control ─────────────────────────────────
    segment: {
      flexDirection: 'row',
      padding: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
      alignSelf: 'flex-end',
      gap: 4,
    },
    segmentItem: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    segmentItemActive: {
      backgroundColor: colors.accentTeal,
      shadowColor: colors.accentTeal,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: '#fff',
    },

    // ── Chart ───────────────────────────────────────────
    chartWrap: {
      marginTop: 10,
      borderRadius: 16,
      overflow: 'hidden',
    },

    // ── View all button ─────────────────────────────────
    viewAllButton: {
      marginTop: 14,
      borderRadius: 14,
      overflow: 'hidden',
    },
    viewAllGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${colors.accentTeal}30`,
      backgroundColor: `${colors.accentTeal}08`,
    },
    viewAllButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentTeal,
    },
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 8,
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: 13,
      color: colors.textMuted || '#8DA4B5',
      fontWeight: '600',
      marginTop: 8,
    },
  });
}

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const [velocityRange, setVelocityRange] = useState<'7d' | '30d'>('30d');

  const { data: profile } = useProfile();
  const { accessToken } = useAuth();


  const userInitials = useMemo(() => {
    if (!profile) return '';
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase();
  }, [profile]);

  const firstName = profile?.first_name || '';

  const { data: dashboardData, isLoading: isDashboardLoading, isError, error, refetch } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);

  // Detect 503 maintenance mode
  const isMaintenanceMode = isError && error instanceof ServiceUnavailableError;
  const [subscriptionData, setSubscriptionData] = useState<SoloSubscriptionResponse | null>(null);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Fetch billing and invoice details
  const fetchBillingData = async (showPulse = false) => {
    if (showPulse) setRefreshing(true);
    try {
      const [subResult, invResult] = await Promise.all([
        getSoloSubscription(accessToken),
        getSoloInvoices(accessToken)
      ]);
      setSubscriptionData(subResult);
    } catch (error) {
      console.error('[BillingUsageScreen] Error fetching billing details:', error);
      Alert.alert('Connection Alert', 'Using secure offline cache for billing details.');
    } finally {
      setRefreshing(false);
    }
  };



  useEffect(() => {
    fetchBillingData();
  }, [accessToken]);

  const crmCounts = useMemo(() => {
    const counts = { new: 0, negotiation: 0, closing: 0 };
    if (!dashboardData?.crmSnapshot) return counts;

    if (Array.isArray(dashboardData.crmSnapshot)) {
      dashboardData.crmSnapshot.forEach((item: any) => {
        const name = item?.name?.toLowerCase();
        const count = Number(item?.count ?? 0);
        if (name === 'lead' || name === 'new') {
          counts.new = count;
        } else if (name === 'offer' || name === 'negotiation') {
          counts.negotiation = count;
        } else if (name === 'closed' || name === 'closing') {
          counts.closing = count;
        }
      });
    } else if (typeof dashboardData.crmSnapshot === 'object') {
      const snapshot = dashboardData.crmSnapshot as any;
      counts.new = Number(snapshot.new ?? snapshot.lead ?? 0);
      counts.negotiation = Number(snapshot.negotiation ?? snapshot.offer ?? 0);
      counts.closing = Number(snapshot.closing ?? snapshot.closed ?? 0);
    }
    return counts;
  }, [dashboardData]);

  const STATS = useMemo(() => {
    if (!dashboardData) return [];

    return STATS_CONFIG.map(config => {
      const apiStat = (dashboardData.stats as any)[config.key];
      const rawValue = apiStat?.value || '0';
      const formattedValue = formatStatValue(rawValue, config.key === 'estRevenue');
      return {
        ...config,
        value: formattedValue,
        meta: apiStat?.trend || '',
        metaTone: (apiStat?.trend?.includes('+') || apiStat?.trend === 'Safe') ? 'positive' : 'neutral',
      };
    });
  }, [dashboardData]);

  const ACTIVE_LEADS = useMemo(() => {
    return dashboardData?.activeLeads || [];
  }, [dashboardData]);

  const windowWidth = Dimensions.get('window').width;
  const isTablet = windowWidth >= 768;
  const sectionColumnWidth = Math.floor(
    isTablet
      ? (windowWidth - CONTENT_PADDING_H * 2 - CARD_GAP) / 2
      : windowWidth - CONTENT_PADDING_H * 2
  );
  const chartWidth = Math.max(240, sectionColumnWidth);

  const leadVelocityData = useMemo(() => {
    const apiData = dashboardData?.leadVelocity || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    if (velocityRange === '7d') {
      // Last 7 days
      const data = apiData.slice(-7);
      const labels = [];
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        labels.push(days[d.getDay()]);
      }

      return { labels, datasets: [{ data }] };
    } else {
      // "30 Days" view (showing all 12 items from API as per Web UI)
      const data = apiData;
      const labels = [];
      const today = new Date();

      for (let i = apiData.length - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        labels.push(`${month} ${d.getDate()}`);
      }

      return { labels, datasets: [{ data }] };
    }
  }, [velocityRange, dashboardData]);

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.cardBackground,
      backgroundGradientTo: colors.cardBackground,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(11, 160, 178, ${opacity})`,
      labelColor: (opacity = 1) => colors.textMuted || '#8DA4B5',
      fillShadowGradientFrom: colors.accentTeal,
      fillShadowGradientTo: `${colors.accentTeal}40`,
      fillShadowGradientOpacity: 0.8,
      barPercentage: 0.30,
      propsForLabels: {
        fontSize: 7,
        fontWeight: '700',
      },
      propsForBackgroundLines: {
        stroke: 'transparent',
      },
    }),
    [colors]
  );



  // Format current date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // ── Maintenance / 503 screen ──────────────────────────────────
  if (isMaintenanceMode) {
    return (
      <DashboardLayout menuItems={MENU_ITEMS} userInitials={userInitials}>
        <MaintenanceBanner
          message={(error as ServiceUnavailableError).message}
          onRetry={refetch}
          isRetrying={isDashboardLoading}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout menuItems={MENU_ITEMS} userInitials={userInitials}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentTeal}
            colors={[colors.accentTeal]}
          />
        }
      >
        {isDashboardLoading && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.accentTeal} />
          </View>
        )}
        {/* ── Greeting Card ── */}
        <LinearGradient
          colors={['#0D2F45', '#0B2D3E', '#082030']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.greetingCard}
        >
          {/* Glow accents */}
          <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(11,160,178,0.18)' }} />
          <View style={{ position: 'absolute', bottom: -10, left: 30, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(107,78,255,0.12)' }} />

          <View style={styles.greetingTopRow}>
            <View style={styles.greetingTag}>
              <MaterialCommunityIcons name="star-four-points" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.greetingTagText}>Intelligence Briefing</Text>
            </View>
            <Text style={styles.greetingDateText}>{dateStr}</Text>
          </View>

          <Text style={styles.greetingTitle}>
            Hi <Text style={styles.greetingName}>{firstName}</Text> 👋
          </Text>
          <Text style={styles.greetingSubtitle}>
            Here is your daily intelligence briefing.
          </Text>
        </LinearGradient>

        {/* ── Search / AI prompt bar ── */}
        <SearchBar />

        {/* ── Quick Actions ── */}
        <ActionPillsRow items={QUICK_ACTIONS} />

        {/* ── Stat Cards (2×2 grid) ── */}
        <View style={styles.statsGrid}>
          {STATS.map((stat) => (
            <Pressable
              key={stat.title}
              style={{ minWidth: '48%' }}
              onPress={() => router.push(stat.route as Href)}
            >
              <LinearGradient
                colors={stat.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <View style={styles.statCardTop}>
                  <View style={styles.statIconWrap}>
                    <MaterialCommunityIcons name={stat.icon as any} size={20} color="#fff" />
                  </View>
                  <View style={styles.statBadge}>
                    <MaterialCommunityIcons
                      name={stat.metaTone === 'positive' ? 'trending-up' : 'shield-check'}
                      size={10}
                      color="#fff"
                    />
                    <Text style={styles.statBadgeText}>
                      {stat.metaTone === 'positive' ? '+' : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={[styles.statBadgeText, { color: 'rgba(255,255,255,0.7)', marginTop: 4 }]}>{stat.meta}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* ── Lead Velocity + Active Leads (side by side on tablet) ── */}
        <View style={[styles.twoCol, isTablet ? styles.twoColRow : styles.twoColCol]}>
          <SectionCard title="Lead Velocity" style={{ flex: 1 }} accent="#0a2341">
            <View style={styles.segment}>
              <Pressable
                onPress={() => setVelocityRange('7d')}
                style={[styles.segmentItem, velocityRange === '7d' && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, velocityRange === '7d' && styles.segmentTextActive]}>7 Days</Text>
              </Pressable>
              <Pressable
                onPress={() => setVelocityRange('30d')}
                style={[styles.segmentItem, velocityRange === '30d' && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, velocityRange === '30d' && styles.segmentTextActive]}>30 Days</Text>
              </Pressable>
            </View>
            <View style={styles.chartWrap}>
              <BarChart
                data={leadVelocityData}
                width={velocityRange === '30d' ? sectionColumnWidth - 60 : sectionColumnWidth - 20}
                height={300}
                fromZero
                showValuesOnTopOfBars
                verticalLabelRotation={velocityRange === '30d' ? 60 : 0}
                withInnerLines={false}
                withHorizontalLabels={false}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={chartConfig as any}
                style={{
                  borderRadius: 16,
                  paddingRight: 0,
                }}
                flatColor={true}
              />
            </View>
          </SectionCard>

          <SectionCard
            title="Active Leads"
            linkLabel="View CRM"
            onLinkPress={() => router.push('/(main)/crm/leads' as Href)}
            style={{ flex: 1 }}
            accent="#6B4EFF"
          >
            <View style={{ marginTop: 8 }}>
              {ACTIVE_LEADS.length > 0 ? (
                ACTIVE_LEADS.map((lead: any) => (
                  <LeadRow
                    key={lead.id || lead.name}
                    id={lead.id}
                    name={lead.name}
                    info={lead.info}
                    initial={lead.initial}
                    status={lead.status}
                  />
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="account-search-outline" size={32} color={colors.textMuted || '#8DA4B5'} />
                  <Text style={styles.emptyStateText}>No active leads available</Text>
                </View>
              )}
              {ACTIVE_LEADS.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.viewAllButton, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push('/(main)/crm/leads' as Href)}
                >
                  <View style={styles.viewAllGradient}>
                    <Text style={styles.viewAllButtonText}>View All Leads</Text>
                    <MaterialCommunityIcons name="arrow-right" size={15} color={colors.accentTeal} />
                  </View>
                </Pressable>
              )}
            </View>
          </SectionCard>
        </View>

        {/* ── Latest Updates + CRM Snapshot ── */}
        <View style={[styles.twoCol, isTablet ? styles.twoColRow : styles.twoColCol]}>
          <SectionCard
            title="Latest Updates"
            linkLabel="View All"
            onLinkPress={() => router.push('/(main)/notifications' as Href)}
            style={{ flex: 1 }}
            accent="#F59E0B"
          >
            <View style={{ marginTop: 4 }}>
              {(dashboardData?.latestUpdates || []).slice(0, 2).map((u: any, i: number) => (
                <UpdateRow
                  key={u.title || i}
                  icon={u.icon || 'bell-outline'}
                  title={u.title}
                  description={u.description}
                  time={u.time || 'Just now'}
                  accentColor={u.accent || '#0a2341'}
                />
              ))}
              {(!dashboardData?.latestUpdates || dashboardData.latestUpdates.length === 0) && (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="bell-off-outline" size={32} color={colors.textMuted || '#8DA4B5'} />
                  <Text style={styles.emptyStateText}>No updates available</Text>
                </View>
              )}
            </View>
          </SectionCard>

          <DarkSectionCard
            title="Deals"
            items={[
              { value: String(crmCounts.new), label: 'Lead' },
              { value: String(crmCounts.negotiation), label: 'Offer' },
              { value: String(crmCounts.closing), label: 'Closed' },
            ]}
            buttonLabel="Go to Pipeline"
            onButtonPress={() => router.push('/(main)/crm/deals' as Href)}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ height: CARD_GAP }} />
      </ScrollView>
    </DashboardLayout>
  );
}

