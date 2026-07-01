import { useAppTheme } from '@/context/ThemeContext';
import { CardAnalytics, DigitalCard, getCardAnalytics } from '@/services/digitalCardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BarGroup, CartesianChart, Line, Area } from 'victory-native';
import { LinearGradient, vec } from '@shopify/react-native-skia';

interface MonthlyPoints {
  views: { x: number; y: number; xValue: any; yValue: any }[];
  leads: { x: number; y: number; xValue: any; yValue: any }[];
}

const MonthlyPointsTracker = ({ points, onChange }: { points: any; onChange: (p: MonthlyPoints) => void }) => {
  const lastPointsStr = React.useRef<string>("");

  React.useEffect(() => {
    if (!points) return;
    const currentStr = JSON.stringify({
      views: (points.views || []).map((p: any) => ({ x: p?.x, y: p?.y, xValue: p?.xValue, yValue: p?.yValue })),
      leads: (points.leads || []).map((p: any) => ({ x: p?.x, y: p?.y, xValue: p?.xValue, yValue: p?.yValue }))
    });

    if (currentStr !== lastPointsStr.current) {
      lastPointsStr.current = currentStr;
      onChange(points);
    }
  }, [points, onChange]);

  return null;
};

interface DailyPoints {
  count: { x: number; y: number; xValue: any; yValue: any }[];
}

