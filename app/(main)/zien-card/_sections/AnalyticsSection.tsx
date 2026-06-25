import { useAppTheme } from '@/context/ThemeContext';
import { CardAnalytics, DigitalCard, getCardAnalytics } from '@/services/digitalCardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface AnalyticsSectionProps {
  onSectionChange?: (section: string) => void;
  activeCard: DigitalCard;
  accessToken: string | null;
}

export function AnalyticsSection({ onSectionChange, activeCard, accessToken }: AnalyticsSectionProps) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CardAnalytics | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!accessToken || !activeCard.id) return;
      try {
        setLoading(true);
        const result = await getCardAnalytics(accessToken, activeCard.id);
        setData(result);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeCard.id, accessToken]);

  const kpiData = useMemo(() => {
    if (!data) return [];

    const views = data.totals.find(t => t.event_type === 'view')?.count || 0;
    const leads = data.totals.find(t => t.event_type === 'exchange_info')?.count || 0;

    return [
      { key: 'views', label: 'Total Views', value: String(views), icon: 'eye-outline' as const, color: '#3B82F6' },
      { key: 'saves', label: 'Contact Saves', value: '0', icon: 'download-outline' as const, color: '#10B981' },
      { key: 'leads', label: 'Leads', value: String(leads), icon: 'comment-text-outline' as const, color: '#F59E0B' },
      { key: 'clicks', label: 'Total Clicks', value: '0', icon: 'near-me' as const, color: '#DC2626' },
    ];
  }, [data]);

  const monthlyChartData = useMemo(() => {
    if (!data || !data.monthly.length) {
      const months: { label: string; count: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleString('default', { month: 'short' }),
          count: 0,
        });
      }
      return months;
    }

    return data.monthly.slice(-6).map(m => {
      const d = new Date(m.month);
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        count: Number(m.count),
      };
    });
  }, [data]);

  const dailyChartData = useMemo(() => {
    const daysToShow = 14;
    const result: { label: string; count: number }[] = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.getDate() + '/' + (d.getMonth() + 1);

      const match = data?.daily.find(item => item.date === dateStr);
      result.push({ label, count: match ? Number(match.count) : 0 });
    }

    return result;
  }, [data]);

  if (loading) {
    return (
      <View style={[styles.main, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accentTeal} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 12 }]}>Fetching analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Analytics Dashboard</Text>
        <Text style={styles.dashboardSubtitle}>Deep dive into your digital profile's growth and engagement.</Text>
      </View>

      {/* Monthly Growth */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartLabel}>Monthly Growth (Last 6 Months)</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Views</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Leads</Text>
            </View>
          </View>
        </View>
        <View style={styles.customChartContainer}>
          {monthlyChartData.map((item, idx) => {
            const maxVal = Math.max(...monthlyChartData.map(m => m.count), 1);
            const barHeight = item.count > 0 ? Math.max((item.count / maxVal) * 120, 20) : 6;

            return (
              <View key={idx} style={styles.chartColumn}>
                <Text style={styles.chartValueLabel}>{item.count}</Text>
                <View style={styles.barOuter}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: item.count > 0
                          ? (isDark ? colors.accentTeal : '#0A2341')
                          : (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartMonthLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {kpiData.map((kpi) => (
          <View key={kpi.key} style={styles.miniCard}>
            <View style={[styles.miniIconWrap, { backgroundColor: kpi.color + '15' }]}>
              <MaterialCommunityIcons name={kpi.icon} size={18} color={kpi.color} />
            </View>
            <Text style={styles.miniValue}>{kpi.value}</Text>
            <Text style={styles.miniLabel}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Daily Activity */}
      <View style={styles.chartCard}>
        <Text style={styles.chartLabel}>Daily Activity (Last 14 Days)</Text>
        <View style={styles.customChartContainer}>
          {dailyChartData.filter((_, i) => i % 2 === 0).map((item, idx) => {
            const maxVal = Math.max(...dailyChartData.map(d => d.count), 1);
            const barHeight = item.count > 0 ? Math.max((item.count / maxVal) * 120, 20) : 6;

            return (
              <View key={idx} style={styles.chartColumn}>
                <Text style={styles.chartValueLabel}>{item.count}</Text>
                <View style={styles.barOuter}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: item.count > 0
                          ? '#3B82F6'
                          : (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartMonthLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Events Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Events Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.sumLabel}>VIEW</Text>
            <Text style={styles.sumValue}>{data?.totals.find(t => t.event_type === 'view')?.count || 0}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.sumLabel}>EXCHANGE INFO</Text>
            <Text style={styles.sumValue}>{data?.totals.find(t => t.event_type === 'exchange_info')?.count || 0}</Text>
          </View>
        </View>
      </View>

      {/* Insight Card */}
      <View style={styles.insightCard}>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>Monthly Insight</Text>
          <Text style={styles.insightSub}>Your conversion rate is growing month-over-month. Keep sharing your link to maintain momentum!</Text>
          <Pressable style={styles.insightBtn}>
            <Text style={styles.insightBtnText}>Full Report</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
  dashboardHeader: { marginBottom: 20 },
  dashboardTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  dashboardSubtitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  chartCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    flexShrink: 1
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  customChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    height: 170,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartValueLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  barOuter: {
    height: 120,
    width: 32,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartMonthLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  miniCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '48%',
  },
  miniIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  miniValue: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  miniLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 15, fontWeight: '900', color: colors.textPrimary, marginBottom: 16 },
  summaryRow: { gap: 12 },
  summaryItem: {
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    padding: 16,
    borderRadius: 16,
  },
  sumLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
  sumValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginTop: 4 },
  insightCard: {
    backgroundColor: colors.accentTeal,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  insightSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginTop: 8 },
  insightBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  insightBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  main: { flex: 1 },
  loadingText: { fontSize: 14, fontWeight: '600' }
});
