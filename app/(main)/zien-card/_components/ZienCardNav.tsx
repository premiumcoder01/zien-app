import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  visible: boolean;
  onClose: () => void;
}

export function ZienCardNav({ activeSection, onSectionChange, visible, onClose }: ZienCardNavProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width * 0.65)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').width * 0.65,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        <Pressable style={styles.drawerBackdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.drawerContent,
            {
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Zien Card Menu</Text>
            <Pressable onPress={onClose} style={styles.drawerCloseBtn} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Menu items */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.drawerScrollContent}
          >
            {SECTIONS.map(({ route, label, icon }) => {
              const isActive = route === activeSection;
              return (
                <Pressable
                  key={route}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    isActive && styles.drawerItemActive,
                    pressed && styles.drawerItemPressed,
                  ]}
                  onPress={() => {
                    onClose();
                    onSectionChange(route);
                  }}
                >
                  <View style={[styles.drawerItemIconWrap, isActive && styles.drawerItemIconWrapActive]}>
                    <MaterialCommunityIcons
                      name={icon}
                      size={16}
                      color={isActive ? colors.accentTeal : colors.textPrimary}
                    />
                  </View>
                  <Text style={[styles.drawerItemLabel, isActive && styles.drawerItemLabelActive]}>
                    {label}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={14}
                    color={isActive ? colors.accentTeal : colors.textMuted || '#9CA3AF'}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  triggerContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 99,
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#0a2341',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 27, 42, 0.75)',
  },
  drawerContent: {
    width: Dimensions.get('window').width * 0.65,
    height: '100%',
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderLeftWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  drawerScrollContent: {
    paddingBottom: 30,
    gap: 6,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 14,
  },
  drawerItemActive: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: `${colors.accentTeal}30`,
  },
  drawerItemPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  drawerItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  drawerItemIconWrapActive: {
    backgroundColor: `${colors.accentTeal}15`,
    borderColor: `${colors.accentTeal}40`,
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  drawerItemLabelActive: {
    color: colors.accentTeal,
    fontWeight: '900',
  },
});

export { ZienCardNav as default };
