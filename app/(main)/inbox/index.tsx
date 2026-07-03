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

// Module and Status dropdown choices
const MODULE_OPTIONS = ['All', 'CRM', 'Campaign', 'Auth', 'Property'];
const STATUS_OPTIONS = ['All', 'Sent', 'Delivered', 'Failed'];

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
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Popover Visibility States
  const [moduleMenuVisible, setModuleMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  // Email Preview Modal Detail State
  const [selectedEmail, setSelectedEmail] = useState<SoloInboxEmail | null>(null);

  // Fetch real-time data using React Query
  const { data: responseData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['solo-inbox-emails', accessToken],
    queryFn: () => getSoloInboxEmails(accessToken),
  });

  const emails = responseData?.data || [];

  // Filter logic based on search queries, module selections, and status filters
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // 1. Search Query Filter
      const matchesSearch =
        searchQuery === '' ||
        item.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Module Filter
      const matchesModule =
        moduleFilter === 'All' ||
        item.module_source.toLowerCase().includes(moduleFilter.toLowerCase());

      // 3. Status Filter
      const matchesStatus =
        statusFilter === 'All' ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [emails, searchQuery, moduleFilter, statusFilter]);

  // Dropdown option custom component
  const renderDropdownModal = (
    label: string,
    value: string,
    options: string[],
    onSelect: (val: string) => void,
    visible: boolean,
    onClose: () => void
  ) => {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.dropdownBackdrop} onPress={onClose}>
          <View style={styles.dropdownPopover}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <View style={styles.dropdownDivider} />
            {options.map((option) => {
              const isSelected = option === value;
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    pressed && styles.dropdownOptionPressed
                  ]}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                >
                  <View style={styles.dropdownCheckContainer}>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    );
  };

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
            onPress={() => setSelectedEmail(item)}
          >
            <MaterialCommunityIcons name="eye-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  };

  // Render Card Item (Mobile layout / card-based view)
  const renderCardItem = (item: SoloInboxEmail) => {
    const avatarLetter = item.recipient_email ? item.recipient_email.charAt(0).toUpperCase() : '?';
    const displayDate = formatDate(item.created_at);

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setSelectedEmail(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
            <Text style={styles.recipientText} numberOfLines={1}>
              {item.recipient_email}
            </Text>
          </View>
          <Pressable
            style={styles.actionButton}
            onPress={() => setSelectedEmail(item)}
          >
            <MaterialCommunityIcons name="eye-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Module:</Text>
            <View style={styles.moduleBadge}>
              <Text style={styles.moduleBadgeText}>
                {item.module_source.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Status:</Text>
            {renderStatusBadge(item.status)}
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Sent Date:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.dateText}>{displayDate}</Text>
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

          <View style={styles.dropdownsContainer}>
            {/* Module Filter Trigger */}
            <View style={styles.dropdownWrapper}>
              <Text style={styles.dropdownLabel}>Module:</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setModuleMenuVisible(true)}
              >
                <Text style={styles.dropdownTriggerText}>{moduleFilter}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Status Filter Trigger */}
            <View style={styles.dropdownWrapper}>
              <Text style={styles.dropdownLabel}>Status:</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setStatusMenuVisible(true)}
              >
                <Text style={styles.dropdownTriggerText}>{statusFilter}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Total Sent Stats Summary Info */}
        <View style={styles.statsSummaryRow}>
          <Text style={styles.statsSummaryText}>
            Showing {filteredEmails.length} of {emails.length} communications
          </Text>
          <View style={styles.totalSentBadge}>
            <Text style={styles.totalSentBadgeLabel}>TOTAL SENT</Text>
            <Text style={styles.totalSentBadgeValue}>{emails.length}</Text>
          </View>
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
            {filteredEmails.map((item) => renderTableRow(item))}
          </View>
        ) : (
          /* Mobile Card View */
          <View style={styles.cardsList}>
            {filteredEmails.map((item) => renderCardItem(item))}
          </View>
        )}
      </ScrollView>

      {/* Module Dropdown Popover */}
      {renderDropdownModal(
        'Filter by Module',
        moduleFilter,
        MODULE_OPTIONS,
        setModuleFilter,
        moduleMenuVisible,
        () => setModuleMenuVisible(false)
      )}

      {/* Status Dropdown Popover */}
      {renderDropdownModal(
        'Filter by Status',
        statusFilter,
        STATUS_OPTIONS,
        setStatusFilter,
        statusMenuVisible,
        () => setStatusMenuVisible(false)
      )}

      {/* Email Preview Modal Dialog */}
      <Modal
        visible={!!selectedEmail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEmail(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEmail(null)}>
          <Pressable style={styles.detailModalContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Email Preview</Text>
              <Pressable style={styles.closeButton} onPress={() => setSelectedEmail(null)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            {selectedEmail && (
              <ScrollView contentContainerStyle={styles.detailModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Recipient</Text>
                  <Text style={styles.detailValue}>{selectedEmail.recipient_email}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Subject</Text>
                  <Text style={styles.detailValueBold}>{selectedEmail.subject}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailItem, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Module Source</Text>
                    <View style={styles.moduleBadge}>
                      <Text style={styles.moduleBadgeText}>
                        {selectedEmail.module_source.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailItem, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={{ alignItems: 'flex-start' }}>
                      {renderStatusBadge(selectedEmail.status)}
                    </View>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sent Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedEmail.created_at)}</Text>
                </View>

                <View style={styles.detailDivider} />

                <Text style={styles.detailLabel}>Email Content Body</Text>
                <View style={styles.messageContentBox}>
                  <Text style={styles.messageContentText}>
                    {selectedEmail.content_preview}
                  </Text>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  });
}
