import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

export type ProfileTabKey = 'identity' | 'professional' | 'branding' | 'security';

const TABS: { key: ProfileTabKey; label: string; icon: string }[] = [
  { key: 'identity', label: 'Personal Info', icon: 'account-outline' },
  { key: 'professional', label: 'Professional Info', icon: 'briefcase-outline' },
  { key: 'branding', label: 'Branding', icon: 'palette-outline' },
  { key: 'security', label: 'Security', icon: 'lock-outline' },
];

type ProfileTabsProps = {
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
};

function ProfileTabsComponent({ activeTab, onTabChange }: ProfileTabsProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.key)}
          >
            {isActive ? (
              <LinearGradient
                colors={['#0a2341', '#1B5E9A']}
                style={styles.activeIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name={tab.icon as any} size={15} color="#fff" />
              </LinearGradient>
            ) : (
              <MaterialCommunityIcons name={tab.icon as any} size={16} color={colors.textSecondary} />
            )}
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const ProfileTabs = memo(ProfileTabsComponent);

function getStyles(colors: any) {
  return StyleSheet.create({
    scroll: {
      marginBottom: 16,
    },
    container: {
      gap: 8,
      paddingRight: 18,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.cardBackgroundSemi,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#0A2F48',
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    tabActive: {
      borderColor: `${colors.accentTeal}50`,
      backgroundColor: colors.cardBackgroundSoft,
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    activeIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textPrimary,
      fontWeight: '800',
    },
  });
}
