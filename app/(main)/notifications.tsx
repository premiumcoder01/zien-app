import { PageHeader } from '@/components/ui';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
type NotificationItem = {
  id: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  actionLabel?: string;
  actionRoute?: string;
  unread?: boolean;
};

// ─────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────
const NOTIFICATIONS_BY_SECTION: { section: string; items: NotificationItem[] }[] = [
  {
    section: 'TODAY',
    items: [
      {
        id: '1',
        icon: 'home-city-outline',
        iconColor: '#0a2341',
        iconBg: '#0a234118',
        title: 'AI Valuation Completed',
        body: 'Valuation report for 124 Ocean Drive is ready. 15% increase in estimated value.',
        time: '2 hours ago',
        actionLabel: 'View Report',
        actionRoute: '/(main)/properties',
        unread: true,
      },
      {
        id: '2',
        icon: 'email-outline',
        iconColor: '#EA580C',
        iconBg: '#EA580C18',
        title: 'Campaign Sent',
        body: 'Monthly Market Update campaign deployed to 450 contacts. Open rates trending at 32%.',
        time: '4 hours ago',
        actionLabel: 'View Analytics',
        actionRoute: '/(main)/crm/campaigns',
        unread: true,
      },
    ],
  },
  {
    section: 'YESTERDAY',
    items: [
      {
        id: '4',
        icon: 'shield-check-outline',
        iconColor: '#16A34A',
        iconBg: '#16A34A18',
        title: 'Guardian AI Activated',
        body: 'Safety monitoring was active for your showing at 88 Summit Ave.',
        time: 'Yesterday at 4:30 PM',
        actionLabel: 'View Log',
        actionRoute: '/(main)/guardian-ai?tab=logs-reports',
      },
      {
        id: '5',
        icon: 'account-group-outline',
        iconColor: '#0a2341',
        iconBg: '#0a234118',
        title: 'New Leads Acquired',
        body: '3 new leads were captured via your Digital Card NFC tap.',
        time: 'Yesterday at 2:15 PM',
        actionLabel: 'Go to CRM',
        actionRoute: '/(main)/crm',
      },
    ],
  },
  {
    section: 'EARLIER',
    items: [
      {
        id: '6',
        icon: 'home-city-outline',
        iconColor: '#0a2341',
        iconBg: '#0a234118',
        title: 'Property Status Changed',
        body: '45 Lakeview Dr has been moved from Active to Pending based on MLS data sync.',
        time: 'Feb 3, 2026',
      },
    ],
  },
];



// ─────────────────────────────────────────────────────
// NotificationCard Component
// ─────────────────────────────────────────────────────
type NotificationCardProps = NotificationItem & {
  onPress: () => void;
  onActionPress: () => void;
};

const NotificationCard = memo(({
  id, icon, iconColor, iconBg, title, body, time, actionLabel, unread,
  onPress, onActionPress,
}: NotificationCardProps) => {
  const { colors } = useAppTheme();
  const styles = getCardStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        unread && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: unread ? `${iconColor}22` : colors.surfaceIcon }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, unread && styles.titleUnread]}>
            {title}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.body}>{body}</Text>

        {actionLabel && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            onPress={(e) => { e.stopPropagation(); onActionPress(); }}
          >
            <Text style={[styles.actionText, { color: iconColor }]}>{actionLabel}</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color={iconColor} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

function getCardStyles(colors: any) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
      position: 'relative',
      overflow: 'hidden',
      gap: 12,
    },
    cardUnread: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.accentTeal,
      borderWidth: 1,
    },
    cardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.99 }],
    },
    unreadBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginLeft: 4,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 19,
    },
    titleUnread: {
      fontWeight: '800',
    },
    time: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.inputPlaceholder,
      flexShrink: 0,
      marginTop: 1,
    },
    body: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      fontWeight: '400',
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
      alignSelf: 'flex-start',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: `${colors.accentTeal}12`,
    },
    actionText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    dot: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: '#fff',
    },
  });
}

// ─────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}
    >
      {/* ── Page Header ── */}
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with your latest intelligence feed."

        onBack={() => router.back()}
      />

      {/* ── List ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {NOTIFICATIONS_BY_SECTION.map(({ section, items }) => (
          <View key={section} style={styles.section}>
            {/* Section label */}
            <View style={styles.sectionRow}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>{section}</Text>
              <View style={styles.sectionLine} />
            </View>

            {/* Cards */}
            {items.map((item) => (
              <NotificationCard
                key={item.id}
                {...item}
                onPress={() => item.actionRoute && router.push(item.actionRoute as any)}
                onActionPress={() => item.actionRoute && router.push(item.actionRoute as any)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────
// Screen-level styles
// ─────────────────────────────────────────────────────
function getStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.divider,
    },
    sectionTitle: {
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.inputPlaceholder,
    },
  });
}
