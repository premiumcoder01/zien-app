import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  ApiNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notificationService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  } catch {
    return isoString;
  }
}

function getNotificationConfig(type: string) {
  switch (type) {
    case 'hot_lead_alert':
      return {
        icon: 'fire' as const,
        iconColor: '#EF4444',
        bgColor: '#FEF2F2',
        borderColor: '#FEE2E2',
        label: 'Hot Lead',
      };
    case 'checkin_alert':
      return {
        icon: 'account-check-outline' as const,
        iconColor: '#4F46E5',
        bgColor: '#EEF2FF',
        borderColor: '#E0E7FF',
        label: 'Visitor Check-in',
      };
    case 'valuation_alert':
    case 'ai_valuation':
      return {
        icon: 'home-city-outline' as const,
        iconColor: '#0a2341',
        bgColor: 'rgba(10,35,65,0.08)',
        borderColor: 'rgba(10,35,65,0.15)',
        label: 'Valuation',
      };
    case 'campaign_alert':
    case 'campaign':
      return {
        icon: 'email-outline' as const,
        iconColor: '#EA580C',
        bgColor: '#FFF7ED',
        borderColor: '#FFEDD5',
        label: 'Campaign',
      };
    case 'guardian_alert':
    case 'guardian_ai':
      return {
        icon: 'shield-check-outline' as const,
        iconColor: '#16A34A',
        bgColor: '#F0FDF4',
        borderColor: '#DCFCE7',
        label: 'Guardian Safety',
      };
    default:
      return {
        icon: 'bell-outline' as const,
        iconColor: '#06B6D4',
        bgColor: '#ECFEFF',
        borderColor: '#CFFAFE',
        label: 'Alert',
      };
  }
}

// ─────────────────────────────────────────────────────
// Notification Card Component
// ─────────────────────────────────────────────────────
interface NotificationCardProps {
  item: ApiNotification;
  onPress: () => void;
}

const NotificationCard = memo(({ item, onPress }: NotificationCardProps) => {
  const { colors } = useAppTheme();
  const styles = getCardStyles(colors);
  const config = getNotificationConfig(item.notification_type);
  const formattedDate = formatTimestamp(item.created_at);
  const isUnread = !item.is_read;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Left Icon Badge */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        <MaterialCommunityIcons name={config.icon} size={22} color={config.iconColor} />
      </View>

      {/* Main Content */}
      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        <Text style={styles.message} numberOfLines={3}>
          {item.message}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.timestamp}>{formattedDate}</Text>
          {item.data && (
            <View style={styles.viewDetailsChip}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={12} color="#64748B" />
            </View>
          )}
        </View>
      </View>

      {/* Right Unread Glowing Dot */}
      {isUnread && (
        <View style={styles.unreadDotContainer}>
          <View style={styles.unreadDot} />
        </View>
      )}
    </Pressable>
  );
});

function getCardStyles(colors: any) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      position: 'relative',
    },
    cardUnread: {
      backgroundColor: '#FFFFFF',
      borderColor: '#CBD5E1',
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    cardPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.99 }],
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginRight: 12,
      flexShrink: 0,
      marginTop: 2,
    },
    contentWrap: {
      flex: 1,
      paddingRight: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: {
      fontSize: 14.5,
      fontWeight: '700',
      color: '#0F172A',
      lineHeight: 20,
      flex: 1,
    },
    titleUnread: {
      fontWeight: '800',
      color: '#020617',
    },
    message: {
      fontSize: 13,
      color: '#475569',
      lineHeight: 18.5,
      marginBottom: 6,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    timestamp: {
      fontSize: 11.5,
      fontWeight: '500',
      color: '#94A3B8',
    },
    viewDetailsChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    viewDetailsText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: '#475569',
    },
    unreadDotContainer: {
      position: 'absolute',
      top: 18,
      right: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EA580C',
      shadowColor: '#EA580C',
      shadowOpacity: 0.5,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
    },
  });
}

