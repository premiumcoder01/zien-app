import { BillingCard, BillingScreenHeader, PlanModal, type BillingTabKey } from '@/components/billing';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UsageRow = {
  label: string;
  used: number;
  limit: number;
  tone: 'primary' | 'warning' | 'muted';
};

type InvoiceRow = {
  id: string;
  billingCycle: string;
  description: string;
  amount: string;
  status: 'paid' | 'due';
};

type TeamRow = {
  id: string;
  memberName: string;
  totalCredits: string;
  primaryAction: string;
  lastActive: string;
};

type AnalyticsLeaderboardRow = {
  id: string;
  name: string;
  initials: string;
  monthlyConsumption: string;
  primaryDomain: string;
  peakActivity: string;
  resourceHealth: number;
  healthColor: string;
};

type MarketplaceItem = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  unit: string;
  category: string;
  icon: string;
};

function formatPercent(used: number, limit: number) {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.max(0, Math.min(1, used / limit));
}


type LedgerRow = {
  id: string;
  settlementDate: string;
  description: string;
  transactionId: string;
  paymentSource: string;
  amount: string;
  status: 'paid' | 'pending';
};

export default function BillingUsageScreen() {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BillingTabKey>('overview');
  const scrollRef = useRef<ScrollView>(null);

  const handleInvoiceDownload = (_invoiceId: string) => {
    // TODO: wire to real invoice PDF URL / file when backend is ready.
  };

  const goToTab = (tab: BillingTabKey) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const [showPlanModal, setShowPlanModal] = useState(false);
  const goToPlans = () => setShowPlanModal(true);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const openSettlementModal = (inv: InvoiceRow) => setSelectedInvoice(inv);
  const closeSettlementModal = () => setSelectedInvoice(null);

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credHolderName, setCredHolderName] = useState('John Olakoya');
  const [credCardNumber, setCredCardNumber] = useState('**** **** **** 4242');
  const [credExpiry, setCredExpiry] = useState('12/26');
  const [credCvc, setCredCvc] = useState('');
  const openCredentialsModal = () => setShowCredentialsModal(true);
  const closeCredentialsModal = () => {
    Keyboard.dismiss();
    setShowCredentialsModal(false);
  };
  const handleAuthorizeUpdate = () => {
    Keyboard.dismiss();
    setShowCredentialsModal(false);
    // TODO: submit to backend
  };

  const [acquireModalItem, setAcquireModalItem] = useState<MarketplaceItem | null>(null);
  const [settlementConfirmedVisible, setSettlementConfirmedVisible] = useState(false);
  const openAcquireModal = (item: MarketplaceItem) => setAcquireModalItem(item);
  const closeAcquireModal = () => setAcquireModalItem(null);
  const handleAuthorizeCapitalRelease = () => {
    closeAcquireModal();
    setSettlementConfirmedVisible(true);
  };
  const closeSettlementConfirmed = () => setSettlementConfirmedVisible(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const openCancelModal = () => setShowCancelModal(true);
  const closeCancelModal = () => setShowCancelModal(false);
  const referenceNo = (id: string) => 'INV-' + id.replace(/^inv-/, '').toUpperCase();

  const usageRows = useMemo<UsageRow[]>(
    () => [
      { label: 'AI Visual Enhancement', used: 420, limit: 1000, tone: 'primary' },
      { label: 'Virtual Staging Studio', used: 12, limit: 50, tone: 'warning' },
      { label: 'Neighborhood Intelligence', used: 85, limit: 200, tone: 'muted' },
    ],
    []
  );

  const invoices = useMemo<InvoiceRow[]>(
    () => [
      { id: 'inv-2026-01', billingCycle: 'Jan 01, 2026', description: 'Pro Team Monthly - 10 Seats', amount: '$249.00', status: 'paid' },
      { id: 'inv-2025-12', billingCycle: 'Dec 01, 2025', description: 'Pro Team Monthly - 10 Seats', amount: '$249.00', status: 'paid' },
      { id: 'inv-2025-11', billingCycle: 'Nov 01, 2025', description: 'Pro Team Monthly - 10 Seats', amount: '$249.00', status: 'paid' },
    ],
    []
  );

  const teamRows = useMemo<TeamRow[]>(
    () => [
      { id: 'm-1', memberName: 'Jane Smith', totalCredits: '4,200', primaryAction: 'Staging', lastActive: '2m ago' },
      { id: 'm-2', memberName: 'Mike Johnson', totalCredits: '1,850', primaryAction: 'Open House', lastActive: '1h ago' },
      { id: 'm-3', memberName: 'Sarah Lee', totalCredits: '1,120', primaryAction: 'Image Gen', lastActive: '4h ago' },
    ],
    []
  );

  const marketplaceItems = useMemo<MarketplaceItem[]>(
    () => [
      {
        id: 'svc-virtual-staging',
        title: 'Virtual Staging Pro',
        subtitle: 'Transform empty spaces with high-end designer furniture templates.',
        price: '$2.99',
        unit: 'per room',
        category: 'VISUALS',
        icon: 'home-outline',
      },
      {
        id: 'svc-neighborhood',
        title: 'AI Neighborhood Insight',
        subtitle: 'Custom demographics and school data reports for listing packages.',
        price: '$5.00',
        unit: 'per zip',
        category: 'INTELLIGENCE',
        icon: 'map-marker-outline',
      },
      {
        id: 'svc-brochure',
        title: 'Luxury Brochure Pack',
        subtitle: 'Premium print-ready marketing materials with custom branding.',
        price: '$15.00',
        unit: '10 designs',
        category: 'MARKETING',
        icon: 'file-document-outline',
      },
      {
        id: 'svc-seat',
        title: 'Team Seat Expansion',
        subtitle: 'Add an additional seat for a temporary agent or assistant.',
        price: '$15.00',
        unit: 'per month',
        category: 'SCALE',
        icon: 'plus',
      },
    ],
    []
  );

  const availableCapital = '$1,248.50';

  const ledgerRows = useMemo<LedgerRow[]>(
    () => [
      { id: '1', settlementDate: 'Jan 01, 2026', description: 'Pro Team Monthly - 10 Seats', transactionId: 'INV-2026-001', paymentSource: 'Visa .... 4242', amount: '$249.00', status: 'paid' },
      { id: '2', settlementDate: 'Dec 01, 2025', description: 'Pro Team Monthly - 10 Seats', transactionId: 'INV-2025-012', paymentSource: 'Visa .... 4242', amount: '$249.00', status: 'paid' },
      { id: '3', settlementDate: 'Nov 01, 2025', description: 'Professional Monthly - 2 Seats', transactionId: 'INV-2025-011', paymentSource: 'Visa .... 4242', amount: '$99.00', status: 'paid' },
    ],
    []
  );

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.cardBackground,
      backgroundGradientTo: colors.cardBackground,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(11, 160, 178, ${opacity})`,
      labelColor: (opacity = 1) => colors.textSecondary,
      fillShadowGradientFrom: colors.accentTeal,
      fillShadowGradientTo: colors.accentDark ?? '#1B5E9A',
      fillShadowGradientOpacity: 1,
      barPercentage: 0.65,
      propsForBackgroundLines: {
        stroke: colors.divider,
        strokeDasharray: '4 6',
      },
    }),
    [colors]
  );

  const consumptionTrendMonthly = useMemo(
    () => ({
      labels: ['Jan 01', 'Jan 05', 'Jan 10', 'Jan 15', 'Jan 20', 'Jan 25', 'Jan 30'],
      datasets: [{ data: [450, 780, 320, 950, 640, 820, 560] }],
    }),
    []
  );

  const consumptionTrendYearly = useMemo(
    () => ({
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{ data: [2840, 3120, 2680, 2950] }],
    }),
    []
  );

  const allocationPieData = useMemo(
    () => [
      { name: 'Visual Staging', population: 75, color: '#0a2341', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: 'Market Insight', population: 15, color: '#F97316', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: 'Other Ops', population: 10, color: isDark ? '#0a2341' : '#0B2D3E', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    ],
    []
  );

  const analyticsLeaderboardRows = useMemo<AnalyticsLeaderboardRow[]>(
    () => [
      { id: 'lb-1', name: 'Sarah Thompson', initials: 'ST', monthlyConsumption: '4,280 Units', primaryDomain: 'Visual Staging', peakActivity: 'Tuesdays', resourceHealth: 92, healthColor: '#0a2341' },
      { id: 'lb-2', name: 'Michael Chen', initials: 'MC', monthlyConsumption: '2,150 Units', primaryDomain: 'Flyer Design', peakActivity: 'Mondays', resourceHealth: 45, healthColor: '#F97316' },
      { id: 'lb-3', name: 'Elena Rodriguez', initials: 'ER', monthlyConsumption: '1,890 Units', primaryDomain: 'Direct Outreach', peakActivity: 'Fridays', resourceHealth: 78, healthColor: isDark ? '#0a2341' : '#0B2D3E' },
      { id: 'lb-4', name: 'David Smith', initials: 'DS', monthlyConsumption: '940 Units', primaryDomain: 'CRM Sync', peakActivity: 'Daily', resourceHealth: 98, healthColor: '#0a2341' },
    ],
    []
  );

  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'monthly' | 'yearly'>('monthly');
  const [leaderboardFilter, setLeaderboardFilter] = useState('');
  const filteredLeaderboardRows = useMemo(
    () =>
      leaderboardFilter.trim()
        ? analyticsLeaderboardRows.filter(
          (r) =>
            r.name.toLowerCase().includes(leaderboardFilter.toLowerCase().trim()) ||
            r.primaryDomain.toLowerCase().includes(leaderboardFilter.toLowerCase().trim())
        )
        : analyticsLeaderboardRows,
    [analyticsLeaderboardRows, leaderboardFilter]
  );

  const renderHistory = () => (
    <View style={{ gap: 16 }}>
      <BillingCard>
        <Text style={styles.cardTitle}>Full Financial Ledger</Text>
        <View style={styles.historyActions}>
          <Pressable style={styles.exportButton}>
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </Pressable>
          <Pressable style={styles.exportButton}>
            <Text style={styles.exportButtonText}>Date Range</Text>
          </Pressable>
        </View>
        <View style={styles.ledgerList}>
          {ledgerRows.map((row, index) => (
            <View key={row.id} style={[styles.ledgerRow, index === 0 && styles.ledgerRowFirst]}>
              <Pressable
                style={styles.ledgerRowMain}
                onPress={() =>
                  openSettlementModal({
                    id: row.id,
                    billingCycle: row.settlementDate,
                    description: row.description,
                    amount: row.amount,
                    status: row.status === 'pending' ? 'due' : 'paid',
                  })
                }
              >
                <Text style={styles.ledgerDate}>{row.settlementDate}</Text>
                <Text style={styles.ledgerDesc} numberOfLines={1}>{row.description}</Text>
                <Pressable onPress={() => { }}>
                  <Text style={styles.ledgerId}>{row.transactionId}</Text>
                </Pressable>
                <Text style={styles.ledgerSource}>{row.paymentSource}</Text>
                <View style={styles.ledgerRowMeta}>
                  <Text style={styles.ledgerAmount}>{row.amount}</Text>
                  <View style={[styles.statusPill, row.status === 'paid' ? styles.statusPaid : styles.statusDue]}>
                    <Text style={[styles.statusText, row.status === 'paid' ? styles.statusTextPaid : styles.statusTextDue]}>
                      {row.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <Pressable onPress={() => handleInvoiceDownload(row.id)} style={styles.downloadPdfButton}>
                <MaterialCommunityIcons name="download" size={20} color={'#FFFFFF'} />
                <Text style={styles.downloadPdfButtonText}>PDF</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </BillingCard>
    </View>
  );

  const renderOverview = () => (
    <View style={{ gap: 20 }}>
      {/* Premium Plan Card */}
      <View style={styles.premiumPlanCard}>
        <View style={styles.planBadgeContainer}>
          <View style={styles.activePillContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.activePillText}>ENTERPRISE ACTIVE</Text>
          </View>
          <View style={styles.tierIconContainer}>
            <MaterialCommunityIcons name="diamond-stone" size={24} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.planInfoMain}>
          <Text style={styles.planTierTitle}>Enterprise Team Edition</Text>
          <View style={styles.planPriceRow}>
            <Text style={styles.planPriceValue}>$249.95</Text>
            <Text style={styles.planPricePeriod}>/monthly cycle</Text>
          </View>
        </View>

        <View style={styles.planDivider} />

        <View style={styles.planFeaturesGrid}>
          <View style={styles.planFeatureDetail}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#0a2341" />
            <Text style={styles.planFeatureDetailText}>10 Authorized Seats</Text>
          </View>
          <View style={styles.planFeatureDetail}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#0a2341" />
            <Text style={styles.planFeatureDetailText}>Full Sync Engine</Text>
          </View>
          <View style={[styles.planFeatureDetail, { width: '100%', marginTop: 4 }]}>
            <MaterialCommunityIcons name="calendar-sync" size={18} color="#7B8794" />
            <Text style={styles.planRenewalText}>Next Renewal: Feb 12, 2026</Text>
          </View>
        </View>

        <View style={styles.planActionContainer}>
          <Pressable style={styles.premiumManageBtn} onPress={goToPlans}>
            <Text style={styles.premiumManageBtnText}>Manage Enterprise Tier</Text>
          </Pressable>
          <Pressable style={styles.cancelSubBtn} onPress={openCancelModal}>
            <Text style={styles.cancelSubBtnText}>Cancel Subscription</Text>
          </Pressable>
        </View>
      </View>

      {/* Resource Consumption Architecture */}
      <View style={styles.premiumResourceCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.premiumCardTitle}>Resource Consumption</Text>
            <Text style={styles.premiumCardSubtitle}>Real-time Audit</Text>
          </View>
          <MaterialCommunityIcons name="chart-box-outline" size={24} color="#0a2341" />
        </View>

        <View style={styles.usageListContainer}>
          {usageRows.map((row) => (
            <View key={row.label} style={styles.premiumUsageRow}>
              <View style={styles.usageInfoTop}>
                <Text style={styles.usageLabelText}>{row.label}</Text>
                <Text style={styles.usageValueText}>
                  {row.used} <Text style={styles.usageLimitText}>/ {row.limit}</Text>
                </Text>
              </View>
              <View style={styles.premiumProgressTrack}>
                <View
                  style={[
                    styles.premiumProgressFill,
                    {
                      width: `${(row.used / row.limit) * 100}%`,
                      backgroundColor: row.tone === 'warning' ? '#F97316' : '#0a2341'
                    }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.autoReplenishCard}>
          <View style={styles.autoReplenishInfo}>
            <View style={styles.replenishIconWrap}>
              <MaterialCommunityIcons name="cached" size={20} color="#0a2341" />
            </View>
            <View>
              <Text style={styles.replenishTitle}>Auto-Replenish Active</Text>
              <Text style={styles.replenishSub}>Top up when below 10%</Text>
            </View>
          </View>
          <Pressable style={styles.replenishAdjustBtn}>
            <Text style={styles.replenishAdjustBtnText}>Adjust</Text>
          </Pressable>
        </View>
      </View>

      {/* Financial History Preview */}
      <View style={styles.historyPreviewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Financial History & Billing</Text>
          <Pressable onPress={() => goToTab('history')} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All Ledger</Text>
          </Pressable>
        </View>

        <View style={styles.previewList}>
          {invoices.map((inv) => (
            <Pressable key={inv.id} style={styles.previewItem} onPress={() => openSettlementModal(inv)}>
              <View style={styles.previewItemLeft}>
                <Text style={styles.previewItemDate}>{inv.billingCycle}</Text>
                <Text style={styles.previewItemDesc} numberOfLines={1}>{inv.description}</Text>
              </View>
              <View style={styles.previewItemRight}>
                <Text style={styles.previewItemAmount}>{inv.amount}</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>PAID</Text>
                </View>
              </View>
              <Pressable style={styles.previewDownloadBtn} onPress={(e) => { e.stopPropagation(); handleInvoiceDownload(inv.id); }}>
                <MaterialCommunityIcons name="file-pdf-box" size={24} color="#7B8794" />
              </Pressable>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Primary Payment Architecture */}
      <View style={styles.premiumPaymentCard}>
        <Text style={styles.paymentSectionHeader}>PRIMARY PAYMENT ARCHITECTURE</Text>

        <View style={styles.visualCardContainer}>
          <LinearGradient
            colors={['#0B2D3E', '#1B5E9A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.virtualCreditCard}
          >
            <View style={styles.vCardHeader}>
              <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color="#D1D5DB" />
              <MaterialCommunityIcons name="wifi" size={24} color="#D1D5DB" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>
            <Text style={styles.vCardNumber}>**** **** **** 4242</Text>
            <View style={styles.vCardFooter}>
              <View>
                <Text style={styles.vCardLabel}>CARD HOLDER</Text>
                <Text style={styles.vCardValue}>JOHN OLAKOYA</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.vCardLabel}>EXPIRES</Text>
                <Text style={styles.vCardValue}>12 / 26</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.paymentActionsRow}>
          <Pressable style={styles.paymentActionButton} onPress={openCredentialsModal}>
            <MaterialCommunityIcons name="credit-card-settings-outline" size={20} color="#0a2341" />
            <Text style={styles.paymentActionText}>Update Credentials</Text>
          </Pressable>
          <Pressable style={styles.paymentActionButton}>
            <MaterialCommunityIcons name="shield-plus-outline" size={20} color="#0a2341" />
            <Text style={styles.paymentActionText}>Add Backup</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderAnalytics = () => {
    const chartWidth = Math.max(280, Dimensions.get('window').width - 18 * 2 - 32);
    const consumptionData = analyticsTimeRange === 'monthly' ? consumptionTrendMonthly : consumptionTrendYearly;
    return (
      <View style={{ gap: 16 }}>
        <BillingCard>
          <View style={styles.analyticsCardHeader}>
            <View style={styles.analyticsCardHeaderTitle}>
              <Text style={styles.cardTitle}>Credit Consumption Trends</Text>
              <Text style={styles.cardSubtitle}>Resource utilization across all team members.</Text>
            </View>

          </View>
          <View style={styles.analyticsToggleRow}>
            <Pressable
              style={[styles.analyticsToggleBtn, analyticsTimeRange === 'monthly' && styles.analyticsToggleBtnActive]}
              onPress={() => setAnalyticsTimeRange('monthly')}
            >
              <Text style={[styles.analyticsToggleText, analyticsTimeRange === 'monthly' && styles.analyticsToggleTextActive]}>Monthly</Text>
            </Pressable>
            <Pressable
              style={[styles.analyticsToggleBtn, analyticsTimeRange === 'yearly' && styles.analyticsToggleBtnActive]}
              onPress={() => setAnalyticsTimeRange('yearly')}
            >
              <Text style={[styles.analyticsToggleText, analyticsTimeRange === 'yearly' && styles.analyticsToggleTextActive]}>Yearly</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: 14, alignItems: 'center' }}>
            <BarChart
              data={consumptionData}
              width={chartWidth}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars={true}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          </View>
        </BillingCard>

        <View style={[styles.twoCol, styles.twoColMobile]}>
          <BillingCard>
            <Text style={styles.cardTitle}>Sub-Account Allocation</Text>
            <View style={styles.allocationCenterLabel}>
              <Text style={styles.allocationCenterValue}>10k</Text>
              <Text style={styles.allocationCenterUnit}>TOTAL UNITS</Text>
            </View>
            <View style={styles.allocationChartWrap}>
              <PieChart
                data={allocationPieData}
                width={Math.min(chartWidth * 0.9, 260)}
                height={160}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                center={[0, 0]}
                hasLegend={true}
                absolute={false}
              />
            </View>
          </BillingCard>

          <BillingCard style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Team Efficiency Leaderboard</Text>
            <View style={styles.leaderboardSearchWrap}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.leaderboardSearchInput}
                placeholder="Filter by agent..."
                placeholderTextColor={isDark ? '#64748B' : Theme.inputPlaceholder}
                value={leaderboardFilter}
                onChangeText={setLeaderboardFilter}
              />
            </View>
            <View style={styles.leaderboardCardList}>
              {filteredLeaderboardRows.length === 0 ? (
                <Text style={styles.leaderboardEmpty}>No agents match your search.</Text>
              ) : (
                filteredLeaderboardRows.map((row) => (
                  <View key={row.id} style={styles.leaderboardAgentCard}>
                    <View style={styles.leaderboardAgentCardHeader}>
                      <View style={[styles.leaderboardInitials, { backgroundColor: isDark ? '#0a2341' : '#0B2D3E' }]}>
                        <Text style={styles.leaderboardInitialsText}>{row.initials}</Text>
                      </View>
                      <Text style={styles.leaderboardAgentCardName}>{row.name}</Text>
                    </View>
                    <View style={styles.leaderboardAgentCardRow}>
                      <Text style={styles.leaderboardAgentCardLabel}>Monthly consumption</Text>
                      <Text style={styles.leaderboardAgentCardValue}>{row.monthlyConsumption}</Text>
                    </View>
                    <View style={styles.leaderboardAgentCardRow}>
                      <Text style={styles.leaderboardAgentCardLabel}>Primary domain</Text>
                      <Text style={styles.leaderboardAgentCardValue}>{row.primaryDomain}</Text>
                    </View>
                    <View style={styles.leaderboardAgentCardRow}>
                      <Text style={styles.leaderboardAgentCardLabel}>Peak activity</Text>
                      <Text style={styles.leaderboardAgentCardValue}>{row.peakActivity}</Text>
                    </View>
                    <View style={styles.leaderboardAgentCardRow}>
                      <Text style={styles.leaderboardAgentCardLabel}>Resource health</Text>
                      <View style={styles.leaderboardAgentCardHealth}>
                        <View style={styles.leaderboardHealthTrack}>
                          <View style={[styles.leaderboardHealthFill, { width: `${row.resourceHealth}%`, backgroundColor: row.healthColor }]} />
                        </View>
                        <Text style={styles.leaderboardHealthPct}>{row.resourceHealth}%</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </BillingCard>
        </View>
      </View>
    );
  };

  const renderMarketplace = () => (
    <View style={styles.marketplaceSection}>
      <View style={styles.marketplaceHeader}>
        <View style={styles.marketplaceHeaderText}>
          <Text style={styles.marketplaceTitle}>Premium Service Studio</Text>
          <Text style={styles.marketplaceSubtitle}>Acquire specialized AI resources for immediate professional deployment.</Text>
        </View>

      </View>
      <View style={styles.availableCapitalPill}>
        <MaterialCommunityIcons name="wallet-outline" size={18} color={colors.textPrimary} />
        <View>
          <Text style={styles.availableCapitalLabel}>AVAILABLE CAPITAL</Text>
          <Text style={styles.availableCapitalValue}>{availableCapital}</Text>
        </View>
      </View>

      <View style={styles.marketplaceCardList}>
        {marketplaceItems.map((item) => (
          <View key={item.id} style={styles.marketplaceServiceCard}>
            <View style={styles.marketplaceCardTop}>
              <View style={styles.marketplaceCardIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color={colors.textSecondary} />
              </View>
              <View style={styles.marketplaceCategoryTag}>
                <Text style={styles.marketplaceCategoryText}>{item.category}</Text>
              </View>
            </View>
            <Text style={styles.marketplaceServiceTitle}>{item.title}</Text>
            <Text style={styles.marketplaceServiceDesc}>{item.subtitle}</Text>
            <View style={styles.marketplacePriceRow}>
              <Text style={styles.marketplacePrice}>{item.price}</Text>
              <Text style={styles.marketplaceUnit}> {item.unit}</Text>
            </View>
            <Pressable style={styles.marketplaceAcquireBtn} onPress={() => openAcquireModal(item)}>
              <MaterialCommunityIcons name="cart-outline" size={20} color={'#FFFFFF'} />
              <Text style={styles.marketplaceAcquireBtnText}>Acquire Service</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.marketplaceBundlesSection}>
        <Text style={styles.marketplaceBundlesTag}>PRO PARTNERSHIP</Text>
        <Text style={styles.marketplaceBundlesTitle}>Brokerage Scale Bundles</Text>
        <Text style={styles.marketplaceBundlesDesc}>
          Deploy high-volume AI infrastructure across your entire team. Volume licensing includes custom support and dedicated compute resource allocation.
        </Text>
        <Pressable style={styles.marketplaceBundlesBtn} onPress={() => { }}>
          <Text style={styles.marketplaceBundlesBtnText}>View Enterprise Bundles</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'history':
        return renderHistory();
      case 'analytics':
        return renderAnalytics();
      case 'marketplace':
        return renderMarketplace();
      default:
        return renderOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, chartConfig, usageRows, invoices, teamRows, marketplaceItems, ledgerRows, analyticsTimeRange, leaderboardFilter, filteredLeaderboardRows, consumptionTrendMonthly, consumptionTrendYearly, allocationPieData]);

  return (
    <>
      <LinearGradient
        colors={(isDark ? ['#0B101E', '#101B28'] : [...Theme.backgroundGradient]) as any}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.background, { paddingTop: insets.top }]}>
        <BillingScreenHeader activeTab={activeTab} onTabChange={goToTab} />
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {tabContent}
        </ScrollView>
      </LinearGradient>
      <PlanModal visible={showPlanModal} onClose={() => setShowPlanModal(false)} />

      <Modal visible={selectedInvoice !== null} transparent animationType="fade">
        <Pressable style={styles.settlementModalOverlay} onPress={closeSettlementModal}>
          <Pressable style={styles.settlementModalCard} onPress={(e) => e.stopPropagation()}>
            {selectedInvoice && (
              <>
                <View style={styles.settlementModalHeader}>
                  <View>
                    <Text style={styles.settlementModalTitle}>Official Settlement</Text>
                    <Text style={styles.settlementModalRef}>Reference No: {referenceNo(selectedInvoice.id)}</Text>
                  </View>
                  <Pressable onPress={closeSettlementModal} style={styles.settlementModalClose} hitSlop={12}>
                    <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.settlementModalBody}>
                  <View style={styles.settlementBillRow}>
                    <View>
                      <Text style={styles.settlementLabel}>BILL TO</Text>
                      <Text style={styles.settlementValue}>John Olakoya</Text>
                      <Text style={styles.settlementSubValue}>Zien Real Estate Group</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.settlementLabel}>ISSUE DATE</Text>
                      <Text style={styles.settlementValue}>{selectedInvoice.billingCycle}</Text>
                    </View>
                  </View>

                  <View style={styles.settlementInvoiceBox}>
                    <View style={styles.settlementLineRow}>
                      <Text style={styles.settlementLineDesc}>{selectedInvoice.description}</Text>
                      <Text style={styles.settlementLineAmount}>{selectedInvoice.amount}</Text>
                    </View>
                    <View style={styles.settlementInvoiceDivider} />
                    <View style={[styles.settlementLineRow, { marginBottom: 12 }]}>
                      <Text style={styles.settlementLineDescMuted}>Tax (0.00%)</Text>
                      <Text style={styles.settlementLineAmount}>$0.00</Text>
                    </View>
                    <View style={styles.settlementLineRow}>
                      <Text style={styles.settlementTotalLabel}>Total Amount Paid</Text>
                      <Text style={styles.settlementTotalAmount}>{selectedInvoice.amount}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.settlementModalFooter}>
                  <Pressable style={styles.settlementDownloadBtn} onPress={() => { handleInvoiceDownload(selectedInvoice.id); closeSettlementModal(); }}>
                    <Text style={styles.settlementDownloadBtnText}>Download Document</Text>
                    <MaterialCommunityIcons name="download-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                  <Pressable style={styles.settlementCloseBtn} onPress={closeSettlementModal}>
                    <Text style={styles.settlementCloseBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCredentialsModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalFullContainer, { paddingTop: insets.top }]}>
            <View style={styles.modalHeaderFull}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitleFull}>Security Architecture</Text>
                <Text style={styles.modalSubtitleFull}>Update your primary settlement credentials.</Text>
              </View>
              <Pressable onPress={closeCredentialsModal} style={styles.modalCloseBtnFull} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={24} color="#0B2D3E" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScrollBody}
              contentContainerStyle={styles.credentialsFormBody}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Account Holder Name</Text>
                <TextInput
                  style={styles.premiumInput}
                  value={credHolderName}
                  onChangeText={setCredHolderName}
                  placeholder="John Olakoya"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Primary Card Number</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.premiumInputFlex}
                    value={credCardNumber}
                    onChangeText={setCredCardNumber}
                    placeholder="**** **** **** 4242"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                  />
                  <View style={styles.cardTypeIcon}>
                    <MaterialCommunityIcons name="credit-card" size={20} color="#0B2D3E" />
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Expiration Date</Text>
                  <TextInput
                    style={styles.premiumInput}
                    value={credExpiry}
                    onChangeText={setCredExpiry}
                    placeholder="12/26"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Security Code (CVC)</Text>
                  <TextInput
                    style={styles.premiumInput}
                    value={credCvc}
                    onChangeText={setCredCvc}
                    placeholder="..."
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.securityAuditPill}>
                <View style={styles.securityBadgeWrap}>
                  <MaterialCommunityIcons name="shield-check-outline" size={22} color="#0B2D3E" />
                </View>
                <Text style={styles.securityAuditText}>
                  Payments are secured with 256-bit bank-grade encryption. Zien never stores your full CVV on our servers.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalFooterFixed, { paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.footerBtnGroup}>
                <Pressable style={styles.authorizeBtn} onPress={handleAuthorizeUpdate}>
                  <Text style={styles.authorizeBtnText}>Authorize Update</Text>
                </Pressable>
                <Pressable style={styles.cancelActionBtn} onPress={closeCredentialsModal}>
                  <Text style={styles.cancelActionBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={acquireModalItem !== null} transparent animationType="fade">
        <View style={styles.secureAccessModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAcquireModal} />
          <View style={styles.secureAccessModalCard}>
            <View style={styles.secureAccessModalHeader}>
              <Text style={styles.secureAccessModalTitle}>Secure Access</Text>
              <Pressable onPress={closeAcquireModal} style={styles.secureAccessModalClose} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
            {acquireModalItem && (
              <>
                <View style={styles.secureAccessServiceCard}>
                  <View style={styles.marketplaceCardIcon}>
                    <MaterialCommunityIcons name={acquireModalItem.icon as any} size={22} color={colors.textSecondary} />
                  </View>
                  <View style={styles.secureAccessServiceInfo}>
                    <Text style={styles.secureAccessServiceName}>{acquireModalItem.title}</Text>
                    <Text style={styles.secureAccessServiceMeta}>System Allocation: Immediate</Text>
                  </View>
                  <Text style={styles.secureAccessServicePrice}>{acquireModalItem.price}</Text>
                </View>
                <View style={styles.secureAccessTotalRow}>
                  <Text style={styles.secureAccessTotalLabel}>Total Settlement Due</Text>
                  <Text style={styles.secureAccessTotalValue}>{acquireModalItem.price}</Text>
                </View>
                <Text style={styles.secureAccessPaymentLabel}>Confirm Payment Architecture</Text>
                <View style={styles.secureAccessPaymentRow}>
                  <MaterialCommunityIcons name="credit-card" size={22} color={Theme.iconMuted} />
                  <Text style={styles.secureAccessPaymentText}>Visa **** 4242</Text>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#16A34A" />
                </View>
                <Pressable style={styles.secureAccessAuthorizeBtn} onPress={handleAuthorizeCapitalRelease}>
                  <Text style={styles.secureAccessAuthorizeBtnText}>Authorize Capital Release</Text>
                  <MaterialCommunityIcons name="arrow-top-right" size={20} color={'#FFFFFF'} />
                </Pressable>
                <Text style={styles.secureAccessDisclaimer}>By confirming, you authorize ZIEN to process this one-time transaction.</Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={settlementConfirmedVisible} transparent animationType="fade">
        <View style={styles.settlementConfirmedOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSettlementConfirmed} />
          <View style={styles.settlementConfirmedCard}>
            <View style={styles.settlementConfirmedIcon}>
              <MaterialCommunityIcons name={'sparkles' as any} size={32} color={'#FFFFFF'} />
            </View>
            <Text style={styles.settlementConfirmedTitle}>Settlement Confirmed</Text>
            <Text style={styles.settlementConfirmedDesc}>
              Your resource allocation has been updated and capital has been authorized for release.
            </Text>
            <Pressable style={styles.settlementConfirmedBtn} onPress={closeSettlementConfirmed}>
              <Text style={styles.settlementConfirmedBtnText}>Return to Dashboard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.cancelModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCancelModal} />
          <View style={styles.cancelModalCard}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>Cancel Subscription?</Text>
              <Pressable onPress={closeCancelModal} style={styles.cancelModalClose} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={22} color="#0B2D3E" />
              </Pressable>
            </View>
            <Text style={styles.cancelModalDesc}>
              If you cancel, your Professional Agent Seats and CRM Sync features will remain active until the end of your
              current billing cycle on <Text style={{ fontWeight: '900', color: colors.textPrimary }}>Feb 12, 2026</Text>. After that,
              your account will be downgraded to the basic free tier.
            </Text>
            <View style={styles.cancelModalFooter}>
              <Pressable style={styles.keepSubBtn} onPress={closeCancelModal}>
                <Text style={styles.keepSubBtnText}>Keep Subscription</Text>
              </Pressable>
              <Pressable style={styles.confirmCancelBtn} onPress={closeCancelModal}>
                <Text style={styles.confirmCancelBtnText}>Confirm Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 16,
  },
  twoCol: {
    gap: 16,
  },
  twoColMobile: {
    flexDirection: 'column' as const,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  exportButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : Theme.surfaceSoft,
  },
  exportButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ledgerList: {
    marginTop: 16,
    gap: 0,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  ledgerRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  ledgerRowMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  ledgerRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  ledgerDate: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  ledgerDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  ledgerId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a2341',
  },
  ledgerSource: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ledgerAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  downloadIconButton: {
    padding: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 4,
  },
  linkText: {
    fontSize: 12.5,
    color: '#0a2341',
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.cardBackgroundSoft,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a2341',
  },
  planPriceUnit: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  planFeatureList: {
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planFeatureText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activeBadge: {
    backgroundColor: colors.cardBackgroundSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  resourceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resourceSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  autoReplenishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  autoReplenishLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoReplenishIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.cardBackgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoReplenishTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  autoReplenishSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adjustButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : Theme.surfaceSoft,
  },
  adjustButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  financialSection: {
    gap: 10,
  },
  financialSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billingHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  billingHistoryRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  billingHistoryRowMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  billingHistoryRowDate: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  billingHistoryRowDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  billingHistoryRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  billingHistoryRowAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  downloadPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0a2341',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 72,
  },
  downloadPdfButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  billingTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  billingTableHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  billingTableDescCol: {
    flex: 1,
    minWidth: 0,
  },
  billingTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  pdfDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pdfDownloadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a2341',
  },
  paymentArchitectureTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  paymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  paymentExpiry: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  planMetaGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  planMetaItem: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  metaLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  metaValue: {
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  usageRow: {
    gap: 10,
  },
  usageRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  usageLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  usageValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 999,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF4',
  },
  invoiceLeft: {
    flex: 1,
    gap: 6,
  },
  invoiceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  invoiceCycle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  invoiceDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    minWidth: 72,
    textAlign: 'right',
  },
  billingList: {
    marginTop: 12,
    gap: 12,
  },
  billingItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    gap: 12,
  },
  billingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  billingDate: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  billingDesc: {
    marginTop: 4,
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '700',
    lineHeight: 17,
  },
  billingRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  billingAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  invoiceDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  invoiceDownloadIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 160, 178, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(11, 160, 178, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceDownloadTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  invoiceDownloadSub: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusPaid: {
    backgroundColor: 'rgba(11, 160, 178, 0.15)',
    borderColor: 'rgba(11, 160, 178, 0.2)',
  },
  statusDue: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  statusTextPaid: {
    color: '#0a2341',
  },
  statusTextDue: {
    color: '#B45309',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  paymentSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  // Premium Overview Styles
  premiumPlanCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.15)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: isDark ? '#22C55E' : '#166534',
    letterSpacing: 0.5,
  },
  tierIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfoMain: {
    marginBottom: 20,
  },
  planTierTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 6,
  },
  planPriceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  planPricePeriod: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  planDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginBottom: 20,
  },
  planFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  planFeatureDetail: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureDetailText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planRenewalText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  planActionContainer: {
    gap: 12,
  },
  premiumManageBtn: {
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumManageBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelSubBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelSubBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },

  premiumResourceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  premiumCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  premiumCardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  usageListContainer: {
    gap: 20,
    marginBottom: 24,
  },
  premiumUsageRow: {
    gap: 10,
  },
  usageInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  usageLabelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  usageValueText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  usageLimitText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  premiumProgressTrack: {
    height: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  premiumProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  autoReplenishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 160, 178, 0.05)',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  autoReplenishInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replenishIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 160, 178, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replenishTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  replenishSub: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
  },
  replenishAdjustBtn: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  replenishAdjustBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  historyPreviewContainer: {
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0a2341',
  },
  previewList: {
    gap: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewItemLeft: {
    flex: 1,
    gap: 2,
  },
  previewItemDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  previewItemDesc: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  previewItemRight: {
    alignItems: 'flex-end',
    marginRight: 16,
    gap: 4,
  },
  previewItemAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  paidBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: isDark ? '#22C55E' : '#166534',
  },
  previewDownloadBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.cardBorder,
  },

  premiumPaymentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  paymentSectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 20,
  },
  visualCardContainer: {
    marginBottom: 24,
  },
  virtualCreditCard: {
    borderRadius: 20,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  vCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vCardNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  vCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  vCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  vCardValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  paymentActionsRow: {
    gap: 12,
  },
  paymentActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.cardBorder,
  },
  paymentActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  outlineButton: {
    marginTop: 6,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 12.5,
  },
  chart: {
    borderRadius: 18,
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  analyticsCardHeaderTitle: {
    flex: 1,
    minWidth: 0,
  },
  analyticsToggleRow: {
    flexDirection: 'row',
    gap: 5,
    flexShrink: 0,
    alignSelf: "flex-end"
  },
  analyticsToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : Theme.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsToggleBtnActive: {
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    borderColor: isDark ? '#0a2341' : '#0B2D3E',
  },
  analyticsToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  analyticsToggleTextActive: {
    color: '#FFFFFF',
  },
  allocationChartWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  allocationCenterLabel: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  allocationCenterValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  allocationCenterUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  leaderboardSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  leaderboardSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  leaderboardCardList: {
    gap: 12,
    marginTop: 4,
  },
  leaderboardEmpty: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  leaderboardAgentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 12,
  },
  leaderboardAgentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  leaderboardAgentCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  leaderboardAgentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leaderboardAgentCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  leaderboardAgentCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leaderboardAgentCardHealth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
  },
  leaderboardTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  leaderboardTh: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  leaderboardThAgent: {
    flex: 1.2,
    minWidth: 0,
  },
  leaderboardThNarrow: {
    flex: 0.7,
    minWidth: 0,
  },
  leaderboardThDomain: {
    flex: 0.9,
    minWidth: 0,
  },
  leaderboardThPeak: {
    flex: 0.6,
    minWidth: 0,
  },
  leaderboardThHealth: {
    flex: 0.8,
    minWidth: 0,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  leaderboardAgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.2,
    minWidth: 0,
  },
  leaderboardInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardInitialsText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  leaderboardName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  leaderboardCell: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  leaderboardHealthCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardHealthTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : Theme.surfaceIcon,
    overflow: 'hidden',
    flex: 1,
    minWidth: 40,
  },
  leaderboardHealthFill: {
    height: 8,
    borderRadius: 4,
  },
  leaderboardHealthPct: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 6,
    minWidth: 28,
  },
  tableHeader: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF4',
  },
  teamName: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  teamMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  teamCredits: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0a2341',
  },
  marketTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  marketPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0a2341',
  },
  marketUnit: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '800',
  },
  marketplaceSection: {
    gap: 20,
  },
  marketplaceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  marketplaceHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  marketplaceTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  marketplaceSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  availableCapitalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignSelf: "flex-end"
  },
  availableCapitalLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  availableCapitalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  marketplaceCardList: {
    gap: 14,
  },
  marketplaceServiceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    gap: 12,
  },
  marketplaceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketplaceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : Theme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketplaceCategoryTag: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  marketplaceCategoryText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  marketplaceServiceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  marketplaceServiceDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontWeight: '600',
  },
  marketplacePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  marketplacePrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  marketplaceUnit: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
    marginLeft: 4,
  },
  marketplaceAcquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  marketplaceAcquireBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  marketplaceBundlesSection: {
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    borderRadius: 22,
    padding: 22,
    gap: 12,
  },
  marketplaceBundlesTag: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.8,
  },
  marketplaceBundlesTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  marketplaceBundlesDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    fontWeight: '600',
  },
  marketplaceBundlesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  marketplaceBundlesBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  // Full-Page Modal Shared Styles (matching Guardian)
  modalFullContainer: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  modalHeaderFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
  },
  modalHeaderInfo: {
    flex: 1,
    marginRight: 16,
  },
  modalTitleFull: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  modalSubtitleFull: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  modalCloseBtnFull: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    flex: 1,
  },
  modalFooterFixed: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerBtnGroup: {
    flexDirection: 'row',
    gap: 12,
  },

  // Credentials Specific Form Styles
  credentialsFormBody: {
    padding: 24,
    gap: 20,
  },
  formSection: {
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  premiumInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingRight: 8,
  },
  premiumInputFlex: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardTypeIcon: {
    width: 44,
    height: 32,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  securityAuditPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11, 160, 178, 0.05)',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  securityBadgeWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  securityAuditText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  authorizeBtn: {
    flex: 2,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorizeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  secureAccessModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 45, 62, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  secureAccessModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  secureAccessModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  secureAccessModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  secureAccessModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureAccessServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 160, 178, 0.05)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secureAccessServiceInfo: {
    flex: 1,
    gap: 2,
  },
  secureAccessServiceName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  secureAccessServiceMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  secureAccessServicePrice: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  secureAccessTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E3ECF4',
    marginBottom: 24,
  },
  secureAccessTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  secureAccessTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  secureAccessPaymentLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secureAccessPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  secureAccessPaymentText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  secureAccessAuthorizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  secureAccessAuthorizeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secureAccessDisclaimer: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  settlementConfirmedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settlementConfirmedCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
  },
  settlementConfirmedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  settlementConfirmedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  settlementConfirmedDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  settlementConfirmedBtn: {
    width: '100%',
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  settlementConfirmedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 45, 62, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    padding: 32,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  cancelModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  cancelModalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  keepSubBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepSubBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 45, 62, 0.45)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  planScroller: {
    paddingTop: 14,
    paddingBottom: 4,
    gap: 12,
  },
  planCard: {
    width: 230,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
    overflow: 'hidden',
  },
  planCardCurrent: {
    borderColor: '#0a2341',
    backgroundColor: colors.cardBackground,
  },
  currentPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currentPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planTier: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.9,
  },
  planModalPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  planModalUnit: {
    paddingBottom: 5,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  planBulletList: {
    gap: 8,
  },
  planBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#0a2341',
  },
  planBulletText: {
    flex: 1,
    fontSize: 12.25,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 16.5,
  },
  planCta: {
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  planCtaDark: {
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    borderColor: '#0B2D3E',
  },
  planCtaAccent: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  planCtaDisabled: {
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
    borderColor: colors.cardBorder,
  },
  planCtaText: {
    fontSize: 12.5,
    fontWeight: '900',
  },
  planCtaTextDark: {
    color: '#FFFFFF',
  },
  planCtaTextAccent: {
    color: '#FFFFFF',
  },
  planCtaTextDisabled: {
    color: colors.textSecondary,
  },
  warningIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  confirmOutline: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  confirmOutlineText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  confirmPrimary: {
    flex: 1,
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmPrimaryText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sparkleIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(11, 160, 178, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(11, 160, 178, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Official Settlement modal
  settlementModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settlementModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    overflow: 'hidden',
  },
  settlementModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  settlementModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  settlementModalRef: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  settlementModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementModalBody: {
    padding: 24,
    paddingBottom: 8,
    gap: 24,
  },
  settlementBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settlementLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  settlementValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementSubValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  settlementInvoiceBox: {
    backgroundColor: 'rgba(11, 160, 178, 0.05)',
    borderRadius: 16,
    padding: 20,
  },
  settlementInvoiceDivider: {
    height: 1,
    backgroundColor: '#E3ECF4',
    marginVertical: 16,
  },
  settlementLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementLineDesc: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    flex: 1,
  },
  settlementLineAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementLineDescMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  settlementTotalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementTotalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
  },
  settlementDownloadBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderRadius: 14,
  },
  settlementDownloadBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  settlementCloseBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementCloseBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  // Security Architecture (Update Credentials) modal
  credentialsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  credentialsModalKAV: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  credentialsModalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  credentialsModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  credentialsModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  credentialsModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  credentialsModalClose: {
    padding: 4,
  },
  credentialsModalScroll: {
    maxHeight: 400,
  },
  credentialsModalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  credentialsInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  credentialsInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  credentialsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  credentialsRowItem: {
    flex: 1,
  },
  credentialsSecurityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : Theme.surfaceMuted,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  credentialsSecurityText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  credentialsModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  credentialsAuthorizeBtn: {
    flex: 1,
    backgroundColor: isDark ? '#0a2341' : '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credentialsAuthorizeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  credentialsCancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
  },
  credentialsCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});

