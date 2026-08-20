import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuardianNav, GuardianTabId } from './GuardianNav';

type GuardianScreenShellProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showVerifiedBadge?: boolean;
  children: ReactNode;
  showNav?: boolean;
  activeTab?: GuardianTabId;
  onTabChange?: (id: GuardianTabId) => void;
};

export function GuardianScreenShell({
  title,
  subtitle,
  showBack = true,
  showVerifiedBadge = true,
  children,
  showNav = false,
  activeTab,
  onTabChange,
}: GuardianScreenShellProps) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <LinearGradient
      colors={isDark ? ['#0C1623', '#111E2D', '#121F2F'] : ['#CAD8E4', '#D7E9F2', '#F3E1D7']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <View style={styles.headerWrap}>
        <View style={styles.header}>
          {showBack && (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
            </Pressable>
          )}
          <View style={[styles.headerText, !showBack && styles.headerTextFull]}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              {showVerifiedBadge && (
                <MaterialCommunityIcons
                  name="shield-check"
                  size={20}
                  color="#00A896"
                  style={styles.titleBadge}
                />
              )}
            </View>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>
      <View style={styles.contentWrap}>
        {children}
      </View>
      {showNav && activeTab && onTabChange && (
        <GuardianNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </LinearGradient>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  background: { flex: 1 },
  headerWrap: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerText: { flex: 1 },
  headerTextFull: { marginLeft: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  title: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  titleBadge: { marginLeft: 6 },
  subtitle: { fontSize: 12.5, color: colors.textSecondary, marginTop: 4, fontWeight: '700' },
  contentWrap: {
    flex: 1,
  },
});
