import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
    appendCRMEvent,
    appendCRMNote,
    getCRMContactDetail,
    getCRMMeta,
    updateCRMContact,
    getCRMFollowUps,
    createCRMFollowUp,
    updateCRMFollowUp,
    deleteCRMFollowUp,
    markCRMFollowUpDone,
} from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getBadgeBgColor = (color: string) => {
    if (color && color.startsWith('#') && color.length === 7) {
        return `${color}18`;
    }
    return 'rgba(100, 116, 139, 0.1)';
};

export default function ProfileScreen() {
    const { colors, theme } = useAppTheme();
    const isDark = theme === 'dark';
    const styles = getStyles(colors, isDark);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();

    // Query Contact Detail
    const { data: contact, isLoading, error } = useQuery({
        queryKey: ['crm-contact', id],
        queryFn: () => getCRMContactDetail(accessToken!, id!),
        enabled: !!accessToken && !!id,
    });

    // Query CRM Metadata (for Group & Tag names fallback)
    const { data: metaData } = useQuery({
        queryKey: ['crm-meta'],
        queryFn: () => getCRMMeta(accessToken!),
        enabled: !!accessToken,
    });

    const groupName = useMemo(() => {
        if (!contact) return '—';
        if (contact.group?.name) return contact.group.name;
        if ((contact as any).group_name) return (contact as any).group_name;
        if (contact.group_id && metaData?.groups) {
            const found = metaData.groups.find((g: any) => g.id === contact.group_id);
            if (found?.name) return found.name;
        }
        return 'General';
    }, [contact, metaData]);

    const tagName = useMemo(() => {
        if (!contact) return '—';
        if (contact.tag?.name) return contact.tag.name;
        if ((contact as any).tag_name) return (contact as any).tag_name;
        if (contact.tag_id && metaData?.tags) {
            const found = metaData.tags.find((t: any) => t.id === contact.tag_id);
            if (found?.name) return found.name;
        }
        return 'Unassigned';
    }, [contact, metaData]);

    const tagColor = useMemo(() => {
        if (!contact) return colors.accentTeal;
        if (contact.tag?.tag_color) return contact.tag.tag_color;
        if ((contact as any).tag_color) return (contact as any).tag_color;
        if (contact.tag_id && metaData?.tags) {
            const found = metaData.tags.find((t: any) => t.id === contact.tag_id);
            if (found?.tag_color) return found.tag_color;
        }
        return colors.accentTeal;
    }, [contact, metaData, colors.accentTeal]);

    // Query Tasks (Follow-ups)
    const { data: followUpsData, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['crm-follow-ups'],
        queryFn: () => getCRMFollowUps(accessToken!),
        enabled: !!accessToken,
    });

    // Filter Tasks for this Contact
    const contactFollowUps = useMemo(() => {
        return (followUpsData || []).filter((task: any) => task.contact_id === id);
    }, [followUpsData, id]);

    // Note State
    const [noteContent, setNoteContent] = useState('');
    const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
    const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
    const noteInputRef = React.useRef<TextInput>(null);

    // Event State
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState<Date | null>(null);
    const [isEventModalVisible, setIsEventModalVisible] = useState(false);
    const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
    const eventTitleInputRef = React.useRef<TextInput>(null);

    // Task State
    const [taskSubject, setTaskSubject] = useState('');
    const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
    const [taskPriority, setTaskPriority] = useState('Medium');
    const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [isPriorityDropdownVisible, setIsPriorityDropdownVisible] = useState(false);
    const taskSubjectInputRef = React.useRef<TextInput>(null);

    // Heat Index State
    const [heatIndexInput, setHeatIndexInput] = useState('');
    const [isHeatModalVisible, setIsHeatModalVisible] = useState(false);
    const heatIndexInputRef = React.useRef<TextInput>(null);

    // Inline Date Picker control (per-modal)
    const [showEventDatePicker, setShowEventDatePicker] = useState(false);
    const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
    const [androidTaskPickerMode, setAndroidTaskPickerMode] = useState<'date' | 'time'>('date');

    // Pipeline Stage Dropdown control
    const [isStageDropdownVisible, setIsStageDropdownVisible] = useState(false);

    // Mutations
    const updateContactMutation = useMutation({
        mutationFn: (payload: any) => updateCRMContact(accessToken!, id!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-contact', id] });
            queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
            queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
        },
        onError: (err: any) => {
            Alert.alert('Update Error', err.message || 'Failed to update contact');
        }
    });

    const addNoteMutation = useMutation({
        mutationFn: (content: string) => appendCRMNote(accessToken!, id!, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-contact', id] });
            setIsNoteModalVisible(false);
            setNoteContent('');
        },
        onError: (err: any) => {
            Alert.alert('Sync Conflict', err.message);
        }
    });

    const addEventMutation = useMutation({
        mutationFn: (data: { title: string, date: string }) => appendCRMEvent(accessToken!, id!, data.title, data.date),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-contact', id] });
            setIsEventModalVisible(false);
            setEventTitle('');
            setEventDate(null);
        },
        onError: (err: any) => {
            Alert.alert('Sync Conflict', err.message);
        }
    });

    // Task Mutations
    const createTaskMutation = useMutation({
        mutationFn: (payload: any) => createCRMFollowUp(accessToken!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
            setIsTaskModalVisible(false);
            resetTaskFields();
        },
        onError: (err: any) => {
            Alert.alert('Task Error', err.message || 'Failed to create task');
        }
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ taskId, payload }: { taskId: string, payload: any }) => updateCRMFollowUp(accessToken!, taskId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
            setIsTaskModalVisible(false);
            resetTaskFields();
        },
        onError: (err: any) => {
            Alert.alert('Task Error', err.message || 'Failed to update task');
        }
    });

    const toggleTaskMutation = useMutation({
        mutationFn: ({ taskId, isCompleted }: { taskId: string, isCompleted: boolean }) => {
            if (isCompleted) {
                return updateCRMFollowUp(accessToken!, taskId, { completed_at: null } as any);
            } else {
                return markCRMFollowUpDone(accessToken!, taskId);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
        },
        onError: (err: any) => {
            Alert.alert('Task Error', err.message || 'Failed to update task status');
        }
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (taskId: string) => deleteCRMFollowUp(accessToken!, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
        },
        onError: (err: any) => {
            Alert.alert('Task Error', err.message || 'Failed to delete task');
        }
    });

    if (isLoading) {
        return (
            <LinearGradient
                colors={colors.backgroundGradient as any}
                style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accentTeal} />
                <Text style={styles.loaderText}>Loading profile...</Text>
            </LinearGradient>
        );
    }

    if (error || !contact) {
        return (
            <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
                <MaterialCommunityIcons name="account-search-outline" size={64} color={colors.textMuted} />
                <Text style={styles.errorTitle}>Profile Not Found</Text>
                <Text style={styles.errorSub}>This lead profile could not be retrieved.</Text>
                <Pressable onPress={() => router.back()} style={styles.errorBtn}>
                    <Text style={styles.errorBtnText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const fullName = `${contact.first_name} ${contact.last_name}`;
    const isActive = contact.status === 1;

    // Actions
    const handleEmail = () => contact.email && Linking.openURL(`mailto:${contact.email}`);
    const handleCall = () => contact.phone && Linking.openURL(`tel:${contact.country_code}${contact.phone}`);
    const handleWhatsApp = () => contact.phone && Linking.openURL(`https://wa.me/${contact.country_code.replace('+', '')}${contact.phone}`);

    // Notes Handlers
    const openAddNote = () => {
        setEditingNoteIndex(null);
        setNoteContent('');
        setIsNoteModalVisible(true);
    };

    const openEditNote = (index: number) => {
        const note = contact.notes[index];
        setEditingNoteIndex(index);
        setNoteContent(note.content || note.text || '');
        setIsNoteModalVisible(true);
    };

    const handleSaveNote = () => {
        if (!noteContent.trim()) return;
        if (editingNoteIndex !== null) {
            const updatedNotes = contact.notes.map((note: any, idx: number) => {
                if (idx === editingNoteIndex) {
                    return { ...note, content: noteContent.trim() };
                }
                return note;
            });
            updateContactMutation.mutate({ notes: updatedNotes });
            setIsNoteModalVisible(false);
            setNoteContent('');
        } else {
            addNoteMutation.mutate(noteContent.trim());
        }
    };

    const handleDeleteNote = (indexToDelete: number) => {
        Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const updatedNotes = contact.notes.filter((_: any, idx: number) => idx !== indexToDelete);
                    updateContactMutation.mutate({ notes: updatedNotes });
                }
            }
        ]);
    };

    // Events Handlers
    const openAddEvent = () => {
        setEditingEventIndex(null);
        setEventTitle('');
        setEventDate(null);
        setShowEventDatePicker(false);
        setIsEventModalVisible(true);
    };

    const parseEventDateString = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        // Handle "Jun 2, 2026" format from API
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) return parsed;
        // Fallback: manually parse "MMM D, YYYY"
        try {
            const months: Record<string, number> = {
                Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
            };
            const parts = dateStr.replace(',', '').split(' ');
            if (parts.length === 3) {
                const month = months[parts[0]];
                const day = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                    return new Date(year, month, day);
                }
            }
        } catch (_) {}
        return null;
    };

    const openEditEvent = (index: number) => {
        const evt = contact.events[index];
        setEditingEventIndex(index);
        setEventTitle(evt.title || '');
        setEventDate(evt.date ? parseEventDateString(evt.date) : null);
        setShowEventDatePicker(false);
        setIsEventModalVisible(true);
    };

    const handleSaveEvent = () => {
        if (!eventTitle.trim() || !eventDate) return;
        const formattedDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (editingEventIndex !== null) {
            const updatedEvents = contact.events.map((evt: any, idx: number) => {
                if (idx === editingEventIndex) {
                    return { ...evt, title: eventTitle.trim(), date: formattedDate };
                }
                return evt;
            });
            updateContactMutation.mutate({ events: updatedEvents });
            setIsEventModalVisible(false);
            setShowEventDatePicker(false);
            setEventTitle('');
            setEventDate(null);
        } else {
            addEventMutation.mutate({ title: eventTitle.trim(), date: formattedDate });
        }
    };

    const handleDeleteEvent = (indexToDelete: number) => {
        Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const updatedEvents = contact.events.filter((_: any, idx: number) => idx !== indexToDelete);
                    updateContactMutation.mutate({ events: updatedEvents });
                }
            }
        ]);
    };

    // Tasks Handlers
    const resetTaskFields = () => {
        setTaskSubject('');
        setTaskDueDate(null);
        setTaskPriority('Medium');
        setEditingTaskId(null);
        setShowTaskDatePicker(false);
    };

    const openAddTask = () => {
        resetTaskFields();
        setIsTaskModalVisible(true);
    };

    const openEditTask = (task: any) => {
        setEditingTaskId(task.id);
        setTaskSubject(task.subject || '');
        setTaskDueDate(task.due_at ? new Date(task.due_at) : null);
        setTaskPriority(task.priority || 'Medium');
        setIsTaskModalVisible(true);
    };

    const handleSaveTask = () => {
        if (!taskSubject.trim() || !taskDueDate) return;
        const payload = {
            subject: taskSubject.trim(),
            due_at: taskDueDate.toISOString(),
            priority: taskPriority,
            contact_id: id,
            group_id: contact.group_id || contact.group?.id || null,
            tag_id: contact.tag_id || contact.tag?.id || null,
            status: 1
        };

        if (editingTaskId) {
            updateTaskMutation.mutate({ taskId: editingTaskId, payload });
        } else {
            createTaskMutation.mutate(payload);
        }
    };

    const handleDeleteTask = (taskId: string) => {
        Alert.alert('Delete Task', 'Are you sure you want to delete this follow-up task?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteTaskMutation.mutate(taskId)
            }
        ]);
    };

    // Heat Index Handlers
    const openEditHeat = () => {
        setHeatIndexInput(String(contact.heat_index ?? ''));
        setIsHeatModalVisible(true);
    };

    const handleSaveHeat = () => {
        const val = parseInt(heatIndexInput, 10);
        if (isNaN(val) || val < 0 || val > 100) {
            Alert.alert('Invalid Score', 'Please input a score between 0 and 100');
            return;
        }
        updateContactMutation.mutate({ heat_index: val });
        setIsHeatModalVisible(false);
    };

    // Date Picker Triggers
    const openEventDatePicker = () => {
        eventTitleInputRef.current?.blur();
        Keyboard.dismiss();
        if (Platform.OS === 'android') {
            setAndroidTaskPickerMode('date');
        }
        setShowEventDatePicker(true);
    };

    const openTaskDatePicker = () => {
        taskSubjectInputRef.current?.blur();
        Keyboard.dismiss();
        if (Platform.OS === 'android') {
            setAndroidTaskPickerMode('date');
        }
        setShowTaskDatePicker(true);
    };

    // Pipeline Stage calculations
    const stages = [
        'Lead Captured',
        'Contacted & Engaged',
        'Showing / Site Visit',
        'Offer & Negotiation',
        'Closed Won'
    ];
    const currentStageName = contact.pipeline_stage || 'Lead Captured';
    const currentStageIndex = stages.indexOf(currentStageName);
    const progressPercent = currentStageIndex >= 0 ? ((currentStageIndex + 1) / stages.length) * 100 : 0;

    const handleSelectStage = (stage: string) => {
        updateContactMutation.mutate({ pipeline_stage: stage });
        setIsStageDropdownVisible(false);
    };

    const formattedEventDate = eventDate
        ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    const formattedTaskDate = taskDueDate
        ? `${taskDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${taskDueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        : null;

    const formatTaskDateModal = (date: Date | null) => {
        if (!date) return 'Select Date';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <LinearGradient
            colors={colors.backgroundGradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.screen}>

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <PageHeader title="" onBack={() => router.back()} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
                showsVerticalScrollIndicator={false}>

                {/* ─── Hero card ─── */}
                <View style={styles.heroCard}>
                    {/* Source badge ribbon */}
                    {contact.source ? (
                        <View style={styles.sourceRibbon}>
                            <MaterialCommunityIcons name="web" size={10} color={isDark ? '#8CA4B5' : '#6B7C8D'} />
                            <Text style={styles.sourceRibbonText}>{contact.source.toUpperCase()}</Text>
                        </View>
                    ) : null}

                    <View style={styles.heroRow}>
                        <View style={styles.avatarWrap}>
                            <LinearGradient
                                colors={['#0B213E', '#143A5C'] as any}
                                style={styles.avatar}>
                                <Text style={styles.avatarLetter}>
                                    {contact.first_name.charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                            <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#64748B' }]} />
                        </View>

                        <View style={styles.heroInfo}>
                            <Text style={styles.heroName} numberOfLines={1}>{fullName}</Text>
                            <View style={styles.badgeRow}>
                                {groupName ? (
                                    <View style={styles.groupBadge}>
                                        <Text style={styles.groupBadgeText}>{groupName.toUpperCase()}</Text>
                                    </View>
                                ) : null}
                                {tagName ? (
                                    <View style={[styles.tagBadge, { backgroundColor: `${tagColor}15`, borderColor: tagColor }]}>
                                        <Text style={[styles.tagBadgeText, { color: tagColor }]}>{tagName.toUpperCase()}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.heroContactRow}>
                                <MaterialCommunityIcons name="email-outline" size={13} color={colors.textMuted} />
                                <Text style={styles.heroSubText} numberOfLines={1}>
                                    {contact.email || 'No Email'}
                                </Text>
                            </View>
                            <View style={styles.heroContactRow}>
                                <MaterialCommunityIcons name="phone-outline" size={13} color={colors.textMuted} />
                                <Text style={styles.heroSubText} numberOfLines={1}>
                                    {contact.phone ? `${contact.country_code} ${contact.phone}` : 'No Phone'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action buttons with icons */}
                    <View style={styles.actionsContainer}>
                        <Pressable
                            onPress={handleEmail}
                            disabled={!contact.email}
                            style={({ pressed }) => [
                                styles.actionBtnEmail,
                                !contact.email && { opacity: 0.4 },
                                pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }
                            ]}>
                            <MaterialCommunityIcons name="email-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnEmailText}>Email</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleCall}
                            disabled={!contact.phone}
                            style={({ pressed }) => [
                                styles.actionBtnOutlined,
                                !contact.phone && { opacity: 0.4 },
                                pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }
                            ]}>
                            <MaterialCommunityIcons name="phone-outline" size={16} color={colors.textPrimary} />
                            <Text style={styles.actionBtnOutlinedText}>Call</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleWhatsApp}
                            disabled={!contact.phone}
                            style={({ pressed }) => [
                                styles.actionBtnWhatsApp,
                                !contact.phone && { opacity: 0.4 },
                                pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }
                            ]}>
                            <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
                            <Text style={styles.actionBtnWhatsAppText}>WhatsApp</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ─── Pipeline Stage ─── */}
                <View style={styles.pipelineCard}>
                    <View style={styles.pipelineHeader}>
                        <View style={styles.pipelineIconWrap}>
                            <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={14} color="#00A7B5" />
                        </View>
                        <Text style={styles.pipelineTitle}>PIPELINE STAGE</Text>
                    </View>
                    <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() => setIsStageDropdownVisible(true)}>
                        <Text style={styles.dropdownText}>{currentStageName}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#FFFFFF" />
                    </Pressable>

                    {/* Step indicator dots */}
                    <View style={styles.pipelineStepsRow}>
                        {stages.map((stage, idx) => {
                            const isReached = idx <= currentStageIndex;
                            const isCurrent = idx === currentStageIndex;
                            return (
                                <View key={stage} style={styles.pipelineStepItem}>
                                    <View style={[
                                        styles.pipelineStepDot,
                                        isReached && styles.pipelineStepDotActive,
                                        isCurrent && styles.pipelineStepDotCurrent,
                                    ]} />
                                    {idx < stages.length - 1 && (
                                        <View style={[
                                            styles.pipelineStepLine,
                                            isReached && idx < currentStageIndex && styles.pipelineStepLineActive
                                        ]} />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* ─── Follow-up tasks ─── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5' }]}>
                                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color="#10B981" />
                            </View>
                            <Text style={styles.cardTitle}>Follow-up tasks</Text>
                            {contactFollowUps.length > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{contactFollowUps.length}</Text>
                                </View>
                            )}
                        </View>
                        <Pressable onPress={openAddTask} style={styles.addBtn}>
                            <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
                            <Text style={styles.addBtnText}>Add</Text>
                        </Pressable>
                    </View>

                    {contactFollowUps.length > 0 ? (
                        <View style={styles.tasksList}>
                            {contactFollowUps.map((task: any, taskIdx: number) => {
                                const isCompleted = !!task.completed_at;
                                const dueDateFormatted = new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                const accentColor = task.priority === 'High' ? colors.danger :
                                    task.priority === 'Medium' ? '#F59E0B' : '#10B981';
                                return (
                                    <View key={task.id} style={[
                                        styles.taskItem,
                                        { borderLeftColor: accentColor },
                                        taskIdx === contactFollowUps.length - 1 && { borderBottomWidth: 0 }
                                    ]}>
                                        <Pressable
                                            onPress={() => toggleTaskMutation.mutate({ taskId: task.id, isCompleted })}
                                            style={styles.checkbox}>
                                            {isCompleted ? (
                                                <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
                                            ) : (
                                                <View style={[styles.checkboxEmpty, { borderColor: accentColor }]} />
                                            )}
                                        </Pressable>

                                        <View style={styles.taskContent}>
                                            <Text style={[styles.taskSubject, isCompleted && styles.completedText]}>
                                                {task.subject}
                                            </Text>
                                            <View style={styles.taskMetaRow}>
                                                <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textMuted} />
                                                <Text style={[styles.taskDueDate, isCompleted && { color: colors.textMuted }]}>{dueDateFormatted}</Text>
                                                <View style={[
                                                    styles.priorityBadge,
                                                    { backgroundColor: `${accentColor}15` }
                                                ]}>
                                                    <Text style={[styles.priorityText, { color: accentColor }]}>
                                                        {task.priority.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.itemActions}>
                                            <Pressable
                                                onPress={() => openEditTask(task)}
                                                hitSlop={8}
                                                style={styles.editIconBtn}>
                                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#0070F3" />
                                            </Pressable>
                                            <Pressable onPress={() => handleDeleteTask(task.id)} hitSlop={8} style={styles.deleteIconBtn}>
                                                <MaterialCommunityIcons name="delete-outline" size={14} color={colors.danger} />
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyStateContainer}>
                            <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={colors.textMuted} style={{ marginBottom: 6, opacity: 0.5 }} />
                            <Text style={styles.emptyStateText}>No follow-up tasks scheduled.</Text>
                        </View>
                    )}
                </View>

                {/* ─── Internal notes ─── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF' }]}>
                                <MaterialCommunityIcons name="note-text-outline" size={16} color="#3B82F6" />
                            </View>
                            <Text style={styles.cardTitle}>Internal notes</Text>
                            {contact.notes && contact.notes.length > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{contact.notes.length}</Text>
                                </View>
                            )}
                        </View>
                        <Pressable onPress={openAddNote} style={styles.addBtn}>
                            <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
                            <Text style={styles.addBtnText}>Add</Text>
                        </Pressable>
                    </View>

                    {contact.notes && contact.notes.length > 0 ? (
                        <View style={styles.notesList}>
                            {[...contact.notes].reverse().map((note: any, reversedIdx: number) => {
                                const originalIdx = contact.notes.length - 1 - reversedIdx;
                                const noteDateFormatted = new Date(note.created_at || note.date).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric'
                                });
                                return (
                                    <View key={reversedIdx} style={styles.noteItemCard}>
                                        <View style={styles.noteAccentBar} />
                                        <View style={styles.noteBody}>
                                            <View style={styles.noteItemHeader}>
                                                <View style={styles.noteDateChip}>
                                                    <MaterialCommunityIcons name="clock-outline" size={11} color={colors.textMuted} />
                                                    <Text style={styles.noteItemTitle}>{noteDateFormatted}</Text>
                                                </View>
                                                <View style={styles.itemActions}>
                                                    <Pressable
                                                        onPress={() => openEditNote(originalIdx)}
                                                        hitSlop={8}
                                                        style={styles.editIconBtn}>
                                                        <MaterialCommunityIcons name="pencil-outline" size={14} color="#0070F3" />
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => handleDeleteNote(originalIdx)}
                                                        hitSlop={8}
                                                        style={styles.deleteIconBtn}>
                                                        <MaterialCommunityIcons name="delete-outline" size={14} color={colors.danger} />
                                                    </Pressable>
                                                </View>
                                            </View>
                                            <Text style={styles.noteItemContent}>{note.content || note.text}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyStateContainer}>
                            <MaterialCommunityIcons name="note-off-outline" size={28} color={colors.textMuted} style={{ marginBottom: 6, opacity: 0.5 }} />
                            <Text style={styles.emptyStateText}>No notes yet.</Text>
                        </View>
                    )}
                </View>

                {/* ─── Important events ─── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? 'rgba(168,85,247,0.12)' : '#F5F3FF' }]}>
                                <MaterialCommunityIcons name="calendar-star" size={16} color="#8B5CF6" />
                            </View>
                            <Text style={styles.cardTitle}>Important events</Text>
                        </View>
                        <Pressable onPress={openAddEvent} style={styles.addBtn}>
                            <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
                            <Text style={styles.addBtnText}>Add</Text>
                        </Pressable>
                    </View>

                    {contact.events && contact.events.length > 0 ? (
                        <View style={styles.eventsList}>
                            {contact.events.map((event: any, idx: number) => (
                                <View key={idx} style={[styles.eventItemRow, idx === contact.events.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                                    <View style={styles.eventIconBox}>
                                        <MaterialCommunityIcons name="calendar-heart" size={18} color="#8B5CF6" />
                                    </View>
                                    <View style={styles.eventInfoContainer}>
                                        <Text style={styles.eventItemTitleText}>{event.title}</Text>
                                        <View style={styles.eventDateChip}>
                                            <MaterialCommunityIcons name="clock-outline" size={11} color={colors.textMuted} />
                                            <Text style={styles.eventItemDateText}>{event.date}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.itemActions}>
                                        <Pressable
                                            onPress={() => openEditEvent(idx)}
                                            hitSlop={8}
                                            style={styles.editIconBtn}>
                                            <MaterialCommunityIcons name="pencil-outline" size={14} color="#0070F3" />
                                        </Pressable>
                                        <Pressable
                                            onPress={() => handleDeleteEvent(idx)}
                                            hitSlop={8}
                                            style={styles.deleteIconBtn}>
                                            <MaterialCommunityIcons name="delete-outline" size={14} color={colors.danger} />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyStateContainer}>
                            <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={colors.textMuted} style={{ marginBottom: 6, opacity: 0.5 }} />
                            <Text style={styles.emptyStateText}>No important events scheduled.</Text>
                        </View>
                    )}
                </View>

                {/* ─── AI heat index ─── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? 'rgba(245,124,0,0.12)' : '#FFF7ED' }]}>
                                <MaterialCommunityIcons name="fire" size={16} color="#F57C00" />
                            </View>
                            <Text style={styles.cardTitle}>AI heat index</Text>
                        </View>
                    </View>

                    <View style={styles.heatRow}>
                        <View style={styles.heatScoreContainer}>
                            <Text style={styles.heatScoreBig}>{contact.heat_index ?? 0}</Text>
                            <Text style={styles.heatScoreMuted}>/100</Text>
                        </View>
                        <Text style={styles.heatSubtitle}>DYNAMIC SCORING</Text>
                    </View>

                    {/* Heat progress bar */}
                    <View style={styles.heatProgressTrack}>
                        <LinearGradient
                            colors={['#F59E0B', '#F57C00', '#EF4444'] as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.heatProgressFill, { width: `${Math.min(contact.heat_index ?? 0, 100)}%` }]}
                        />
                    </View>
                    <View style={styles.heatLabelsRow}>
                        <Text style={styles.heatLabel}>Cold</Text>
                        <Text style={styles.heatLabel}>Warm</Text>
                        <Text style={styles.heatLabel}>Hot</Text>
                    </View>
                </View>

                {/* ─── Contact Details Card ─── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <View style={[styles.sectionIconBox, { backgroundColor: isDark ? 'rgba(100,116,139,0.12)' : '#F1F5F9' }]}>
                                <MaterialCommunityIcons name="card-account-details-outline" size={16} color="#64748B" />
                            </View>
                            <Text style={styles.cardTitle}>Contact details</Text>
                        </View>
                    </View>
                    <View style={styles.detailsList}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Group Name</Text>
                            <Text style={styles.detailValue}>{groupName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Tag Name</Text>
                            {tagColor ? (
                                <View style={[styles.statusChip, { backgroundColor: getBadgeBgColor(tagColor) }]}>
                                    <Text style={[styles.statusChipText, { color: tagColor }]}>{tagName}</Text>
                                </View>
                            ) : (
                                <Text style={styles.detailValue}>{tagName}</Text>
                            )}
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Source</Text>
                            <Text style={styles.detailValue}>{contact.source || '—'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <View style={[styles.statusChip, { backgroundColor: isActive ? '#ECFDF5' : '#F1F5F9' }]}>
                                <View style={[styles.statusChipDot, { backgroundColor: isActive ? '#10B981' : '#94A3B8' }]} />
                                <Text style={[styles.statusChipText, { color: isActive ? '#059669' : '#64748B' }]}>
                                    {isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.detailLabel}>Added</Text>
                            <Text style={styles.detailValue}>
                                {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* ─── Modals ─── */}

            {/* Note Add/Edit Modal */}
            <Modal
                visible={isNoteModalVisible}
                transparent={false}
                statusBarTranslucent
                animationType="slide"
                onRequestClose={() => setIsNoteModalVisible(false)}>
                <View style={styles.fullPageModal}>
                    <View style={[styles.fullPageModalContent, { paddingTop: insets.top }]}>
                        {/* Header */}
                        <View style={styles.fullPageHeader}>
                            <View style={styles.fullPageHeaderTitleRow}>
                                <View style={[styles.modalIconWrap, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF' }]}>
                                    <MaterialCommunityIcons name="note-text-outline" size={20} color="#3B82F6" />
                                </View>
                                <Text style={styles.fullPageHeaderTitle}>{editingNoteIndex !== null ? 'Edit Note' : 'Add Note'}</Text>
                            </View>
                            <Pressable onPress={() => setIsNoteModalVisible(false)} style={styles.fullPageCloseBtn} hitSlop={12}>
                                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                            </Pressable>
                        </View>

                        {/* Body */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}>
                            <ScrollView
                                style={styles.fullPageScroll}
                                contentContainerStyle={styles.fullPageScrollContent}
                                keyboardShouldPersistTaps="handled">
                                <TextInput
                                    ref={noteInputRef}
                                    style={styles.textArea}
                                    placeholder="Write a note about this lead..."
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                    autoFocus
                                    value={noteContent}
                                    onChangeText={setNoteContent}
                                />
                            </ScrollView>

                            {/* Footer */}
                            <View style={[styles.fullPageFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                                <Pressable onPress={() => setIsNoteModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.saveBtn, !noteContent.trim() && { opacity: 0.4 }]}
                                    onPress={handleSaveNote}
                                    disabled={!noteContent.trim()}>
                                    <Text style={styles.saveBtnText}>Save Note</Text>
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </View>
            </Modal>

            {/* Event Add/Edit Modal */}
            <Modal
                visible={isEventModalVisible}
                transparent={false}
                statusBarTranslucent
                animationType="slide"
                onRequestClose={() => setIsEventModalVisible(false)}>
                <View style={styles.fullPageModal}>
                    <View style={[styles.fullPageModalContent, { paddingTop: insets.top }]}>
                        {/* Header */}
                        <View style={styles.fullPageHeader}>
                            <View style={styles.fullPageHeaderTitleRow}>
                                <View style={[styles.modalIconWrap, { backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : '#F5F3FF' }]}>
                                    <MaterialCommunityIcons name="calendar-star" size={20} color="#8B5CF6" />
                                </View>
                                <Text style={styles.fullPageHeaderTitle}>{editingEventIndex !== null ? 'Edit Event' : 'Add Event'}</Text>
                            </View>
                            <Pressable onPress={() => { setIsEventModalVisible(false); setShowEventDatePicker(false); }} style={styles.fullPageCloseBtn} hitSlop={12}>
                                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                            </Pressable>
                        </View>

                        {/* Body */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}>
                            <ScrollView
                                style={styles.fullPageScroll}
                                contentContainerStyle={styles.fullPageScrollContent}
                                keyboardShouldPersistTaps="handled">
                                <TextInput
                                    ref={eventTitleInputRef}
                                    style={styles.singleInput}
                                    placeholder="Event title (e.g. birthday, anniversary)"
                                    placeholderTextColor={colors.textMuted}
                                    autoFocus={!showEventDatePicker}
                                    value={eventTitle}
                                    onChangeText={setEventTitle}
                                />

                                {/* Date Trigger Button */}
                                <Pressable style={styles.datePicker} onPress={openEventDatePicker}>
                                    <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textMuted} />
                                    <Text style={formattedEventDate ? styles.datePickerValue : styles.datePickerPlaceholder}>
                                        {formattedEventDate || 'Select date'}
                                    </Text>
                                </Pressable>

                                {/* iOS inline date picker */}
                                {Platform.OS === 'ios' && showEventDatePicker && (
                                    <View style={styles.inlinePicker}>
                                        <View style={styles.inlinePickerHeader}>
                                            <Text style={styles.inlinePickerTitle}>Select Date</Text>
                                            <Pressable onPress={() => setShowEventDatePicker(false)}>
                                                <Text style={styles.inlinePickerDone}>Done</Text>
                                            </Pressable>
                                        </View>
                                        <DateTimePicker
                                            value={eventDate || new Date()}
                                            mode="date"
                                            display="inline"
                                            onChange={(event, selectedDate) => {
                                                if (selectedDate) setEventDate(selectedDate);
                                            }}
                                            themeVariant={isDark ? 'dark' : 'light'}
                                            style={{ width: '100%' }}
                                        />
                                    </View>
                                )}

                                {/* Android date picker */}
                                {Platform.OS === 'android' && showEventDatePicker && (
                                    <DateTimePickerModal
                                        isVisible={showEventDatePicker}
                                        mode="date"
                                        date={eventDate || new Date()}
                                        display="spinner"
                                        onConfirm={(date) => {
                                            setEventDate(date);
                                            setShowEventDatePicker(false);
                                        }}
                                        onCancel={() => setShowEventDatePicker(false)}
                                    />
                                )}
                            </ScrollView>

                            {/* Footer */}
                            <View style={[styles.fullPageFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                                <Pressable onPress={() => { setIsEventModalVisible(false); setShowEventDatePicker(false); }} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.saveBtn, (!eventTitle.trim() || !eventDate) && { opacity: 0.4 }]}
                                    onPress={handleSaveEvent}
                                    disabled={!eventTitle.trim() || !eventDate}>
                                    <Text style={styles.saveBtnText}>Save Event</Text>
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </View>
            </Modal>

            {/* Task Add/Edit Modal */}
            <Modal
                visible={isTaskModalVisible}
                transparent={false}
                statusBarTranslucent
                animationType="slide"
                onRequestClose={() => setIsTaskModalVisible(false)}>
                <View style={styles.fullPageModal}>
                    <View style={[styles.fullPageModalContent, { paddingTop: insets.top }]}>
                        {/* Header */}
                        <View style={styles.fullPageHeader}>
                            <View style={styles.fullPageHeaderTitleRow}>
                                <View style={[styles.modalIconWrap, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5' }]}>
                                    <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#10B981" />
                                </View>
                                <Text style={styles.fullPageHeaderTitle}>{editingTaskId ? 'Edit Task' : 'Add Task'}</Text>
                            </View>
                            <Pressable onPress={() => { setIsTaskModalVisible(false); setShowTaskDatePicker(false); }} style={styles.fullPageCloseBtn} hitSlop={12}>
                                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                            </Pressable>
                        </View>

                        {/* Body */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}>
                            <ScrollView
                                style={styles.fullPageScroll}
                                contentContainerStyle={styles.fullPageScrollContent}
                                keyboardShouldPersistTaps="handled">
                                <TextInput
                                    ref={taskSubjectInputRef}
                                    style={styles.singleInput}
                                    placeholder="Task subject (e.g. Call to discuss contract)"
                                    placeholderTextColor={colors.textMuted}
                                    autoFocus={!showTaskDatePicker}
                                    value={taskSubject}
                                    onChangeText={setTaskSubject}
                                />

                                <View style={styles.modalRow}>
                                    <Pressable style={[styles.datePicker, { flex: 1, marginBottom: 0 }]} onPress={openTaskDatePicker}>
                                        <Text style={taskDueDate ? styles.datePickerValue : styles.datePickerPlaceholder}>
                                            {taskDueDate ? formatTaskDateModal(taskDueDate) : 'Select Date'}
                                        </Text>
                                        <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                                    </Pressable>

                                    <Pressable
                                        style={[styles.priorityTrigger, { flex: 1 }]}
                                        onPress={() => {
                                            taskSubjectInputRef.current?.blur();
                                            Keyboard.dismiss();
                                            setIsPriorityDropdownVisible(true);
                                        }}>
                                        <Text style={styles.priorityTriggerText}>{taskPriority} Priority</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                                    </Pressable>
                                </View>

                                {/* iOS inline datetime picker */}
                                {Platform.OS === 'ios' && showTaskDatePicker && (
                                    <View style={styles.inlinePicker}>
                                        <View style={styles.inlinePickerHeader}>
                                            <Text style={styles.inlinePickerTitle}>Select Date & Time</Text>
                                            <Pressable onPress={() => setShowTaskDatePicker(false)}>
                                                <Text style={styles.inlinePickerDone}>Done</Text>
                                            </Pressable>
                                        </View>
                                        <DateTimePicker
                                            value={taskDueDate || new Date()}
                                            mode="datetime"
                                            display="inline"
                                            onChange={(event, selectedDate) => {
                                                if (selectedDate) setTaskDueDate(selectedDate);
                                            }}
                                            themeVariant={isDark ? 'dark' : 'light'}
                                            style={{ width: '100%' }}
                                        />
                                    </View>
                                )}

                                {/* Android datetime picker - two step (date then time) */}
                                {Platform.OS === 'android' && showTaskDatePicker && (
                                    <DateTimePickerModal
                                        isVisible={showTaskDatePicker}
                                        mode="datetime"
                                        date={taskDueDate || new Date()}
                                        display="spinner"
                                        onConfirm={(date) => {
                                            setTaskDueDate(date);
                                            setShowTaskDatePicker(false);
                                        }}
                                        onCancel={() => setShowTaskDatePicker(false)}
                                    />
                                )}
                            </ScrollView>

                            {/* Footer */}
                            <View style={[styles.fullPageFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                                <Pressable onPress={() => { setIsTaskModalVisible(false); setShowTaskDatePicker(false); }} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.saveBtn, (!taskSubject.trim() || !taskDueDate) && { opacity: 0.4 }]}
                                    onPress={handleSaveTask}
                                    disabled={!taskSubject.trim() || !taskDueDate}>
                                    <Text style={styles.saveBtnText}>{editingTaskId ? 'Update task' : 'Add task'}</Text>
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>

                        {/* Priority Dropdown Overlay - placed inside Task Modal to avoid iOS nested Modal bugs */}
                        {isPriorityDropdownVisible && (
                            <Pressable style={styles.dropdownOverlay} onPress={() => setIsPriorityDropdownVisible(false)}>
                                <View style={[styles.dropdownModalContent, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
                                    <Text style={styles.dropdownModalTitle}>Select Priority</Text>
                                    {['High', 'Medium', 'Low'].map((p) => {
                                        const isSelected = p === taskPriority;
                                        return (
                                            <Pressable
                                                key={p}
                                                onPress={() => { setTaskPriority(p); setIsPriorityDropdownVisible(false); }}
                                                style={styles.dropdownOption}>
                                                <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                                                    {p} Priority
                                                </Text>
                                                {isSelected && (
                                                    <MaterialCommunityIcons name="check" size={20} color={colors.accentTeal} />
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </Pressable>
                        )}
                    </View>
                </View>
            </Modal>


            {/* Heat Index Modal */}
            <Modal
                visible={isHeatModalVisible}
                transparent={false}
                statusBarTranslucent
                animationType="slide"
                onRequestClose={() => setIsHeatModalVisible(false)}>
                <View style={styles.fullPageModal}>
                    <View style={[styles.fullPageModalContent, { paddingTop: insets.top }]}>
                        {/* Header */}
                        <View style={styles.fullPageHeader}>
                            <View style={styles.fullPageHeaderTitleRow}>
                                <View style={[styles.modalIconWrap, { backgroundColor: isDark ? 'rgba(245,124,0,0.12)' : '#FFF7ED' }]}>
                                    <MaterialCommunityIcons name="fire" size={20} color="#F57C00" />
                                </View>
                                <Text style={styles.fullPageHeaderTitle}>AI Heat Index</Text>
                            </View>
                            <Pressable onPress={() => setIsHeatModalVisible(false)} style={styles.fullPageCloseBtn} hitSlop={12}>
                                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                            </Pressable>
                        </View>

                        {/* Body */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}>
                            <ScrollView
                                style={styles.fullPageScroll}
                                contentContainerStyle={styles.fullPageScrollContent}
                                keyboardShouldPersistTaps="handled">

                                {/* Live Score Display */}
                                <View style={styles.heatModalScoreWrap}>
                                    <Text style={[
                                        styles.heatModalScoreBig,
                                        {
                                            color: parseInt(heatIndexInput || '0') >= 70 ? '#EF4444' :
                                                parseInt(heatIndexInput || '0') >= 40 ? '#F59E0B' : '#10B981'
                                        }
                                    ]}>
                                        {heatIndexInput || '0'}
                                    </Text>
                                    <Text style={styles.heatModalScoreSuffix}>/100</Text>
                                </View>

                                {/* Gradient Progress Bar */}
                                <View style={styles.heatModalProgressTrack}>
                                    <LinearGradient
                                        colors={['#10B981', '#F59E0B', '#F57C00', '#EF4444'] as any}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.heatModalProgressFill, { width: `${Math.min(parseInt(heatIndexInput || '0'), 100)}%` }]}
                                    />
                                </View>
                                <View style={styles.heatModalLabelsRow}>
                                    <Text style={styles.heatModalLabel}>Cold</Text>
                                    <Text style={styles.heatModalLabel}>Warm</Text>
                                    <Text style={styles.heatModalLabel}>Hot</Text>
                                </View>

                                {/* Score Input */}
                                <View style={styles.heatModalInputRow}>
                                    <Text style={styles.heatModalInputLabel}>Score</Text>
                                    <TextInput
                                        ref={heatIndexInputRef}
                                        style={styles.heatModalInput}
                                        placeholder="0"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="numeric"
                                        autoFocus
                                        maxLength={3}
                                        value={heatIndexInput}
                                        onChangeText={(text) => {
                                            const numOnly = text.replace(/[^0-9]/g, '');
                                            if (numOnly === '' || parseInt(numOnly) <= 100) {
                                                setHeatIndexInput(numOnly);
                                            }
                                        }}
                                        selectTextOnFocus
                                    />
                                </View>
                            </ScrollView>

                            {/* Footer */}
                            <View style={[styles.fullPageFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                                <Pressable onPress={() => setIsHeatModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.saveBtn, !heatIndexInput.trim() && { opacity: 0.4 }]}
                                    onPress={handleSaveHeat}
                                    disabled={!heatIndexInput.trim()}>
                                    {updateContactMutation.isPending ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.saveBtnText}>Update Score</Text>
                                    )}
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </View>
            </Modal>

            {/* Pipeline Stage Dropdown Modal */}
            <Modal visible={isStageDropdownVisible} transparent animationType="fade" onRequestClose={() => setIsStageDropdownVisible(false)}>
                <Pressable style={styles.dropdownOverlay} onPress={() => setIsStageDropdownVisible(false)}>
                    <View style={[styles.dropdownModalContent, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
                        <Text style={styles.dropdownModalTitle}>Select Stage</Text>
                        {stages.map((stage) => {
                            const isSelected = stage === currentStageName;
                            return (
                                <Pressable
                                    key={stage}
                                    onPress={() => handleSelectStage(stage)}
                                    style={styles.dropdownOption}>
                                    <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                                        {stage}
                                    </Text>
                                    {isSelected && (
                                        <MaterialCommunityIcons name="check" size={20} color={colors.accentTeal} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </Pressable>
            </Modal>


        </LinearGradient>
    );
}

function getStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
        screen: {
            flex: 1,
        },
        loaderText: {
            marginTop: 12,
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        errorTitle: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.textPrimary,
            marginTop: 20,
        },
        errorSub: {
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 20,
        },
        errorBtn: {
            marginTop: 28,
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 28,
            paddingVertical: 13,
            borderRadius: 14,
        },
        errorBtnText: {
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 15,
        },
        header: {
            backgroundColor: 'transparent',
        },
        scroll: { flex: 1 },
        scrollContent: {
            paddingHorizontal: 16,
            paddingTop: 12,
        },

        // Hero Card
        heroCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 22,
            padding: 20,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: colors.cardShadowColor || '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 16,
            elevation: 4,
        },
        sourceRibbon: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
            backgroundColor: isDark ? 'rgba(140,164,181,0.08)' : '#F1F5F9',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            marginBottom: 14,
        },
        sourceRibbonText: {
            fontSize: 9,
            fontWeight: '800',
            color: isDark ? '#8CA4B5' : '#6B7C8D',
            letterSpacing: 0.8,
        },
        heroRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 16,
        },
        avatarWrap: {
            position: 'relative',
        },
        avatar: {
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarLetter: {
            fontSize: 28,
            fontWeight: '900',
            color: '#FFFFFF',
        },
        statusDot: {
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2.5,
            borderColor: colors.cardBackground,
        },
        heroInfo: {
            flex: 1,
            justifyContent: 'center',
        },
        heroName: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 4,
        },
        badgeRow: {
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
            marginBottom: 8,
        },
        groupBadge: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F3F5',
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 5,
        },
        groupBadgeText: {
            fontSize: 9,
            fontWeight: '800',
            color: isDark ? '#A0B4C6' : '#495057',
        },
        tagBadge: {
            borderWidth: 1,
            paddingHorizontal: 7,
            paddingVertical: 2.5,
            borderRadius: 5,
        },
        tagBadgeText: {
            fontSize: 9,
            fontWeight: '800',
        },
        heroContactRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
        },
        heroSubText: {
            fontSize: 12,
            color: colors.textSecondary,
            fontWeight: '500',
            flex: 1,
        },

        // Actions Grid
        actionsContainer: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 18,
        },
        actionBtnEmail: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: '#0B213E',
            borderRadius: 12,
            height: 42,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            shadowColor: '#0B213E',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 3,
        },
        actionBtnEmailText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '700',
        },
        actionBtnOutlined: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: 12,
            height: 42,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        actionBtnOutlinedText: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
        },
        actionBtnWhatsApp: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(37,211,102,0.08)' : '#F0FFF4',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(37,211,102,0.2)' : '#C6F6D5',
            borderRadius: 12,
            height: 42,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        actionBtnWhatsAppText: {
            color: '#25D366',
            fontSize: 13,
            fontWeight: '700',
        },

        // Pipeline Card (Dark Navy Blue always)
        pipelineCard: {
            backgroundColor: '#081628',
            borderRadius: 22,
            padding: 18,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: '#152A4A',
        },
        pipelineHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 2,
        },
        pipelineIconWrap: {
            width: 24,
            height: 24,
            borderRadius: 7,
            backgroundColor: 'rgba(0, 167, 181, 0.12)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        pipelineTitle: {
            fontSize: 10,
            fontWeight: '800',
            color: '#8CA4B5',
            letterSpacing: 0.8,
        },
        dropdownTrigger: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#112239',
            borderColor: '#233F6E',
            borderWidth: 1,
            borderRadius: 12,
            height: 48,
            paddingHorizontal: 16,
            marginTop: 10,
        },
        dropdownText: {
            fontSize: 15,
            fontWeight: '700',
            color: '#FFFFFF',
        },
        pipelineStepsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 18,
            marginBottom: 4,
            paddingHorizontal: 4,
        },
        pipelineStepItem: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        pipelineStepDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#1E3A5F',
            borderWidth: 1.5,
            borderColor: '#2A4D6E',
        },
        pipelineStepDotActive: {
            backgroundColor: '#00A7B5',
            borderColor: '#00A7B5',
        },
        pipelineStepDotCurrent: {
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2.5,
            borderColor: '#00A7B5',
            backgroundColor: '#081628',
            shadowColor: '#00A7B5',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 5,
            elevation: 3,
        },
        pipelineStepLine: {
            flex: 1,
            height: 2,
            backgroundColor: '#1E3A5F',
            marginHorizontal: 3,
            borderRadius: 1,
        },
        pipelineStepLineActive: {
            backgroundColor: '#00A7B5',
        },

        // Premium Cards
        card: {
            backgroundColor: colors.cardBackground,
            borderRadius: 22,
            padding: 18,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: colors.cardShadowColor || '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 12,
            elevation: 3,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        cardTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,
        },
        sectionIconBox: {
            width: 30,
            height: 30,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cardTitle: {
            fontSize: 15,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        countBadge: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 10,
            marginLeft: 4,
        },
        countBadgeText: {
            fontSize: 11,
            fontWeight: '800',
            color: colors.textMuted,
        },
        addBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 10,
        },
        addBtnText: {
            fontSize: 12,
            fontWeight: '700',
            color: '#FFFFFF',
        },
        emptyStateContainer: {
            alignItems: 'center',
            paddingVertical: 24,
        },
        emptyStateText: {
            fontSize: 13,
            color: colors.textMuted,
            fontWeight: '500',
        },

        // Task Items
        tasksList: {
            gap: 0,
        },
        taskItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            borderLeftWidth: 3,
            borderLeftColor: 'transparent',
            paddingLeft: 10,
            marginLeft: -2,
        },
        checkbox: {
            marginRight: 10,
        },
        checkboxEmpty: {
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
        },
        taskContent: {
            flex: 1,
        },
        taskSubject: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        taskMetaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
        },
        taskDueDate: {
            fontSize: 11,
            color: colors.textMuted,
            fontWeight: '500',
        },
        priorityBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        priorityText: {
            fontSize: 8,
            fontWeight: '900',
            letterSpacing: 0.3,
        },
        completedText: {
            textDecorationLine: 'line-through',
            color: colors.textMuted,
        },

        // Item Actions (Edit/Delete)
        itemActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        editIconBtn: {
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(0,112,243,0.08)' : '#EFF6FF',
            alignItems: 'center',
            justifyContent: 'center',
        },
        deleteIconBtn: {
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(220,38,38,0.08)' : '#FEF2F2',
            alignItems: 'center',
            justifyContent: 'center',
        },

        // Note Items
        notesList: {
            gap: 10,
        },
        noteItemCard: {
            flexDirection: 'row',
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        noteAccentBar: {
            width: 4,
            backgroundColor: '#3B82F6',
        },
        noteBody: {
            flex: 1,
            padding: 12,
        },
        noteItemHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        noteDateChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        noteItemTitle: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textMuted,
        },
        noteItemContent: {
            fontSize: 13,
            color: colors.textPrimary,
            lineHeight: 19,
            fontWeight: '500',
        },

        // Event Items
        eventsList: {
            gap: 0,
        },
        eventItemRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            paddingTop: 4,
        },
        eventIconBox: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : '#F5F3FF',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(139,92,246,0.2)' : '#E9E3FF',
        },
        eventInfoContainer: {
            flex: 1,
        },
        eventItemTitleText: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textPrimary,
            textTransform: 'capitalize',
        },
        eventDateChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 3,
        },
        eventItemDateText: {
            fontSize: 11,
            color: colors.textMuted,
            fontWeight: '500',
        },

        // Heat Index Card
        heatRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
        },
        heatScoreContainer: {
            flexDirection: 'row',
            alignItems: 'baseline',
        },
        heatScoreBig: {
            fontSize: 38,
            fontWeight: '900',
            color: '#F57C00',
        },
        heatScoreMuted: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.textMuted,
            marginLeft: 2,
        },
        heatSubtitle: {
            fontSize: 10,
            fontWeight: '800',
            color: colors.textMuted,
            letterSpacing: 0.8,
            marginLeft: 'auto',
        },
        heatEditBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        heatEditBtnText: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.accentTeal,
        },
        heatProgressTrack: {
            height: 6,
            backgroundColor: isDark ? '#1E3A5F' : '#F1F5F9',
            borderRadius: 3,
            overflow: 'hidden',
            marginTop: 12,
        },
        heatProgressFill: {
            height: '100%',
            borderRadius: 3,
        },
        heatLabelsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 6,
        },
        heatLabel: {
            fontSize: 10,
            fontWeight: '600',
            color: colors.textMuted,
        },

        // Contact Details Card
        detailsList: {
            gap: 0,
        },
        detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        detailLabel: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.textMuted,
        },
        detailValue: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        statusChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
        },
        statusChipDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
        },
        statusChipText: {
            fontSize: 12,
            fontWeight: '700',
        },

        // Modals overlay & layout
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        modalContent: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
        },
        modalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
        },
        modalIconWrap: {
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        // Full Page Modals
        fullPageModal: {
            flex: 1,
            backgroundColor: colors.cardBackground,
        },
        fullPageModalContent: {
            flex: 1,
            backgroundColor: colors.cardBackground,
        },
        fullPageHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        fullPageHeaderTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        fullPageHeaderTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        fullPageCloseBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        fullPageScroll: {
            flex: 1,
        },
        fullPageScrollContent: {
            paddingHorizontal: 24,
            paddingTop: 24,
        },
        fullPageFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: 24,
            paddingTop: 16,
            gap: 16,
            backgroundColor: colors.cardBackground,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
        },
        textArea: {
            fontSize: 15,
            color: colors.textPrimary,
            minHeight: 100,
            textAlignVertical: 'top',
            fontWeight: '500',
            lineHeight: 22,
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: 10,
            padding: 12,
        },
        singleInput: {
            fontSize: 15,
            color: colors.textPrimary,
            fontWeight: '500',
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 48,
            marginBottom: 12,
        },
        datePicker: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 48,
            marginBottom: 12,
        },
        modalRow: {
            flexDirection: 'row',
            gap: 12,
            marginBottom: 16,
        },
        priorityTrigger: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 48,
            backgroundColor: colors.cardBackground,
        },
        priorityTriggerText: {
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '700',
        },
        datePickerPlaceholder: {
            fontSize: 14,
            color: colors.textMuted,
            fontWeight: '500',
        },
        datePickerValue: {
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '700',
        },
        pickerLabel: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textSecondary,
            marginBottom: 8,
            marginTop: 4,
        },
        prioritySelector: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 16,
        },
        prioritySelectBtn: {
            flex: 1,
            height: 38,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.borderLight,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceSoft,
        },
        prioritySelectBtnActive: {
            borderWidth: 1.5,
        },
        prioritySelectText: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        prioritySelectTextActive: {
            fontWeight: '800',
        },
        inputActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
            paddingTop: 16,
        },
        cancelText: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textMuted,
        },
        saveBtn: {
            backgroundColor: '#0B213E',
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 10,
        },
        saveBtnText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '800',
        },

        inlineDropdownOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        },
        inlineDropdownContent: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.borderLight,
            paddingVertical: 12,
            paddingHorizontal: 16,
            width: '85%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
        },
        // Dropdown Stage modal / Priority modal
        dropdownOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
            zIndex: 9999,
            elevation: 10,
        },
        dropdownModalContent: {
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: 40,
        },
        dropdownModalTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 20,
            textAlign: 'center',
        },
        dropdownOption: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 52,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        dropdownOptionText: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.textPrimary,
        },
        dropdownOptionTextActive: {
            color: colors.accentTeal,
            fontWeight: '800',
        },

        // Inline date picker (shows inside modal on iOS)
        inlinePicker: {
            marginTop: 4,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: colors.cardBackground,
        },
        inlinePickerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        inlinePickerTitle: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        inlinePickerDone: {
            fontSize: 14,
            fontWeight: '800',
            color: colors.accentTeal,
        },

        // Heat Index Modal
        heatModalContent: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 24,
            marginHorizontal: 24,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 12,
        },
        heatModalScoreWrap: {
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            marginBottom: 16,
        },
        heatModalScoreBig: {
            fontSize: 56,
            fontWeight: '900',
            letterSpacing: -2,
        },
        heatModalScoreSuffix: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.textMuted,
            marginLeft: 3,
        },
        heatModalProgressTrack: {
            height: 8,
            backgroundColor: isDark ? '#1E3A5F' : '#F1F5F9',
            borderRadius: 4,
            overflow: 'hidden',
        },
        heatModalProgressFill: {
            height: '100%',
            borderRadius: 4,
        },
        heatModalLabelsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 6,
            marginBottom: 20,
        },
        heatModalLabel: {
            fontSize: 10,
            fontWeight: '600',
            color: colors.textMuted,
        },
        heatModalInputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
        },
        heatModalInputLabel: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        heatModalInput: {
            flex: 1,
            height: 48,
            borderWidth: 1.5,
            borderColor: colors.borderLight,
            borderRadius: 14,
            paddingHorizontal: 16,
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
            backgroundColor: colors.surfaceSoft,
            textAlign: 'center',
        },
        heatModalActions: {
            flexDirection: 'row',
            gap: 10,
        },
        heatModalCancelBtn: {
            flex: 1,
            height: 48,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.borderLight,
            alignItems: 'center',
            justifyContent: 'center',
        },
        heatModalCancelText: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        heatModalSaveBtn: {
            flex: 1.5,
            height: 48,
            borderRadius: 14,
            backgroundColor: colors.accentTeal,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.accentTeal,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 3,
        },
        heatModalSaveText: {
            fontSize: 14,
            fontWeight: '800',
            color: '#FFFFFF',
        },
    });
}
