import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ZienCardScreenShellProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  children: ReactNode;
  /** Optional element shown on the right side of the header (e.g. save icon). */
  headerRight?: ReactNode;
};

export function ZienCardScreenShell({
  title,
  subtitle,
  showBack = true,
  children,
  headerRight,
}: ZienCardScreenShellProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <LinearGradient
      colors={(colors.backgroundGradient as any) || ['#CAD8E4', '#D7E9F2', '#F3E1D7']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerWrap}>
        <View style={styles.header}>
          {showBack && (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
            </Pressable>
          )}
          <View style={[styles.headerText, !showBack && styles.headerTextFull]}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerRight != null ? headerRight : null}
        </View>
      </View>
      {children}
    </LinearGradient>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  background: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerText: { flex: 1 },
  headerTextFull: { marginLeft: 0 },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
    opacity: 0.8,
  },
});

export { ZienCardScreenShell as default };