// ─────────────────────────────────────────────────────
// Main Notifications Screen
// ─────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'hot' | 'checkin'>('all');
  const [selectedNotification, setSelectedNotification] = useState<ApiNotification | null>(null);

  // ── 1. Fetch Notifications ──
  const {
    data: notifications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['notifications', accessToken],
    queryFn: () => getNotifications(accessToken || ''),
    enabled: true,
  });

  // ── 2. Mark Single Read Mutation ──
  const markReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id, accessToken || ''),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['notifications', accessToken], (old: ApiNotification[] = []) =>
        old.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
  });

  // ── 3. Mark All Read Mutation ──
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(accessToken || ''),
    onSuccess: () => {
      queryClient.setQueryData(['notifications', accessToken], (old: ApiNotification[] = []) =>
        old.map((n) => ({ ...n, is_read: true }))
      );
      Alert.alert('Done', 'All notifications marked as read.');
    },
  });

  // ── Filter Counts ──
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );
  const hotLeadsCount = useMemo(
    () => notifications.filter((n) => n.notification_type === 'hot_lead_alert').length,
    [notifications]
  );
  const checkinsCount = useMemo(
    () => notifications.filter((n) => n.notification_type === 'checkin_alert').length,
    [notifications]
  );

  // ── Filtered List ──
  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.is_read);
      case 'hot':
        return notifications.filter((n) => n.notification_type === 'hot_lead_alert');
      case 'checkin':
        return notifications.filter((n) => n.notification_type === 'checkin_alert');
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  // ── Handle Card Click ──
  const handleNotificationPress = (item: ApiNotification) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
    setSelectedNotification(item);
  };

  // ── Quick Communication Handlers ──
  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${clean}`);
  };

  const handleEmail = (email?: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with your latest intelligence feed."
        onBack={() => router.back()}
        rightAction={
          unreadCount > 0 ? (
            <Pressable
              style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.7 }]}
              onPress={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <MaterialCommunityIcons name="check-all" size={16} color="#0a2341" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Filter Tabs / Chips */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <Pressable
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}
            >
              All ({notifications.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'unread' && styles.filterChipActive]}
            onPress={() => setActiveFilter('unread')}
          >
            {unreadCount > 0 && <View style={styles.chipUnreadDot} />}
            <Text
              style={[styles.filterChipText, activeFilter === 'unread' && styles.filterChipTextActive]}
            >
              Unread ({unreadCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'hot' && styles.filterChipActive]}
            onPress={() => setActiveFilter('hot')}
          >
            <Text
              style={[styles.filterChipText, activeFilter === 'hot' && styles.filterChipTextActive]}
            >
              🔥 Hot Leads ({hotLeadsCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, activeFilter === 'checkin' && styles.filterChipActive]}
            onPress={() => setActiveFilter('checkin')}
          >
            <Text
              style={[styles.filterChipText, activeFilter === 'checkin' && styles.filterChipTextActive]}
            >
              📍 Check-ins ({checkinsCount})
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Notification Cards List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#0a2341"
            colors={['#0a2341']}
          />
        }
      >
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0a2341" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No notifications found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'unread'
                ? 'You have caught up with all your unread alerts!'
                : 'Stay tuned for real-time open house check-ins and hot leads.'}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((item) => (
            <NotificationCard
              key={`notif-${item.id}`}
              item={item}
              onPress={() => handleNotificationPress(item)}
            />
          ))
        )}
      </ScrollView>

      {/* ───────────────────────────────────────────────────── */}
      {/* Detail Modal for Notification & Lead Info            */}
      {/* ───────────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedNotification}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedNotification(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedNotification && (
              <>
                {/* Modal Header matching Web UI */}
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalHeaderIconBadge,
                      {
                        backgroundColor: getNotificationConfig(
                          selectedNotification.notification_type
                        ).bgColor,
                        borderColor: getNotificationConfig(
                          selectedNotification.notification_type
                        ).borderColor,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getNotificationConfig(selectedNotification.notification_type).icon}
                      size={24}
                      color={
                        getNotificationConfig(selectedNotification.notification_type).iconColor
                      }
                    />
                  </View>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedNotification.title}
                  </Text>
                  <Pressable
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedNotification(null)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                  </Pressable>
                </View>

                {/* Modal Scroll Content */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 500 }}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  <Text style={styles.modalMessage}>{selectedNotification.message}</Text>

                  {/* Visitor Contact & Attributes list matching Web UI */}
                  {selectedNotification.data ? (
                    <View style={styles.webLeadDetailsBox}>
                      {selectedNotification.data.name ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>VISITOR NAME</Text>
                          <Text style={styles.webFieldValue}>{selectedNotification.data.name}</Text>
                        </View>
                      ) : null}

                      {selectedNotification.data.email ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>EMAIL</Text>
                          <Text style={styles.webFieldValue}>{selectedNotification.data.email}</Text>
                        </View>
                      ) : null}

                      {selectedNotification.data.phone ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>PHONE</Text>
                          <Text style={styles.webFieldValue}>{selectedNotification.data.phone}</Text>
                        </View>
                      ) : null}

                      {selectedNotification.data.timeline ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>TIMELINE</Text>
                          <Text style={styles.webFieldValue}>{selectedNotification.data.timeline}</Text>
                        </View>
                      ) : null}

                      {selectedNotification.data.budget ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>BUDGET</Text>
                          <Text style={styles.webFieldValue}>{selectedNotification.data.budget}</Text>
                        </View>
                      ) : null}

                      {selectedNotification.data.pre_approved ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>PRE-APPROVED</Text>
                          <Text style={styles.webFieldValue}>{selectedNotification.data.pre_approved}</Text>
                        </View>
                      ) : null}

                      {selectedNotification.data.interest_signal ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>INTEREST SIGNAL</Text>
                          <Text style={[styles.webFieldValue, { color: '#EA580C' }]}>
                            {selectedNotification.data.interest_signal}
                          </Text>
                        </View>
                      ) : null}

                      {selectedNotification.data.working_with_agent ? (
                        <View style={styles.webFieldGroup}>
                          <Text style={styles.webFieldLabel}>WORKING WITH AGENT?</Text>
                          <Text style={styles.webFieldValue}>
                            {selectedNotification.data.working_with_agent}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────
function getStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(10,35,65,0.08)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    markAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0a2341',
    },
    filterScrollWrapper: {
      paddingBottom: 8,
    },
    filterContainer: {
      paddingHorizontal: 16,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    filterChipActive: {
      backgroundColor: '#0a2341',
      borderColor: '#0a2341',
    },
    filterChipText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: '#475569',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    chipUnreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#EA580C',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    loadingContainer: {
      paddingTop: 80,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748B',
    },
    emptyContainer: {
      paddingTop: 90,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIconCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      color: '#64748B',
      textAlign: 'center',
      lineHeight: 18,
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 22,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 14,
    },
    modalHeaderIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    modalTitle: {
      flex: 1,
      fontSize: 15.5,
      fontWeight: '800',
      color: '#0F172A',
      lineHeight: 21,
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2,
    },
    modalMessage: {
      fontSize: 13.5,
      color: '#334155',
      lineHeight: 20,
      marginBottom: 16,
    },
    webLeadDetailsBox: {
      backgroundColor: '#F8FAFC',
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      gap: 12,
      marginBottom: 14,
    },
    webFieldGroup: {
      gap: 2,
    },
    webFieldLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#64748B',
      letterSpacing: 0.6,
    },
    webFieldValue: {
      fontSize: 14.5,
      fontWeight: '700',
      color: '#0F172A',
    },
    quickActionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: '#E2E8F0',
    },
    quickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 8,
      borderRadius: 8,
    },
    quickBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    modalBottomActionRow: {
      paddingTop: 4,
    },
    modalCrmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#0a2341',
      paddingVertical: 13,
      borderRadius: 12,
    },
    modalCrmBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
