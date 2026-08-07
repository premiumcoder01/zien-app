import { PageHeader } from '@/components/ui';
import { useAppTheme } from '@/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getSoloInboxEmails, SoloInboxEmail } from '@/services/inboxService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';

const formatDisplayName = (emailOrPhone: string) => {
  if (!emailOrPhone) return 'Contact';
  if (emailOrPhone.includes('@')) {
    const username = emailOrPhone.split('@')[0];
    const words = username.split(/[\._\-]/).filter(Boolean);
    if (words.length > 0) {
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return username;
  }
  return emailOrPhone;
};

const formatShortTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch (e) {
    return '';
  }
};



const getCommunicationChannel = (item: SoloInboxEmail) => {
  if ((item as any).channel) {
    return (item as any).channel.toLowerCase();
  }
  if ((item as any).type) {
    return (item as any).type.toLowerCase();
  }
  const recipient = item.recipient_email || '';
  if (recipient.includes('@')) {
    return 'email';
  }
  const content = (item.content_preview || '').toLowerCase();
  const subject = (item.subject || '').toLowerCase();
  const source = (item.module_source || '').toLowerCase();
  if (content.includes('whatsapp') || subject.includes('whatsapp') || source.includes('whatsapp')) {
    return 'whatsapp';
  }
  if (/^\+?[0-9\s\-]+$/.test(recipient)) {
    return 'sms';
  }
  return 'email';
};

// Date formatter helper (e.g. 26/06/2026 15:20)
const formatDate = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
};

