import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getSoloCreditFlow } from '@/services/billingService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, usePathname, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MainHeaderProps = {
  onMenuPress: () => void;
  userInitials?: string;
  userName?: string;
  userEmail?: string;
  profileRoute?: Href;
  backgroundColor?: string;
  isAgency?: boolean;
};

// ── User Menu Bottom Sheet ──────────────────────────────
type MenuAction = {
  id: string;
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
};

type UserMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  userInitials: string;
  userName: string;
  userEmail: string;
  userAvatarUri?: string | null;
  credits?: string | number;
  isAgency?: boolean;
  actions: MenuAction[];
};

export default function UserMenuSheet({
  visible, onClose, userInitials, userName, userEmail, userAvatarUri, credits, isAgency, actions,
}: UserMenuSheetProps) {
  const router = useRouter();
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);
  const sheetStyles = getSheetStyles(colors);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const onShow = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 240, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, fadeAnim, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      onShow={onShow}
    >
      {/* Backdrop */}
      <Animated.View style={[sheetStyles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          sheetStyles.sheet,
          {
            backgroundColor: colors.cardBackground,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }]
          },
        ]}
      >


        {/* Drag handle */}
        <View style={[sheetStyles.handle, { backgroundColor: colors.divider }]} />

        {/* User info header */}
        <View style={sheetStyles.userRow}>
          {userAvatarUri ? (
            <Image source={{ uri: userAvatarUri }} style={sheetStyles.userAvatarImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#0a2341', '#1B5E9A']}
              style={sheetStyles.userAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={sheetStyles.userAvatarText}>{userInitials}</Text>
            </LinearGradient>
          )}
          <View style={sheetStyles.userInfo}>
            <Text style={[sheetStyles.userName, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
              {userName}
            </Text>
            <Text style={[sheetStyles.userEmail, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
              {userEmail}
            </Text>
          </View>
          {/* Online & Credits/Agency Status badge */}
          <View style={sheetStyles.userBadgesCol}>
            {isAgency ? (
              <Pressable
                style={sheetStyles.agencyBadge}
                onPress={() => {
                  handleClose();
                  setTimeout(() => router.push('/(main)/agency/billing-plan'), 260);
                }}
              >
                <View style={sheetStyles.agencyBadgeDot} />
                <Text style={sheetStyles.agencyBadgeText}>ACTIVE</Text>
              </Pressable>
            ) : (
              credits !== undefined && (
                <Pressable
                  style={sheetStyles.creditsBadge}
                  onPress={() => {
                    handleClose();
                    setTimeout(() => router.push('/(main)/billing-usage'), 260);
                  }}
                >
                  <MaterialCommunityIcons name="lightning-bolt" size={13} color="#7C3AED" />
                  <Text style={sheetStyles.creditsBadgeText}>{credits} Credits</Text>
                </Pressable>
              )
            )}
            <View style={sheetStyles.onlineBadge}>
              <View style={sheetStyles.onlineDot} />
              <Text style={sheetStyles.onlineText}>Online</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[sheetStyles.divider, { backgroundColor: colors.divider }]} />

        {/* Actions */}
        <View style={sheetStyles.actions}>
          {actions.map((action, idx) => {
            const isLast = idx === actions.length - 1;
            const isDestructive = action.color === '#EF4444';
            return (
              <View key={action.id}>
                {isDestructive && <View style={[sheetStyles.divider, { backgroundColor: colors.divider }]} />}
                <Pressable
                  style={({ pressed }) => [
                    sheetStyles.actionRow,
                    pressed && { backgroundColor: colors.surfaceSoft },
                  ]}
                  onPress={() => {
                    if (action.id === 'theme') {
                      action.onPress();
                    } else {
                      handleClose();
                      setTimeout(action.onPress, 260);
                    }
                  }}
                >
                  <View style={[
                    sheetStyles.actionIcon,
                    { backgroundColor: colors.surfaceIcon, borderColor: colors.cardBorder },
                    isDestructive && sheetStyles.actionIconDestructive,
                  ]}>
                    <MaterialCommunityIcons
                      name={action.icon as any}
                      size={20}
                      color={action.color ?? colors.textPrimary}
                    />
                  </View>
                  <Text style={[
                    sheetStyles.actionLabel,
                    { color: colors.textPrimary },
                    isDestructive && sheetStyles.actionLabelDestructive,
                  ]}>
                    {action.label}
                  </Text>
                  {!isDestructive && action.id !== 'theme' && (
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.inputPlaceholder} />
                  )}
                  {action.id === 'theme' && (
                    <View pointerEvents="none">
                      <Switch
                        value={theme === 'dark'}
                        trackColor={{ false: '#CBD5E1', true: colors.accentTeal }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

function getSheetStyles(colors: any) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(8,20,35,0.45)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 12,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: -10 },
      elevation: 16,
    },
    absoluteCloseBtn: {
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 10,
      padding: 4,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      gap: 14,
      marginBottom: 18,
    },
    userAvatar: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0a2341',
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    userAvatarImage: {
      width: 50,
      height: 50,
      borderRadius: 16,
    },
    userAvatarText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 17,
      letterSpacing: 0.5,
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      paddingRight: 6,
    },
    userName: {
      fontSize: 15.5,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.1,
    },
    userEmail: {
      fontSize: 12.5,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    userBadgesCol: {
      alignItems: 'flex-end',
      gap: 4,
      flexShrink: 0,
    },
    onlineBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#ECFDF5',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: '#BBF7D0',
    },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#22C55E',
    },
    onlineText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#16A34A',
    },
    creditsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#EDE9FE',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: '#DDD6FE',
    },
    creditsBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6D28D9',
    },
    agencyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#DCFCE7',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderWidth: 1,
      borderColor: '#86EFAC',
    },
    agencyBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#16A34A',
    },
    agencyBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#15803D',
      letterSpacing: 0.3,
    },
    divider: {
      height: 1,
      backgroundColor: '#F1F5F9',
      marginVertical: 6,
    },
    actions: {
      gap: 2,
      marginTop: 4,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 6,
      borderRadius: 14,
    },
    actionRowPressed: {
      backgroundColor: colors.surfaceSoft,
    },
    actionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    actionIconDestructive: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
    actionLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    actionLabelDestructive: {
      color: '#EF4444',
    },
  });
}

