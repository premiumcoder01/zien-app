import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getCRMOverview } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CRM_SECTIONS: Array<{
  id: string;
  label: string;
  icon: 'view-grid-outline' | 'account-group-outline' | 'account-outline' | 'calendar-blank-outline' | 'pipe' | 'rocket-launch-outline' | 'content-copy' | 'lightning-bolt-outline' | 'connection' | 'cog-outline';
  route: Href | null;
  badge?: string;
}> = [
    { id: 'contacts', label: 'Contacts', icon: 'account-group-outline', route: '/(main)/crm/contacts', badge: '1.2k' },
    { id: 'leads', label: 'Leads', icon: 'account-outline', route: '/(main)/crm/leads', badge: '42' },
    { id: 'follow-ups', label: 'Follow-Ups', icon: 'calendar-blank-outline', route: '/(main)/crm/follow-ups', badge: '12' },
    { id: 'deals', label: 'Deals / Pipeline', icon: 'pipe', route: '/(main)/crm/deals' },
    { id: 'campaigns', label: 'Campaigns', icon: 'rocket-launch-outline', route: '/(main)/crm/campaigns' },
    { id: 'templates', label: 'Templates', icon: 'content-copy', route: '/(main)/crm/templates' },
    { id: 'automations', label: 'Automations Rules', icon: 'lightning-bolt-outline', route: '/(main)/crm/automations' },
    { id: 'integrations', label: 'Integrations', icon: 'connection', route: '/(main)/crm/integrations' },
    { id: 'settings', label: 'Settings', icon: 'cog-outline', route: '/(main)/crm/settings' },
  ];

const OVERVIEW_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lead-sources', label: 'Lead Sources' },
  { id: 'conversion-roi', label: 'Conversion ROI' },
  { id: 'heat-index', label: 'Heat Index Stats' },
] as const;




// The original hardcoded values LEAD_SOURCE_CARDS, CONVERSION_FUNNEL_STAGES, 
// HEAT_DISTRIBUTION, HEAT_SURGE_TRIGGERS are replaced with dynamic API values.


