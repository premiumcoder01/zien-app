import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface PriceTrendTabProps {
  property: any;
}

export const PriceTrendTab: React.FC<PriceTrendTabProps> = ({ property }) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [timeRange, setTimeRange] = useState('5y');

  const data5y = {
    labels: ['2021', '2022', '2023', '2024', '2025'],
    datasets: [
      {
        data: [1080, 1175, 1220, 1260, 1285],
        color: (opacity = 1) => colors.accent,
        strokeWidth: 3,
      },
    ],
  };

  const data1y = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Now'],
    datasets: [
      {
        data: [1210, 1230, 1245, 1270, 1285],
        color: (opacity = 1) => colors.accent,
        strokeWidth: 3,
      },
    ],
  };

  const currentData = timeRange === '5y' ? data5y : data1y;
  const totalChange = timeRange === '5y' ? '+17.4%' : '+6.1%';

  return (
    <View style={styles.container}>
      {/* 1. Summary Stats Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>CURRENT EST. VALUE</Text>
          <Text style={styles.statValueMain}>$1,285,000</Text>
          <Text style={styles.statSubText}>Estimated Market Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>1-YEAR GROWTH</Text>
          <Text style={[styles.statValueMain, { color: '#10B981' }]}>+6.8%</Text>
          <Text style={styles.statSubText}>vs last year</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>5-YEAR GROWTH</Text>
          <Text style={[styles.statValueMain, { color: '#10B981' }]}>+42.3%</Text>
          <Text style={styles.statSubText}>since 2020</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>LAST SALE PRICE</Text>
          <Text style={styles.statValueMain}>$980,000</Text>
          <Text style={styles.statSubText}>Aug 14, 2019</Text>
        </View>
      </ScrollView>

      {/* 2. Chart Section */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Property Price Trend ({timeRange === '5y' ? '5 Years' : '1 Year'})</Text>
          <Text style={styles.chartSubtitle}>
              {timeRange === '5y' ? '2021 → 2025' : 'Last 12 Months'} · Total change: <Text style={{ color: '#10B981' }}>{totalChange}</Text>
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleGroup}>
            <Pressable 
              style={[styles.toggleBtn, timeRange === '5y' && styles.toggleActive]}
              onPress={() => setTimeRange('5y')}
            >
              <Text style={[styles.toggleText, timeRange === '5y' && styles.toggleTextActive]}>5 Years</Text>
            </Pressable>
            <Pressable 
              style={[styles.toggleBtn, timeRange === '1y' && styles.toggleActive]}
              onPress={() => setTimeRange('1y')}
            >
              <Text style={[styles.toggleText, timeRange === '1y' && styles.toggleTextActive]}>1 Year</Text>
            </Pressable>
          </View>
        </View>

        <LineChart
          data={currentData}
          width={Dimensions.get('window').width - 72}
          height={200}
          yAxisLabel="$"
          yAxisSuffix="K"
          chartConfig={{
            backgroundColor: colors.cardBackground,
            backgroundGradientFrom: colors.cardBackground,
            backgroundGradientTo: colors.cardBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(${timeRange === '5y' ? '6, 182, 212' : '16, 185, 129'}, ${opacity})`, // cyan or green based on range
            labelColor: (opacity = 1) => colors.textSecondary,
            style: { borderRadius: 16 },
            propsForDots: { r: "5", strokeWidth: "2", stroke: colors.accent },
            propsForBackgroundLines: { strokeDasharray: "", stroke: 'rgba(255,255,255,0.05)' },
            fillShadowGradientFrom: colors.accent,
            fillShadowGradientTo: colors.accent,
            fillShadowGradientOpacity: 0.15,
            fillShadowGradientFromOpacity: 0.3,
          }}
          bezier
          style={{ marginVertical: 8, marginLeft: -10, borderRadius: 16 }}
          withVerticalLines={false}
          withHorizontalLines={true}
          withShadow={true}
        />
      </View>

      {/* 3. Year-by-Year Breakdown */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Year-by-Year Breakdown</Text>
        <View style={styles.breakdownList}>
          {[
            { year: '2025', price: '$1285K', change: '+2.0%', progress: 100 },
            { year: '2024', price: '$1260K', change: '+3.3%', progress: 92 },
            { year: '2023', price: '$1220K', change: '+3.8%', progress: 85 },
            { year: '2022', price: '$1175K', change: '+7.3%', progress: 78 },
            { year: '2021', price: '$1095K', change: '+7.4%', progress: 65 },
            { year: '2020', price: '$1020K', change: '+4.1%', progress: 50 },
            { year: '2019', price: '$980K', change: 'Purchase', progress: 40, isPurchase: true },
          ].map((item, idx) => (
            <View key={idx} style={styles.breakdownRow}>
              <Text style={styles.yearText}>{item.year}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.barBase, { backgroundColor: colors.surfaceSoft }]}>
                  <View style={[styles.barFill, { width: `${item.progress}%`, backgroundColor: colors.accent }]} />
                </View>
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.breakdownPrice}>{item.price}</Text>
                <Text style={[styles.breakdownChange, item.isPurchase && { color: colors.textSecondary }]}>
                    {item.change}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 4. Dual Assessment Cards */}
      <View style={styles.dualCards}>
        <View style={styles.sideCard}>
            <Text style={styles.infoSectionTitle}>Tax Assessment</Text>
            <View style={styles.cardList}>
                {[
                    { label: 'Assessed Total Value', value: '$1,040,000' },
                    { label: 'Land Value', value: '$360,000' },
                    { label: 'Improvement Value', value: '$680,000' },
                    { label: 'Annual Tax (2024)', value: '$12,480' },
                ].map((item, i) => (
                    <View key={i} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{item.label}</Text>
                        <Text style={styles.detailValue}>{item.value}</Text>
                    </View>
                ))}
            </View>
        </View>
        
        <View style={styles.sideCard}>
            <Text style={styles.infoSectionTitle}>Rental Intelligence</Text>
            <View style={styles.cardList}>
                {[
                    { label: 'Estimated Rent / mo', value: '$5,800' },
                    { label: 'Rent Range', value: '$5,200 – $6,400' },
                    { label: 'Gross Rental Yield', value: '5.4%' },
                    { label: 'Cap Rate', value: '3.8%' },
                ].map((item, i) => (
                    <View key={i} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{item.label}</Text>
                        <Text style={styles.detailValue}>{item.value}</Text>
                    </View>
                ))}
            </View>
        </View>
      </View>
    </View>
  );
};

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      gap: 20,
      paddingBottom: 20,
    },
    statsScroll: {
        gap: 12,
    },
    statCard: {
        width: 160,
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        gap: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    statValueMain: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    statSubText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
    },
    chartSection: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    chartHeader: {
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 12,
    },
    toggleGroup: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceSoft,
        borderRadius: 10,
        padding: 3,
    },
    toggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: colors.cardBackground,
    },
    toggleText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    toggleTextActive: {
        color: colors.textPrimary,
    },
    infoSection: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        gap: 20,
    },
    infoSectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    breakdownList: {
        gap: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    yearText: {
        width: 36,
        fontSize: 12,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    barContainer: {
        flex: 1,
    },
    barBase: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    priceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 100,
        gap: 8,
    },
    breakdownPrice: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    breakdownChange: {
        fontSize: 10,
        fontWeight: '700',
        color: '#10B981',
        width: 54,
        textAlign: 'right',
    },
    dualCards: {
        gap: 16,
    },
    sideCard: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    cardList: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
    },
  });
}

export { PriceTrendTab as default };
