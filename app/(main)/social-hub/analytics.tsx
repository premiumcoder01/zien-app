import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLATFORMS = [
  { name: 'Instagram', pct: 65, color: '#E1306C', icon: 'instagram' },
  { name: 'Facebook', pct: 20, color: '#1877F2', icon: 'facebook' },
  { name: 'LinkedIn', pct: 15, color: '#0A66C2', icon: 'linkedin' },
];

const KPI_CARDS = [
  { title: 'CLICK RATE', value: '3.2%', change: '+0.8%', icon: 'cursor-default-click-outline', color: '#0a2341' },
  { title: 'WEB VISITS', value: '1,420', change: '+12%', icon: 'web', color: '#6366F1' },
  { title: 'LEADS', value: '28', change: '+5%', icon: 'account-plus-outline', color: '#F59E0B' },
];

export default function AnalyticsScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dateRange] = useState('Last 30 Days');

  const { width } = Dimensions.get('window');
  const chartWidth = width - 40;

  const engagementData = useMemo(
    () => ({
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
      datasets: [{ data: [12, 18, 14, 22, 19, 26] }],
    }),
    []
  );

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.cardBackground,
      backgroundGradientTo: colors.cardBackground,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(11, 160, 178, ${opacity * 0.9})`,
      labelColor: (opacity = 1) => colors.textSecondary,
      barPercentage: 0.6,
      propsForBackgroundLines: { stroke: colors.cardBorder, strokeWidth: 1 },
    }),
    [colors]
  );

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.background, { paddingTop: insets.top }]}>

      <PageHeader
        title="Analytics"
        subtitle="Performance insights and engagement growth."
        onBack={() => router.back()}

      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>


        {/* Top Actions */}
        <View style={styles.topActions}>
          <Pressable style={styles.topActionBtn}>
            <Text style={styles.topActionText}>{dateRange}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.topActionBtn}>
            <Text style={[styles.topActionText, { color: colors.textPrimary }]}>Export Report</Text>
          </Pressable>
        </View>

        {/* Chart Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Engagement Growth</Text>
        </View>

        <View style={styles.chartCard}>
          <BarChart
            data={engagementData}
            width={chartWidth}
            height={220}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig as any}
            style={styles.chart}
            withInnerLines={false}
          />
        </View>

        {/* Platform Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Platform Reach</Text>
        </View>

        <View style={styles.platformCard}>
          {PLATFORMS.map((p, i) => (
            <View key={i} style={styles.platformRow}>
              <View style={[styles.platformIcon, { backgroundColor: `${p.color}10` }]}>
                <MaterialCommunityIcons name={p.icon as any} size={18} color={p.color} />
              </View>
              <View style={styles.platformInfo}>
                <View style={styles.platformTagRow}>
                  <Text style={styles.platformLabel}>{p.name}</Text>
                  <Text style={styles.percentText}>{p.pct}%</Text>
                </View>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressFill, { width: `${p.pct}%`, backgroundColor: p.color }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* AI Insight Upgrade */}
        <LinearGradient
          colors={['#0B2341', '#1E293B']}
          style={styles.aiInsightBox}>
          <View style={styles.aiHeader}>
            <View style={styles.pulseContainer}>
              <View style={styles.pulseInner} />
            </View>
            <Text style={styles.aiTitle}>NEURAL SYNC INSIGHT</Text>
          </View>
          <Text style={styles.aiMessage}>
            "Your audience engagement peaks during the 11 AM - 1 PM window on Instagram. Converting these visitors into leads is 4.2x more likely if you include a direct CTA in your captions."
          </Text>
          <View style={styles.aiFooter}>
            <Text style={styles.aiConfidence}>Confidence Score: 98%</Text>
          </View>
        </LinearGradient>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {KPI_CARDS.map((kpi, i) => (
            <View key={i} style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: `${kpi.color}15` }]}>
                <MaterialCommunityIcons name={kpi.icon as any} size={20} color={kpi.color} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiLabel}>{kpi.title}</Text>
                <Text style={styles.kpiVal}>{kpi.value}</Text>
                <Text style={styles.kpiDiff}>{kpi.change}</Text>
              </View>
            </View>
          ))}
        </View>


      </ScrollView>
    </LinearGradient>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 10,
      marginBottom: 24,
    },
    kpiCard: {
      width: '48%',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    },
    kpiIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    kpiContent: {},
    kpiLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    kpiVal: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    kpiDiff: {
      fontSize: 11,
      fontWeight: '800',
      color: '#10B981',
      marginTop: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    topActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    topActionBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
        android: { elevation: 1 },
      }),
    },
    topActionText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    chartCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
      alignItems: 'center',
    },
    chart: {
      borderRadius: 16,
      marginRight: 0, // Kit fix
    },
    platformCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
    },
    platformRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    platformIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    platformInfo: {
      flex: 1,
    },
    platformTagRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    platformLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    percentText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textSecondary,
    },
    progressContainer: {
      height: 6,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    aiInsightBox: {
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    pulseContainer: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(11, 160, 178, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#0a2341',
    },
    aiTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: '#0a2341',
      letterSpacing: 1.5,
    },
    aiMessage: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '600',
      lineHeight: 22,
      fontStyle: 'italic',
    },
    aiFooter: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    },
    aiConfidence: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
  });
}