const DailyPointsTracker = ({ points, onChange }: { points: any; onChange: (p: DailyPoints) => void }) => {
  const lastPointsStr = React.useRef<string>("");

  React.useEffect(() => {
    if (!points) return;
    const currentStr = JSON.stringify({
      count: (points.count || []).map((p: any) => ({ x: p?.x, y: p?.y, xValue: p?.xValue, yValue: p?.yValue }))
    });

    if (currentStr !== lastPointsStr.current) {
      lastPointsStr.current = currentStr;
      onChange(points);
    }
  }, [points, onChange]);

  return null;
};

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
  const [monthlyChartPoints, setMonthlyChartPoints] = useState<MonthlyPoints | null>(null);
  const [dailyChartPoints, setDailyChartPoints] = useState<DailyPoints | null>(null);

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
    const saves = data.totals.find(t => t.event_type === 'save_contact')?.count || 0;
    const leads = data.totals.find(t => t.event_type === 'exchange_info')?.count || 0;

    return [
      { key: 'views', label: 'Total Views', value: String(views), icon: 'eye-outline' as const, color: '#3B82F6' },
      { key: 'saves', label: 'Contact Saves', value: String(saves), icon: 'download-outline' as const, color: '#10B981' },
      { key: 'leads', label: 'Leads', value: String(leads), icon: 'comment-text-outline' as const, color: '#F59E0B' },
      { key: 'clicks', label: 'Total Clicks', value: '0', icon: 'cursor-default-outline' as const, color: '#6366F1' },
    ];
  }, [data]);

  const monthlyChartData = useMemo(() => {
    const months: { label: string; views: number; leads: number }[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(-2); // e.g. "May 26"
      
      const viewsCount = data?.monthly
        .filter(m => {
          const mDate = new Date(m.month);
          return mDate.getFullYear() === d.getFullYear() && mDate.getMonth() === d.getMonth() && m.event_type === 'view';
        })
        .reduce((sum, item) => sum + Number(item.count), 0) || 0;

      const leadsCount = data?.monthly
        .filter(m => {
          const mDate = new Date(m.month);
          return mDate.getFullYear() === d.getFullYear() && mDate.getMonth() === d.getMonth() && m.event_type === 'exchange_info';
        })
        .reduce((sum, item) => sum + Number(item.count), 0) || 0;

      months.push({
        label,
        views: viewsCount,
        leads: leadsCount,
      });
    }
    return months;
  }, [data]);

  const dailyChartData = useMemo(() => {
    const daysToShow = 14;
    const result: { label: string; count: number }[] = [];
    const now = new Date();

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const label = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getDate(); // e.g. "Jun 22"

      const viewsCount = data?.daily
        .filter(item => item.date === dateStr && item.event_type === 'view')
        .reduce((sum, item) => sum + Number(item.count), 0) || 0;

      result.push({ label, count: viewsCount });
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

        <View style={{ height: 180, width: '100%', position: 'relative' }}>
          <CartesianChart
            data={monthlyChartData}
            xKey="label"
            yKeys={["views", "leads"]}
            domainPadding={{ left: 24, right: 24, top: 30, bottom: 20 }}
          >
            {({ points, chartBounds }) => (
              <>
                <BarGroup
                  chartBounds={chartBounds}
                  betweenGroupPadding={0.3}
                  withinGroupPadding={0.1}
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                >
                  <BarGroup.Bar
                    points={points.views}
                    color="#3B82F6"
                  />
                  <BarGroup.Bar
                    points={points.leads}
                    color="#10B981"
                  />
                </BarGroup>
                <MonthlyPointsTracker points={points} onChange={setMonthlyChartPoints} />
              </>
            )}
          </CartesianChart>

          {/* Monthly Growth custom labels overlay */}
          {monthlyChartPoints && (
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              {monthlyChartPoints.views.map((point: any, idx: number) => {
                const leadPoint = monthlyChartPoints.leads[idx];
                const viewVal = monthlyChartData[idx]?.views || 0;
                const leadVal = monthlyChartData[idx]?.leads || 0;
                const label = point.xValue;
                
                // Calculate center of group for the month label
                const groupX = leadPoint ? (point.x + leadPoint.x) / 2 : point.x;

                return (
                  <React.Fragment key={`monthly-group-${idx}`}>
                    {/* View value label */}
                    {viewVal > 0 && (
                      <Text
                        style={{
                          position: 'absolute',
                          left: point.x - 20,
                          top: Math.max(point.y - 18, 2),
                          width: 40,
                          textAlign: 'center',
                          fontSize: 10,
                          fontWeight: '800',
                          color: colors.textPrimary,
                        }}
                      >
                        {viewVal}
                      </Text>
                    )}

                    {/* Lead value label */}
                    {leadVal > 0 && leadPoint && (
                      <Text
                        style={{
                          position: 'absolute',
                          left: leadPoint.x - 20,
                          top: Math.max(leadPoint.y - 18, 2),
                          width: 40,
                          textAlign: 'center',
                          fontSize: 10,
                          fontWeight: '800',
                          color: colors.textPrimary,
                        }}
                      >
                        {leadVal}
                      </Text>
                    )}

                    {/* Month label */}
                    <Text
                      style={{
                        position: 'absolute',
                        left: groupX - 30,
                        bottom: 0,
                        width: 60,
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: '700',
                        color: colors.textSecondary,
                      }}
                    >
                      {label}
                    </Text>
                  </React.Fragment>
                );
              })}
            </View>
          )}
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
        <View style={{ height: 180, width: '100%', position: 'relative', marginTop: 15 }}>
          <CartesianChart
            data={dailyChartData}
            xKey="label"
            yKeys={["count"]}
            domainPadding={{ left: 16, right: 16, top: 20, bottom: 20 }}
          >
            {({ points, chartBounds }) => (
              <>
                <Area
                  points={points.count}
                  y0={chartBounds.bottom}
                  color="#3B82F6"
                  opacity={0.1}
                  curveType="natural"
                >
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, 140)}
                    colors={["rgba(59, 130, 246, 0.25)", "rgba(59, 130, 246, 0.0)"]}
                  />
                </Area>
                <Line
                  points={points.count}
                  color="#3B82F6"
                  strokeWidth={2}
                  curveType="natural"
                />
                <DailyPointsTracker points={points} onChange={setDailyChartPoints} />
              </>
            )}
          </CartesianChart>

          {/* Daily Activity custom labels overlay */}
          {dailyChartPoints && (
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              {dailyChartPoints.count.map((point: any, idx: number) => {
                const label = point.xValue;
                // Render every 2nd label to avoid crowding, plus the last one
                const showLabel = idx % 2 === 0 || idx === dailyChartData.length - 1;
                if (!showLabel) return null;

                return (
                  <Text
                    key={`daily-lbl-${idx}`}
                    style={{
                      position: 'absolute',
                      left: point.x - 20,
                      bottom: 0,
                      width: 40,
                      textAlign: 'center',
                      fontSize: 9,
                      fontWeight: '700',
                      color: colors.textSecondary,
                    }}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Events Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Events Summary</Text>
        
        {/* Row 1: Exchange Info & Save Contact */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItemHalf}>
            <Text style={styles.sumLabel}>EXCHANGE INFO</Text>
            <Text style={styles.sumValue}>{data?.totals.find(t => t.event_type === 'exchange_info')?.count || 0}</Text>
          </View>
          <View style={styles.summaryItemHalf}>
            <Text style={styles.sumLabel}>SAVE CONTACT</Text>
            <Text style={styles.sumValue}>{data?.totals.find(t => t.event_type === 'save_contact')?.count || 0}</Text>
          </View>
        </View>

        {/* Row 2: View */}
        <View style={[styles.summaryRow, { marginTop: 12 }]}>
          <View style={styles.summaryItemFull}>
            <Text style={styles.sumLabel}>VIEW</Text>
            <Text style={styles.sumValue}>{data?.totals.find(t => t.event_type === 'view')?.count || 0}</Text>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItemHalf: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryItemFull: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
