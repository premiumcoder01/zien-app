import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type BillingTabKey = 'overview' | 'history' | 'analytics';

const TABS: Array<{
  key: BillingTabKey;
  label: string;
  icon: string;
}> = [
    { key: 'overview', label: 'Overview', icon: 'view-dashboard-outline' },
    { key: 'history', label: 'History', icon: 'history' },
    { key: 'analytics', label: 'Analytics', icon: 'chart-bar' },
  ];

type BillingScreenHeaderProps = {
  activeTab: BillingTabKey;
  onTabChange: (tab: BillingTabKey) => void;
  credits?: number;
};

function BillingScreenHeaderComponent({ activeTab, onTabChange, credits = 2484 }: BillingScreenHeaderProps) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Billing & Usage</Text>
            <View style={styles.creditPillHeader}>
              <MaterialCommunityIcons name="flash" size={13} color={isDark ? '#818CF8' : '#4F46E5'} />
              <Text style={styles.creditPillText}>{credits.toLocaleString()} Credits</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Manage your current plan, add-ons, and view full payment history.
          </Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabsScroll}
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <Pressable
              key={t.key}
              style={[styles.tabPill, isActive && styles.tabPillActive]}
              onPress={() => onTabChange(t.key)}
            >
              <MaterialCommunityIcons
                name={t.icon as any}
                size={16}
                color={isActive ? colors.textPrimary : colors.textSecondary}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const BillingScreenHeader = memo(BillingScreenHeaderComponent);

function getStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 16,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    headerText: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    creditPillHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    creditPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#A5B4FC' : '#4F46E5',
    },
    subtitle: {
      fontSize: 12.5,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 17,
      fontWeight: '600',
    },
    tabsScroll: {
      flexGrow: 0,
    },
    tabsContent: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(16, 27, 40, 0.85)' : '#F1F5F9',
      padding: 4,
      borderRadius: 14,
      gap: 4,
    },
    tabPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    tabIcon: {
      marginRight: 6,
    },
    tabText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '800',
    },
    tabPillActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    tabTextActive: {
      color: colors.textPrimary,
    },
  });
}
