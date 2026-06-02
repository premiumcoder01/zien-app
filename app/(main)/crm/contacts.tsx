import { PageHeader } from '@/components/ui/PageHeader';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { addCRMContact, AddCRMContactPayload, CRMContact, deleteCRMContact, getCRMContacts, getCRMMeta, updateCRMContact, updateCRMContactStatus } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddContactModal } from './components/modals/AddContactModal';
import { AIImportModal } from './components/modals/AIImportModal';
import { ManageMetaModal } from './components/modals/ManageMetaModal';
import { QuickFilterModal } from './components/modals/QuickFilterModal';

const STATUS_OPTIONS = ['All status', 'Active', 'Inactive (archived)'];
const TYPE_OPTIONS = ['Buyer', 'Seller', 'Investor'] as const;

export default function ContactsScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // API Metadata
  const { data: metaData } = useQuery({
    queryKey: ['crm-meta'],
    queryFn: () => getCRMMeta(accessToken!),
    enabled: !!accessToken,
  });

  const [selectedGroup, setSelectedGroup] = useState('All groups');
  const [selectedStatus, setSelectedStatus] = useState('All status');
  const [selectedTag, setSelectedTag] = useState('All tags');

  // API Contacts - Server-side Filtering
  const { data: serverContacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['crm-contacts', debouncedSearch, selectedGroup, selectedStatus, selectedTag],
    queryFn: () => {
      const filters: any = {};
      if (debouncedSearch) filters.q = debouncedSearch;

      if (selectedGroup !== 'All groups') {
        const groupObj = metaData?.groups?.find(g => g.name === selectedGroup);
        if (groupObj) filters.group_id = groupObj.id;
      }

      if (selectedTag !== 'All tags') {
        const tagObj = metaData?.tags?.find(t => t.name === selectedTag);
        if (tagObj) filters.tag_id = tagObj.id;
      }

      if (selectedStatus !== 'All status') {
        filters.status = selectedStatus === 'Active' ? 1 : 0;
      }

      return getCRMContacts(accessToken!, filters);
    },
    enabled: !!accessToken,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [manageMetaVisible, setManageMetaVisible] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [aiImportVisible, setAiImportVisible] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState<'group' | 'status' | 'tag' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const clearFilters = () => {
    setSearch('');
    setSelectedGroup('All groups');
    setSelectedStatus('All status');
    setSelectedTag('All tags');
  };

  const filtersActive = search !== '' || selectedGroup !== 'All groups' || selectedStatus !== 'All status' || selectedTag !== 'All tags';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crm-meta'] }),
        queryClient.invalidateQueries({ queryKey: ['crm-contacts'] })
      ]);
    } finally {
      setRefreshing(false);
    }
  };


  // Management State
  const availableGroups = useMemo(() => {
    return metaData?.groups?.map(g => g.name) || [];
  }, [metaData]);

  const availableTags = useMemo(() => {
    return metaData?.tags?.map(t => t.name) || [];
  }, [metaData]);

  const groupOptions = ['All groups', ...availableGroups];
  const tagOptionsShow = ['All tags', ...availableTags];

  const contactsList = useMemo(() => {
    return serverContacts || [];
  }, [serverContacts]);

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedContact(null);
    setModalVisible(true);
  };

  const openEditModal = (contact: CRMContact) => {
    setIsEditing(true);
    setSelectedContact(contact);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleToggleStatus = async (contactId: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 0 ? 'archiving' : 'restoring';

    try {
      setIsUpdating(true);
      await updateCRMContactStatus(accessToken!, contactId, newStatus);
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
    } catch (error: any) {
      Alert.alert('Status Update Failed', error.message || `Failed to update contact status while ${actionText}.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveContact = async (data: any) => {
    const groupObj = metaData?.groups?.find(g => g.name === data.group);
    const tagObj = metaData?.tags?.find(t => t.name === data.tag);

    if (!groupObj || !tagObj) {
      Alert.alert('Selection Error', 'Please select a valid group and tag.');
      return;
    }

    const payload: AddCRMContactPayload = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      country_code: data.countryCode,
      group_id: groupObj.id,
      tag_id: tagObj.id,
    };

    try {
      setIsUpdating(true);
      if (isEditing && selectedContact) {
        await updateCRMContact(accessToken!, selectedContact.id, payload);
      } else {
        await addCRMContact(accessToken!, payload);
      }
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
    } catch (error: any) {
      Alert.alert('API Error', error.message || `Something went wrong while ${isEditing ? 'updating' : 'adding'} contact`);
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteContactId(id);
  };

  const handleDeleteContact = async (id: string) => {
    try {
      setIsUpdating(true);
      await deleteCRMContact(accessToken!, id);
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete contact');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleDropdown = (type: 'group' | 'status' | 'tag') => {
    setActiveDropdown(activeDropdown === type ? null : type);
  };

  const formatCurrency = (val: string | number | null) => {
    if (!val) return 'N/A';
    return typeof val === 'number' ? `$${val.toLocaleString()}` : val;
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <PageHeader
        title="Contacts"
        subtitle="Unified lead intelligence with real-time attribution data."
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.cardBackground}
          />
        }>

        {/* Actions */}
        <View style={styles.topActions}>
          <Pressable style={styles.actionBtn} onPress={() => setAiImportVisible(true)}>
            <MaterialCommunityIcons name="folder-upload-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>AI Import</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setManageMetaVisible(true)}>
            <MaterialCommunityIcons name="account-multiple-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Groups & tags</Text>
          </Pressable>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Find by name, email, or source..."
                placeholderTextColor="#94A3B8"
              />
              {search !== '' && (
                <Pressable onPress={() => setSearch('')} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.dropdownRowThree}>
            <Pressable style={[styles.filterBtn, selectedGroup !== 'All groups' && styles.filterBtnActive]} onPress={() => toggleDropdown('group')}>
              <MaterialCommunityIcons name="filter-outline" size={14} color={selectedGroup !== 'All groups' ? colors.textPrimary : '#64748B'} />
              <Text style={[styles.filterBtnText, selectedGroup !== 'All groups' && styles.filterBtnTextActive]} numberOfLines={1}>{selectedGroup}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={selectedGroup !== 'All groups' ? colors.textPrimary : '#64748B'} />
            </Pressable>

            <Pressable style={[styles.filterBtn, selectedStatus !== 'All status' && styles.filterBtnActive]} onPress={() => toggleDropdown('status')}>
              <MaterialCommunityIcons name="account-outline" size={14} color={selectedStatus !== 'All status' ? colors.textPrimary : '#64748B'} />
              <Text style={[styles.filterBtnText, selectedStatus !== 'All status' && styles.filterBtnTextActive]} numberOfLines={1}>{selectedStatus}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={selectedStatus !== 'All status' ? colors.textPrimary : '#64748B'} />
            </Pressable>

            <Pressable style={[styles.filterBtn, selectedTag !== 'All tags' && styles.filterBtnActive]} onPress={() => toggleDropdown('tag')}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={selectedTag !== 'All tags' ? colors.textPrimary : '#64748B'} />
              <Text style={[styles.filterBtnText, selectedTag !== 'All tags' && styles.filterBtnTextActive]} numberOfLines={1}>{selectedTag}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={selectedTag !== 'All tags' ? colors.textPrimary : '#64748B'} />
            </Pressable>
          </View>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>Showing <Text style={{ fontWeight: '900', color: colors.textPrimary }}>{contactsList.length}</Text> intelligent matches</Text>
            {filtersActive && (
              <Pressable onPress={clearFilters} style={styles.clearFiltersBtn}>
                <MaterialCommunityIcons name="filter-remove-outline" size={14} color={colors.accent} />
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Lead Grid */}
        <View style={styles.contactList}>
          {isLoadingContacts ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loaderText}>Syncing CRM Data...</Text>
            </View>
          ) : contactsList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No leads found matching your filters.</Text>
            </View>
          ) : contactsList.map((contact: CRMContact) => {
            const fullName = `${contact.first_name} ${contact.last_name}`;
            const groupName = contact.group?.name || 'Standard';
            const tagName = contact.tag?.name || 'General';
            const rawTagColor = contact.tag?.tag_color || '#64748B';
            const adjustTagColor = (color: string) => {
              if (theme !== 'dark') return color;
              const darkColors = ['#0A2341', '#0B2D3E', '#000000'];
              if (darkColors.includes(color.toUpperCase())) {
                return '#00a7b5';
              }
              if (color.startsWith('#') && color.length === 7) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness < 120) {
                  return '#00a7b5';
                }
              }
              return color;
            };
            const tagColor = adjustTagColor(rawTagColor);
            const phoneNumber = contact.phone ? `${contact.country_code} ${contact.phone}` : 'N/A';
            const dateJoined = new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <View key={contact.id} style={styles.contactCard}>
                {/* 1. Header Info */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{contact.first_name.charAt(0)}</Text>
                    <View style={[styles.statusDot, { backgroundColor: contact.status === 1 ? '#10B981' : '#64748B' }]} />
                  </View>
                  <View style={styles.contactMain}>
                    <Text style={styles.contactName} numberOfLines={1}>{fullName}</Text>
                    <View style={styles.contactSubInfo}>
                      <MaterialCommunityIcons name="email-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.contactEmail}>{contact.email}</Text>
                    </View>
                    {contact.phone && (
                      <View style={styles.contactSubInfo}>
                        <MaterialCommunityIcons name="phone-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.contactEmail}>{phoneNumber}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.heatBadge, { backgroundColor: contact.heat_index > 70 ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2') : colors.surfaceIcon }]}>
                    <MaterialCommunityIcons name="fire" size={16} color={contact.heat_index > 70 ? '#EF4444' : colors.iconMuted} />
                    <Text style={[styles.heatValue, { color: contact.heat_index > 70 ? '#EF4444' : colors.textPrimary }]}>{contact.heat_index}</Text>
                  </View>
                </View>

                {/* 2. Metadata Tags Row */}
                <View style={styles.tagsRow}>
                  <View style={[styles.statusBadge, { backgroundColor: contact.status === 1 ? '#10B98115' : '#64748B15' }]}>
                    <View style={[styles.statusDotSmall, { backgroundColor: contact.status === 1 ? '#10B981' : '#64748B' }]} />
                    <Text style={[styles.statusText, { color: contact.status === 1 ? '#10B981' : '#64748B' }]}>
                      {contact.status === 1 ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                  <View style={styles.dataBadge}>
                    <MaterialCommunityIcons name="account-group-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.dataBadgeText}>{groupName}</Text>
                  </View>
                  <View style={[styles.dataBadge, { borderColor: tagColor, borderWidth: 0.5 }]}>
                    <Text style={[styles.dataBadgeText, { color: tagColor }]}>{tagName}</Text>
                  </View>
                  {contact.pipeline_stage && (
                    <View style={[styles.dataBadge, { backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.12)' : '#F0F9FA' }]}>
                      <Text style={[styles.dataBadgeText, { color: theme === 'dark' ? '#00a7b5' : '#0a2341' }]}>{contact.pipeline_stage}</Text>
                    </View>
                  )}
                </View>

                {/* 3. High-Intelligence Insights Grid - Conditionally shown */}
                {(contact.budget || contact.timeline || contact.pre_approved !== null) && (
                  <View style={styles.insightsGrid}>
                    {contact.budget && (
                      <View style={styles.insightBox}>
                        <Text style={styles.insightLabel}>BUDGET</Text>
                        <Text style={styles.insightValue}>{formatCurrency(contact.budget)}</Text>
                      </View>
                    )}
                    {contact.timeline && (
                      <View style={styles.insightBox}>
                        <Text style={styles.insightLabel}>TIMELINE</Text>
                        <Text style={styles.insightValue}>{contact.timeline}</Text>
                      </View>
                    )}
                    {contact.pre_approved !== null && (
                      <View style={styles.insightBox}>
                        <Text style={styles.insightLabel}>PRE-APPROVED</Text>
                        <Text style={[styles.insightValue, { color: contact.pre_approved ? '#10B981' : colors.textPrimary }]}>
                          {contact.pre_approved ? 'YES' : 'NO'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 4. Latest Note Section */}
                {contact.latest_note && (
                  <View style={styles.noteBox}>
                    <View style={styles.noteHeader}>
                      <MaterialCommunityIcons name="text-box-search-outline" size={14} color={theme === 'dark' ? '#00a7b5' : '#0a2341'} />
                      <Text style={styles.noteHeaderText}>
                        LATEST NOTE • {new Date(contact.latest_note.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.noteContent} numberOfLines={2}>
                      {contact.latest_note.content}
                    </Text>
                  </View>
                )}

                {/* 5. Attribution & Source Row */}
                {(contact.source || dateJoined) && (
                  <View style={styles.attributionRow}>
                    {contact.source && (
                      <View style={styles.sourceInfo}>
                        <MaterialCommunityIcons name="compass-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.sourceText}>Source: <Text style={{ color: colors.textPrimary }}>{contact.source}</Text></Text>
                      </View>
                    )}
                    <Text style={styles.joinedDate}>Joined {dateJoined}</Text>
                  </View>
                )}

                {/* 6. Redesigned Premium Action Bar */}
                <View style={styles.cardActionRow}>
                  <Pressable style={styles.archiveAction} onPress={() => handleToggleStatus(contact.id, contact.status)}>
                    <MaterialCommunityIcons
                      name={contact.status === 1 ? "archive-outline" : "refresh"}
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.archiveActionText}>
                      {contact.status === 1 ? 'Archive' : 'Restore'}
                    </Text>
                  </Pressable>

                  <View style={styles.centerActions}>
                    <Pressable style={styles.iconActionBtn} onPress={() => openEditModal(contact)}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable style={[styles.iconActionBtn, { backgroundColor: '#EF444410', borderColor: '#EF444420' }]} onPress={() => confirmDelete(contact.id)}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color="#EF4444" />
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.profileAction}
                    onPress={() => router.push({ pathname: '/(main)/crm/profile', params: { id: contact.id } })}>
                    <Text style={styles.profileActionText}>Profile</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={theme === 'dark' ? '#00a7b5' : '#0a2341'} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modals */}
      <QuickFilterModal
        visible={activeDropdown !== null}
        onClose={() => setActiveDropdown(null)}
        type={activeDropdown}
        options={activeDropdown === 'group' ? groupOptions : activeDropdown === 'status' ? STATUS_OPTIONS : tagOptionsShow}
        selectedValue={activeDropdown === 'group' ? selectedGroup : activeDropdown === 'status' ? selectedStatus : selectedTag}
        onSelect={(val: string) => {
          if (activeDropdown === 'group') setSelectedGroup(val);
          else if (activeDropdown === 'status') setSelectedStatus(val);
          else if (activeDropdown === 'tag') setSelectedTag(val);
        }}
      />

      <AddContactModal
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleSaveContact}
        availableGroups={availableGroups}
        availableTags={availableTags}
        isEditing={isEditing}
        loading={isUpdating}
        initialData={selectedContact ? {
          firstName: selectedContact.first_name,
          lastName: selectedContact.last_name,
          email: selectedContact.email,
          phone: selectedContact.phone,
          group: selectedContact.group?.name,
          tag: selectedContact.tag?.name,
          countryCode: selectedContact.country_code
        } : null}
      />

      <ManageMetaModal
        visible={manageMetaVisible}
        onClose={() => setManageMetaVisible(false)}
      />

      <AIImportModal
        visible={aiImportVisible}
        onClose={() => setAiImportVisible(false)}
        accessToken={accessToken}
        metaData={metaData || null}
        onImportSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
          queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
        }}
      />

      {/* Custom Delete Contact Modal */}
      <Modal
        visible={!!deleteContactId}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteContactId(null)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Delete Contact</Text>
            <Text style={styles.alertMessage}>Are you sure you want to permanently delete this lead? This action cannot be undone.</Text>
            <View style={styles.alertBtnRow}>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnCancel]}
                onPress={() => setDeleteContactId(null)}
              >
                <Text style={styles.alertBtnTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnConfirm]}
                onPress={() => {
                  if (deleteContactId) {
                    handleDeleteContact(deleteContactId);
                  }
                  setDeleteContactId(null);
                }}
              >
                <Text style={styles.alertBtnTextConfirm}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dynamic Action Button */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
        <Pressable style={styles.fab} onPress={openAddModal}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.fabText}>Add Contact</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const getStyles = (colors: ThemeColors, theme?: string) => StyleSheet.create({
  background: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10 },
  topActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  filterSection: { marginBottom: 20 },
  searchRow: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  dropdownRowThree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '08' },
  filterBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary },
  filterBtnTextActive: { color: colors.accent },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 4,
  },
  resultsCount: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginLeft: 4 },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
  },
  contactList: { gap: 16 },
  contactCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#0b2341',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  contactMain: { flex: 1, gap: 2 },
  contactName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  contactSubInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactEmail: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  heatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heatValue: { fontSize: 16, fontWeight: '900' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
  },
  dataBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  insightsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceIcon,
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    justifyContent: 'space-between',
  },
  insightBox: { flex: 1, alignItems: 'center' },
  insightLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginBottom: 4 },
  insightValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  noteBox: {
    backgroundColor: colors.surfaceIcon,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  noteHeaderText: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  noteContent: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', lineHeight: 18 },
  attributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  sourceInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sourceText: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  joinedDate: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.rowBorder,
  },
  archiveAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  archiveActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  centerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  profileAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.08)' : '#0a234108',
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.2)' : '#0a234120',
  },
  profileActionText: {
    fontSize: 14,
    fontWeight: '900',
    color: theme === 'dark' ? '#00a7b5' : '#0a2341',
  },
  loaderContainer: { alignItems: 'center', paddingVertical: 60 },
  loaderText: { marginTop: 12, fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, opacity: 0.6 },
  emptyText: { marginTop: 16, textAlign: 'center', color: colors.textMuted, fontWeight: '700', fontSize: 15 },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  noteBottomSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  bottomSheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: colors.divider,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  fabContainer: { position: 'absolute', right: 20 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme === 'dark' ? '#00a7b5' : '#0a2341',
    gap: 5,
    shadowColor: theme === 'dark' ? '#00a7b5' : '#0a2341',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
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
