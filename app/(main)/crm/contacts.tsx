import { PageHeader } from '@/components/ui/PageHeader';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { addCRMContact, AddCRMContactPayload, CRMContact, deleteCRMContact, getCRMContacts, getCRMMeta, updateCRMContact, updateCRMContactStatus } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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

const getBadgeBgColor = (color: string) => {
  if (color && color.startsWith('#') && color.length === 7) {
    return `${color}15`;
  }
  return 'rgba(100, 116, 139, 0.08)';
};

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
  const { data: serverContacts, isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['crm-contacts', accessToken, debouncedSearch, selectedGroup, selectedStatus, selectedTag],
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
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        refetchContacts();
      }
    }, [accessToken, refetchContacts])
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [contactApiError, setContactApiError] = useState<string | null>(null);
  const [manageMetaVisible, setManageMetaVisible] = useState(false);
  const [aiImportVisible, setAiImportVisible] = useState(false);

  // Select All to Delete states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

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

  const closeModal = () => {
    setModalVisible(false);
    setSelectedContact(null);
    setIsEditing(false);
    setContactApiError(null);
  };

  const openEditModal = (contact: CRMContact) => {
    setIsEditing(true);
    setSelectedContact(contact);
    setModalVisible(true);
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
      auto_merge: true,
    };

    try {
      setIsUpdating(true);
      setContactApiError(null);
      if (isEditing && selectedContact) {
        await updateCRMContact(accessToken || undefined, selectedContact.id, payload);
      } else {
        await addCRMContact(accessToken || undefined, payload);
      }
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
    } catch (error: any) {
      const msg = error?.message || `Something went wrong while ${isEditing ? 'updating' : 'adding'} contact`;
      setContactApiError(msg);
      const isValidation = msg.toLowerCase().includes('already exists') ||
                           msg.toLowerCase().includes('email') ||
                           msg.toLowerCase().includes('phone') ||
                           msg.toLowerCase().includes('required') ||
                           msg.toLowerCase().includes('invalid');
      if (!isValidation) {
        Alert.alert(msg);
      }
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
      setDeleteContactId(null);
      Alert.alert('Success', 'Contact deleted successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete contact');
    } finally {
      setIsUpdating(false);
    }
  };

  // Select All / Deselect All
  const toggleSelectAll = () => {
    if (selectedContactIds.size === contactsList.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(contactsList.map(c => c.id)));
    }
  };

  const toggleSelectContact = (id: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Delete handler
  const handleBulkDelete = async () => {
    if (!accessToken || selectedContactIds.size === 0) return;
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(true);
    const ids = Array.from(selectedContactIds);
    setBulkDeleteProgress({ current: 0, total: ids.length });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await deleteCRMContact(accessToken!, ids[i]);
        successCount++;
      } catch {
        failCount++;
      }
      setBulkDeleteProgress({ current: i + 1, total: ids.length });
    }
    queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
    queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
    setIsBulkDeleting(false);
    setSelectedContactIds(new Set());
    setIsSelectMode(false);
    setBulkDeleteProgress({ current: 0, total: 0 });
    if (failCount > 0) {
      Alert.alert('Done', `${successCount} contacts deleted, ${failCount} failed.`);
    } else {
      Alert.alert('Success', `${successCount} contact${successCount > 1 ? 's' : ''} deleted successfully.`);
    }
  };

  const toggleDropdown = (type: 'group' | 'status' | 'tag') => {
    setActiveDropdown(activeDropdown === type ? null : type);
  };

  const formatCurrency = (val: string | number | null) => {
    if (!val) return 'N/A';
    return typeof val === 'number' ? `$${val.toLocaleString()}` : val;
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportContacts = async () => {
    if (!contactsList || contactsList.length === 0) {
      Alert.alert('Export Contacts', 'No contacts available to export.');
      return;
    }

    try {
      setIsExporting(true);
      const csvHeader = ['First Name', 'Last Name', 'Email', 'Country Code', 'Phone', 'Group', 'Tag', 'Status', 'Heat Index', 'Source', 'Pipeline Stage', 'Budget', 'Timeline', 'Pre-Approved', 'Created At'];
      const csvRows = contactsList.map((c: CRMContact) => [
        c.first_name,
        c.last_name,
        c.email,
        c.country_code || '',
        c.phone || '',
        c.group?.name || '',
        c.tag?.name || '',
        c.status === 1 ? 'Active' : 'Inactive',
        c.heat_index?.toString() || '0',
        c.source || '',
        c.pipeline_stage || '',
        c.budget || '',
        c.timeline || '',
        c.pre_approved !== null ? (c.pre_approved ? 'Yes' : 'No') : '',
        new Date(c.created_at).toLocaleDateString(),
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

      const csvString = [csvHeader.join(','), ...csvRows].join('\n');
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Contacts_Export_${dateStr}.csv`;
      const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
      const docUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(cacheUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (Platform.OS === 'android') {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'text/csv'
            );
            await FileSystem.writeAsStringAsync(safUri, csvString, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            Alert.alert(
              "Download Complete",
              `"${fileName}" has been saved to your selected folder.`
            );
            return;
          }
        } catch (safError) {
          console.warn("StorageAccessFramework failed, falling back to share:", safError);
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(cacheUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Contacts',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        }
      } else {
        await FileSystem.writeAsStringAsync(docUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert(
          "Download Complete",
          `"${fileName}" has been saved directly to your Files app.`
        );
      }
    } catch (error) {
      console.error('Error exporting contacts:', error);
      Alert.alert('Export Failed', 'Failed to export contacts.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <PageHeader
        title="Contacts"
        subtitle="Unified database with full attribution and grouped automation."
        onBack={() => router.back()}
        rightIcon="tray-arrow-down"
        onRightPress={handleExportContacts}
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dropdownRowThreeScroll}
            contentContainerStyle={styles.dropdownRowThree}
          >
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
          </ScrollView>
          <View style={styles.resultsHeader}>
            <View style={styles.resultsHeaderInner}>
              <Text style={styles.resultsCount}>Showing <Text style={{ fontWeight: '900', color: colors.textPrimary }}>{contactsList.length}</Text> intelligent matches</Text>
              <View style={styles.resultsHeaderRight}>
                {filtersActive && (
                  <Pressable onPress={clearFilters} style={styles.clearFiltersBtn}>
                    <MaterialCommunityIcons name="filter-remove-outline" size={14} color={colors.accent} />
                    <Text style={styles.clearFiltersText}>Clear All</Text>
                  </Pressable>
                )}
                {contactsList.length > 0 && (
                  <Pressable
                    style={[styles.selectModeToggleBtn, isSelectMode && styles.selectModeToggleBtnActive]}
                    onPress={() => {
                      if (isSelectMode) {
                        setIsSelectMode(false);
                        setSelectedContactIds(new Set());
                      } else {
                        setIsSelectMode(true);
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isSelectMode ? 'close' : 'checkbox-multiple-marked-outline'}
                      size={14}
                      color={isSelectMode ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text style={[styles.selectModeToggleText, isSelectMode && { color: '#FFFFFF' }]}>
                      {isSelectMode ? 'Cancel' : 'Select'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {isSelectMode && (
              <View style={styles.selectActionBar}>
                <Pressable style={styles.selectAllBtn} onPress={toggleSelectAll}>
                  <View style={[styles.selectCheckbox, selectedContactIds.size === contactsList.length && contactsList.length > 0 && styles.selectCheckboxChecked]}>
                    {selectedContactIds.size === contactsList.length && contactsList.length > 0 && (
                      <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.selectAllText}>
                    {selectedContactIds.size === contactsList.length && contactsList.length > 0 ? 'Deselect All' : 'Select All'}
                  </Text>
                </Pressable>
                {selectedContactIds.size > 0 && (
                  <Pressable
                    style={styles.deleteAllBtn}
                    onPress={() => setShowBulkDeleteModal(true)}
                    disabled={isBulkDeleting}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.deleteAllBtnText}>
                      Delete {selectedContactIds.size} Contact{selectedContactIds.size > 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {isBulkDeleting && (
              <View style={styles.bulkDeleteProgressBar}>
                <View style={styles.bulkDeleteProgressTrack}>
                  <View style={[styles.bulkDeleteProgressFill, { width: `${bulkDeleteProgress.total > 0 ? (bulkDeleteProgress.current / bulkDeleteProgress.total) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.bulkDeleteProgressText}>
                  Deleting {bulkDeleteProgress.current}/{bulkDeleteProgress.total}...
                </Text>
              </View>
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
              <Pressable
                key={contact.id}
                style={[styles.contactCard, isSelectMode && selectedContactIds.has(contact.id) && styles.contactCardSelected]}
                onPress={isSelectMode ? () => toggleSelectContact(contact.id) : undefined}
                disabled={!isSelectMode}
              >
                {isSelectMode && (
                  <Pressable style={styles.selectCheckboxRow} onPress={() => toggleSelectContact(contact.id)}>
                    <View style={[styles.selectCheckbox, selectedContactIds.has(contact.id) && styles.selectCheckboxChecked]}>
                      {selectedContactIds.has(contact.id) && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                )}
                {/* 1. Header Info */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{contact.first_name.charAt(0)}</Text>
                    <View style={[styles.statusDot, { backgroundColor: contact.status === 1 ? '#10B981' : '#64748B' }]} />
                  </View>
                  <View style={styles.contactMain}>
                    <View style={styles.nameRow}>
                      <Text style={styles.contactName}>{fullName}</Text>
                      <View style={[styles.heatBadge, { backgroundColor: contact.heat_index > 70 ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2') : colors.surfaceIcon }]}>
                        <MaterialCommunityIcons name="fire" size={13} color={contact.heat_index > 70 ? '#EF4444' : colors.iconMuted} />
                        <Text style={[styles.heatValue, { color: contact.heat_index > 70 ? '#EF4444' : colors.textPrimary }]}>{contact.heat_index}</Text>
                      </View>
                    </View>
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
                  <View style={[styles.dataBadge, { backgroundColor: getBadgeBgColor(tagColor) }]}>
                    <Text style={[styles.dataBadgeText, { color: tagColor }]}>{tagName}</Text>
                  </View>
                  {contact.pipeline_stage && (
                    <View style={[styles.dataBadge, { backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.15)' : '#F0F9FA' }]}>
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
              </Pressable>
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
        apiError={contactApiError}
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
                disabled={isUpdating}
              >
                <Text style={styles.alertBtnTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnConfirm]}
                onPress={() => {
                  if (deleteContactId) {
                    handleDeleteContact(deleteContactId);
                  }
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.alertBtnTextConfirm}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        visible={showBulkDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBulkDeleteModal(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Delete {selectedContactIds.size} Contact{selectedContactIds.size > 1 ? 's' : ''}?</Text>
            <Text style={styles.alertMessage}>
              All selected contacts will be permanently deleted one by one. This action cannot be undone.
            </Text>
            <View style={styles.alertBtnRow}>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnCancel]}
                onPress={() => setShowBulkDeleteModal(false)}
              >
                <Text style={styles.alertBtnTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnConfirm]}
                onPress={handleBulkDelete}
              >
                <Text style={styles.alertBtnTextConfirm}>Delete All</Text>
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
  dropdownRowThreeScroll: {
    marginBottom: 12,
  },
  dropdownRowThree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '08' },
  filterBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterBtnTextActive: { color: colors.accent },
  resultsHeader: {
    marginBottom: 8,
    paddingRight: 4,
  },
  resultsHeaderInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  selectModeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceIcon,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectModeToggleBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  selectModeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  selectActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EF4444',
  },
  deleteAllBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted || '#8DA4B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCheckboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  contactCardSelected: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  bulkDeleteProgressBar: {
    marginTop: 10,
  },
  bulkDeleteProgressTrack: {
    height: 6,
    backgroundColor: `${colors.textMuted}30`,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  bulkDeleteProgressFill: {
    height: 6,
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  bulkDeleteProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
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
  contactMain: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 2,
  },
  contactName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3, flexShrink: 1 },
  contactSubInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactEmail: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  heatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  heatValue: { fontSize: 11, fontWeight: '900' },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
    flexShrink: 0,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
  },
  dataBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