import { useProfile } from '@/hooks/useProfile';

function MainHeaderComponent({
  onMenuPress,
  userInitials: propUserInitials,
  userName: propUserName,
  userEmail: propUserEmail,
  profileRoute = '/(main)/profile' as Href,
  backgroundColor,
  isAgency = false,
}: MainHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme, colors } = useAppTheme();
  const styles = getStyles(colors);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const { logout, accessToken, userRole } = useAuth();
  const { data: profile } = useProfile();
  const [avatarError, setAvatarError] = useState(false);
  const [liveCredits, setLiveCredits] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    getSoloCreditFlow(accessToken).then((flow) => {
      if (isMounted && flow && typeof flow.remainingCredits === 'number') {
        setLiveCredits(flow.remainingCredits);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [accessToken]);

  const creditsObj = (profile?.credits || (profile as any)?.data?.credits || (profile as any)?.user?.credits) as any;
  const creditBalance = useMemo(() => {
    if (typeof creditsObj === 'number' && creditsObj >= 0) return creditsObj.toLocaleString();
    if (creditsObj && typeof creditsObj === 'object') {
      if (typeof creditsObj.balance === 'number' && creditsObj.balance >= 0) return creditsObj.balance.toLocaleString();
      if (typeof creditsObj.remaining === 'number' && creditsObj.remaining >= 0) return creditsObj.remaining.toLocaleString();
      if (typeof creditsObj.plan_credits === 'number' || typeof creditsObj.topup_credits === 'number') {
        const sum = (creditsObj.plan_credits || 0) + (creditsObj.topup_credits || 0);
        if (sum > 0) return sum.toLocaleString();
      }
      if (typeof creditsObj.total_purchased === 'number' && creditsObj.total_purchased > 0) return creditsObj.total_purchased.toLocaleString();
    }
    if (typeof liveCredits === 'number' && liveCredits > 0) return liveCredits.toLocaleString();
    return '0';
  }, [creditsObj, liveCredits]);

  const pathname = usePathname();
  const isAgencyMode = useMemo(() => {
    // 1. Check userRole from AuthContext
    if (userRole === 'agency_user' || userRole === 'agency' || userRole === 'agency_admin' || userRole === 'team') {
      return true;
    }

    // 2. Check profile object role or is_agency flag
    const p = profile as any;
    if (p) {
      if (p.is_agency === true || p.is_agency === 1 || p.is_agency === 'true') {
        return true;
      }
      if (p.role === 'agency_user' || p.role === 'agency' || p.role === 'agency_admin' || p.role === 'team') {
        return true;
      }
      if (p.user_type === 'agency' || p.user_type === 'agency_user') {
        return true;
      }
      // Explicit non-agency role check on profile
      if (
        p.role === 'agent' ||
        p.role === 'solo' ||
        p.role === 'solo_agent' ||
        p.role === 'agent_user' ||
        p.user_type === 'agent' ||
        p.user_type === 'solo'
      ) {
        return false;
      }
    }

    // 3. Explicit non-agency role check on userRole
    if (userRole === 'agent' || userRole === 'solo' || userRole === 'solo_agent' || userRole === 'agent_user') {
      return false;
    }

    // 4. Fallback to explicit prop passed from parent
    return isAgency;
  }, [userRole, profile, isAgency]);

  const userInitials = propUserInitials || (profile ? ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() : '') || 'P';
  const userName = propUserName || (profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '') || 'User';
  const userEmail = propUserEmail || profile?.email || '';
  const rawImage = profile?.image;
  const userAvatarUri = (rawImage && typeof rawImage === 'string' && rawImage.trim().length > 0 && rawImage !== 'null' && rawImage !== 'undefined') ? rawImage.trim() : null;

  useEffect(() => {
    setAvatarError(false);
  }, [userAvatarUri]);

  const handleSignOut = useCallback(() => {
    setMenuOpen(false);
    setShowSignOutModal(true);
  }, []);

  const confirmSignOut = useCallback(() => {
    setShowSignOutModal(false);
    logout();
  }, [logout]);

  const MENU_ACTIONS: MenuAction[] = useMemo(() => [
    {
      id: 'profile',
      icon: 'account-outline',
      label: 'My Profile',
      onPress: () => router.push(profileRoute),
    },
    {
      id: 'notifications',
      icon: 'bell-outline',
      label: 'Notifications',
      onPress: () => router.push('/(main)/notifications'),
    },
    {
      id: 'theme',
      icon: theme === 'dark' ? 'weather-night' : 'weather-sunny',
      label: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
      onPress: toggleTheme,
    },
    {
      id: 'signout',
      icon: 'logout-variant',
      label: 'Sign Out',
      color: '#EF4444',
      onPress: handleSignOut,
    },
  ], [theme, toggleTheme, router, profileRoute, handleSignOut]);

  return (
    <>
      <View style={styles.header}>
        {/* Hamburger */}
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && styles.iconBtnPressed,
          ]}
          onPress={onMenuPress}
        >
          <MaterialCommunityIcons
            name="menu"
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>

        {/* Hidden Logo / Center Area */}
        <View style={styles.center}>
          {!isAgencyMode && (
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/rem.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>Zien</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {isAgencyMode ? (
            <Pressable
              style={({ pressed }) => [styles.agencyPill, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/(main)/agency/billing-plan')}
            >
              <View style={styles.agencyPillDot} />
              <Text style={styles.agencyPillText}>AGENCY STATUS: ACTIVE</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.creditsPill, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/(main)/billing-usage')}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#7C3AED" />
              <Text style={styles.creditsPillText}>{creditBalance} Credits</Text>
            </Pressable>
          )}

          {isAgencyMode ? (
            <Pressable
              style={styles.agencyAvatarRow}
              onPress={() => setMenuOpen(true)}
            >
              {userAvatarUri && !avatarError ? (
                <Image
                  source={{ uri: userAvatarUri }}
                  style={styles.agencyAvatarSquare}
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={styles.agencyAvatarSquare}>
                  <Text style={styles.agencyAvatarText}>{userInitials}</Text>
                </View>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8 }]}
              onPress={() => setMenuOpen(true)}
            >
              {userAvatarUri && !avatarError ? (
                <Image
                  source={{ uri: userAvatarUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <LinearGradient
                  colors={['#0a2341', '#1B5E9A']}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </LinearGradient>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Bottom sheet user menu */}
      <UserMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        userInitials={userInitials}
        userName={userName}
        userEmail={userEmail}
        userAvatarUri={userAvatarUri && !avatarError ? userAvatarUri : undefined}
        credits={creditBalance}
        isAgency={isAgencyMode}
        actions={MENU_ACTIONS}
      />

      {/* Custom Sign Out Modal to prevent Android Uppercase */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Sign Out</Text>
            <Text style={styles.alertMessage}>Are you sure you want to sign out of Zien?</Text>
            <View style={styles.alertBtnRow}>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnCancel]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={styles.alertBtnTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnConfirm]}
                onPress={() => {
                  setShowSignOutModal(false);
                  logout();
                }}
              >
                <Text style={styles.alertBtnTextConfirm}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export const MainHeader = memo(MainHeaderComponent);

function getStyles(colors: any) {
  return StyleSheet.create({
    header: {
      height: 64,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    iconBtnPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    center: {
      flex: 1,
      alignItems: 'center',
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    logo: {
      width: 38,
      height: 38,
    },
    logoText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    avatarWrap: {
      position: 'relative',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    creditsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#EDE9FE',
      borderWidth: 1,
      borderColor: '#DDD6FE',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 18,
    },
    creditsPillText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#6D28D9',
    },
    agencyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#DCFCE7',
      borderWidth: 1,
      borderColor: '#86EFAC',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 18,
    },
    agencyPillDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#16A34A',
    },
    agencyPillText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#15803D',
      letterSpacing: 0.4,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0a2341',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    avatarImage: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatarText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
      letterSpacing: 0.5,
    },
    onlineDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#22C55E',
      borderWidth: 2,
      borderColor: '#fff',
    },
    agencyHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    agencyStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#F1F5F9', // Pale gray background from image
      borderRadius: 20,
      gap: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    agencyStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#0F172A', // Dark dot
    },
    agencyStatusText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#0F172A',
      letterSpacing: 0.5,
    },
    agencyAvatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    agencyAvatarSquare: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#0F172A', // Navy background from image
      alignItems: 'center',
      justifyContent: 'center',
    },
    agencyAvatarText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '900',
    },
    agencyAdminName: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
    },
    agencyRole: {
      fontSize: 10,
      fontWeight: '900',
      color: '#F97316', // Orange from image
      letterSpacing: 0.5,
      marginTop: -1,
    },
    alertBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    alertBox: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    alertTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    alertMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 24,
    },
    alertBtnRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    alertBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    alertBtnCancel: {
      backgroundColor: 'transparent',
    },
    alertBtnTextCancel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    alertBtnConfirm: {
      backgroundColor: '#FEF2F2',
    },
    alertBtnTextConfirm: {
      fontSize: 14,
      fontWeight: '800',
      color: '#EF4444',
    },
  });
}
