import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { memo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type NavMenuItem = {
  label: string;
  icon: string;
  route?: Href;
  marginTop?: number;
};

type NavDrawerProps = {
  visible: boolean;
  translateX: Animated.Value;
  width: number;
  paddingTop: number;
  paddingBottom: number;
  menuItems: NavMenuItem[];
  onClose: () => void;
  onItemPress: (route?: Href) => void;
  customLogo?: React.ReactNode;
  customBackground?: string;
  customTextColor?: string;
  backToMainRoute?: Href;
  isLoading?: boolean;
  isAgency?: boolean;
};

const getAlphaColor = (color: string, opacity: number) => {
  if (!color) return undefined;
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${isNaN(r) ? 255 : r}, ${isNaN(g) ? 255 : g}, ${isNaN(b) ? 255 : b}, ${opacity})`;
  }
  return color;
};

function NavDrawerComponent({
  visible,
  translateX,
  width,
  paddingTop,
  paddingBottom,
  menuItems,
  onClose,
  onItemPress,
  customLogo,
  customBackground,
  customTextColor,
  backToMainRoute,
  isLoading,
  isAgency,
}: NavDrawerProps) {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const router = useRouter();
  const segments = useSegments();
  const { logout, userRole } = useAuth();
  const isAgencyUser = isAgency ?? (userRole === 'agency_user' || userRole === 'agency');
  const currentRoute = segments.length > 0 ? '/' + segments.join('/') : '/dashboard';

  if (!visible) return null;

  const handlePress = (route?: Href) => {
    if (route) router.push(route);
    onItemPress(route);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { width, paddingTop, paddingBottom, transform: [{ translateX }] },
          customBackground ? { backgroundColor: customBackground } : {},
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          {customLogo ? (
            customLogo
          ) : (
            <Image
              source={require('@/assets/appImages/nlogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={({ pressed }) => [
              styles.closeBtn,
              (customBackground === '#FFFFFF' || customBackground === '#fff' || customBackground?.toLowerCase() === '#ffffff')
                ? { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }
                : (customBackground ? { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.2)' } : {}),
              pressed && { opacity: 0.7 }
            ]}
            onPress={onClose}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={(customBackground === '#FFFFFF' || customBackground === '#fff' || customBackground?.toLowerCase() === '#ffffff') ? '#64748B' : (customTextColor || (customBackground ? '#FFFFFF' : colors.textSecondary))}
            />
          </Pressable>
        </View>

        {/* Divider */}
        <View style={[styles.headerDivider, (customBackground === '#FFFFFF' || customBackground === '#fff' || customBackground?.toLowerCase() === '#ffffff') ? { backgroundColor: '#E2E8F0' } : (customBackground ? { backgroundColor: 'rgba(255, 255, 255, 0.15)' } : {})]} />

        {/* Nav Items */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.accentTeal} />
            </View>
          ) : (
            menuItems.map((item) => {
              const itemRoute = (item.route as string) || '';
              const isActive = itemRoute === currentRoute ||
                (itemRoute.includes('(main)') && currentRoute === itemRoute.replace('/(main)', '')) ||
                (currentRoute === '/dashboard' && itemRoute.includes('dashboard'));

              let activeBg = isAgencyUser
                ? '#14532D' // Agency green
                : (theme === 'dark' ? 'rgba(0, 167, 181, 0.18)' : '#EBF8F9'); // Web-matching soft cyan

              let activeLeftBorderColor = isAgencyUser
                ? 'transparent'
                : (theme === 'dark' ? '#00e5ff' : '#00a7b5');

              let activeBorderColor = isAgencyUser
                ? 'transparent'
                : (theme === 'dark' ? 'rgba(0, 167, 181, 0.3)' : '#D5F3F6');

              let activeTextColor = isAgencyUser
                ? '#FFFFFF'
                : (theme === 'dark' ? '#00e5ff' : '#0F172A');

              let activeIconColor = isAgencyUser
                ? '#FFFFFF'
                : (theme === 'dark' ? '#00e5ff' : '#00a7b5');

              let inactiveTextColor = isAgencyUser
                ? '#475569'
                : (customTextColor ? getAlphaColor(customTextColor, 0.8) : (customBackground ? 'rgba(255,255,255,0.7)' : (theme === 'dark' ? colors.textSecondary : '#334155')));

              let inactiveIconColor = isAgencyUser
                ? '#64748B'
                : (customTextColor ? getAlphaColor(customTextColor, 0.7) : (customBackground ? 'rgba(255,255,255,0.7)' : (theme === 'dark' ? colors.textSecondary : '#64748B')));

              return (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.item,
                    {
                      marginHorizontal: 12,
                      paddingHorizontal: 14,
                      marginVertical: 2,
                      borderRadius: isAgencyUser ? 10 : 8,
                      borderTopLeftRadius: isAgencyUser ? 10 : 4,
                      borderBottomLeftRadius: isAgencyUser ? 10 : 4,
                      borderTopRightRadius: isAgencyUser ? 10 : 8,
                      borderBottomRightRadius: isAgencyUser ? 10 : 8,
                      borderWidth: isActive && !isAgencyUser ? 1 : 0,
                      borderColor: isActive && !isAgencyUser ? activeBorderColor : 'transparent',
                      borderLeftWidth: isActive && !isAgencyUser ? 3.5 : 0,
                      borderLeftColor: isActive && !isAgencyUser ? activeLeftBorderColor : 'transparent',
                      backgroundColor: isActive ? activeBg : 'transparent',
                    },
                    pressed && !isActive && styles.itemPressed,
                    item.marginTop ? { marginTop: item.marginTop } : {},
                  ]}
                  onPress={() => handlePress(item.route)}
                  disabled={!item.route}
                >
                  <View style={styles.iconWrap}>
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={isActive ? activeIconColor : inactiveIconColor}
                    />
                  </View>

                  <Text
                    style={[
                      styles.itemText,
                      isActive ? styles.itemTextActive : {},
                      !item.route ? styles.itemTextDisabled : {},
                      { color: isActive ? activeTextColor : inactiveTextColor },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

      </Animated.View>
    </View>
  );
}

export const NavDrawer = memo(NavDrawerComponent);

function getStyles(colors: any, theme?: string) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(8, 20, 35, 0.45)',
    },
    drawer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: theme === 'dark' ? colors.cardBackground : '#FFFFFF',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 4, height: 0 },
      elevation: 8,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    logo: {
      width: 80,
      height: 32,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    headerDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: 20,
      marginBottom: 8,
      opacity: 0.6,
    },
    scroll: {
      flex: 1,
    },
    list: {
      paddingVertical: 8,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      position: 'relative',
      height: 48,
    },
    itemActive: {
      backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.18)' : 'rgba(0, 167, 181, 0.10)',
    },
    itemPressed: {
      backgroundColor: theme === 'dark' ? colors.surfaceSoft : '#F8FAFC',
    },
    activeIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: '#00a7b5',
    },
    iconWrap: {
      width: 24,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    itemTextActive: {
      color: theme === 'dark' ? '#FFFFFF' : '#0F172A',
      fontWeight: '600',
    },
    itemTextDisabled: {
      color: colors.inputPlaceholder,
    },
    logoutWrapper: {
      marginTop: 'auto',
      paddingBottom: 10,
    },
  });
}
