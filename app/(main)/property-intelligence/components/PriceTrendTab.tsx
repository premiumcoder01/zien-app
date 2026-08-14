import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PriceTrendTabProps {
    property: any;
    apiData?: any;
}

export const PriceTrendTab: React.FC<PriceTrendTabProps> = ({ property, apiData }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    // Data extraction
    const marketTrends = apiData?.marketTrends?.marketTrendsData;
    const saleData = marketTrends?.saleData;
    const rentEstimate = apiData?.rentEstimate?.rent ?? 0;
    const listPrice = apiData?.ListPrice || apiData?.valuation?.price || 0;

    const grossYield = rentEstimate && listPrice ? ((rentEstimate * 12 / listPrice) * 100).toFixed(1) : '0%';
    const capRate = rentEstimate && listPrice ? ((rentEstimate * 12 * 0.65 / listPrice) * 100).toFixed(1) : '0%';
    const investmentScore = apiData?.investmentScore ?? 0;
    const scoreLabel = investmentScore > 70 ? 'Good' : investmentScore > 40 ? 'Fair' : 'Fair';

    return (
        <View style={styles.container}>
            {/* Top 3 Metric Cards matching web */}
            <View style={styles.topCardsRow}>
                {/* 1. Investment Score */}
                <View style={styles.metricCard}>
                    <View style={styles.gaugeRow}>
                        <View style={styles.scoreCircle}>
                            <Text style={styles.scoreNumber}>{investmentScore}</Text>
                        </View>
                        <View>
                            <Text style={styles.metricLabel}>ZIEN INVESTMENT SCORE</Text>
                            <Text style={styles.metricValueLarge}>{scoreLabel}</Text>
                        </View>
                    </View>
                </View>

                {/* 2. Gross Yield */}
                <View style={styles.metricCardSmall}>
                    <Text style={styles.metricLabel}>GROSS YIELD</Text>
                    <Text style={styles.metricValueBold}>{grossYield}</Text>
                </View>

                {/* 3. Est. Cap Rate */}
                <View style={styles.metricCardSmall}>
                    <Text style={styles.metricLabel}>EST. CAP RATE</Text>
                    <Text style={styles.metricValueBold}>{capRate}</Text>
                </View>
            </View>

            {/* Historical Market Trends (Zip Code) Section */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Historical Market Trends (Zip Code)</Text>
                <View style={styles.emptyNoticeBox}>
                    <MaterialCommunityIcons name="chart-line-variant" size={32} color={colors.surfaceMuted} />
                    <Text style={styles.emptyNoticeText}>
                        Historical data is not available for this zip code on the current RentCast plan.
                    </Text>
                </View>
            </View>
        </View>
    );
};

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { gap: 16, paddingBottom: 24 },

        topCardsRow: { gap: 12 },
        metricCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
        scoreCircle: {
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 3.5,
            borderColor: '#F59E0B',
            alignItems: 'center',
            justifyContent: 'center',
        },
        scoreNumber: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },

        metricCardSmall: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 6,
        },
        metricLabel: {
            fontSize: 9,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 0.8,
        },
        metricValueLarge: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.textPrimary,
            marginTop: 2,
        },
        metricValueBold: {
            fontSize: 26,
            fontWeight: '900',
            color: colors.textPrimary,
        },

        card: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 16,
        },
        cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
        emptyNoticeBox: {
            backgroundColor: colors.surfaceSoft,
            borderRadius: 12,
            padding: 28,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
        },
        emptyNoticeText: {
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 18,
        },
    });
}
