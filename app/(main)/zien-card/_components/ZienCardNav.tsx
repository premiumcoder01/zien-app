import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS: Array<{
  route: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
    { route: '/(main)/zien-card', label: 'Dashboard', icon: 'view-dashboard-outline' },
    { route: '/(main)/zien-card/basic-information', label: 'Basic Information', icon: 'card-account-details-outline' },
    { route: '/(main)/zien-card/themes-color', label: 'Themes & Color', icon: 'palette-outline' },
    { route: '/(main)/zien-card/lead-enquiries', label: 'Lead Enquiries', icon: 'account-group-outline' },
    { route: '/(main)/zien-card/analytics', label: 'Analytics', icon: 'chart-bar' },
  ];

interface ZienCardNavProps {
  activeSection: string;
  onSectionChange: (route: string) => void;
}

export function ZienCardNav({ activeSection, onSectionChange }: ZienCardNavProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {SECTIONS.map(({ route, label, icon }) => {
          const isActive = route === activeSection;
          return (
            <Pressable
              key={route}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSectionChange(route)}>
              <MaterialCommunityIcons
                name={icon}
                size={18}
                color={isActive ? '#FFFFFF' : '#5B6B7A'}
              />
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pillActive: {
    backgroundColor: '#0a2341',
    borderColor: '#0a2341',
    elevation: 4,
    shadowColor: '#0a2341',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