export default function InboxScreen() {
  const { colors, theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = getStyles(colors, width, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all');

  // Email Preview Modal Detail State
  const [selectedEmail, setSelectedEmail] = useState<SoloInboxEmail | null>(null);

  // Fetch real-time data using React Query
  const { data: responseData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['solo-inbox-emails', accessToken],
    queryFn: () => getSoloInboxEmails(accessToken),
  });

  const emails = responseData?.data || [];

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateFilter(selectedDate);
    }
  };

  // Counts of each channel
  const channelCounts = useMemo(() => {
    let all = 0;
    let email = 0;
    let sms = 0;
    let whatsapp = 0;

    emails.forEach(item => {
      // Filter counts only by search query and date filter (excluding channel itself)
      const matchesSearch =
        searchQuery === '' ||
        item.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate = !dateFilter || (() => {
        const itemDate = new Date(item.created_at);
        return (
          itemDate.getFullYear() === dateFilter.getFullYear() &&
          itemDate.getMonth() === dateFilter.getMonth() &&
          itemDate.getDate() === dateFilter.getDate()
        );
      })();

      if (matchesSearch && matchesDate) {
        all++;
        const channel = getCommunicationChannel(item);
        if (channel === 'email') email++;
        else if (channel === 'sms') sms++;
        else if (channel === 'whatsapp') whatsapp++;
      }
    });

    return { all, email, sms, whatsapp };
  }, [emails, searchQuery, dateFilter]);

  // Filter logic based on search queries, channel filters, and date filters
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // 1. Search Query Filter
      const matchesSearch =
        searchQuery === '' ||
        item.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Channel Filter
      const itemChannel = getCommunicationChannel(item);
      const matchesChannel =
        channelFilter === 'all' ||
        itemChannel === channelFilter;

      // 3. Date Filter
      const matchesDate = !dateFilter || (() => {
        const itemDate = new Date(item.created_at);
        return (
          itemDate.getFullYear() === dateFilter.getFullYear() &&
          itemDate.getMonth() === dateFilter.getMonth() &&
          itemDate.getDate() === dateFilter.getDate()
        );
      })();

      return matchesSearch && matchesChannel && matchesDate;
    });
  }, [emails, searchQuery, channelFilter, dateFilter]);

  // Group communications by contact/recipient_email (Web Parity)
  const groupedConversations = useMemo(() => {
    const map = new Map<string, { latestItem: SoloInboxEmail; count: number }>();

    filteredEmails.forEach((item) => {
      const key = item.recipient_email.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { latestItem: item, count: 1 });
      } else {
        const existing = map.get(key)!;
        existing.count += 1;
        if (new Date(item.created_at).getTime() > new Date(existing.latestItem.created_at).getTime()) {
          existing.latestItem = item;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => 
      new Date(b.latestItem.created_at).getTime() - new Date(a.latestItem.created_at).getTime()
    );
  }, [filteredEmails]);



  // Status Badge renderer helper
  const renderStatusBadge = (status: string) => {
    const lowerStatus = status.toLowerCase();
    let bg = '#DCFCE7';
    let text = '#15803D';
    let icon: 'check-circle-outline' | 'alert-circle-outline' | 'clock-outline' = 'check-circle-outline';

    if (lowerStatus === 'failed') {
      bg = '#FEE2E2';
      text = '#B91C1C';
      icon = 'alert-circle-outline';
    } else if (lowerStatus === 'delivered') {
      bg = '#E0F2FE';
      text = '#0369A1';
      icon = 'check-circle-outline';
    } else if (lowerStatus === 'pending') {
      bg = '#FEF3C7';
      text = '#B45309';
      icon = 'clock-outline';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={13} color={text} />
        <Text style={[styles.statusBadgeText, { color: text }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    );
  };

  // Render Table Header (Wide layout / Table view)
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 2.5 }]}>RECIPIENT</Text>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>MODULE</Text>
      <Text style={[styles.headerCell, { flex: 1.2 }]}>STATUS</Text>
      <Text style={[styles.headerCell, { flex: 2 }]}>DATE</Text>
      <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>ACTION</Text>
    </View>
  );

  const navigateToDetail = (item: SoloInboxEmail) => {
    router.push({
      pathname: '/(main)/inbox/[id]',
      params: {
        recipient_email: item.recipient_email,
      },
    });
  };

  // Render Table Row (Wide layout / Table view)
  const renderTableRow = (item: SoloInboxEmail) => {
    const avatarLetter = item.recipient_email ? item.recipient_email.charAt(0).toUpperCase() : '?';
    const displayDate = formatDate(item.created_at);

    return (
      <View key={item.id} style={styles.tableRow}>
        {/* Recipient info with circle avatar */}
        <View style={[styles.cell, { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <Text style={styles.recipientText} numberOfLines={1}>
            {item.recipient_email}
          </Text>
        </View>

        {/* Module source badge */}
        <View style={[styles.cell, { flex: 1.5 }]}>
          <View style={styles.moduleBadge}>
            <Text style={styles.moduleBadgeText}>
              {item.module_source.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={[styles.cell, { flex: 1.2 }]}>
          {renderStatusBadge(item.status)}
        </View>

        {/* Date representation */}
        <View style={[styles.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.dateText}>{displayDate}</Text>
        </View>

        {/* Action button eye icon */}
        <View style={[styles.cell, { flex: 0.8, alignItems: 'center' }]}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => navigateToDetail(item)}
          >
            <MaterialCommunityIcons name="eye-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  };

  // Render Card Item (Mobile layout / Web-matching conversation view)
  const renderCardItem = (item: SoloInboxEmail) => {
    const displayName = formatDisplayName(item.recipient_email);
    const avatarLetter = displayName.charAt(0).toUpperCase();
    const shortTime = formatShortTime(item.created_at);
    const channel = getCommunicationChannel(item);

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => navigateToDetail(item)}
      >
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text style={styles.recipientName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.timeText}>{shortTime}</Text>
            </View>

            <Text style={styles.subjectText} numberOfLines={1}>
              {item.subject || 'No Subject'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[
                  styles.channelBadge,
                  channel === 'email' ? { backgroundColor: '#E0F2FE' } :
                  channel === 'whatsapp' ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#F3E8FF' }
                ]}>
                  <Text style={[
                    styles.channelBadgeText,
                    channel === 'email' ? { color: '#0369A1' } :
                    channel === 'whatsapp' ? { color: '#15803D' } : { color: '#6B21A8' }
                  ]}>
                    {channel.toUpperCase()}
                  </Text>
                </View>
                {renderStatusBadge(item.status)}
              </View>

              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar key={theme} style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Main Page Header */}
      <PageHeader
        title="Communication Inbox"
        subtitle="Track all emails and communications sent from your Zien account"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters Card */}
        <View style={styles.filterCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                placeholder="Search by email or subject..."
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.dateFilterContainer}>
              <Pressable
                style={styles.dateInputPressable}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.dateInputText, !dateFilter && { color: colors.inputPlaceholder }]}>
                  {dateFilter ? dateFilter.toLocaleDateString('en-GB') : 'dd/mm/yyyy'}
                </Text>
              </Pressable>
              {dateFilter && (
                <Pressable
                  style={styles.clearDateBtn}
                  onPress={() => setDateFilter(null)}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>


          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.channelsPillsContainer} style={{ marginTop: 4 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'email', label: 'Email' },
              { key: 'sms', label: 'SMS' },
              { key: 'whatsapp', label: 'WhatsApp' }
            ].map((pill) => {
              const isActive = channelFilter === pill.key;
              return (
                <Pressable
                  key={pill.key}
                  style={[
                    styles.pillButton,
                    isActive && styles.pillButtonActive
                  ]}
                  onPress={() => setChannelFilter(pill.key as any)}
                >
                  <Text style={[
                    styles.pillButtonText,
                    isActive && styles.pillButtonTextActive
                  ]}>
                    {pill.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>



        {/* Content Section (Loading / Empty / Table / Cards) */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={styles.loadingText}>Fetching communications...</Text>
          </View>
        ) : filteredEmails.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="message-off-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No communications found</Text>
          </View>
        ) : width >= 768 ? (
          /* Desktop / Tablet Grid Table View */
          <View style={styles.tableCard}>
            {renderTableHeader()}
            {groupedConversations.map((group) => renderTableRow(group.latestItem))}
          </View>
        ) : (
          /* Mobile Card View */
          <View style={styles.cardsList}>
            {groupedConversations.map((group) => renderCardItem(group.latestItem))}
          </View>
        )}
      </ScrollView>



      {/* Date Picker Modal for iOS / Standard Trigger */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowDatePicker(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerToolbar}>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateFilter || new Date()}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                textColor={colors.textPrimary}
                style={styles.pickerInternal}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display="spinner"
          onChange={onDateChange}
        />
      )}


    </LinearGradient>
  );
}

function getStyles(colors: any, width: number, theme: string) {
  const isWide = width >= 768;
  const isDark = theme === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    statsSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    statsSummaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    recipientName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    subjectText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    timeText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
    channelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    channelBadgeText: { fontSize: 10, fontWeight: '800' },
    detailModalSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    viewProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0B2D3E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    viewProfileBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    webSubjectBanner: { backgroundColor: '#0B2341', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    webSubjectText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1, paddingRight: 10 },
    webSubjectTime: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    metaInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 2 },
    metaInfoText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    webViewWrapper: { height: 420, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: '#FFFFFF' },
    totalSentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.inputBackground : '#FFFFFF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#E2E8F0',
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 6,
      shadowColor: '#000',
      shadowOpacity: 0.02,
      shadowRadius: 3,
      elevation: 1,
    },
    totalSentBadgeLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    totalSentBadgeValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    filterCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: isWide ? 'row' : 'column',
      alignItems: isWide ? 'center' : 'stretch',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.01,
      shadowRadius: 5,
      elevation: 1,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.inputBackground : '#F8FAFC',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#E2E8F0',
      flex: isWide ? 1.5 : undefined,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      marginLeft: 8,
      fontWeight: '500',
    },
    dropdownsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      justifyContent: isWide ? 'flex-end' : 'space-between',
      flex: isWide ? 1 : undefined,
    },
    dropdownWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dropdownLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.inputBackground : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#CBD5E1',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 6,
      minWidth: 80,
      justifyContent: 'space-between',
    },
    dropdownTriggerText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    // Custom Dropdown Modal Sleek styles
    dropdownBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dropdownPopover: {
      backgroundColor: '#334155',
      borderRadius: 14,
      paddingVertical: 8,
      width: 220,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    dropdownTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#94A3B8',
      paddingHorizontal: 16,
      paddingVertical: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dropdownDivider: {
      height: 1,
      backgroundColor: '#475569',
      marginVertical: 4,
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    dropdownOptionPressed: {
      backgroundColor: '#475569',
    },
    dropdownCheckContainer: {
      width: 20,
      justifyContent: 'center',
    },
    dropdownOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#E2E8F0',
      flex: 1,
    },
    dropdownOptionTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    // Desktop Grid View Card and Table styles
    tableCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 8,
      shadowColor: '#000',
      shadowOpacity: 0.01,
      shadowRadius: 10,
      elevation: 2,
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      backgroundColor: isDark ? colors.inputBackground : '#F8FAFC',
      borderRadius: 8,
    },
    headerCell: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    cell: {
      justifyContent: 'center',
    },
    recipientText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    avatarBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#243141' : '#0F172A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    moduleBadge: {
      backgroundColor: isDark ? '#243141' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#E2E8F0',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    moduleBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    dateText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? '#243141' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonPressed: {
      backgroundColor: '#E2E8F0',
    },
    // Mobile Card styles
    cardsList: {
      gap: 12,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.02,
      shadowRadius: 8,
      elevation: 2,
    },
    cardPressed: {
      backgroundColor: 'rgba(0,0,0,0.01)',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingBottom: 10,
      marginBottom: 10,
    },
    cardBody: {
      gap: 8,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardLabel: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    // Loading State
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 10,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    // Empty State
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.inputPlaceholder,
      fontWeight: '600',
    },
    // Detail Modal styles
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    detailModalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      width: '100%',
      maxWidth: 550,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 10,
      overflow: 'hidden',
    },
    detailModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    detailModalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    detailModalBody: {
      padding: 20,
      gap: 16,
    },
    detailItem: {
      gap: 4,
    },
    detailRow: {
      flexDirection: 'row',
      gap: 16,
    },
    detailLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    detailValueBold: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    detailDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 4,
    },
    messageContentBox: {
      backgroundColor: isDark ? colors.inputBackground : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#E2E8F0',
      borderRadius: 10,
      padding: 14,
      minHeight: 100,
    },
    messageContentText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      fontWeight: '500',
    },
    searchRow: {
      flexDirection: isWide ? 'row' : 'column',
      alignItems: isWide ? 'center' : 'stretch',
      gap: 12,
      width: '100%',
    },
    dateFilterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.inputBackground : '#F8FAFC',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#E2E8F0',
      flex: isWide ? 1 : undefined,
      position: 'relative',
    },
    dateInputPressable: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      height: '100%',
    },
    dateInputText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    clearDateBtn: {
      position: 'absolute',
      right: 12,
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    channelsPillsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    pillButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 100,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pillButtonActive: {
      backgroundColor: colors.accentTeal || '#0EA5E9',
      borderColor: colors.accentTeal || '#0EA5E9',
    },
    pillButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    pillButtonTextActive: {
      color: '#FFFFFF',
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
    },
    pickerToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    doneBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    doneBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.accentTeal || '#0EA5E9',
    },
    pickerInternal: {
      width: '100%',
      height: 200,
    },
  });
}