export default function CRMScreen() {
  const { colors } = useAppTheme();
  const { accessToken } = useAuth();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [overviewTab, setOverviewTab] = useState<(typeof OVERVIEW_TABS)[number]['id']>('overview');
  const [showActivityLog, setShowActivityLog] = useState(false);

  // TanStack Query
  const {
    data: crmData,
    isLoading: loading,
    error: queryError,
    refetch,
    isRefetching: refreshing
  } = useQuery({
    queryKey: ['crm-overview'],
    queryFn: () => getCRMOverview(accessToken!),
    enabled: !!accessToken,
  });

  const error = queryError instanceof Error ? queryError.message : (queryError ? 'Something went wrong' : null);

  const onRefresh = () => {
    refetch();
  };

  const { width } = Dimensions.get('window');
  const padding = 16;
  const gap = 12;
  const statCardWidth = (width - padding * 2 - gap) / 2;
  const chartWidth = Math.max(260, width - padding * 2 - 24);

  const velocityData = useMemo(() => {
    let data = crmData?.leadVelocity || [];
    if (data.length === 0) data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2];

    const padded = new Array(12).fill(0);
    const slice = data.slice(-12);
    for (let i = 0; i < slice.length; i++) {
      padded[12 - slice.length + i] = slice[i];
    }
    const maxVal = Math.max(...padded, 1);

    return padded.map((val, i) => ({
      id: `vel-${i}`,
      value: val,
      heightPct: `${(val / maxVal) * 100}%`,
      label: i === 11 ? 'Today' : `${11 - i}d`,
      isToday: i === 11,
    }));
  }, [crmData]);


  const displayStats = useMemo(() => {
    const stats = crmData?.stats;
    return [
      { title: 'TOTAL CONTACTS', value: stats?.totalContacts?.value || '0', meta: stats?.totalContacts?.change || '0%', icon: 'account-group-outline' as const },
      { title: 'TOTAL LEADS', value: stats?.totalLeads?.value || '0', meta: stats?.totalLeads?.change || '0', icon: 'account-outline' as const },
      { title: 'PENDING FOLLOW-UPS', value: stats?.pendingFollowUps?.value || '0', meta: stats?.pendingFollowUps?.change || '0', icon: 'calendar-blank-outline' as const },
      { title: 'ACTIVE DEALS', value: stats?.activeDeals?.value || '0', meta: stats?.activeDeals?.change || '0', icon: 'briefcase-outline' as const },
      { title: 'HOT LEADS', value: stats?.hotLeads?.value || '0', meta: stats?.hotLeads?.change || '0', icon: 'fire' as const },
      { title: 'AVG. HEAT INDEX', value: stats?.avgHeatIndex?.value || '0', meta: stats?.avgHeatIndex?.change || '0 pts', icon: 'trending-up' as const },
    ];
  }, [crmData]);

  const displayRecentLeads = useMemo(() => {
    if (!crmData?.recentLeads || crmData.recentLeads.length === 0) return [];
    return crmData.recentLeads.map((lead, index) => ({
      ...lead,
      id: `api-lead-${index}`
    }));
  }, [crmData]);

  const displaySourceAttribution = useMemo(() => {
    if (!crmData?.sourceAttribution) return [];
    return crmData.sourceAttribution.map((item, index) => ({
      id: `source-${index}`,
      source: item.source,
      dotColor: item.color || '#0a2341',
      leads: item.leads,
      convRate: item.conversion,
      roi: item.roi,
      roiHigh: item.roi.toLowerCase() === 'high' || item.roi.toLowerCase() === 'medium',
    }));
  }, [crmData]);

  const displayConversionFunnel = useMemo(() => {
    if (!crmData?.conversionRoi?.funnel) return [];
    const colors = ['#CAD8E4', '#B8CCDC', '#9FC5D8', '#5BA8C9', '#0a2341'];
    return crmData.conversionRoi.funnel.map((item, index) => ({
      id: `funnel-${index}`,
      label: item.level,
      value: item.count.toString(),
      barColor: colors[Math.min(index, colors.length - 1)]
    }));
  }, [crmData]);

  const displayHeatDistribution = useMemo(() => {
    if (!crmData?.heatIndex) return [];
    const { cold, warm, hot } = crmData.heatIndex;
    const total = cold + warm + hot;
    const getPct = (val: number) => total > 0 ? `${Math.round((val / total) * 100)}%` : '0%';

    return [
      { id: 'cold', label: 'Cold', pct: getPct(cold), sub: 'Cold (0-30)', color: '#5B6B7A' },
      { id: 'warm', label: 'Warm', pct: getPct(warm), sub: 'Warm (31-70)', color: '#0a2341' },
      { id: 'hot', label: 'Hot', pct: getPct(hot), sub: 'Hot (71-100)', color: '#EA580C' },
    ];
  }, [crmData]);

  const displayHeatSurgeTriggers = useMemo(() => {
    if (!crmData?.heatIndex?.scoringRules) return [];
    return crmData.heatIndex.scoringRules.map((rule, index) => ({
      id: `trigger-${index}`,
      label: rule.event,
      pts: rule.weight
    }));
  }, [crmData]);

  const displayActivityLog = useMemo(() => {
    if (!crmData?.activityLog || crmData.activityLog.length === 0) return [];
    return crmData.activityLog.map((activity, index) => ({
      ...activity,
      id: activity.id || `api-activity-${index}`
    }));
  }, [crmData]);

  const topSource = useMemo(() => {
    if (!crmData?.sourceAttribution || crmData.sourceAttribution.length === 0) {
      return { source: 'N/A', conversion: '0%' };
    }
    // Pick the source with the most leads or the first one if only one exists
    return [...crmData.sourceAttribution].sort((a, b) => b.leads - a.leads)[0];
  }, [crmData]);

  const handleDownloadROIReport = async () => {
    try {
      const stats = crmData?.stats;
      const roi = crmData?.conversionRoi;
      const heat = crmData?.heatIndex;

      const formatCurrency = (val: number | undefined) => {
        if (val === undefined) return '$0';
        return '$' + val.toLocaleString();
      };

      const csvData = [
        ['Metric', 'Value'],
        ['Total Contacts', stats?.totalContacts?.value || '0'],
        ['Active Deals', stats?.activeDeals?.value || '0'],
        ['Hot Leads', stats?.hotLeads?.value || '0'],
        ['Average Heat Index', stats?.avgHeatIndex?.value || '0 pts'],
        ['Total Pipeline Value', formatCurrency(roi?.totalPipelineValue)],
        ['Closed Deal Revenue', formatCurrency(roi?.closedWonValue)],
        ['Estimated Ad Campaign Spend', formatCurrency(roi?.estimatedAdCost)],
        ['Marketing Net ROI', `${roi?.netROI || 0}%`],
        ['Top Performing Lead Source', topSource?.source || 'N/A'],
        ['Lead Source Conversion Rate', topSource?.conversion || '0%'],
        ['Cold Leads (0-30)', heat?.cold?.toString() || '0'],
        ['Warm Leads (31-70)', heat?.warm?.toString() || '0'],
        ['Hot Leads (71-100)', heat?.hot?.toString() || '0'],
      ];

      const csvString = csvData
        .map((row, index) => index === 0 ? row.join(',') : row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `CRM_ROI_Report_${dateStr}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download ROI Report',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error sharing CSV:', error);
      Alert.alert('Error', 'Failed to generate the report.');
    }
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <PageHeader
        title="CRM"
        subtitle="Intelligent database tracking leads from capture to close."
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a2341" />
        }>

        {loading && !refreshing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0a2341" />
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1, justifyContent: 'center' }]}
            onPress={handleDownloadROIReport}
          >
            <Text style={styles.secondaryBtnText}>Download ROI Report</Text>
          </Pressable>
        </View>

        {/* Overview tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScroll}>
          {OVERVIEW_TABS.map((tab) => {
            const isActive = overviewTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setOverviewTab(tab.id)}>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab content: Overview | Lead Sources | Conversion ROI | Heat Index */}
        {overviewTab === 'overview' && (
          <>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.statsGrid}>
              {displayStats.map((card) => (
                <View key={card.title} style={[styles.statCard, { width: statCardWidth }]}>
                  <View style={styles.statHeader}>
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons name={card.icon as any} size={18} color="#0a2341" />
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.statMeta}>{card.meta}</Text>
                    </View>
                  </View>
                  <View style={styles.statBody}>
                    <Text style={styles.statValue}>{card.value}</Text>
                    <Text style={styles.statTitle}>{card.title}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Lead Velocity & Source Attribution</Text>
              </View>
              <View style={styles.customChartContainerWrap}>
                <View style={styles.customChartContainer}>
                  {velocityData.map((item) => (
                    <View key={item.id} style={styles.customChartBarCol}>
                      {item.value > 0 ? (
                        <Text style={styles.customChartValue}>{item.value}</Text>
                      ) : (
                        <Text style={[styles.customChartValue, { opacity: 0 }]}>0</Text>
                      )}
                      <View style={styles.customChartBarTrack}>
                        <View
                          style={[
                            styles.customChartBarFill,
                            { height: item.heightPct as any },
                            item.isToday && styles.customChartBarFillToday
                          ]}
                        />
                      </View>
                      <Text style={styles.customChartLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <LinearGradient
                colors={[colors.cardBackground, colors.surfaceSoft]}
                style={styles.velocityFooter}>
                <View>
                  <Text style={styles.velocityLabel}>TOP PERFORMING SOURCE</Text>
                  <Text style={styles.velocityValue}>{topSource.source}</Text>
                </View>
                <View style={styles.velocityRight}>
                  <Text style={styles.velocityLabel}>CONVERSION RATE</Text>
                  <Text style={styles.velocityValue}>{topSource.conversion || (topSource as any).conversionRate}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Lead Flows</Text>

              </View>
              {displayRecentLeads.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>No recent leads captured</Text>
                </View>
              ) : displayRecentLeads.map((lead, idx) => (
                <View
                  key={lead.id}
                  style={[styles.leadRow, idx === displayRecentLeads.length - 1 && styles.leadRowLast]}>
                  <View style={styles.leadAvatar}>
                    <Text style={styles.avatarText}>{lead.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.leadInfo}>
                    <Text style={styles.leadName}>{lead.name}</Text>
                    <Text style={styles.leadSource}>{lead.source}</Text>
                  </View>
                  <View style={styles.leadRight}>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreText}>{lead.score}</Text>
                    </View>
                    <Text style={styles.leadTime}>{lead.time}</Text>
                  </View>
                </View>
              ))}
              <Pressable style={styles.cardLinkBtn} onPress={() => router.push('/(main)/crm/leads')}>
                <Text style={styles.cardLinkText}>View Leads</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#0a2341" />
              </Pressable>
            </View>
          </>
        )}



        {overviewTab === 'lead-sources' && (
          <View style={styles.leadSourceList}>
            {displaySourceAttribution.map((item) => (
              <View key={item.id} style={styles.leadSourceCardFull}>
                <View style={styles.leadSourceMain}>
                  <View style={styles.leadSourceHeader}>
                    <View style={[styles.leadSourceDot, { backgroundColor: item.dotColor }]} />
                    <Text style={styles.leadSourceLabel}>{item.source}</Text>
                  </View>
                  <View style={styles.leadSourceValueContainer}>
                    <Text style={styles.leadSourceValue}>{item.leads}</Text>
                    <Text style={styles.leadSourceMeta}>Leads</Text>
                  </View>
                </View>

                <View style={styles.leadSourceMetrics}>
                  <View style={styles.leadSourceMetricBox}>
                    <Text style={styles.leadSourceLabelSmall}>CONV.</Text>
                    <Text style={[styles.leadSourceConv, item.roiHigh && styles.leadSourceConvTeal]}>
                      {item.convRate}
                    </Text>
                  </View>
                  <View style={styles.leadSourceMetricBox}>
                    <Text style={styles.leadSourceLabelSmall}>ROI</Text>
                    <View style={[styles.roiBadge, item.roiHigh ? styles.roiBadgeHigh : styles.roiBadgeLow]}>
                      <Text style={[styles.leadSourceRoi, item.roiHigh && styles.leadSourceRoiGreen]}>
                        {item.roi}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {overviewTab === 'conversion-roi' && (
          <View style={styles.funnelCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.funnelTitle}>Lead-to-Deal Funnel</Text>
              <MaterialCommunityIcons name="filter-outline" size={20} color="#94A3B8" />
            </View>
            {displayConversionFunnel.map((stage, idx) => (
              <View
                key={stage.id}
                style={[
                  styles.funnelBar,
                  { backgroundColor: stage.barColor, opacity: 1 - idx * 0.1 },
                  idx === displayConversionFunnel.length - 1 && styles.funnelBarLast,
                ]}>
                <Text style={styles.funnelBarLabel}>{stage.label}</Text>
                <View style={styles.funnelValueContainer}>
                  <Text style={styles.funnelBarValue}>{stage.value}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {overviewTab === 'heat-index' && (
          <>
            <View style={styles.heatCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.heatCardTitle}>Global Interest Distribution</Text>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD700" />
              </View>
              <View style={styles.heatDistributionRow}>
                {displayHeatDistribution.map((item) => (
                  <View key={item.id} style={styles.heatDistributionItem}>
                    <Text style={[styles.heatDistributionPct, { color: item.color }]}>{item.pct}</Text>
                    <Text style={styles.heatDistributionSub}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.heatCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.heatCardTitle}>Interest Surge Triggers</Text>
              </View>
              {displayHeatSurgeTriggers.map((trigger, idx) => (
                <View
                  key={trigger.id}
                  style={[styles.heatTriggerRow, idx === displayHeatSurgeTriggers.length - 1 && styles.heatTriggerRowLast]}>
                  <View style={styles.triggerIconWrap}>
                    <MaterialCommunityIcons name="flash-outline" size={16} color="#0a2341" />
                  </View>
                  <Text style={styles.heatTriggerLabel}>{trigger.label}</Text>
                  <Text style={styles.heatTriggerPts}>{trigger.pts}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* CRM workspace — same in every tab */}
        <Text style={styles.sectionTitle}>CRM workspace</Text>
        <View style={styles.sectionsList}>
          {CRM_SECTIONS.map((section) => (
            <Pressable
              key={section.id}
              style={({ pressed }) => [styles.sectionRow, pressed && styles.sectionRowPressed]}
              onPress={() => section.route && router.push(section.route)}
              disabled={!section.route}>
              <View style={[styles.sectionIconWrap, !section.route && styles.sectionIconWrapActive]}>
                <MaterialCommunityIcons
                  name={section.icon}
                  size={22}
                  color={!section.route ? '#FFFFFF' : colors.textPrimary}
                />
              </View>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.route ? (
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              ) : (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Here</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Continuous Activity Log Modal */}
      <Modal
        visible={showActivityLog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivityLog(false)}>
        <View style={styles.activityLogContainer}>
          {/* Header */}
          <View style={[styles.activityLogHeader, { paddingTop: insets.top + 16 }]}>
            <View style={styles.activityLogTitleRow}>
              <MaterialCommunityIcons name="pulse" size={24} color={colors.textPrimary} />
              <View style={styles.activityLogTitleText}>
                <Text style={styles.activityLogTitle}>Continuous Activity Log</Text>
                <Text style={styles.activityLogSubtitle}>Real-time feed of all CRM activities and interactions</Text>
              </View>
            </View>
            <Pressable onPress={() => setShowActivityLog(false)} style={styles.activityLogCloseBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          {/* Activity List */}
          <ScrollView
            style={styles.activityLogScroll}
            contentContainerStyle={[styles.activityLogContent, { paddingBottom: insets.bottom + 80 }]}
            showsVerticalScrollIndicator={false}>
            {displayActivityLog.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center', opacity: 0.5 }}>
                <MaterialCommunityIcons name="pulse" size={48} color={colors.textMuted} />
                <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>
                  No recent activities found
                </Text>
              </View>
            ) : displayActivityLog.map((activity) => (
              <View
                key={activity.id}
                style={[
                  styles.activityLogItem,
                  {
                    backgroundColor: colors.cardBackground,
                    borderLeftColor: activity.leftBorder === 'transparent' ? colors.cardBorder : (activity.leftBorder || colors.cardBorder),
                    borderLeftWidth: activity.leftBorder !== 'transparent' ? 4 : 0,
                  }
                ]}>
                <View style={styles.activityLogIcon}>
                  <MaterialCommunityIcons name={activity.icon || 'circle-outline'} size={20} color={colors.textPrimary} />
                </View>
                <View style={styles.activityLogDetails}>
                  <View style={styles.activityLogRow}>
                    <Text style={styles.activityLogActor}>{activity.actor}</Text>
                    <Text style={styles.activityLogAction}>{activity.action}</Text>
                  </View>
                  <Text style={styles.activityLogDetail}>{activity.detail}</Text>
                  {activity.score && (
                    <View style={styles.activityLogScoreBadge}>
                      <Text style={styles.activityLogScoreText}>{activity.score}</Text>
                    </View>
                  )}
                  {activity.scoreChange && (
                    <View style={styles.activityLogScoreChangeBadge}>
                      <Text style={styles.activityLogScoreChangeText}>{activity.scoreChange}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.activityLogTime}>{activity.time}</Text>
              </View>
            ))}

            <View style={styles.activityLogFooterInfo}>
              <Text style={styles.activityLogFooterText}>Showing {displayActivityLog.length} recent activities</Text>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={[styles.activityLogFooter, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable style={styles.activityLogCloseButton} onPress={() => setShowActivityLog(false)}>
              <Text style={styles.activityLogCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16 },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 18,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    secondaryBtnText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      backgroundColor: colors.accentTeal,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    tabsScroll: { marginHorizontal: -16 },
    tabsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      marginBottom: 4,
    },
    tab: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginRight: 10,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
    },
    tabActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    tabLabelActive: { color: colors.textPrimary, fontWeight: '800' },
    tabUnderline: {
      display: 'none',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    statIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metaBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statMeta: { fontSize: 11, fontWeight: '800', color: '#10B981' },
    statBody: {
      gap: 2,
    },
    statValue: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
    statTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 15,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    viewAllText: { fontSize: 13, fontWeight: '700', color: '#0a2341' },
    chartWrap: { alignItems: 'center', marginVertical: 10 },
    chart: { borderRadius: 16 },
    velocityFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
    },
    velocityLabel: { fontSize: 10, fontWeight: '800', color: colors.inputPlaceholder, letterSpacing: 0.8 },
    velocityValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
    velocityRight: { alignItems: 'flex-end' },
    leadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      gap: 14,
    },
    leadRowLast: { borderBottomWidth: 0 },
    leadAvatar: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    leadInfo: { flex: 1, gap: 2 },
    leadName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    leadSource: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    leadRight: { alignItems: 'flex-end', gap: 4 },
    scoreBadge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    scoreText: { fontSize: 13, fontWeight: '800', color: '#0a2341' },
    leadScore: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    leadTime: { fontSize: 12, color: colors.inputPlaceholder, fontWeight: '600' },
    cardLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      paddingVertical: 12,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      gap: 6,
    },
    cardLinkText: { fontSize: 14, fontWeight: '700', color: '#0a2341' },
    leadSourceList: {
      flexDirection: 'column',
      gap: 14,
      marginBottom: 24,
    },
    leadSourceCardFull: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    leadSourceMain: {
      flex: 1,
      paddingRight: 16,
    },
    leadSourceHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    leadSourceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 3,
    },
    leadSourceLabel: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    leadSourceValueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    leadSourceValue: {
      fontSize: 32,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    leadSourceMeta: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inputPlaceholder,
    },
    leadSourceMetrics: {
      flexDirection: 'row',
      gap: 10,
    },
    leadSourceMetricBox: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      minWidth: 72,
    },
    leadSourceLabelSmall: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.inputPlaceholder,
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    leadSourceConv: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    leadSourceConvTeal: { color: '#0a2341' },
    roiBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    roiBadgeHigh: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
    roiBadgeLow: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
    leadSourceRoi: {
      fontSize: 13,
      fontWeight: '800',
      color: '#EF4444',
    },
    leadSourceRoiGreen: { color: '#10B981' },
    funnelCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 15,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    funnelTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    funnelBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      marginBottom: 8,
    },
    funnelBarLast: {
      marginBottom: 0,
      borderWidth: 1.5,
      borderColor: 'rgba(11, 160, 178, 0.4)',
    },
    funnelBarLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    funnelValueContainer: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    funnelBarValue: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    heatCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 15,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    heatCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    heatDistributionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 10,
    },
    heatDistributionItem: { flex: 1, alignItems: 'center', gap: 4 },
    heatDistributionPct: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
    heatDistributionSub: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    heatTriggerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 14,
      marginBottom: 8,
      gap: 12,
    },
    heatTriggerRowLast: { marginBottom: 0 },
    triggerIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heatTriggerLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1 },
    heatTriggerPts: { fontSize: 13, fontWeight: '800', color: '#0a2341' },
    sectionsList: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 15,
      elevation: 2,
      marginBottom: 40,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      gap: 14,
      borderRadius: 16,
      marginBottom: 4,
    },
    sectionRowPressed: { backgroundColor: colors.surfaceSoft },
    sectionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionIconWrapActive: {
      backgroundColor: colors.accentTeal,
    },
    sectionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    sectionBadge: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginRight: 4 },
    currentBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    currentBadgeText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
    // Activity Log Modal Styles
    activityLogContainer: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
    },
    activityLogHeader: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    activityLogTitleRow: {
      flexDirection: 'row',
      gap: 12,
      flex: 1,
    },
    activityLogTitleText: {
      flex: 1,
    },
    activityLogTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    activityLogSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },
    activityLogCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityLogScroll: {
      flex: 1,
    },
    activityLogContent: {
      padding: 16,
      gap: 12,
    },
    activityLogItem: {
      flexDirection: 'row',
      padding: 14,
      borderRadius: 12,
      gap: 12,
      alignItems: 'flex-start',
    },
    activityLogIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    activityLogDetails: {
      flex: 1,
      gap: 4,
    },
    activityLogRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    activityLogActor: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    activityLogAction: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    activityLogDetail: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    activityLogScoreBadge: {
      backgroundColor: '#EA580C',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    activityLogScoreText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    activityLogScoreChangeBadge: {
      backgroundColor: '#0a2341',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    activityLogScoreChangeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    activityLogTime: {
      fontSize: 11,
      color: colors.inputPlaceholder,
      fontWeight: '600',
      minWidth: 70,
      textAlign: 'right',
    },
    activityLogFooterInfo: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    activityLogFooterText: {
      fontSize: 12,
      color: colors.inputPlaceholder,
      fontWeight: '600',
    },
    activityLogFooter: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    activityLogCloseButton: {
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    activityLogCloseButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 200,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      paddingVertical: 40,
    },
    errorContainer: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      padding: 16,
      borderRadius: 16,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: '#EF4444',
      fontWeight: '700',
    },
    retryBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#EF4444',
      borderRadius: 10,
    },
    retryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    customChartContainerWrap: {
      backgroundColor: '#F8FAFB',
      borderRadius: 16,
      padding: 16,
      marginVertical: 16,
    },
    customChartContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 180,
    },
    customChartBarCol: {
      alignItems: 'center',
      flex: 1,
    },
    customChartValue: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0a2341',
      marginBottom: 6,
    },
    customChartBarTrack: {
      flex: 1,
      width: 14,
      justifyContent: 'flex-end',
      marginBottom: 8,
    },
    customChartBarFill: {
      width: '100%',
      backgroundColor: '#A5D6D9',
      borderRadius: 4,
      minHeight: 4,
    },
    customChartBarFillToday: {
      backgroundColor: '#0a2341',
    },
    customChartLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#94A3B8',
      width: 40,
      textAlign: 'center',
    },
  });
}