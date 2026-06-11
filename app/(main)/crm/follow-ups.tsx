import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  createCRMFollowUp,
  CRMFollowUp,
  deleteCRMFollowUp,
  getCRMContacts,
  getCRMFollowUps,
  getCRMMeta,
  markCRMFollowUpDone,
  rescheduleCRMFollowUp,
  updateCRMFollowUp
} from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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

const TABS = ['All', 'Today', 'Upcoming', 'Overdue', 'Completed'] as const;
type TabId = (typeof TABS)[number];

function TaskCard({
  task,
  onEdit,
  onDelete,
  onReschedule,
  onDone,
  onIncomplete
}: {
  task: CRMFollowUp,
  onEdit: () => void,
  onDelete: () => void,
  onReschedule: () => void,
  onDone: () => void,
  onIncomplete?: () => void
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const isCompleted = task.status === 0 || !!task.completed_at;
  const isOverdue = !isCompleted && new Date(task.due_at) < new Date();

  const dueDateFormatted = new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dueTimeFormatted = new Date(task.due_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={styles.cardMain}>
        <View style={[
          styles.cardIconWrap,
          isOverdue && styles.cardIconOverdue,
          isCompleted && styles.cardIconCompleted
        ]}>
          <MaterialCommunityIcons
            name={isCompleted ? "check-circle" : (isOverdue ? "alert-circle" : "calendar-clock")}
            size={24}
            color={isCompleted ? colors.accentGreen || "#10B981" : (isOverdue ? colors.danger || "#EF4444" : colors.textMuted || "#8DA4B5")}
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, isCompleted && styles.cardTitleCompleted]} numberOfLines={1}>
              {task.subject}
            </Text>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: task.priority === 'High' ? `${colors.danger || '#EF4444'}15` : (task.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : `${colors.accentGreen || '#10B981'}15`) }
            ]}>
              <Text style={[
                styles.priorityText,
                { color: task.priority === 'High' ? colors.danger || '#EF4444' : (task.priority === 'Medium' ? '#F59E0B' : colors.accentGreen || '#10B981') }
              ]}>{task.priority}</Text>
            </View>
          </View>

          <Text style={styles.cardContact}>
            Contact: <Text style={styles.cardContactName}>{task.contact?.first_name ? `${task.contact.first_name} ${task.contact.last_name || ''}` : '---'}</Text>
          </Text>

          {(task.group || task.tag) && (
            <View style={styles.tagsRow}>
              {task.group && (
                <View style={styles.tagPill}>
                  <Text style={styles.tagText}>{task.group.name}</Text>
                </View>
              )}
              {task.tag && (
                <View style={[styles.tagPill, { borderLeftWidth: 3, borderLeftColor: task.tag.tag_color }]}>
                  <Text style={styles.tagText}>{task.tag.name}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar" size={14} color={colors.textMuted || "#8DA4B5"} />
              <Text style={styles.infoText}>{dueDateFormatted}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textMuted || "#8DA4B5"} />
              <Text style={styles.infoText}>{dueTimeFormatted}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        {!isCompleted ? (
          <>
            <View style={styles.actionIcons}>
              <Pressable style={styles.actionIconBtn} onPress={onEdit}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
              </Pressable>
              <Pressable style={styles.actionIconBtn} onPress={onDelete}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger || "#EF4444"} />
              </Pressable>
              <Pressable style={[styles.actionIconBtn, { backgroundColor: `${colors.accentGreen || '#10B981'}15` }]} onPress={onDone}>
                <MaterialCommunityIcons name="check" size={20} color={colors.accentGreen || "#10B981"} />
              </Pressable>
            </View>

            <Pressable style={styles.rescheduleBtn} onPress={onReschedule}>
              <MaterialCommunityIcons name="calendar-refresh" size={18} color={colors.textPrimary} />
              <Text style={styles.rescheduleText}>Reschedule</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.completedBadge, pressed && { opacity: 0.7 }]}
            onPress={onIncomplete}
          >
            <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.completedLabel}>Task Completed (Undo)</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function FollowUpsScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('All');
  const [isAddTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<CRMFollowUp | null>(null);
  const [deletingTask, setDeletingTask] = useState<CRMFollowUp | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<CRMFollowUp | null>(null);

  const [groupFilter, setGroupFilter] = useState('All Groups');
  const [tagFilter, setTagFilter] = useState('All Tags');
  const [search, setSearch] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'group' | 'tag' | null>(null);

  const queryClient = useQueryClient();

  // API Meta Data
  const { data: crmMeta } = useQuery({
    queryKey: ['crm-meta'],
    queryFn: () => getCRMMeta(accessToken!),
    enabled: !!accessToken,
  });

  // API Follow-Ups
  const { data: followUpsData, isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['crm-follow-ups'],
    queryFn: () => getCRMFollowUps(accessToken!),
    enabled: !!accessToken,
  });

  // API Contacts for Selection
  const { data: contactsData } = useQuery({
    queryKey: ['crm-contacts'],
    queryFn: () => getCRMContacts(accessToken!),
    enabled: !!accessToken,
  });




  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTasks()]);
    setRefreshing(false);
  };

  const [modalSubject, setModalSubject] = useState('');
  const [modalContactId, setModalContactId] = useState<string | null>(null);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalGroupId, setModalGroupId] = useState<number | null>(null);
  const [modalTagId, setModalTagId] = useState<number | null>(null);
  const [modalPriority, setModalPriority] = useState<string | null>(null);
  const [modalColor, setModalColor] = useState('#8B5CF6');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time'>('date');
  const [isModalGroupDropdownOpen, setModalGroupDropdownOpen] = useState(false);
  const [isModalTagDropdownOpen, setModalTagDropdownOpen] = useState(false);
  const [isModalContactDropdownOpen, setModalContactDropdownOpen] = useState(false);
  const [modalManualContact, setModalManualContact] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);


  const openAddModal = () => {
    setEditingTask(null);
    setModalSubject('');
    setModalContactId(null);
    setModalManualContact('');
    setModalDate(null);
    setModalGroupId(null);
    setModalTagId(null);
    setModalPriority(null);
    setModalColor('#8B5CF6');
    setErrors({});
    setAddTaskModalVisible(true);
  };

  const openEditModal = (task: CRMFollowUp) => {
    setEditingTask(task);
    setModalSubject(task.subject);
    setModalContactId(task.contact_id);
    const cName = task.contact?.first_name ? `${task.contact.first_name} ${task.contact.last_name || ''}` : '';
    setModalManualContact(cName);
    setModalDate(new Date(task.due_at));
    setModalGroupId(task.group_id);
    setModalTagId(task.tag_id);
    setModalPriority(task.priority);
    setModalColor('#0a2341');
    setErrors({});
    setAddTaskModalVisible(true);
  };

  // Filtering Logic
  const filteredTasks = (followUpsData || []).filter((t) => {
    const isCompleted = t.status === 0 || !!t.completed_at;
    const dueTime = new Date(t.due_at).getTime();
    const now = new Date().getTime();
    const isOverdue = !isCompleted && dueTime < now;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = dueTime >= today.getTime() && dueTime < tomorrow.getTime();
    const isUpcoming = dueTime >= tomorrow.getTime();

    // Tab Specific Logic
    if (activeTab === 'Today' && (!isToday || isCompleted)) return false;
    if (activeTab === 'Upcoming' && (!isUpcoming || isCompleted)) return false;
    if (activeTab === 'Overdue' && (!isOverdue || isCompleted)) return false;
    if (activeTab === 'Completed' && !isCompleted) return false;
    // Note: 'All' tab shows everything (no return false here)

    // Search Filter
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.contact?.first_name?.toLowerCase().includes(search.toLowerCase())) return false;

    // Group Filter
    if (groupFilter !== 'All Groups' && t.group?.name !== groupFilter) return false;

    // Tag Filter
    if (tagFilter !== 'All Tags' && t.tag?.name !== tagFilter) return false;

    return true;
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => createCRMFollowUp(accessToken!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
      setAddTaskModalVisible(false);
      Alert.alert('Success', 'Follow-up created successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create follow-up.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateCRMFollowUp(accessToken!, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
      setAddTaskModalVisible(false);
      setRescheduleTask(null);
      Alert.alert('Success', 'Follow-up updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update follow-up.');
    },
  });

  const doneMutation = useMutation({
    mutationFn: (id: string) => markCRMFollowUpDone(accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
      Alert.alert('Success', 'Task marked as completed.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to complete task.');
    },
  });

  const incompleteMutation = useMutation({
    mutationFn: (id: string) => updateCRMFollowUp(accessToken!, id, { completed_at: null } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
      Alert.alert('Success', 'Task marked as active.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to reactivate task.');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, due_at }: { id: string; due_at: string }) => rescheduleCRMFollowUp(accessToken!, id, due_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
      setRescheduleTask(null);
      Alert.alert('Success', 'Task rescheduled successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to reschedule task.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCRMFollowUp(accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
      setDeletingTask(null);
      Alert.alert('Success', 'Follow-up deleted successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete follow-up.');
    },
  });

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    if (!modalSubject.trim()) {
      newErrors.subject = 'Subject is required.';
    }

    if (!modalDate) {
      newErrors.date = 'Due date is required.';
    }

    if (!modalGroupId) {
      newErrors.group = 'Group is required.';
    }

    if (!modalTagId) {
      newErrors.tag = 'Tag is required.';
    }

    if (!modalPriority) {
      newErrors.priority = 'Priority is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }


    if (editingTask) {
      const updatePayload = {
        subject: modalSubject,
        contact_id: modalContactId,
        due_at: modalDate!.toISOString(),
        group_id: modalGroupId,
        tag_id: modalTagId,
        priority: modalPriority!,
      };
      updateMutation.mutate({ id: editingTask.id, payload: updatePayload });
    } else {
      const createPayload = {
        subject: modalSubject,
        contact_id: modalContactId,
        due_at: modalDate!.toISOString(),
        group_id: modalGroupId,
        tag_id: modalTagId,
        priority: modalPriority!,
        status: 1, // Active for new tasks
      };
      createMutation.mutate(createPayload);
    }
  };

  const markTaskDone = async (id: string) => {
    doneMutation.mutate(id);
  };

  const markTaskIncomplete = async (id: string) => {
    incompleteMutation.mutate(id);
  };

  const handleDeleteTask = async (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleReschedule = async () => {
    if (!rescheduleTask) return;
    const formattedDate = rescheduleDate.toISOString().split('.')[0].slice(0, 16);
    rescheduleMutation.mutate({
      id: rescheduleTask.id,
      due_at: formattedDate
    });
  };

  const [groupSearch, setGroupSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const filteredGroups = useMemo(() => {
    return (crmMeta?.groups || []).filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  }, [crmMeta, groupSearch]);

  const filteredTags = useMemo(() => {
    return (crmMeta?.tags || []).filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [crmMeta, tagSearch]);

  const filteredContacts = useMemo(() => {
    return (contactsData || []).filter(c =>
      `${c.first_name} ${c.last_name || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
    );
  }, [contactsData, contactSearch]);

  const selectedGroupName = useMemo(() => {
    return crmMeta?.groups.find(g => g.id === modalGroupId)?.name || 'Select Group';
  }, [crmMeta, modalGroupId]);

  const selectedTagName = useMemo(() => {
    return crmMeta?.tags.find(t => t.id === modalTagId)?.name || 'Select Tag';
  }, [crmMeta, modalTagId]);

  const selectedContactName = useMemo(() => {
    const contact = contactsData?.find(c => c.id === modalContactId);
    return contact ? `${contact.first_name} ${contact.last_name || ''}` : 'Select Contact';
  }, [contactsData, modalContactId]);

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <PageHeader
          title="Follow-Ups"
          subtitle="Manage automated and manual interactions with your prospects."
          onBack={() => router.back()}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accentTeal]} tintColor={colors.accentTeal} />
        }
      >
        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrapper}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted || "#8DA4B5"} />
            <TextInput
              placeholder="Search by contact or subject..."
              placeholderTextColor={colors.textMuted || "#8DA4B5"}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.filtersRow}>
            <Pressable
              style={[styles.filterBtn, groupFilter !== 'All Groups' && styles.filterBtnActive]}
              onPress={() => setActiveDropdown('group')}
            >
              <MaterialCommunityIcons name="folder-outline" size={18} color={groupFilter !== 'All Groups' ? colors.accentTeal : colors.textSecondary} />
              <Text style={[styles.filterBtnText, groupFilter !== 'All Groups' && styles.filterBtnTextActive]} numberOfLines={1}>{groupFilter}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={groupFilter !== 'All Groups' ? colors.textPrimary : colors.textMuted || '#64748B'} />
            </Pressable>

            <Pressable
              style={[styles.filterBtn, tagFilter !== 'All Tags' && styles.filterBtnActive]}
              onPress={() => setActiveDropdown('tag')}
            >
              <MaterialCommunityIcons name="tag-outline" size={18} color={tagFilter !== 'All Tags' ? colors.accentTeal : colors.textSecondary} />
              <Text style={[styles.filterBtnText, tagFilter !== 'All Tags' && styles.filterBtnTextActive]} numberOfLines={1}>{tagFilter}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={tagFilter !== 'All Tags' ? colors.textPrimary : colors.textMuted || '#64748B'} />
            </Pressable>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {isLoadingTasks ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: '700' }}>Syncing Follow-Ups...</Text>
          </View>
        ) : (
          <>
            {filteredTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={() => openEditModal(t)}
                onDelete={() => setDeletingTask(t)}
                onDone={() => markTaskDone(t.id)}
                onIncomplete={() => markTaskIncomplete(t.id)}
                onReschedule={() => setRescheduleTask(t)}
              />
            ))}
            {filteredTasks.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.textMuted || '#8DA4B5', fontWeight: 'bold' }}>No tasks found matching these filters.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={openAddModal}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Follow Up</Text>
      </Pressable>

      {/* Quick Filter Modal */}
      <Modal
        visible={activeDropdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <Pressable style={styles.bottomSheetOverlay} onPress={() => setActiveDropdown(null)}>
          <View style={[styles.noteBottomSheet, { paddingBottom: 40 }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={[styles.modalTitle, { marginBottom: 20, textAlign: 'center' }]}>
              {activeDropdown === 'group' ? 'Select Group' : 'Select Tag'}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {(activeDropdown === 'group'
                ? ['All Groups', ...(crmMeta?.groups.map(g => g.name) || [])]
                : ['All Tags', ...(crmMeta?.tags.map(t => t.name) || [])]
              ).map((opt) => (
                <Pressable
                  key={opt}
                  style={styles.dropdownOption}
                  onPress={() => {
                    if (activeDropdown === 'group') setGroupFilter(opt);
                    else setTagFilter(opt);
                    setActiveDropdown(null);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    (activeDropdown === 'group' ? groupFilter : tagFilter) === opt && { color: colors.accentTeal, fontWeight: '800' }
                  ]}>
                    {opt}
                  </Text>
                  {(activeDropdown === 'group' ? groupFilter : tagFilter) === opt && (
                    <MaterialCommunityIcons name="check" size={20} color={colors.accentTeal} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Add Task Modal (Full Page) */}
      <Modal
        visible={isAddTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddTaskModalVisible(false)}
      >
        <View style={[styles.fullPageModal, { paddingTop: insets.top }]}>
          <View style={styles.premiumModalHeader}>
            <View>
              <Text style={styles.fullScreenModalTitle}>
                {editingTask ? 'Edit Follow-Up' : 'Add Follow-Up'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {editingTask
                  ? 'Update your follow-up task details below.'
                  : 'Schedule a manual follow-up task with intelligence.'}
              </Text>
            </View>
            <Pressable style={styles.fullScreenModalCloseIcon} onPress={() => setAddTaskModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalContent} contentContainerStyle={{ paddingBottom: 120 }} keyboardDismissMode='on-drag'>
            <View style={styles.modalBody}>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>
                  Subject <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={[styles.modalInput, errors.subject && styles.inputError]}
                  placeholder="e.g. Call to discuss pricing"
                  placeholderTextColor={colors.textMuted || "#8DA4B5"}
                  value={modalSubject}
                  onChangeText={(val) => {
                    setModalSubject(val);
                    if (errors.subject) setErrors(prev => ({ ...prev, subject: '' }));
                  }}
                />
                {errors.subject ? <Text style={styles.inlineError}>{errors.subject}</Text> : null}
              </View>

              <View style={[styles.modalFieldGroup, { zIndex: 4000 }]}>
                <Text style={styles.modalLabel}>Contact Name</Text>
                <Pressable
                  style={[styles.modalDropdownTrigger]}
                  onPress={() => {
                    setModalContactDropdownOpen(true);
                    setModalGroupDropdownOpen(false);
                    setModalTagDropdownOpen(false);
                    setContactSearch('');
                  }}
                >
                  <Text style={[styles.modalDropdownText, !modalContactId && { color: colors.textMuted }]}>
                    {selectedContactName}
                  </Text>
                  <MaterialCommunityIcons name="account-search-outline" size={20} color={colors.textPrimary} />
                </Pressable>

                <Modal
                  visible={isModalContactDropdownOpen}
                  transparent={false}
                  animationType="slide"
                  onRequestClose={() => setModalContactDropdownOpen(false)}
                >
                  <View style={[styles.fullPageModal, { paddingTop: insets.top }]}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Contact</Text>
                      <Pressable onPress={() => setModalContactDropdownOpen(false)} style={styles.pickerCloseBtnSmall}>
                        <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>

                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.pickerSearchInputSmall}
                        placeholder="Search contact..."
                        placeholderTextColor={colors.textMuted}
                        value={contactSearch}
                        onChangeText={setContactSearch}
                      />
                    </View>

                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                      {filteredContacts.map((c) => (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.selectionModalItem,
                            modalContactId === c.id && styles.selectionModalItemActive
                          ]}
                          onPress={() => { setModalContactId(c.id); setModalContactDropdownOpen(false); }}
                        >
                          <Text style={[styles.selectionModalItemText, modalContactId === c.id && styles.selectionModalItemTextActive]}>
                            {c.first_name} {c.last_name || ''}
                          </Text>
                          {modalContactId === c.id && (
                            <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </Modal>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>
                  Due Date <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <Pressable
                  style={[styles.modalInputWithIcon, errors.date && styles.inputError]}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      setAndroidPickerMode('date');
                    }
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[styles.modalDateText, !modalDate && { color: colors.textMuted }]}>
                    {modalDate
                      ? `${modalDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}, ${modalDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                      : 'Select Date'}
                  </Text>
                  <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textPrimary} />
                </Pressable>
                {errors.date ? <Text style={styles.inlineError}>{errors.date}</Text> : null}
              </View>

              <View style={[styles.modalFieldGroup, { zIndex: 3000 }]}>
                <Text style={styles.modalLabel}>
                  Group <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <Pressable
                  style={[styles.modalDropdownTrigger, errors.group && styles.inputError]}
                  onPress={() => {
                    setModalGroupDropdownOpen(true);
                    setModalTagDropdownOpen(false);
                    setGroupSearch('');
                  }}
                >
                  <Text style={[styles.modalDropdownText, !modalGroupId && { color: colors.textMuted }]}>{selectedGroupName}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
                {errors.group ? <Text style={styles.inlineError}>{errors.group}</Text> : null}
                <Modal
                  visible={isModalGroupDropdownOpen}
                  transparent={false}
                  animationType="slide"
                  onRequestClose={() => setModalGroupDropdownOpen(false)}
                >
                  <View style={[styles.fullPageModal, { paddingTop: insets.top }]}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Group</Text>
                      <Pressable onPress={() => setModalGroupDropdownOpen(false)} style={styles.pickerCloseBtnSmall}>
                        <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>

                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.pickerSearchInputSmall}
                        placeholder="Search groups..."
                        placeholderTextColor={colors.textMuted}
                        value={groupSearch}
                        onChangeText={setGroupSearch}
                      />
                    </View>

                    <ScrollView style={styles.selectionModalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                      {filteredGroups.length === 0 ? (
                        <Text style={styles.noResultsSmall}>No groups found</Text>
                      ) : filteredGroups.map((g, index, arr) => (
                        <Pressable
                          key={g.id}
                          style={[
                            styles.selectionModalItem,
                            index === arr.length - 1 && styles.selectionModalItemLast
                          ]}
                          onPress={() => {
                            setModalGroupId(g.id);
                            setModalGroupDropdownOpen(false);
                            if (errors.group) setErrors(prev => ({ ...prev, group: '' }));
                          }}
                        >
                          <Text style={[styles.selectionModalItemText, modalGroupId === g.id && styles.selectionModalItemTextActive]}>{g.name}</Text>
                          {modalGroupId === g.id && (
                            <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </Modal>
              </View>

              <View style={[styles.modalFieldGroup, { zIndex: 2000 }]}>
                <Text style={styles.modalLabel}>
                  Tag <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <Pressable
                  style={[styles.modalDropdownTrigger, errors.tag && styles.inputError]}
                  onPress={() => {
                    setModalTagDropdownOpen(true);
                    setModalGroupDropdownOpen(false);
                    setTagSearch('');
                  }}
                >
                  <Text style={[styles.modalDropdownText, !modalTagId && { color: colors.textMuted }]}>{selectedTagName}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
                {errors.tag ? <Text style={styles.inlineError}>{errors.tag}</Text> : null}
                <Modal
                  visible={isModalTagDropdownOpen}
                  transparent={false}
                  animationType="slide"
                  onRequestClose={() => setModalTagDropdownOpen(false)}
                >
                  <View style={[styles.fullPageModal, { paddingTop: insets.top }]}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Tag</Text>
                      <Pressable onPress={() => setModalTagDropdownOpen(false)} style={styles.pickerCloseBtnSmall}>
                        <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>

                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.pickerSearchInputSmall}
                        placeholder="Search tags..."
                        placeholderTextColor={colors.textMuted}
                        value={tagSearch}
                        onChangeText={setTagSearch}
                      />
                    </View>

                    <ScrollView style={styles.selectionModalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                      {filteredTags.length === 0 ? (
                        <Text style={styles.noResultsSmall}>No tags found</Text>
                      ) : filteredTags.map((t, index, arr) => (
                        <Pressable
                          key={t.id}
                          style={[
                            styles.selectionModalItem,
                            index === arr.length - 1 && styles.selectionModalItemLast
                          ]}
                          onPress={() => {
                            setModalTagId(t.id);
                            setModalTagDropdownOpen(false);
                            if (errors.tag) setErrors(prev => ({ ...prev, tag: '' }));
                          }}
                        >
                          <Text style={[styles.selectionModalItemText, modalTagId === t.id && styles.selectionModalItemTextActive]}>{t.name}</Text>
                          {modalTagId === t.id && (
                            <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </Modal>
              </View>



              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>
                  Priority <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={[styles.priorityRow, errors.priority && { padding: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.danger || '#E11D48' }]}>
                  {['High', 'Medium', 'Low'].map((p) => (
                    <Pressable
                      key={p}
                      style={[styles.priorityPillBtn, modalPriority === p && styles.priorityPillBtnActive]}
                      onPress={() => {
                        setModalPriority(p);
                        if (errors.priority) setErrors(prev => ({ ...prev, priority: '' }));
                      }}
                    >
                      <Text style={[styles.priorityPillText, modalPriority === p && styles.priorityPillTextActive]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
                {errors.priority ? <Text style={styles.inlineError}>{errors.priority}</Text> : null}
              </View>
            </View>
          </ScrollView>

          {Platform.OS === 'ios' ? (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <Pressable style={styles.pickerOverlay} onPress={() => setShowDatePicker(false)}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Date & Time</Text>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerDoneBtn}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={modalDate || new Date()}
                    mode="datetime"
                    display="inline"
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setModalDate(selectedDate);
                        if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
                      }
                    }}
                    textColor={colors.textPrimary}
                    style={{ width: '100%', height: 360 }}
                  />
                </View>
              </Pressable>
            </Modal>
          ) : (
            showDatePicker && (
              <DateTimePicker
                value={modalDate || new Date()}
                mode={androidPickerMode}
                display="default"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (event.type === 'set') {
                    const currentDate = selectedDate || modalDate || new Date();
                    setModalDate(currentDate);
                    if (androidPickerMode === 'date') {
                      setAndroidPickerMode('time');
                    } else {
                      setShowDatePicker(false);
                      if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
                    }
                  } else {
                    setShowDatePicker(false);
                  }
                }}
              />
            )
          )}

          <View style={[styles.fixedBottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Pressable style={styles.modalCancelBtn} onPress={() => setAddTaskModalVisible(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.modalSaveBtn}
              onPress={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Reschedule Task Modal (Bottom Sheet Style) */}
      <Modal
        visible={!!rescheduleTask}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleTask(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRescheduleTask(null)}>
          <View style={[styles.bottomFixModal, { paddingBottom: Math.max(insets.bottom, 20) }]} onStartShouldSetResponder={() => true}>
            <View style={styles.premiumModalHeader}>
              <View>
                <Text style={[styles.fullScreenModalTitle, { fontSize: 24 }]}>Reschedule Task</Text>
                <Text style={styles.modalSubtitle}>Choose a new date and time for this follow-up.</Text>
              </View>
              <Pressable style={styles.fullScreenModalCloseIcon} onPress={() => setRescheduleTask(null)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={[styles.modalBody, { paddingBottom: 20 }]}>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>New Due Date</Text>
                <Pressable style={styles.modalInputWithIcon} onPress={() => {
                  if (Platform.OS === 'android') {
                    setAndroidPickerMode('date');
                  }
                  setShowReschedulePicker(true);
                }}>
                  <Text style={styles.modalDateText}>
                    {rescheduleDate.toLocaleDateString('en-GB')} {rescheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={[styles.modalCancelBtn, { flex: 1 }]} onPress={() => setRescheduleTask(null)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSaveBtn, { flex: 1.5 }]}
                  onPress={handleReschedule}
                  disabled={rescheduleMutation.isPending}
                >
                  {rescheduleMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>

        {Platform.OS === 'ios' ? (
          <Modal
            visible={showReschedulePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowReschedulePicker(false)}
          >
            <Pressable style={styles.pickerOverlay} onPress={() => setShowReschedulePicker(false)}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Date & Time</Text>
                  <Pressable onPress={() => setShowReschedulePicker(false)}>
                    <Text style={styles.pickerDoneBtn}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={rescheduleDate}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setRescheduleDate(selectedDate);
                  }}
                  textColor={colors.textPrimary}
                />
              </View>
            </Pressable>
          </Modal>
        ) : (
          showReschedulePicker && (
            <DateTimePicker
              value={rescheduleDate}
              mode={androidPickerMode}
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (event.type === 'set') {
                  const currentDate = selectedDate || rescheduleDate;
                  setRescheduleDate(currentDate);
                  if (androidPickerMode === 'date') {
                    setAndroidPickerMode('time');
                  } else {
                    setShowReschedulePicker(false);
                  }
                } else {
                  setShowReschedulePicker(false);
                }
              }}
            />
          )
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deletingTask}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingTask(null)}
      >
        <Pressable style={styles.alertOverlay} onPress={() => setDeletingTask(null)}>
          <View style={styles.alertContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.alertIconCircle}>
              <MaterialCommunityIcons name="alert-outline" size={32} color={colors.danger || "#EF4444"} />
            </View>

            <Text style={styles.alertTitle}>Delete Follow-Up?</Text>
            <Text style={styles.alertDescription}>
              This action cannot be undone. This task will be permanently removed from your schedule.
            </Text>

            <View style={styles.alertActions}>
              <Pressable style={styles.alertCancelBtn} onPress={() => setDeletingTask(null)}>
                <Text style={styles.alertCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.alertDeleteBtn}
                onPress={() => deletingTask && handleDeleteTask(deletingTask.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.alertDeleteBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.cardBackground },
    topTabsContainer: { marginBottom: 16 },

    searchBarContainer: { paddingHorizontal: 0, marginBottom: 0 },
    searchInputWrapper: {
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
    selectionModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    selectionModalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 28,
      width: '100%',
      height: 520,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.2,
      shadowRadius: 30,
      elevation: 20,
    },
    selectionModalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    selectionModalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceSoft,
    },
    selectionModalItemActive: {
      backgroundColor: 'rgba(11, 160, 178, 0.05)',
      borderRadius: 12,
    },
    selectionModalItemLast: {
      borderBottomWidth: 0,
    },
    selectionModalItemText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    selectionModalItemTextActive: {
      color: colors.accentTeal,
      fontWeight: '800',
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },

    filterSection: { marginBottom: 16 },
    filtersRow: { flexDirection: 'row', gap: 10 },
    filterBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterBtnActive: { borderColor: colors.accentTeal, backgroundColor: colors.accentTeal + '10' },
    filterBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      flex: 1,
      textAlign: 'center',
    },
    filterBtnTextActive: { color: colors.accentTeal },

    dropdownOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    dropdownOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    tabsContainer: { marginBottom: 20 },
    tabsScroll: { paddingHorizontal: 0, gap: 8 },
    tabItem: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 100,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    tabItemActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: '#FFFFFF' },

    fab: {
      position: 'absolute',
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.accentTeal,
      gap: 5,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 100,
    },
    fabText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '800',
    },

    scroll: { flex: 1 },
    listContainer: { paddingHorizontal: 20, gap: 16, paddingTop: 4 },

    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 4
    },
    cardCompleted: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.cardBorder,
      opacity: 0.8,
    },
    cardMain: { flexDirection: 'row', gap: 16 },
    cardIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center'
    },
    cardIconOverdue: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    cardIconCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    cardContent: { flex: 1 },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
    },
    cardTitle: { fontSize: 17, fontWeight: '900', color: colors.textPrimary, flex: 1, marginRight: 8 },
    cardTitleCompleted: { color: colors.textMuted, textDecorationLine: 'line-through' },

    priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    priorityText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

    cardContact: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    cardContactName: { fontWeight: '800', color: colors.textPrimary },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    tagPill: { backgroundColor: colors.surfaceSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    infoGrid: {
      flexDirection: 'row',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 16
    },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },

    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      gap: 12
    },
    actionIcons: { flexDirection: 'row', gap: 10 },
    actionIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    rescheduleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      height: 40,
      borderRadius: 12,
    },
    rescheduleText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },

    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 10,
    },
    completedLabel: { fontSize: 13, fontWeight: '900', color: colors.accentGreen || '#10B981' },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(11, 45, 62, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
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
      backgroundColor: colors.cardBorder,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: 24,
    },
    rescheduleModalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      paddingTop: 24,
      paddingBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    modalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      maxHeight: '90%',
      paddingTop: 24,
      paddingBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 24,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
      maxWidth: '80%',
    },
    modalCloseIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalScroll: {
      paddingHorizontal: 24,
      paddingBottom: 8,
    },
    modalFieldGroup: {
      marginBottom: 16,
    },
    modalLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    modalInput: {
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.cardBackground,
      fontWeight: '600',
    },
    modalRow: {
      flexDirection: 'row',
      gap: 12,
    },
    modalInputWithIcon: {
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
    },
    modalDateText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityPillBtn: {
      flex: 1,
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priorityPillBtnActive: {
      borderColor: colors.accentTeal,
      backgroundColor: colors.accentTeal,
    },
    priorityPillText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    priorityPillTextActive: {
      color: '#FFFFFF',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    modalCancelBtn: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    modalCancelBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
    modalCreateBtn: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCreateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

    // --- New Modal Styles ---
    fullPageModal: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    premiumModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 20,
    },
    fullScreenModalTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    fullScreenModalCloseIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    modalContent: {
      flex: 1,
    },
    modalBody: {
      paddingHorizontal: 24,
      paddingTop: 10,
    },
    modalDropdownTrigger: {
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
    },
    modalDropdownText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    requiredAsterisk: {
      color: colors.danger || '#E11D48',
    },
    inlineError: {
      fontSize: 12,
      color: colors.danger || '#E11D48',
      fontWeight: '700',
      marginTop: 4,
      marginLeft: 4,
    },
    inputError: {
      borderColor: colors.danger || '#E11D48',
    },
    modalTagColorCircleOuter: {
      width: 38,
      height: 38,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fixedBottomActions: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 24,
      paddingTop: 16,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    modalSaveBtn: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    modalSaveBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerContainer: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      justifyContent: "center",
      alignItems: "center"
    },
    pickerHeader: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    pickerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    pickerDoneBtn: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.accentTeal,
    },
    bottomFixModal: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      width: '100%',
      marginTop: 'auto',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 20,
    },
    alertOverlay: {
      flex: 1,
      backgroundColor: 'rgba(11, 45, 62, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    alertContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 32,
      width: '100%',
      maxWidth: 340,
      padding: 32,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.15,
      shadowRadius: 30,
      elevation: 10,
    },
    alertIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    alertTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    alertDescription: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 32,
      paddingHorizontal: 10,
    },
    alertActions: {
      flexDirection: 'row',
      gap: 16,
      width: '100%',
    },
    alertCancelBtn: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertCancelBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    alertDeleteBtn: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.danger || '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.danger || '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    alertDeleteBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    autocompleteContainer: {
      position: 'relative',
      width: '100%',
    },
    autocompleteDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginTop: 4,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 5,
      zIndex: 10000,
    },
    autocompleteItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceSoft,
    },
    autocompleteItemTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    autocompleteItemSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalTextInput: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    selectionModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
    },
    pickerCloseBtnSmall: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerSearchBoxSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      marginHorizontal: 24,
      marginBottom: 16,
      paddingHorizontal: 16,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pickerSearchInputSmall: {
      flex: 1,
      marginLeft: 10,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    selectionModalList: {
      flex: 1,
    },
    noResultsSmall: {
      textAlign: 'center',
      marginTop: 32,
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '600',
    },
  });
}