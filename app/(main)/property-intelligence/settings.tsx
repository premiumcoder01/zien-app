import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PropertySettingsScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const insets = useSafeAreaInsets();

    const [valuationAlerts, setValuationAlerts] = useState(true);
    const [dataPrivacy, setDataPrivacy] = useState(true);

    const SettingRow = ({
        icon,
        title,
        subtitle,
        value,
        onValueChange,
        isLast = false
    }: {
        icon: any;
        title: string;
        subtitle: string;
        value: boolean;
        onValueChange: (val: boolean) => void;
        isLast?: boolean;
    }) => (
        <View style={[styles.row, !isLast && styles.rowBorder]}>
            <View style={styles.rowIconContainer}>
                <MaterialCommunityIcons name={icon} size={22} color={colors.textSecondary} />
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.borderLight, true: colors.accent }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.borderLight}
            />
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Module Settings</Text>
                <Text style={styles.headerSubtitle}>
                    Configure your preferences for the property intelligence engine.
                </Text>
            </View>

            <View style={styles.settingsCard}>
                <SettingRow
                    icon="bell-outline"
                    title="Valuation Alerts"
                    subtitle="Get notified when a saved property's value changes by more than 5%."
                    value={valuationAlerts}
                    onValueChange={setValuationAlerts}
                />
                <SettingRow
                    icon="shield-outline"
                    title="Data Privacy"
                    subtitle="Obfuscate owner names in shared intelligence reports."
                    value={dataPrivacy}
                    onValueChange={setDataPrivacy}
                    isLast={true}
                />
            </View>
        </ScrollView>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.cardBackground,
        },
        content: {
            padding: 24,
            paddingTop: 20,
        },
        header: {
            marginBottom: 28,
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -1,
            marginBottom: 6,
        },
        headerSubtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
            fontWeight: '500',
        },
        settingsCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            overflow: 'hidden',
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 20,
            gap: 16,
        },
        rowBorder: {
            borderBottomWidth: 1,
            borderBottomColor: colors.rowBorder || colors.cardBorder,
        },
        rowIconContainer: {
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowContent: {
            flex: 1,
        },
        rowTitle: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 2,
        },
        rowSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
            lineHeight: 18,
            fontWeight: '500',
        },
    });
}
