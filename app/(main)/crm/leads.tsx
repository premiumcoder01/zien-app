import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { addCRMGroup, addCRMLead, addCRMTag, convertCRMLead, CRMLead, deleteCRMLead, getCRMLeads, getCRMMeta, updateCRMLead } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import PhoneInput from "react-native-phone-number-input";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AILeadImportModal } from './components/modals/AILeadImportModal';
import { ManageMetaModal } from './components/modals/ManageMetaModal';


function LeadCard({ lead, onDeletePress, onConvertPress, onToggleArchive, onEditPress, isArchiving, isConverting, isSelectMode, isSelected, onToggleSelect }: {
  lead: CRMLead,
  onDeletePress: () => void,
  onConvertPress: () => void,
  onToggleArchive: () => void,
  onEditPress: () => void,
  isArchiving?: boolean,
  isConverting?: boolean,
  isSelectMode?: boolean,
  isSelected?: boolean,
  onToggleSelect?: () => void,
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const fullName = `${lead.first_name} ${lead.last_name}`;
  const isHot = lead.score >= 80;
  const isConverted = lead.lead_date_label === 'Converted';
  const isActive = lead.status === 1;
  const badgeLabel = isConverted ? 'CONVERTED' : (isActive ? 'ACTIVE' : 'INACTIVE');
  const badgeColor = isConverted ? '#2563EB' : (isActive ? (colors.accentGreen || '#10B981') : (colors.danger || '#EF4444'));

  return (
    <Pressable
      style={[styles.leadCard, isHot && styles.leadCardHotBorder, isSelectMode && isSelected && styles.leadCardSelected]}
      onPress={isSelectMode ? onToggleSelect : undefined}
      disabled={!isSelectMode}
    >
      {isSelectMode && (
        <Pressable style={styles.selectCheckboxRow} onPress={onToggleSelect}>
          <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxChecked]}>
            {isSelected && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
          </View>
        </Pressable>
      )}
      <View style={styles.leadCardHeader}>
        <View style={styles.leadAvatar}>
          <LinearGradient
            colors={isHot ? ['#FF6B00', '#FF8E3C'] : ['#0a2341', '#26C7DB']}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarLetter}>{lead.first_name.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          {isHot && (
            <View style={styles.hotBadgeSmall}>
              <MaterialCommunityIcons name="fire" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.leadMainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.leadCardName} numberOfLines={1}>{fullName}</Text>
            {isHot && (
              <View style={styles.hotTag}>
                <Text style={styles.hotTagText}>HOT</Text>
              </View>
            )}
          </View>
          <Text style={styles.leadCardSub} numberOfLines={1}>{lead.email || 'No email provided'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.leadMetaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="source-branch" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{lead.source}</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{lead.lead_date_label}</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{lead.group?.name || 'No Group'}</Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        {/* 1. Status Badge */}
        <View style={[styles.statusBadgeInline, { backgroundColor: `${badgeColor}15` }]}>
          <View style={[styles.statusDotSmall, { backgroundColor: badgeColor }]} />
          <Text style={[styles.statusLabelInline, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>

        {/* 2. Custom Tag Badge */}
        {lead.tag && (
          <View style={[styles.tagBadge, { backgroundColor: `${lead.tag.tag_color}15`, borderColor: `${lead.tag.tag_color}30` }]}>
            <View style={[styles.tagDot, { backgroundColor: lead.tag.tag_color }]} />
            <Text style={[styles.tagLabel, { color: lead.tag.tag_color }]}>{lead.tag.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <View style={[styles.leftActions, (!isActive || isConverted) && { flex: 1 }]}>
          {isConverted ? (
            isActive ? (
              <Pressable style={[styles.whiteAction, { flex: 1 }]} onPress={onToggleArchive} disabled={isArchiving || isConverting}>
                {isArchiving ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.whiteActionText}>Archive</Text>
                )}
              </Pressable>
            ) : (
              <Pressable style={[styles.darkAction, { flex: 1 }]} onPress={onToggleArchive} disabled={isArchiving}>
                {isArchiving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.darkActionText}>Unarchive</Text>
                )}
              </Pressable>
            )
          ) : isActive ? (
            <>
              <Pressable style={styles.primaryAction} onPress={onConvertPress} disabled={isConverting || isArchiving}>
                {isConverting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="account-convert" size={14} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Convert</Text>
                  </>
                )}
              </Pressable>
              <Pressable style={styles.whiteAction} onPress={onToggleArchive} disabled={isArchiving || isConverting}>
                {isArchiving ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.whiteActionText}>Archive</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable style={[styles.darkAction, { flex: 1 }]} onPress={onToggleArchive} disabled={isArchiving}>
              {isArchiving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.darkActionText}>Unarchive</Text>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.secondaryActions}>
          {isActive && (
            <>
              <Pressable style={styles.iconAction} onPress={onEditPress}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable style={[styles.iconAction, styles.deleteAction]} onPress={onDeletePress}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger || "#E11D48"} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function LeadsScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [leadsList, setLeadsList] = useState<CRMLead[]>([]);
  const { data: serverLeads, isLoading: isLoadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['crm-leads', accessToken],
    queryFn: () => getCRMLeads(accessToken!)
  });



  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchLeads();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const [search, setSearch] = useState('');
  const [isImportModalVisible, setImportModalVisible] = useState(false);
  const [importInstructions, setImportInstructions] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState('All Leads');
  const [isHotFilterActive, setHotFilterActive] = useState(false);
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Select All to Delete states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<any | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('All Status');
  const [isStatusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [convertGroupDropdownOpen, setConvertGroupDropdownOpen] = useState(false);
  const [convertTagDropdownOpen, setConvertTagDropdownOpen] = useState(false);
  const [convertGroup, setConvertGroup] = useState('Buyer');
  const [convertTag, setConvertTag] = useState('Hot');
  const [convertColor, setConvertColor] = useState('#FF6B00');
  const [leadToEdit, setLeadToEdit] = useState<any | null>(null);
  const [editSourceDropdownOpen, setEditSourceDropdownOpen] = useState(false);
  const [editStatusDropdownOpen, setEditStatusDropdownOpen] = useState(false);
  const [editGroupDropdownOpen, setEditGroupDropdownOpen] = useState(false);
  const [editTagDropdownOpen, setEditTagDropdownOpen] = useState(false);
  const [editGroup, setEditGroup] = useState('Buyer');
  const [editTag, setEditTag] = useState('Lead');
  const [editSource, setEditSource] = useState('Manual Entry');
  const [editStatus, setEditStatus] = useState('Active');
  const [editColor, setEditColor] = useState('#0a2341');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [addGroupModalVisible, setAddGroupModalVisible] = useState(false);

  // New Lead Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [customGroup, setCustomGroup] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const phoneInput = useRef<PhoneInput>(null);

  const { data: crmMeta } = useQuery({
    queryKey: ['crmMeta'],
    queryFn: () => getCRMMeta(accessToken!),
    enabled: !!accessToken,
  });

  // Selection Modal States
  const [isSelectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectionOptions, setSelectionOptions] = useState<string[]>([]);
  const [selectionTitle, setSelectionTitle] = useState('');
  const [selectionSearch, setSelectionSearch] = useState('');
  const [onSelectHandler, setOnSelectHandler] = useState<(opt: string) => void>(() => { });

  const filteredSelectionOptions = selectionOptions.filter(opt =>
    opt.toLowerCase().includes(selectionSearch.toLowerCase())
  );

  const openSelection = (title: string, options: string[], onSelect: (opt: string) => void) => {
    setSelectionTitle(title);
    setSelectionOptions(options);
    setSelectionSearch('');
    setOnSelectHandler(() => (opt: string) => {
      onSelect(opt);
      setSelectionModalVisible(false);
    });
    setSelectionModalVisible(true);
  };

  // Populate form for editing
  useEffect(() => {
    if (leadToEdit) {
      setFirstName(leadToEdit.first_name || '');
      setLastName(leadToEdit.last_name || '');
      setEmail(leadToEdit.email || '');
      setPhone(leadToEdit.phone || '');
      setFormattedPhone(leadToEdit.phone || '');
      setEditGroup(leadToEdit.group?.name || 'Buyer');
      setEditTag(leadToEdit.tag?.name || 'Lead');
      setEditSource(leadToEdit.source || 'Manual Entry');
      setEditStatus(leadToEdit.status === 1 ? 'Active' : 'Inactive');
      setEditColor(leadToEdit.tag?.tag_color || '#0a2341');
      setSelectedGroupId(leadToEdit.group_id);
      setSelectedTagId(leadToEdit.tag_id);
    }
  }, [leadToEdit]);

  const filteredLeads = (serverLeads || []).filter(lead => {
    const isConverted = lead.lead_date_label === 'Converted';
    const isActive = lead.status === 1;

    // Converted Leads Tab
    if (selectedTab === 'Converted Leads' && !isConverted) {
      return false;
    }

    // Active Leads and New Tabs
    if ((selectedTab === 'Active Leads' || selectedTab === 'New') && (isConverted || !isActive)) {
      return false;
    }

    // Archived and Inactive Tabs
    if ((selectedTab === 'Archived' || selectedTab === 'Inactive') && isActive) {
      return false;
    }

    // All other tabs (except All Leads) hide converted leads unless selectedTab is Converted Leads or Archived/Inactive
    if (selectedTab !== 'All Leads' && selectedTab !== 'Converted Leads' && selectedTab !== 'Archived' && selectedTab !== 'Inactive' && isConverted) {
      return false;
    }

    // AI Score Filter (Hot Leads toggle)
    if (isHotFilterActive && lead.score < 80) return false;

    // Search Filter
    if (search.trim() !== '') {
      const s = search.toLowerCase();
      const first = lead.first_name ? lead.first_name.toLowerCase() : '';
      const last = lead.last_name ? lead.last_name.toLowerCase() : '';
      const email = lead.email ? lead.email.toLowerCase() : '';
      const source = lead.source ? lead.source.toLowerCase() : '';

      const match = first.includes(s) || last.includes(s) || email.includes(s) || source.includes(s);
      if (!match) return false;
    }

    return true;
  });

  const toggleArchive = async (lead: CRMLead) => {
    if (!accessToken) return;
    try {
      setLoadingLeadId(lead.id);
      const newStatus = lead.status === 1 ? 0 : 1;
      await updateCRMLead(accessToken, lead.id, { status: newStatus });
      await refetchLeads();
      Alert.alert('Success', `Lead ${newStatus === 0 ? 'archived' : 'unarchived'} successfully.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update lead status.');
    } finally {
      setLoadingLeadId(null);
    }
  };

  const confirmDelete = async () => {
    if (leadToDelete && accessToken) {
      try {
        setIsDeleting(true);
        await deleteCRMLead(accessToken, leadToDelete);
        await refetchLeads();
        setLeadToDelete(null);
        Alert.alert('Success', 'Lead deleted successfully.');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to delete lead.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Select All / Deselect All
  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Delete handler
  const handleBulkDelete = async () => {
    if (!accessToken || selectedLeadIds.size === 0) return;
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(true);
    const ids = Array.from(selectedLeadIds);
    setBulkDeleteProgress({ current: 0, total: ids.length });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await deleteCRMLead(accessToken, ids[i]);
        successCount++;
      } catch {
        failCount++;
      }
      setBulkDeleteProgress({ current: i + 1, total: ids.length });
    }
    await refetchLeads();
    queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
    setIsBulkDeleting(false);
    setSelectedLeadIds(new Set());
    setIsSelectMode(false);
    setBulkDeleteProgress({ current: 0, total: 0 });
    if (failCount > 0) {
      Alert.alert('Done', `${successCount} leads deleted, ${failCount} failed.`);
    } else {
      Alert.alert('Success', `${successCount} lead${successCount > 1 ? 's' : ''} deleted successfully.`);
    }
  };

  const handleDirectConvert = async (lead: CRMLead) => {
    if (!accessToken) return;
    try {
      setConvertingLeadId(lead.id);
      await convertCRMLead(accessToken, lead.id);
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
      Alert.alert('Success', 'Lead converted successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to convert lead.');
    } finally {
      setConvertingLeadId(null);
    }
  };

  const handleSaveLead = async () => {
    if (!accessToken) return;
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'First Name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last Name is required.';
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email.';

    if (phone && !phoneInput.current?.isValidNumber(phone)) {
      newErrors.phone = 'Invalid phone number.';
    }

    if (editGroup === 'Select Group') newErrors.group = 'Please select a group.';
    if (editTag === 'Select Tag') newErrors.tag = 'Please select a tag.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSavingLead(true);
      let finalGroupId = selectedGroupId;
      let finalTagId = selectedTagId;

      const isCustomGroup = editGroup === 'Custom Group...';
      const isCustomTag = editTag === 'Custom Tag...';

      if (isCustomGroup && customGroup) {
        const newGroup = await addCRMGroup(accessToken, customGroup);
        finalGroupId = newGroup.id;
      }

      if (isCustomTag && customTag) {
        const newTag = await addCRMTag(accessToken, customTag, editColor);
        finalTagId = newTag.id;
      }

      const payload: any = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone,
        country_code: countryCode,
        source: editSource,
        status: editStatus === 'Active' ? '1' : '0',
        group_id: finalGroupId,
        tag_id: finalTagId,
        custom_group: isCustomGroup ? customGroup : undefined,
        custom_tag: isCustomTag ? customTag : undefined,
        tag_color: isCustomTag ? editColor : undefined,
        score: 75,
        lead_date_label: 'Today',
      };

      if (!payload.group_id && !isCustomGroup) {
        Alert.alert('Error', 'Please select a valid group.');
        setIsSavingLead(false);
        return;
      }
      if (!payload.tag_id && !isCustomTag) {
        Alert.alert('Error', 'Please select a valid tag.');
        setIsSavingLead(false);
        return;
      }

      if (isCustomGroup) payload.custom_group = customGroup;
      if (isCustomTag) {
        payload.custom_tag = customTag;
        payload.tag_color = editColor;
      }

      if (leadToEdit) {
        await updateCRMLead(accessToken, leadToEdit.id, payload);
      } else {
        await addCRMLead(accessToken, payload);
      }

      await refetchLeads();
      setIsEditModalVisible(false);
      setLeadToEdit(null);
      Alert.alert('Success', `Lead ${leadToEdit ? 'updated' : 'added'} successfully.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save lead.');
    } finally {
      setIsSavingLead(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportLeads = async () => {
    if (!filteredLeads || filteredLeads.length === 0) {
      Alert.alert('No Data', 'There are no leads to export.');
      return;
    }
    try {
      setIsExporting(true);
      const csvHeader = ['First Name', 'Last Name', 'Email', 'Country Code', 'Phone', 'Source', 'Score', 'Status', 'Group', 'Tag', 'Date Label', 'Created At'];
      const csvRows = filteredLeads.map((l: CRMLead) => [
        l.first_name,
        l.last_name,
        l.email,
        l.country_code || '',
        l.phone || '',
        l.source || '',
        l.score?.toString() || '0',
        l.status === 1 ? 'Active' : 'Inactive',
        l.group?.name || '',
        l.tag?.name || '',
        l.lead_date_label || '',
        new Date(l.created_at).toLocaleDateString(),
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

      const csvString = [csvHeader.join(','), ...csvRows].join('\n');
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Leads_Export_${dateStr}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Leads',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error exporting leads:', error);
      Alert.alert('Export Failed', 'Failed to export leads.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader
        title="Leads"
        subtitle="Incoming inquiries and potential opportunities."
        onBack={() => router.back()}
        rightIcon="tray-arrow-down"
        onRightPress={handleExportLeads}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accentTeal]} tintColor={colors.accentTeal} />
        }
        showsVerticalScrollIndicator={false}>

        {/* Actions */}
        <View style={styles.topActions}>
          <Pressable style={styles.actionBtn} onPress={() => setImportModalVisible(true)}>
            <MaterialCommunityIcons name="folder-upload-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>AI Import</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setAddGroupModalVisible(true)}>
            <MaterialCommunityIcons name="account-multiple-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Groups & Tags</Text>
          </Pressable>
        </View>

        <View style={{ zIndex: 10, marginBottom: 20 }}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted || "#8DA4B5"} />
              <TextInput
                placeholder="Find leads by name, source, or ID..."
                placeholderTextColor={colors.textMuted || "#8DA4B5"}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
            style={styles.tabsScroll}
          >
            {['All Leads', 'Active Leads', 'Converted Leads', 'Inactive', 'New', 'Archived'].map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            ))}

            <Pressable
              style={[styles.hotFilterBtn, isHotFilterActive && styles.hotFilterBtnActive]}
              onPress={() => setHotFilterActive(!isHotFilterActive)}
            >
              <MaterialCommunityIcons
                name="fire"
                size={16}
                color={isHotFilterActive ? "#FF6B00" : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.hotFilterText, isHotFilterActive && { color: '#FFFFFF' }]}>
                Hot Leads
              </Text>
            </Pressable>
            {isHotFilterActive && (
              <Pressable style={styles.clearFilterBtn} onPress={() => setHotFilterActive(false)}>
                <MaterialCommunityIcons name="close" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.clearFilterText}>Clear</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>



        <View style={styles.listHeaderRow}>
          <View style={styles.listHeaderInner}>
            <Text style={styles.sectionTitle}>
              Showing {filteredLeads.length} leads {isHotFilterActive && `(filtered from ${leadsList.length})`}
            </Text>
            {filteredLeads.length > 0 && (
              <Pressable
                style={[styles.selectModeToggleBtn, isSelectMode && styles.selectModeToggleBtnActive]}
                onPress={() => {
                  if (isSelectMode) {
                    setIsSelectMode(false);
                    setSelectedLeadIds(new Set());
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

          {isSelectMode && (
            <View style={styles.selectActionBar}>
              <Pressable style={styles.selectAllBtn} onPress={toggleSelectAll}>
                <View style={[styles.selectCheckbox, selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 && styles.selectCheckboxChecked]}>
                  {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 && (
                    <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.selectAllText}>
                  {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
              {selectedLeadIds.size > 0 && (
                <Pressable
                  style={styles.deleteAllBtn}
                  onPress={() => setShowBulkDeleteModal(true)}
                  disabled={isBulkDeleting}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.deleteAllBtnText}>
                    Delete {selectedLeadIds.size} Lead{selectedLeadIds.size > 1 ? 's' : ''}
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

        <View style={styles.leadList}>
          {isLoadingLeads ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.accentTeal} />
            </View>
          ) : filteredLeads.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>No leads found</Text>
            </View>
          ) : filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isArchiving={loadingLeadId === lead.id}
              isConverting={convertingLeadId === lead.id}
              isSelectMode={isSelectMode}
              isSelected={selectedLeadIds.has(lead.id)}
              onToggleSelect={() => toggleSelectLead(lead.id)}
              onDeletePress={() => setLeadToDelete(lead.id)}
              onConvertPress={() => handleDirectConvert(lead)}
              onToggleArchive={() => toggleArchive(lead)}
              onEditPress={() => {
                console.log(lead);

                setLeadToEdit(lead);
                setEditGroup('Buyer');
                setEditTag('Lead');
                setEditSource(lead.source);
                setEditStatus(lead.status === 1 ? 'Active' : 'Inactive');
                setEditColor('#0a2341');
                setIsEditModalVisible(true);
              }}
            />
          ))}
        </View>
      </ScrollView>

      <AILeadImportModal
        visible={isImportModalVisible}
        onClose={() => setImportModalVisible(false)}
        accessToken={accessToken}
        metaData={crmMeta || null}
        onImportSuccess={() => {
          refetchLeads();
          queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
        }}
      />

      <Modal
        visible={!!leadToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setLeadToDelete(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLeadToDelete(null)}>
          <Pressable style={[styles.modalContainer, { padding: 32 }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalDeleteIconCircle}>
              <MaterialCommunityIcons name="alert-outline" size={32} color={colors.danger || "#EF4444"} />
            </View>
            <Text style={styles.modalDeleteTitle}>Delete Lead?</Text>
            <Text style={styles.modalDeleteSubtitle}>
              This lead will be deleted. This action cannot be undone.
            </Text>
            <View style={styles.modalDeleteActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setLeadToDelete(null)} disabled={isDeleting}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDeleteConfirmBtn} onPress={confirmDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteConfirmBtnText}>Delete Lead</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        visible={showBulkDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBulkDeleteModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowBulkDeleteModal(false)}>
          <Pressable style={[styles.modalContainer, { padding: 32 }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalDeleteIconCircle}>
              <MaterialCommunityIcons name="delete-sweep-outline" size={32} color={colors.danger || "#EF4444"} />
            </View>
            <Text style={styles.modalDeleteTitle}>Delete {selectedLeadIds.size} Lead{selectedLeadIds.size > 1 ? 's' : ''}?</Text>
            <Text style={styles.modalDeleteSubtitle}>
              All selected leads will be permanently deleted one by one. This action cannot be undone.
            </Text>
            <View style={styles.modalDeleteActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowBulkDeleteModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDeleteConfirmBtn} onPress={handleBulkDelete}>
                <Text style={styles.modalDeleteConfirmBtnText}>Delete All</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Remove Convert Modal as per direct conversion request */}

      {/* --- Edit / Add Modal --- */}
      <Modal
        visible={isEditModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => { setIsEditModalVisible(false); setLeadToEdit(null); }}
      >
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <Text style={styles.fullScreenModalTitle}>{leadToEdit ? 'Edit Lead' : 'Add New Lead'}</Text>
            <Pressable style={styles.fullScreenModalCloseIcon} onPress={() => { setIsEditModalVisible(false); setLeadToEdit(null); }}>
              <MaterialCommunityIcons name="close" size={16} color={colors.textPrimary} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior="padding"
            style={{ flex: 1 }}
          >
            <FlatList
              style={styles.fullScreenModalContent}
              contentContainerStyle={{ paddingBottom: 60 }}
              key={leadToEdit ? leadToEdit.id : 'new_lead'}
              data={[1]}
              keyExtractor={(item) => item.toString()}
              renderItem={() => (
                <View>
                  <View style={styles.convertCol}>
                    <Text style={styles.convertLabel}>First Name <Text style={{ color: '#E11D48' }}>*</Text></Text>
                    <TextInput
                      style={[styles.convertInput, errors.firstName && styles.inputError]}
                      value={firstName}
                      onChangeText={(t) => { setFirstName(t); if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' })); }}
                      placeholder="John"
                      placeholderTextColor={colors.textMuted || "#8DA4B5"}
                    />
                    {errors.firstName ? <Text style={styles.inlineError}>{errors.firstName}</Text> : null}
                  </View>
                  <View style={styles.convertCol}>
                    <Text style={styles.convertLabel}>Last Name <Text style={{ color: '#E11D48' }}>*</Text></Text>
                    <TextInput
                      style={[styles.convertInput, errors.lastName && styles.inputError]}
                      value={lastName}
                      onChangeText={(t) => { setLastName(t); if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' })); }}
                      placeholder="Doe"
                      placeholderTextColor={colors.textMuted || "#8DA4B5"}
                    />
                    {errors.lastName ? <Text style={styles.inlineError}>{errors.lastName}</Text> : null}
                  </View>
                  <View style={styles.convertCol}>
                    <Text style={styles.convertLabel}>Email <Text style={{ color: '#E11D48' }}>*</Text></Text>
                    <TextInput
                      style={[
                        styles.convertInput,
                        errors.email && styles.inputError,
                        // !!leadToEdit && { backgroundColor: colors.surfaceSoft, color: colors.textMuted }
                      ]}
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
                      placeholder="john@example.com"
                      placeholderTextColor={colors.textMuted || "#8DA4B5"}
                    // editable={!leadToEdit}
                    />
                    {errors.email ? <Text style={styles.inlineError}>{errors.email}</Text> : null}
                  </View>
                  <View style={styles.convertCol}>
                    <Text style={styles.convertLabel}>Phone</Text>
                    <PhoneInput
                      ref={phoneInput}
                      defaultValue={phone}
                      defaultCode={countryCode as any}
                      layout="second"
                      disabled={!!leadToEdit}
                      containerStyle={[
                        styles.phoneInputWrapper,
                        errors.phone && styles.inputError,
                        // !!leadToEdit && { backgroundColor: colors.surfaceSoft }
                      ]}
                      textContainerStyle={[
                        styles.phoneTextContainer,
                        // !!leadToEdit && { backgroundColor: colors.surfaceSoft }
                      ]}
                      textInputStyle={[
                        styles.phoneTextInput,
                        // !!leadToEdit && { color: colors.textMuted }
                      ]}
                      codeTextStyle={[
                        styles.phoneCodeText,
                        // !!leadToEdit && { color: colors.textMuted }
                      ]}
                      flagButtonStyle={[
                        styles.phoneFlagButton,
                        // !!leadToEdit && { backgroundColor: colors.surfaceSoft }
                      ]}
                      onChangeText={(text) => { setPhone(text); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }}
                      onChangeFormattedText={(text) => setFormattedPhone(text)}
                      onChangeCountry={(country) => setCountryCode(country.cca2 as any)}
                      withDarkTheme={theme === 'dark'}
                      countryPickerProps={{
                        withFilter: true,
                        withAlphaFilter: true,
                        renderFlagButton: (props: any) => {
                          const code = (props.countryCode || 'US').toUpperCase();
                          const emoji = code.replace(/./g, (c: string) =>
                            String.fromCodePoint(0x1F1A5 + c.charCodeAt(0))
                          );
                          return <Text style={{ fontSize: 22, lineHeight: 30, marginLeft: 10 }}>{emoji}</Text>;
                        },
                        theme: theme === 'dark' ? {
                          backgroundColor: '#000000',
                          onBackgroundTextColor: '#FFFFFF',
                          fontSize: 15,
                          filterPlaceholderTextColor: '#94A3B8',
                        } : {
                          backgroundColor: '#FFFFFF',
                          onBackgroundTextColor: '#0F172A',
                          fontSize: 15,
                          filterPlaceholderTextColor: '#64748B',
                        },
                        modalProps: {
                          statusBarTranslucent: true,
                        },
                        closeButtonStyle: {
                          marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                        },
                        filterProps: {
                          placeholderTextColor: theme === 'dark' ? '#94A3B8' : '#64748B',
                          style: {
                            color: theme === 'dark' ? '#FFFFFF' : '#0F172A',
                            fontSize: 15,
                            flex: 1,
                            marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                          }
                        }
                      }}
                    />
                    {errors.phone ? <Text style={styles.inlineError}>{errors.phone}</Text> : null}
                  </View>

                  <View style={{ zIndex: 12 }}>
                    <View style={[styles.convertCol, { marginBottom: 16 }]}>
                      <Text style={styles.convertLabel}>Source</Text>
                      <Pressable
                        style={styles.convertDropdown}
                        onPress={() => {
                          openSelection('Select Source', ['Manual Entry', 'Website', 'Referral', 'Social Media', 'Open House', 'Zillow'], (opt) => setEditSource(opt));
                        }}
                      >
                        <Text style={styles.convertDropdownText}>{editSource}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ zIndex: 11 }}>
                    <View style={[styles.convertCol, { marginBottom: 16 }]}>
                      <Text style={styles.convertLabel}>Status</Text>
                      <Pressable
                        style={styles.convertDropdown}
                        onPress={() => {
                          openSelection('Select Status', ['Active', 'Inactive'], (opt) => setEditStatus(opt));
                        }}
                      >
                        <Text style={styles.convertDropdownText}>{editStatus}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={[styles.convertRow, { zIndex: 10 }]}>
                    <View style={styles.convertCol}>
                      <Text style={styles.convertLabel}>Group <Text style={{ color: '#E11D48' }}>*</Text></Text>
                      <Pressable
                        style={[styles.convertDropdown, errors.group && styles.inputError]}
                        onPress={() => {
                          openSelection(
                            'Select Group',
                            ([...(crmMeta?.groups.map(g => g.name) || []), 'Custom Group...']),
                            (opt) => {
                              setEditGroup(opt);
                              if (errors.group) setErrors(prev => ({ ...prev, group: '' }));
                              if (opt !== 'Custom Group...') {
                                setCustomGroup('');
                                const matched = crmMeta?.groups.find(g => g.name === opt);
                                if (matched) setSelectedGroupId(matched.id);
                              } else {
                                setSelectedGroupId(null);
                              }
                            }
                          );
                        }}
                      >
                        <Text style={[styles.convertDropdownText, editGroup === 'Select Group' && { color: colors.textMuted }]}>{editGroup}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                      </Pressable>
                      {errors.group ? <Text style={styles.inlineError}>{errors.group}</Text> : null}
                    </View>
                  </View>

                  {editGroup === 'Custom Group...' && (
                    <View style={[styles.convertCol, { marginBottom: 20 }]}>
                      <Text style={styles.convertLabel}>Custom Group Name</Text>
                      <TextInput
                        style={styles.convertInput}
                        placeholder="Enter custom group"
                        placeholderTextColor={colors.textMuted || "#8DA4B5"}
                        value={customGroup}
                        onChangeText={setCustomGroup}
                      />
                    </View>
                  )}

                  <View style={[styles.convertRow, { zIndex: 9 }]}>
                    <View style={styles.convertCol}>
                      <Text style={styles.convertLabel}>Tag <Text style={{ color: '#E11D48' }}>*</Text></Text>
                      <Pressable
                        style={[styles.convertDropdown, errors.tag && styles.inputError]}
                        onPress={() => {
                          openSelection(
                            'Select Tag',
                            ([...(crmMeta?.tags.map(t => t.name) || []), 'Custom Tag...']),
                            (opt) => {
                              setEditTag(opt);
                              if (errors.tag) setErrors(prev => ({ ...prev, tag: '' }));
                              if (opt !== 'Custom Tag...') {
                                setCustomTag('');
                                const matched = crmMeta?.tags.find(t => t.name === opt);
                                if (matched) setSelectedTagId(matched.id);
                              } else {
                                setSelectedTagId(null);
                              }
                            }
                          );
                        }}
                      >
                        <Text style={[styles.convertDropdownText, editTag === 'Select Tag' && { color: colors.textMuted }]}>{editTag}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                      </Pressable>
                      {errors.tag ? <Text style={styles.inlineError}>{errors.tag}</Text> : null}
                    </View>
                  </View>

                  {editTag === 'Custom Tag...' && (
                    <View style={[styles.convertCol, { marginBottom: 20 }]}>
                      <Text style={styles.convertLabel}>Custom Tag Name</Text>
                      <TextInput
                        style={styles.convertInput}
                        placeholder="Enter custom tag"
                        placeholderTextColor={colors.textMuted || "#8DA4B5"}
                        value={customTag}
                        onChangeText={setCustomTag}
                      />
                    </View>
                  )}
                  {editTag === 'Custom Tag...' && (
                    <View style={[styles.convertCol, { marginBottom: 32 }]}>
                      <Text style={styles.convertLabel}>Tag Color Theme</Text>
                      <View style={styles.tagColorRow}>
                        {['#0a2341', '#FF6B00', '#0B2D3E', '#6366F1', '#10B981', '#64748B', '#E11D48', '#9333EA'].map((color) => {
                          const isActive = editColor === color;
                          return (
                            <Pressable
                              key={color}
                              onPress={() => setEditColor(color)}
                              style={isActive ? [styles.tagColorCircleOuter, { borderColor: color === '#FF6B00' ? '#FF8A00' : color }] : undefined}
                            >
                              <View style={[styles.tagColorCircle, { backgroundColor: color }]} />
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Fixed Bottom Actions */}
            <View style={[
              styles.convertActions,
              { paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 24) }
            ]}>
              <Pressable style={styles.convertCancelBtn} onPress={() => { setIsEditModalVisible(false); setLeadToEdit(null); }}>
                <Text style={styles.convertCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.convertConfirmBtn, isSavingLead && { opacity: 0.7 }]}
                onPress={handleSaveLead}
                disabled={isSavingLead}
              >
                {isSavingLead ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.convertConfirmBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>

          <Modal
            visible={isSelectionModalVisible}
            transparent={false}
            animationType="slide"
            onRequestClose={() => setSelectionModalVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: colors.cardBackground, paddingTop: insets.top }}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{selectionTitle}</Text>
                <Pressable onPress={() => setSelectionModalVisible(false)} style={styles.pickerCloseBtn}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.pickerSearchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.pickerSearchInput}
                  placeholder="Search..."
                  placeholderTextColor={colors.textMuted}
                  value={selectionSearch}
                  onChangeText={setSelectionSearch}
                />
              </View>

              <ScrollView style={[styles.pickerList, { flex: 1 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode='on-drag'>
                {filteredSelectionOptions.length === 0 ? (
                  <Text style={styles.noResults}>No matches found</Text>
                ) : (
                  filteredSelectionOptions.map((opt) => (
                    <Pressable
                      key={opt}
                      style={styles.pickerItem}
                      onPress={() => onSelectHandler(opt)}
                    >
                      <Text style={styles.pickerItemText}>{opt}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </Modal>
        </View>
      </Modal>

      <ManageMetaModal
        visible={addGroupModalVisible}
        onClose={() => setAddGroupModalVisible(false)}
      />

      {/* Dynamic Action Button */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
        <Pressable style={styles.fab} onPress={() => {
          setLeadToEdit(null);
          setFirstName('');
          setLastName('');
          setEmail('');
          setPhone('');
          setFormattedPhone('');
          setCountryCode('US');
          setCustomGroup('');
          setCustomTag('');
          setEditGroup('Select Group');
          setEditTag('Select Tag');
          setSelectedGroupId(null);
          setSelectedTagId(null);
          setEditSource('Manual Entry');
          setEditStatus('Active');
          setEditColor('#0a2341');
          setErrors({});
          setIsEditModalVisible(true);
        }}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.fabText}>Add Lead</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function getStyles(colors: any, theme?: string) {
  return StyleSheet.create({
    container: { flex: 1 },

    scroll: { flex: 1 },
    scrollContent: { paddingTop: 10 },

    topActions: { flexDirection: 'row', gap: 10, marginBottom: 20, paddingHorizontal: 20 },
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
      borderColor: colors.cardBorder || colors.borderLight,
    },
    actionBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
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

    searchFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      gap: 5,
    },
    searchContainer: {
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      height: 48,
      borderRadius: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 6,
      elevation: 1,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    topFilterDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
      height: 48,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
    },
    topFilterText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      marginHorizontal: 2,
    },
    filterDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      height: 48,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dropdownMenu: {
      position: 'absolute',
      top: 54, // just below the filter button
      left: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      paddingVertical: 8,
      minWidth: 160,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 8,
      zIndex: 1000,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      paddingLeft: 36,
    },
    dropdownItemText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    hotFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 100,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    hotFilterText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    hotFilterBtnActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    clearFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    clearFilterText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabsScroll: {
      paddingLeft: 20,
    },
    tabsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingRight: 40,
      paddingBottom: 4,
    },
    tabButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 100,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    tabButtonActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },

    summaryCarousel: {
      paddingHorizontal: 20,
      gap: 12,
      paddingBottom: 24,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
      width: 140,
      paddingVertical: 18,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 10,
      elevation: 2,
      alignItems: 'center',
    },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted || '#8DA4B5', letterSpacing: 0.8, marginBottom: 8 },
    summaryCount: { fontSize: 32, fontWeight: '800', color: colors.textPrimary },

    listHeaderRow: {
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    listHeaderInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    selectModeToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    selectModeToggleBtnActive: {
      backgroundColor: colors.danger || '#EF4444',
      borderColor: colors.danger || '#EF4444',
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
      backgroundColor: colors.danger || '#EF4444',
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
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    leadCardSelected: {
      borderColor: colors.accentTeal,
      borderWidth: 1.5,
    },
    bulkDeleteProgressBar: {
      marginTop: 10,
    },
    bulkDeleteProgressTrack: {
      height: 6,
      backgroundColor: `${colors.textMuted}30`,
      borderRadius: 3,
      overflow: 'hidden',
    },
    bulkDeleteProgressFill: {
      height: 6,
      backgroundColor: colors.danger || '#EF4444',
      borderRadius: 3,
    },
    bulkDeleteProgressText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.danger || '#EF4444',
      marginTop: 4,
    },
    leadList: {
      paddingHorizontal: 20,
      gap: 16,
    },
    leadCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    leadCardHotBorder: {
      borderColor: '#FF6B0040',
      borderWidth: 1.5,
    },
    leadCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    leadAvatar: {
      position: 'relative',
    },
    avatarCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
    },
    hotBadgeSmall: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: '#FF6B00',
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.cardBackground,
    },
    leadMainInfo: {
      flex: 1,
      marginLeft: 14,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    leadCardName: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    hotTag: {
      backgroundColor: '#FF6B0015',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    hotTagText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FF6B00',
    },
    leadCardSub: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    scoreContainer: {
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
    },
    scoreTitle: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    scoreValue: {
      fontSize: 18,
      fontWeight: '900',
    },
    divider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 16,
    },
    leadMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    tagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
    },
    tagDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    tagLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    statusBadgeInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 30,
      height: 24,
    },
    statusDotSmall: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusLabelInline: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    aiScoreBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 30,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      height: 24,
    },
    aiScoreTitle: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    aiScoreValue: {
      fontSize: 9,
      fontWeight: '900',
    },
    statusBadge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    statusBadgeConverted: {
      backgroundColor: `${colors.accentTeal}15`,
    },
    statusLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      gap: 10
    },
    leftActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    primaryAction: {
      backgroundColor: colors.accentTeal,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      height: 38,
      borderRadius: 12,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
    primaryActionText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    secondaryActions: {
      flexDirection: 'row',
      gap: 8,
    },
    darkAction: {
      backgroundColor: colors.accentTeal,
      paddingHorizontal: 16,
      height: 38,
      borderRadius: 12,
      minWidth: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    darkActionText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    whiteAction: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    whiteActionText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    iconAction: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteAction: {
      borderColor: `${colors.danger || '#E11D48'}20`,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 28,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    modalTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
    modalSubtitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginTop: 6, maxWidth: '90%' },
    modalDashedArea: {
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    modalIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    modalDragText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    modalBrowseText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 24 },
    modalSelectBtn: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
      marginBottom: 24,
    },
    modalSelectBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    modalSupportText: { fontSize: 12, color: colors.textMuted || '#8DA4B5', fontWeight: '500' },
    modalDeleteIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: (colors.danger || '#EF4444') + '15',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalDeleteTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.4,
    },
    modalDeleteSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 20,
      paddingHorizontal: 10,
    },
    modalDeleteActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    modalCancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalDeleteConfirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.danger || '#DE3B49',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalDeleteConfirmBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    convertedStateContainer: {
      backgroundColor: `${colors.accentTeal}10`,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    convertedStateText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accentTeal,
    },
    fullScreenModalContainer: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    fullScreenModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 60, // approximate top inset for modal
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    fullScreenModalTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
    fullScreenModalCloseIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreenModalContent: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    convertRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 20,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    pickerContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      height: 520,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
      elevation: 30,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    pickerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    pickerCloseBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      margin: 20,
      marginTop: 10,
      marginBottom: 10,
      paddingHorizontal: 16,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pickerSearchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    pickerList: {
      flex: 1,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    pickerItemText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    noResults: {
      textAlign: 'center',
      marginTop: 40,
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: '600',
    },
    convertCol: {
      flex: 1,
      marginBottom: 10
    },
    inlineError: {
      fontSize: 11,
      color: colors.danger || '#E11D48',
      fontWeight: '700',
      marginTop: 4,
      marginLeft: 4,
    },
    inputError: {
      borderColor: colors.danger || '#E11D48',
    },
    convertLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    convertInput: {
      height: 50,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      backgroundColor: colors.cardBackground,
    },
    phoneInputWrapper: {
      height: 50,
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      overflow: 'hidden',
    },
    phoneTextContainer: {
      backgroundColor: 'transparent',
      paddingVertical: 0,
    },
    phoneTextInput: {
      fontSize: 14,
      color: colors.textPrimary,
      height: 50,
    },
    phoneCodeText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginLeft: 4,
    },
    phoneFlagButton: {
      width: 100,
      backgroundColor: colors.surfaceSoft,
      borderRightWidth: 1,
      borderRightColor: colors.cardBorder,
    },
    convertInputDisabled: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
    },
    convertDropdown: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
    },
    convertDropdownText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    formDropdownMenu: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
      zIndex: 2000,
    },
    formDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    formDropdownItemText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 30, // Space for the checkmark
    },
    formDropdownCheck: {
      position: 'absolute',
      left: 14,
    },
    tagColorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 48,
    },
    tagColorCircle: {
      width: 28,
      height: 28,
      borderRadius: 10,
    },
    tagColorCircleOuter: {
      width: 36,
      height: 36,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    convertActions: {
      flexDirection: 'row',
      gap: 12,
      paddingTop: 16,
      paddingHorizontal: 24, // Added space from left and right
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
    },
    convertCancelBtn: {
      flex: 1,
      height: 52,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    convertCancelBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    convertConfirmBtn: {
      flex: 1,
      height: 52,
      backgroundColor: colors.accentTeal,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    convertConfirmBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // --- AI Lead Import Styles ---
    fullPageModal: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    modalContent: {
      flex: 1,
    },
    premiumModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingTop: 16,
      paddingBottom: 20,
      backgroundColor: colors.cardBackground,
    },
    premiumModalTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    premiumModalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 4,
    },
    premiumCloseBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    premiumModalBody: {
      paddingHorizontal: 28,
    },
    aiImportTitleRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
    },
    aiImportHeaderText: {
      flex: 1,
      paddingRight: 10,
    },
    aiIconSquare: {
      width: 44,
      height: 44,
      backgroundColor: colors.accentTeal,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    importCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      paddingTop: 0,
    },
    importLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    importSectionLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    instructionInputContainer: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 16,
      minHeight: 120,
      marginBottom: 16,
    },
    instructionInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
      textAlignVertical: 'top',
      lineHeight: 22,
    },
    uploadBtnSmall: {
      position: 'absolute',
      right: 12,
      top: 12,
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dropzone: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      borderRadius: 20,
      paddingVertical: 40,
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
    },
    dropzoneIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dropzoneTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    dropzoneSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    fileStatusArea: {
      gap: 16,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
    },
    fileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      padding: 16,
      gap: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.03,
      shadowRadius: 15,
      elevation: 2,
    },
    fileIconBox: {
      width: 48,
      height: 56,
      backgroundColor: colors.accentTeal,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileDetails: {
      flex: 1,
    },
    fileName: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    fileMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    readyTag: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.accentGreen || '#10B981',
    },
    changeFileText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.danger || '#E11D48',
    },
    mappingBtn: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#0a2341',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    mappingBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      gap: 10,
    },
    mappingBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
}