import { useAppTheme } from '@/context/ThemeContext';
import { CardAnalytics, DigitalCard, getCardAnalytics } from '@/services/digitalCardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BarGroup, CartesianChart, Line, Area, useChartPressState } from 'victory-native';
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
  views: { x: number; y: number; xValue: any; yValue: any }[];
  leads: { x: number; y: number; xValue: any; yValue: any }[];
}

const DailyPointsTracker = ({ points, onChange }: { points: any; onChange: (p: DailyPoints) => void }) => {
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

  // Press state for monthly chart tooltip (bar chart — victory-native handles it)
  const { state: monthlyPressState, isActive: isMonthlyActive } = useChartPressState({
    x: "",
    y: { views: 0, leads: 0 }
  });


  const [activeMonthlyPoint, setActiveMonthlyPoint] = useState<{ x: string; views: number; leads: number } | null>(null);
  const [activeDailyPoint, setActiveDailyPoint] = useState<{ x: string; views: number; leads: number } | null>(null);


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
    const clicks = data.totals.filter(t => t.event_type.toLowerCase().includes('click'))
      .reduce((sum, t) => sum + Number(t.count || 0), 0);

    return [
      { key: 'views', label: 'Total Views', value: String(views), icon: 'eye-outline' as const, color: '#3B82F6' },
      { key: 'saves', label: 'Contact Saves', value: String(saves), icon: 'download-outline' as const, color: '#10B981' },
      { key: 'leads', label: 'Leads', value: String(leads), icon: 'comment-text-outline' as const, color: '#F59E0B' },
      { key: 'clicks', label: 'Total Clicks', value: String(clicks), icon: 'cursor-default-outline' as const, color: '#6366F1' },
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
    const result: { label: string; views: number; leads: number }[] = [];
    const now = new Date();

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const label = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getDate(); // e.g. "Jun 22"

      const viewsCount = data?.daily
        .filter(item => item.date === dateStr && item.event_type === 'view')
        .reduce((sum, item) => sum + Number(item.count), 0) || 0;

      const leadsCount = data?.daily
        .filter(item => item.date === dateStr && item.event_type === 'exchange_info')
        .reduce((sum, item) => sum + Number(item.count), 0) || 0;

      result.push({ label, views: viewsCount, leads: leadsCount });
    }

    return result;
  }, [data]);

  // ── Pure-JS touch tooltip for daily chart (no Reanimated) ──
  const [dailyChartWidth, setDailyChartWidth] = useState(0);
  const dailyChartWidthRef = React.useRef(0);
  const dailyChartDataRef = React.useRef(dailyChartData);
  useEffect(() => { dailyChartDataRef.current = dailyChartData; }, [dailyChartData]);

  const resolveDailyPoint = useCallback((locationX: number) => {
    const w = dailyChartWidthRef.current;
    if (w === 0) return;
    const PADDING = 16;
    const usableW = w - PADDING * 2;
    const data = dailyChartDataRef.current;
    const numPts = data.length;
    if (numPts === 0) return;
    const idx = Math.max(0, Math.min(numPts - 1,
      Math.round(((locationX - PADDING) / usableW) * (numPts - 1))
    ));
    const pt = data[idx];
    if (pt) setActiveDailyPoint({ x: pt.label, views: pt.views, leads: pt.leads });
  }, []);

  const dailyPanResponder = React.useMemo(() => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: any) => resolveDailyPoint(e.nativeEvent.locationX),
    onResponderMove: (e: any) => resolveDailyPoint(e.nativeEvent.locationX),
    onResponderRelease: () => setActiveDailyPoint(null),
    onResponderTerminate: () => setActiveDailyPoint(null),
  }), [resolveDailyPoint]);


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
          <View style={{ flex: 1 }}>
            <Text style={styles.chartLabel}>Monthly Growth (Last 6 Months)</Text>
            {activeMonthlyPoint && (
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginTop: 4 }}>
                {activeMonthlyPoint.x}: <Text style={{ color: '#3B82F6' }}>{activeMonthlyPoint.views} Views</Text> • <Text style={{ color: '#10B981' }}>{activeMonthlyPoint.leads} Leads</Text>
              </Text>
            )}
          </View>
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
            chartPressState={monthlyPressState}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.chartLabel}>Daily Activity (Last 14 Days)</Text>
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

        {/* Tooltip — only shown when user touches the graph */}
        {activeDailyPoint ? <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.07)',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.15)',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
              {activeDailyPoint.x}
            </Text>
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#3B82F6' }} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#3B82F6' }}>{activeDailyPoint.views}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}> Views</Text>
            </View>
            <Text style={{ color: colors.textSecondary, opacity: 0.4 }}> | </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>{activeDailyPoint.leads}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}> Leads</Text>
            </View>
          </View> : null}

        {/* Chart with PanResponder for touch detection */}
        <View
          style={{ height: 180, width: '100%', position: 'relative', marginTop: 12 }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            setDailyChartWidth(w);
            dailyChartWidthRef.current = w;
          }}
          {...dailyPanResponder}
        >
          <CartesianChart
            data={dailyChartData}
            xKey="label"
            yKeys={["views", "leads"]}
            domainPadding={{ left: 16, right: 16, top: 20, bottom: 20 }}
          >
            {({ points, chartBounds }) => (
              <>
                {/* Views Area */}
                <Area
                  points={points.views}
                  y0={chartBounds.bottom}
                  color="#3B82F6"
                  opacity={0.05}
                  curveType="natural"
                >
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, 140)}
                    colors={["rgba(59, 130, 246, 0.15)", "rgba(59, 130, 246, 0.0)"]}
                  />
                </Area>
                {/* Views Line */}
                <Line
                  points={points.views}
                  color="#3B82F6"
                  strokeWidth={2.5}
                  curveType="natural"
                />
                {/* Leads Area */}
                <Area
                  points={points.leads}
                  y0={chartBounds.bottom}
                  color="#10B981"
                  opacity={0.05}
                  curveType="natural"
                >
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, 140)}
                    colors={["rgba(16, 185, 129, 0.15)", "rgba(16, 185, 129, 0.0)"]}
                  />
                </Area>
                {/* Leads Line */}
                <Line
                  points={points.leads}
                  color="#10B981"
                  strokeWidth={2.5}
                  curveType="natural"
                />
                <DailyPointsTracker points={points} onChange={setDailyChartPoints} />
              </>
            )}
          </CartesianChart>

          {/* Dot indicator on touched data point */}
          {activeDailyPoint && dailyChartPoints && Array.isArray(dailyChartPoints.views) && (() => {
            const idx = dailyChartData.findIndex(d => d.label === activeDailyPoint.x);
            const vPt = dailyChartPoints.views[idx];
            const lPt = dailyChartPoints.leads[idx];
            return (
              <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                {vPt && <View style={{ position: 'absolute', left: vPt.x - 5, top: vPt.y - 5, width: 11, height: 11, borderRadius: 6, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#fff' }} />}
                {lPt && <View style={{ position: 'absolute', left: lPt.x - 5, top: lPt.y - 5, width: 11, height: 11, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff' }} />}
              </View>
            );
          })()}

          {/* Date labels at bottom */}
          {dailyChartPoints && Array.isArray(dailyChartPoints.views) && (
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              {dailyChartPoints.views.map((point: any, idx: number) => {
                const label = point.xValue;
                const showLabel = (dailyChartData.length - 1 - idx) % 2 === 0;
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
  main: { flex: 1 },
  loadingText: { fontSize: 14, fontWeight: '600' }
});
