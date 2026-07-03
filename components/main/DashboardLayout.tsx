import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useMyMenus } from '@/hooks/useMyMenus';
import { getTeamBrandingSettings } from '@/services/dashboardService';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import type { Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainHeader } from './MainHeader';
import type { NavMenuItem } from './NavDrawer';
import { NavDrawer } from './NavDrawer';
import { StatusBar } from 'expo-status-bar';

const DRAWER_WIDTH = 265;

type DashboardLayoutProps = {
  children: React.ReactNode;
  menuItems: NavMenuItem[];
  userInitials?: string;
  userName?: string;
  userEmail?: string;
  profileRoute?: string;
  customLogo?: React.ReactNode;
  customBackground?: string;
  customHeaderBackground?: string;
  backToMainRoute?: Href;
  isAgency?: boolean;
};

export function DashboardLayout({
  children,
  menuItems,
  userInitials,
  userName,
  userEmail,
  profileRoute,
  customLogo,
  customBackground,
  customHeaderBackground,
  backToMainRoute,
  isAgency = false,
}: DashboardLayoutProps) {
  const { accessToken } = useAuth();
  const { colors, theme, setBranding } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Fetch dynamic menu items from the API hook
  const { data: dynamicMenuItems, isLoading: isMenusLoading } = useMyMenus();

  // If agency page, keep agency menu items. Otherwise, use dynamic menus (fall back to static menu items if loading/error/empty)
  const finalMenuItems = isAgency ? menuItems : (dynamicMenuItems && dynamicMenuItems.length > 0 ? dynamicMenuItems : menuItems);

  const { data: brandingData } = useQuery({
    queryKey: ['teamBrandingSettings'],
    queryFn: () => getTeamBrandingSettings(accessToken!),
    enabled: !!accessToken && isAgency,
  });

  useEffect(() => {
    if (isAgency && brandingData) {
      setBranding({
        theme_color: brandingData.theme_color,
        text_color: brandingData.text_color,
      });
    } else if (!isAgency) {
      setBranding(null);
    }
    return () => {
      setBranding(null);
    };
  }, [isAgency, brandingData, setBranding]);

  const customLogoNode = useMemo(() => {
    if (!isAgency) return customLogo;
    const txtColor = brandingData?.text_color || '#FFFFFF';
    if (brandingData?.logo_url) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={{ uri: brandingData.logo_url }}
            style={{ width: 32, height: 32, borderRadius: 6 }}
            resizeMode="contain"
          />
          <View style={{ flexShrink: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: txtColor }}>
              {brandingData.legal_name || 'Agency'}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: txtColor + 'B3', letterSpacing: 0.5 }}>
              AGENCY CONTROL
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image
          source={require('@/assets/appImages/nlogo.png')}
          style={{ width: 32, height: 32 }}
          resizeMode="contain"
        />
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: txtColor }}>
            {brandingData?.legal_name || 'maxx'}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '700', color: txtColor + 'B3', letterSpacing: 0.5 }}>
            AGENCY CONTROL
          </Text>
        </View>
      </View>
    );
  }, [isAgency, brandingData, customLogo]);

  const drawerBg = isAgency ? (brandingData?.theme_color || undefined) : customBackground;
  const drawerTextColor = isAgency ? (brandingData?.text_color || undefined) : undefined;

  const openMenu = useMemo(
    () => () => {
      setIsMenuOpen(true);
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [drawerTranslateX]
  );

  const closeMenu = useMemo(
    () => () => {
      Animated.timing(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setIsMenuOpen(false);
      });
    },
    [drawerTranslateX]
  );

  const handleMenuPress = useMemo(
    () => (route?: import('expo-router').Href) => {
      closeMenu();
    },
    [closeMenu]
  );

  const finalProfileRoute = profileRoute || (isAgency ? '/(main)/agency/settings' : '/(main)/profile');

  return (
    <View style={styles.wrapper}>
      <StatusBar key={theme} style={theme === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={colors.backgroundGradient as any}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.background, { paddingTop: insets.top }]}
      >
        <MainHeader
          onMenuPress={openMenu}
          userInitials={userInitials}
          userName={userName}
          userEmail={userEmail}
          profileRoute={finalProfileRoute as any}
          backgroundColor={customHeaderBackground}
          isAgency={isAgency}
        />
        {children}
      </LinearGradient>
      <NavDrawer
        visible={isMenuOpen}
        translateX={drawerTranslateX}
        width={DRAWER_WIDTH}
        paddingTop={insets.top + 18}
        paddingBottom={insets.bottom}
        menuItems={finalMenuItems}
        onClose={closeMenu}
        onItemPress={handleMenuPress}
        customLogo={customLogoNode}
        customBackground={drawerBg}
        customTextColor={drawerTextColor}
        backToMainRoute={backToMainRoute}
        isLoading={!isAgency && isMenusLoading}
      />
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    background: {
      flex: 1,
    },
  });
}
