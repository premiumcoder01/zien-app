import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { generatePropertyData } from '../utils/generatePropertyData';

interface RiskEnvironmentTabProps {
  property: any;
  apiData?: any;
}

export const RiskEnvironmentTab: React.FC<RiskEnvironmentTabProps> = ({ property, apiData }) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const address = property?.address || apiData?.UnparsedAddress || '';
  const pd = generatePropertyData(address);

  const getRiskLabel = (score: number) =>
    score <= 3 ? 'Low' : score <= 6 ? 'Moderate' : 'High';
  const getRiskColor = (score: number) =>
    score <= 3 ? '#10B981' : score <= 6 ? '#F59E0B' : '#EF4444';
  const getRiskBg = (score: number) =>
    score <= 3 ? 'rgba(16, 185, 129, 0.1)' : score <= 6 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  const natAvgPct = Math.round(((47 - pd.crimeScore) / 47) * 100);
  const safePct = natAvgPct > 0 ? natAvgPct : 0;

  const crimeData = {
    labels: ['Overall', 'Violent', 'Property', "Nat'l Avg"],
    datasets: [{
      data: [pd.crimeScore, pd.crimeViolent, pd.crimeProperty, 47],
      colors: [
        (opacity = 1) => pd.crimeScore < 47 ? '#10B981' : '#EF4444',
        (opacity = 1) => pd.crimeViolent < 25 ? '#10B981' : '#F59E0B',
        (opacity = 1) => pd.crimeProperty < 40 ? '#F59E0B' : '#EF4444',
        (opacity = 1) => '#64748B',
      ]
    }],
  };

  const aqiVal = 30 + (pd.floodRisk * 8);
  const aqiLabel = aqiVal < 50 ? 'Good' : aqiVal < 100 ? 'Moderate' : 'Unhealthy';
  const aqiColor = aqiVal < 50 ? '#10B981' : aqiVal < 100 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.container}>
      {/* 1. Risk Score Cards - Horizontal Scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.riskScroll}>
        <View style={styles.riskCard}>
          <View style={styles.riskTop}>
            <MaterialCommunityIcons name="water" size={18} color="#06B6D4" />
            <View style={[styles.statusBadge, { backgroundColor: getRiskBg(pd.floodRisk) }]}>
              <Text style={[styles.statusText, { color: getRiskColor(pd.floodRisk) }]}>{getRiskLabel(pd.floodRisk)}</Text>
            </View>
          </View>
          <Text style={styles.riskTitle}>Flood Risk</Text>
          <View style={styles.progressRow}>
            <View style={styles.riskBarBase}>
              <View style={[styles.riskBarFill, { width: `${pd.floodRisk * 10}%`, backgroundColor: getRiskColor(pd.floodRisk) }]} />
            </View>
            <Text style={styles.riskValue}>{pd.floodRisk}/10</Text>
          </View>
          <Text style={styles.riskZone}>{pd.floodZone.split('–')[0].trim()}</Text>
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskTop}>
            <MaterialCommunityIcons name="fire" size={18} color="#EF4444" />
            <View style={[styles.statusBadge, { backgroundColor: getRiskBg(pd.fireRisk) }]}>
              <Text style={[styles.statusText, { color: getRiskColor(pd.fireRisk) }]}>{getRiskLabel(pd.fireRisk)}</Text>
            </View>
          </View>
          <Text style={styles.riskTitle}>Wildfire Risk</Text>
          <View style={styles.progressRow}>
            <View style={styles.riskBarBase}>
              <View style={[styles.riskBarFill, { width: `${pd.fireRisk * 10}%`, backgroundColor: getRiskColor(pd.fireRisk) }]} />
            </View>
            <Text style={styles.riskValue}>{pd.fireRisk}/10</Text>
          </View>
          <Text style={styles.riskZone}>CAL FIRE Zone</Text>
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskTop}>
            <MaterialCommunityIcons name="pulse" size={18} color="#F59E0B" />
            <View style={[styles.statusBadge, { backgroundColor: getRiskBg(pd.earthquakeRisk) }]}>
              <Text style={[styles.statusText, { color: getRiskColor(pd.earthquakeRisk) }]}>{getRiskLabel(pd.earthquakeRisk)}</Text>
            </View>
          </View>
          <Text style={styles.riskTitle}>Earthquake Risk</Text>
          <View style={styles.progressRow}>
            <View style={styles.riskBarBase}>
              <View style={[styles.riskBarFill, { width: `${pd.earthquakeRisk * 10}%`, backgroundColor: getRiskColor(pd.earthquakeRisk) }]} />
            </View>
            <Text style={styles.riskValue}>{pd.earthquakeRisk}/10</Text>
          </View>
          <Text style={styles.riskZone}>USGS Seismic Zone</Text>
        </View>
      </ScrollView>

      {/* 2. Crime Index Section */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Crime Index (Lower = Safer)</Text>
        <BarChart
          data={crimeData}
          width={Dimensions.get('window').width - 72}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: colors.cardBackground,
            backgroundGradientFrom: colors.cardBackground,
            backgroundGradientTo: colors.cardBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => colors.accent,
            labelColor: (opacity = 1) => colors.textSecondary,
            propsForBackgroundLines: { strokeDasharray: "4", stroke: 'rgba(255,255,255,0.05)' },
          }}
          fromZero={true}
          showValuesOnTopOfBars={false}
          style={{ marginVertical: 8, borderRadius: 16 }}
          withInnerLines={true}
          flatColor={true}
          withCustomBarColorFromData={true}
        />
        <View style={styles.chartFooter}>
            <Text style={styles.footerLabel}>vs. National Average</Text>
            <Text style={[styles.footerValue, { color: safePct >= 0 ? '#10B981' : '#EF4444' }]}>
              {safePct >= 0 ? `${safePct}% Safer Overall` : `${Math.abs(safePct)}% More Risk`}
            </Text>
        </View>
      </View>

      {/* 3. AQI & Flood Zone Grid */}
      <View style={styles.dualGrid}>
        <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>Air Quality Index</Text>
            <View style={styles.aqiContainer}>
                <View style={[styles.aqiCircle, { borderColor: aqiColor }]}>
                    <Text style={[styles.aqiNumber, { color: aqiColor }]}>{aqiVal}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.aqiStatus}>{aqiLabel}</Text>
                    <Text style={styles.aqiDesc}>
                      {aqiVal < 50
                        ? 'AQI 0–50. Good air quality for all residents.'
                        : aqiVal < 100
                        ? 'AQI 51–100. Sensitive groups should limit prolonged outdoor exposure.'
                        : 'AQI 101+. Unhealthy for all groups. Limit outdoor activity.'}
                    </Text>
                </View>
            </View>
        </View>

        <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>Flood Zone</Text>
            <View style={styles.zoneContainer}>
                <MaterialCommunityIcons
                  name={pd.floodRisk <= 3 ? 'check-circle' : 'alert-circle'}
                  size={24}
                  color={getRiskColor(pd.floodRisk)}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.zoneTitle}>{pd.floodZone}</Text>
                    <Text style={styles.aqiDesc}>
                      {pd.floodRisk <= 3
                        ? 'Minimal flood risk. Insurance not required but recommended.'
                        : pd.floodRisk <= 6
                        ? 'Moderate flood risk. Flood insurance strongly recommended.'
                        : 'High flood risk area. Flood insurance required.'}
                    </Text>
                </View>
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
    riskScroll: {
        gap: 12,
    },
    riskCard: {
        width: 180,
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    riskTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
    },
    riskTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    riskBarBase: {
        flex: 1,
        height: 4,
        backgroundColor: colors.surfaceSoft,
        borderRadius: 2,
        overflow: 'hidden',
    },
    riskBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    riskValue: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textSecondary,
    },
    riskZone: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    chartCard: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    chartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    footerLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    footerValue: {
        fontSize: 12,
        fontWeight: '900',
    },
    dualGrid: {
        gap: 16,
    },
    subCard: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    subCardTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    aqiContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    aqiCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aqiNumber: {
        fontSize: 16,
        fontWeight: '900',
    },
    aqiStatus: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    aqiDesc: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    zoneContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    zoneTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 2,
    },
  });
}

export { RiskEnvironmentTab as default };
