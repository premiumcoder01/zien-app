import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type GuardianTabId = 'overview' | 'monitoring' | 'logs-reports' | 'admin';

const SECTIONS: Array<{
  id: GuardianTabId;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
    { id: 'overview', label: 'Overview', icon: 'view-grid-outline' },
    { id: 'monitoring', label: 'Monitoring', icon: 'radar' },
    { id: 'logs-reports', label: 'Logs & Reports', icon: 'file-document-outline' },
    { id: 'admin', label: 'Admin Controls', icon: 'cog-outline' },
  ];

type GuardianNavProps = {
  activeTab: GuardianTabId;
  onTabChange: (id: GuardianTabId) => void;
};

export function GuardianNav({ activeTab, onTabChange }: GuardianNavProps) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {SECTIONS.map(({ id, label, icon }) => {
          const isActive = activeTab === id;
          return (
            <Pressable
              key={id}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onTabChange(id)}>
              <MaterialCommunityIcons
                name={icon}
                size={22}
                color={isActive ? '#FFFFFF' : '#94A3B8'}
              />
              <Text style={[styles.pillText, isActive && styles.pillTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: isDark ? 'rgba(16, 27, 40, 0.85)' : 'rgba(255, 255, 255, 0.8)',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#0a2341',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 0,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
