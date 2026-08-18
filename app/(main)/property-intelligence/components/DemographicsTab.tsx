import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DemographicsTabProps {
    property: any;
    apiData?: any;
}

export const DemographicsTab: React.FC<DemographicsTabProps> = ({ property, apiData }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const demographics = apiData?.demographics;

    if (!demographics) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyCard}>
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="account-group-outline" size={40} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>Demographics data is not available for this zip code.</Text>
                    <Text style={styles.emptySubtitle}>Please ensure a valid US Census API key is configured.</Text>
                </View>
            </View>
        );
    }

    // When demographics data is available
    const population = demographics.population || 0;
    const medianIncome = demographics.medianIncome || 0;
    const medianAge = demographics.medianAge || 0;
    const ownerOccupiedPct = demographics.ownerOccupied || 0;

    return (
        <View style={styles.container}>
            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>POPULATION</Text>
                    <Text style={styles.statValue}>{population.toLocaleString()}</Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>MEDIAN INCOME</Text>
                    <Text style={styles.statValue}>${medianIncome.toLocaleString()}</Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>MEDIAN AGE</Text>
                    <Text style={styles.statValue}>{medianAge} yrs</Text>
                </View>

            </View>
        </View>
    );
};

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { paddingBottom: 24 },
        emptyCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 36,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            minHeight: 220,
        },
        iconCircle: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
        },
        emptyTitle: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.textPrimary,
            textAlign: 'center',
        },
        emptySubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: 'center',
        },

        statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        statBox: {
            width: '47.5%',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 6,
        },
        statLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.8 },
        statValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    });
}
