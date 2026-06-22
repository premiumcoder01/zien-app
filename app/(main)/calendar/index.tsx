import { PageHeader } from '@/components/ui';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState, useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Switch,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Calendar from 'expo-calendar';
import {
  requestCalendarPermissions,
  getDeviceCalendars,
  getDeviceEvents,
  saveLocalEvent,
  getLocalEvents,
  saveEventToDeviceCalendar,
  saveSyncConfig,
  getSyncConfig,
  getCalendarSource,
  CalendarEvent,
  LocalSyncConfig
} from '@/services/calendarService';

type TabKey = 'calendar' | 'booking' | 'tasks';

type Task = {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  owner: string;
};

type BookingLink = {
  id: string;
  title: string;
  duration: string;
  type: string;
  url: string;
};

export default function CalendarScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [showModal, setShowModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDate, setNewItemDate] = useState('');
  const [newItemTime, setNewItemTime] = useState('');
  const [newItemType, setNewItemType] = useState('Calendar Event');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());
  const [timeValue, setTimeValue] = useState(new Date());

  // Permission & Device Sync States
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [deviceCals, setDeviceCals] = useState<Calendar.Calendar[]>([]);
  const [syncConfig, setSyncConfig] = useState<LocalSyncConfig>({ enabled: false, selectedCalendarIds: [] });
  const [eventsList, setEventsList] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);

  const tasks = useMemo<Task[]>(
    () => [
      {
        id: 'task-1',
        title: 'Follow up with Jessica Miller',
        dueDate: 'Today, 2:00 PM',
        priority: 'high',
        status: 'pending',
        owner: 'BS',
      },
      {
        id: 'task-2',
        title: 'Prepare CMA for Malibu Villa',
        dueDate: 'Tomorrow',
        priority: 'medium',
        status: 'pending',
        owner: 'BS',
      },
      {
        id: 'task-3',
        title: 'Send anniversary email to Sam',
        dueDate: 'Jan 31',
        priority: 'low',
        status: 'completed',
        owner: 'BS',
      },
    ],
    []
  );

  const bookingLinks = useMemo<BookingLink[]>(
    () => [
      {
        id: 'link-1',
        title: '15 Min Consultation',
        duration: '15M',
        type: 'Virtual',
        url: 'zien.ai/becker/consult',
      },
      {
        id: 'link-2',
        title: 'Property Showing',
        duration: '45M',
        type: 'On-Site',
        url: 'zien.ai/becker/showing',
      },
      {
        id: 'link-3',
        title: 'Listing Presentation',
        duration: '60M',
        type: 'Virtual/In-Person',
        url: 'zien.ai/becker/pitch',
      },
    ],
    []
  );

  const loadSyncSettingsAndEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const config = await getSyncConfig();
      setSyncConfig(config);

      const localList = await getLocalEvents();
      let deviceList: CalendarEvent[] = [];

      if (config.enabled) {
        const allowed = await requestCalendarPermissions();
        setHasPermission(allowed);
        if (allowed) {
          const cals = await getDeviceCalendars();
          setDeviceCals(cals);
          
          if (config.selectedCalendarIds.length > 0) {
            const start = new Date();
            start.setMonth(start.getMonth() - 1);
            const end = new Date();
            end.setMonth(end.getMonth() + 3);
            deviceList = await getDeviceEvents(config.selectedCalendarIds, start, end);
          }
        }
      }

      // Merge and sort
      const combined = [...localList, ...deviceList].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      setEventsList(combined);
    } catch (e) {
      console.error('Failed to load calendar data', e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadSyncSettingsAndEvents();
  }, []);

  const handleToggleCalendar = async (calId: string) => {
    const isSelected = syncConfig.selectedCalendarIds.includes(calId);
    let updatedIds = [...syncConfig.selectedCalendarIds];
    
    if (isSelected) {
      updatedIds = updatedIds.filter(id => id !== calId);
    } else {
      updatedIds.push(calId);
    }
    
    const newConfig = {
      ...syncConfig,
      selectedCalendarIds: updatedIds,
      enabled: updatedIds.length > 0 ? true : syncConfig.enabled
    };
    
    setSyncConfig(newConfig);
    await saveSyncConfig(newConfig);
    
    // Reload events with the new config
    setIsLoadingEvents(true);
    try {
      const localList = await getLocalEvents();
      let deviceList: CalendarEvent[] = [];
      
      if (newConfig.selectedCalendarIds.length > 0) {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        const end = new Date();
        end.setMonth(end.getMonth() + 3);
        deviceList = await getDeviceEvents(newConfig.selectedCalendarIds, start, end);
      }
      
      const combined = [...localList, ...deviceList].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      setEventsList(combined);
    } catch (e) {
      console.error('Failed to update calendars selection', e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleToggleSyncAll = async (value: boolean) => {
    let updatedIds = syncConfig.selectedCalendarIds;
    let calendars: Calendar.Calendar[] = [];
    
    if (value) {
      const allowed = await requestCalendarPermissions();
      setHasPermission(allowed);
      if (!allowed) {
        Alert.alert('Permission Denied', 'Please enable calendar permissions in device settings to sync calendars.');
        return;
      }
      calendars = await getDeviceCalendars();
      setDeviceCals(calendars);
      
      if (updatedIds.length === 0 && calendars.length > 0) {
        const primaryCals = calendars.filter(c => c.isPrimary || c.title.toLowerCase() === 'calendar' || c.title.toLowerCase() === 'work');
        updatedIds = (primaryCals.length > 0 ? primaryCals : [calendars[0]]).map(c => c.id);
      }
    }
    
    const newConfig = {
      enabled: value,
      selectedCalendarIds: value ? updatedIds : []
    };
    
    setSyncConfig(newConfig);
    await saveSyncConfig(newConfig);
    loadSyncSettingsAndEvents();
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a title.');
      return;
    }

    setShowModal(false);
    setIsLoadingEvents(true);

    try {
      if (newItemType === 'Calendar Event') {
        const start = new Date(
          dateValue.getFullYear(),
          dateValue.getMonth(),
          dateValue.getDate(),
          timeValue.getHours(),
          timeValue.getMinutes()
        );
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour

        // 1. Save locally in Zien
        await saveLocalEvent({
          title: newItemTitle,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          notes: newItemNotes,
          calendarId: 'local',
          calendarTitle: 'Zien Workspace'
        });

        // 2. Save to external device calendars if sync is active
        if (syncConfig.enabled && syncConfig.selectedCalendarIds.length > 0) {
          const syncPromises = syncConfig.selectedCalendarIds.map(async (calId) => {
            try {
              await saveEventToDeviceCalendar(calId, {
                title: newItemTitle,
                startDate: start,
                endDate: end,
                notes: newItemNotes,
              });
            } catch (err) {
              console.error(`Failed to sync event to calendar ${calId}:`, err);
            }
          });
          await Promise.all(syncPromises);
          Alert.alert('Success', 'Event added to Zien and synced with your device calendar!');
        } else {
          Alert.alert('Success', 'Event added to Zien calendar.');
        }

        await loadSyncSettingsAndEvents();
      } else {
        Alert.alert('Success', `${newItemType} created successfully.`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsLoadingEvents(false);
      setNewItemTitle('');
      setNewItemDate('');
      setNewItemTime('');
      setNewItemNotes('');
      setNewItemType('Calendar Event');
      setIsEditing(false);
    }
  };

  const openCreateModal = (type: string = 'Calendar Event') => {
    setIsEditing(false);
    setNewItemTitle('');
    setNewItemDate(new Date().toLocaleDateString('en-US'));
    setNewItemTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setNewItemNotes('');
    setNewItemType(type);
    setDateValue(new Date());
    setTimeValue(new Date());
    setShowModal(true);
  };

  const openEditModal = (item: any, type: string) => {
    setIsEditing(true);
    setNewItemTitle(item.title);
    setNewItemType(type);
    const parsedDate = new Date(item.startDate || new Date());
    setDateValue(parsedDate);
    setTimeValue(parsedDate);
    setNewItemDate(parsedDate.toLocaleDateString('en-US'));
    setNewItemTime(parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setNewItemNotes(item.notes || '');
    setShowModal(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateValue(selectedDate);
      setNewItemDate(selectedDate.toLocaleDateString('en-US'));
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTimeValue(selectedTime);
      setNewItemTime(selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    }
  };

  // Group events by day helper
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: CalendarEvent[] } = {};
    eventsList.forEach(evt => {
      const d = new Date(evt.startDate);
      const dateKey = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(evt);
    });
    return Object.keys(groups).map(date => ({
      date,
      data: groups[date]
    }));
  }, [eventsList]);

  const renderCalendarTab = () => {
    if (isLoadingEvents) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentTeal} />
          <Text style={styles.loadingText}>Fetching your schedule...</Text>
        </View>
      );
    }

    return (
      <View style={styles.calendarTabRoot}>
        {/* Sync Settings Header & Button */}
        <View style={styles.syncHeaderRow}>
          <View style={styles.syncHeaderInfo}>
            <Text style={styles.syncHeaderTitle}>Device & Cloud Calendars</Text>
            <Text style={styles.syncHeaderSubtitle}>
              {syncConfig.enabled ? `${syncConfig.selectedCalendarIds.length} calendars synced` : 'Sync is disabled'}
            </Text>
          </View>
          <Pressable 
            style={[styles.syncSettingsToggleBtn, showSyncSettings && styles.syncSettingsToggleBtnActive]} 
            onPress={() => setShowSyncSettings(!showSyncSettings)}
          >
            <MaterialCommunityIcons 
              name={showSyncSettings ? "tune-vertical" : "cog-outline"} 
              size={18} 
              color={showSyncSettings ? "#FFF" : colors.textPrimary} 
            />
            <Text style={[styles.syncSettingsToggleBtnText, showSyncSettings && styles.syncSettingsToggleBtnTextActive]}>
              {showSyncSettings ? "Close Settings" : "Sync Settings"}
            </Text>
          </Pressable>
        </View>

        {/* Sync Settings Expanded Card */}
        {showSyncSettings && (
          <View style={styles.settingsCard}>
            <View style={styles.settingsSwitchRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.settingsSwitchTitle}>Enable Sync Integration</Text>
                <Text style={styles.settingsSwitchDesc}>
                  Access your Google, Outlook, and Apple calendars configured on this device.
                </Text>
              </View>
              <Switch 
                value={syncConfig.enabled} 
                onValueChange={handleToggleSyncAll} 
                trackColor={{ false: '#CBD5E1', true: colors.accentTeal }}
                thumbColor="#FFF"
              />
            </View>

            {syncConfig.enabled && (
              <View style={styles.calendarListSection}>
                <Text style={styles.calendarListTitle}>Select Calendars to Sync</Text>
                {deviceCals.length === 0 ? (
                  <Text style={styles.noCalendarsText}>No calendars found. Ensure you have accounts added in your phone settings.</Text>
                ) : (
                  <View style={styles.calendarListContainer}>
                    {deviceCals.map(cal => {
                      const isSelected = syncConfig.selectedCalendarIds.includes(cal.id);
                      const source = getCalendarSource(cal);
                      let sourceIcon: any = "calendar";
                      let sourceColor = "#64748B";
                      
                      if (source === 'google') {
                        sourceIcon = "google";
                        sourceColor = "#EA4335";
                      } else if (source === 'outlook') {
                        sourceIcon = "microsoft-outlook";
                        sourceColor = "#0078D4";
                      } else if (source === 'apple') {
                        sourceIcon = "apple";
                        sourceColor = "#000000";
                      }

                      return (
                        <Pressable 
                          key={cal.id} 
                          style={styles.calendarSelectItem}
                          onPress={() => handleToggleCalendar(cal.id)}
                        >
                          <MaterialCommunityIcons name={sourceIcon} size={18} color={sourceColor} style={{ marginRight: 10 }} />
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.calendarSelectName} numberOfLines={1}>{cal.title}</Text>
                            <Text style={styles.calendarSelectAccount} numberOfLines={1}>{cal.source?.name || 'Local Store'}</Text>
                          </View>
                          <MaterialCommunityIcons 
                            name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                            size={22} 
                            color={isSelected ? colors.accentTeal : "#CBD5E1"} 
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Schedule / Agenda list */}
        {eventsList.length === 0 ? (
          // Standard empty state when no events exist
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={56} color={colors.accentTeal} />
            </View>
            <Text style={styles.emptyTitle}>Your Workspace Schedule</Text>
            <Text style={styles.emptySubtitle}>Sync your personal and work calendars to see all events here in one place.</Text>

            <View style={styles.syncRow}>
              <Pressable style={styles.syncPill} onPress={() => handleToggleSyncAll(true)}>
                <MaterialCommunityIcons name="google" size={16} color="#EA4335" />
                <Text style={styles.syncPillText}>Google</Text>
              </Pressable>
              <Pressable style={styles.syncPill} onPress={() => handleToggleSyncAll(true)}>
                <MaterialCommunityIcons name="microsoft-outlook" size={16} color="#0078D4" />
                <Text style={styles.syncPillText}>Outlook</Text>
              </Pressable>
              <Pressable style={styles.syncPill} onPress={() => handleToggleSyncAll(true)}>
                <MaterialCommunityIcons name="apple" size={16} color="#000000" />
                <Text style={styles.syncPillText}>Apple</Text>
              </Pressable>
            </View>

            <Pressable style={styles.mainActionBtn} onPress={() => openCreateModal('Calendar Event')}>
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.mainActionBtnText}>Create New Event</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.agendaContainer}>
            {groupedEvents.map(group => (
              <View key={group.date} style={styles.dayGroup}>
                <Text style={styles.dayHeader}>{group.date}</Text>
                {group.data.map(evt => {
                  const startTime = new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                  const endTime = new Date(evt.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                  
                  let sourceIcon: any = "calendar";
                  let sourceLabel = "Zien";
                  let sourceColor = colors.accentTeal;
                  
                  if (evt.source === 'google') {
                    sourceIcon = "google";
                    sourceLabel = "Google";
                    sourceColor = "#EA4335";
                  } else if (evt.source === 'outlook') {
                    sourceIcon = "microsoft-outlook";
                    sourceLabel = "Outlook";
                    sourceColor = "#0078D4";
                  } else if (evt.source === 'apple') {
                    sourceIcon = "apple";
                    sourceLabel = "Apple";
                    sourceColor = "#000000";
                  }

                  return (
                    <View key={evt.id} style={styles.eventCard}>
                      <View style={styles.eventTimeCol}>
                        <Text style={styles.eventTimeStart}>{startTime}</Text>
                        <Text style={styles.eventTimeEnd}>{endTime}</Text>
                      </View>
                      <View style={[styles.eventContentCol, { borderLeftColor: evt.color || sourceColor }]}>
                        <View style={styles.eventHeaderRow}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{evt.title}</Text>
                          <View style={[styles.eventSourceBadge, { backgroundColor: `${sourceColor}10` }]}>
                            <MaterialCommunityIcons name={sourceIcon} size={11} color={sourceColor} style={{ marginRight: 3 }} />
                            <Text style={[styles.eventSourceText, { color: sourceColor }]}>{sourceLabel}</Text>
                          </View>
                        </View>
                        {evt.notes ? (
                          <Text style={styles.eventNotes} numberOfLines={2}>{evt.notes}</Text>
                        ) : null}
                        {evt.location ? (
                          <View style={styles.eventLocationRow}>
                            <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748B" />
                            <Text style={styles.eventLocationText} numberOfLines={1}>{evt.location}</Text>
                          </View>
                        ) : null}
                        {evt.meetingLink ? (
                          <Pressable 
                            style={styles.joinMeetingBtn} 
                            onPress={() => WebBrowser.openBrowserAsync(evt.meetingLink!)}
                          >
                            <MaterialCommunityIcons name="video-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.joinMeetingBtnText}>Join Meeting</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            <Pressable style={styles.createCard} onPress={() => openCreateModal('Calendar Event')}>
              <MaterialCommunityIcons name="plus-circle-outline" size={32} color="#94A3B8" />
              <Text style={styles.createText}>Create New Event</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderBookingTab = () => (
    <View style={styles.contentArea}>
      {bookingLinks.map((link) => (
        <View key={link.id} style={styles.bookingCard}>
          <View style={styles.bookingHeader}>
            <View style={styles.linkIconBox}>
              <MaterialCommunityIcons name="link-variant" size={20} color={colors.accentTeal} />
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{link.duration}</Text>
            </View>
          </View>
          <Text style={styles.bookingTitle}>{link.title}</Text>
          <Text style={styles.bookingType}>Type: {link.type}</Text>
          <View style={styles.urlRow}>
            <Text style={styles.urlText} numberOfLines={1}>
              {link.url}
            </Text>
            <Pressable style={styles.copyButton}>
              <MaterialCommunityIcons name="content-copy" size={16} color="#64748B" />
            </Pressable>
          </View>
          <Pressable style={styles.editButton} onPress={() => openEditModal(link, 'Booking Link')}>
            <Text style={styles.editButtonText}>Edit Interface</Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.createCard} onPress={() => openCreateModal('Booking Link')}>
        <MaterialCommunityIcons name="plus-circle-outline" size={48} color="#94A3B8" />
        <Text style={styles.createText}>Create New Booking Link</Text>
      </Pressable>
    </View>
  );

  const renderTasksTab = () => (
    <View style={styles.tasksArea}>
      {tasks.map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskCardHeader}>
            <Text style={styles.taskCardTitle}>{task.title}</Text>
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerText}>{task.owner}</Text>
            </View>
          </View>

          <View style={styles.taskCardMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
              <Text style={styles.metaText}>{task.dueDate}</Text>
            </View>
          </View>

          <View style={styles.taskCardFooter}>
            <View style={[styles.priorityBadge, styles[`priority${task.priority}`]]}>
              <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, task.status === 'completed' && styles.statusCompleted]}>
              <Text
                style={[styles.statusText, task.status === 'completed' && styles.statusTextCompleted]}>
                {task.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'booking':
        return renderBookingTab();
      case 'tasks':
        return renderTasksTab();
      default:
        return renderCalendarTab();
    }
  }, [activeTab, tasks, bookingLinks, eventsList, syncConfig, deviceCals, isLoadingEvents, showSyncSettings]);

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.background, { paddingTop: insets.top }]}>
      <PageHeader
        title="Calendar"
        subtitle="Manage events, bookings, and tasks"
        onBack={() => router.back()}
        rightIcon="calendar-sync-outline"
        onRightPress={() => { }}
      />

      <View style={styles.tabContainer}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'calendar' && styles.tabActive]}
            onPress={() => setActiveTab('calendar')}>
            <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>
              Calendar
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'booking' && styles.tabActive]}
            onPress={() => setActiveTab('booking')}>
            <Text style={[styles.tabText, activeTab === 'booking' && styles.tabTextActive]}>
              Bookings
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
            onPress={() => setActiveTab('tasks')}>
            <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
              Tasks
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.floatingAddBtn}
          onPress={() => openCreateModal()}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}>
        {/* Tab Content */}
        {tabContent}
      </ScrollView>

      {/* Create New Item Full-Page Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalScreen, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Item' : 'Create New Event'}</Text>
            <Pressable onPress={() => setShowModal(false)} style={styles.closeCircle}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Type</Text>
              <View style={styles.pillRow}>
                {(['Calendar Event', 'Booking Link', 'Team Task'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setNewItemType(type)}
                    style={[
                      styles.pill,
                      newItemType === type && styles.pillActive
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        type === 'Calendar Event' ? 'calendar-star' :
                          type === 'Booking Link' ? 'link-variant' : 'calendar-check-outline'
                      }
                      size={16}
                      color={newItemType === type ? '#FFF' : '#64748B'}
                    />
                    <Text style={[
                      styles.pillText,
                      newItemType === type && styles.pillTextActive
                    ]}>
                      {type === 'Calendar Event' ? 'Event' : type === 'Booking Link' ? 'Booking' : 'Task'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Title</Text>
              <TextInput
                style={styles.fullInput}
                placeholder="e.g. Property Listing with David"
                placeholderTextColor={colors.inputPlaceholder}
                value={newItemTitle}
                onChangeText={setNewItemTitle}
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <Text style={styles.sectionLabel}>Date</Text>
                  <Pressable
                    style={styles.inputIconBox}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <TextInput
                      style={styles.rowInput}
                      placeholder="dd/mm/yyyy"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={newItemDate}
                      editable={false}
                      pointerEvents="none"
                    />
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#64748B" />
                  </Pressable>
                </View>
                <View style={styles.formColumn}>
                  <Text style={styles.sectionLabel}>Time</Text>
                  <Pressable
                    style={styles.inputIconBox}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <TextInput
                      style={styles.rowInput}
                      placeholder="--:-- --"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={newItemTime}
                      editable={false}
                      pointerEvents="none"
                    />
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#64748B" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Bottom Sheet for Date Picker */}
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <Pressable style={styles.pickerBackdrop} onPress={() => setShowDatePicker(false)}>
                <View style={styles.pickerSheet}>
                  <View style={styles.pickerToolbar}>
                    <Text style={styles.pickerTitle}>Select Date</Text>
                    <Pressable onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                      <Text style={styles.doneBtnText}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    textColor={colors.textPrimary}
                    style={styles.pickerInternal}
                  />
                </View>
              </Pressable>
            </Modal>

            {/* Bottom Sheet for Time Picker */}
            <Modal
              visible={showTimePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <Pressable style={styles.pickerBackdrop} onPress={() => setShowTimePicker(false)}>
                <View style={styles.pickerSheet}>
                  <View style={styles.pickerToolbar}>
                    <Text style={styles.pickerTitle}>Select Time</Text>
                    <Pressable onPress={() => setShowTimePicker(false)} style={styles.doneBtn}>
                      <Text style={styles.doneBtnText}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={timeValue}
                    mode="time"
                    display="spinner"
                    is24Hour={false}
                    onChange={onTimeChange}
                    textColor={colors.textPrimary}
                    style={styles.pickerInternal}
                  />
                </View>
              </Pressable>
            </Modal>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add details..."
                placeholderTextColor={colors.inputPlaceholder}
                value={newItemNotes}
                onChangeText={setNewItemNotes}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtnLarge}
                onPress={handleCreateItem}
              >
                <Text style={styles.saveBtnLargeText}>{isEditing ? 'Save Changes' : 'Save'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    padding: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inputPlaceholder,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  floatingAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentTeal,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyState: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${colors.accentTeal}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  syncRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  syncPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentTeal,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  mainActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contentArea: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  linkIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.accentTeal}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    backgroundColor: `${colors.accentTeal}10`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.accentTeal,
  },
  bookingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bookingType: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 16,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  urlText: {
    fontSize: 13,
    color: colors.accentTeal,
    fontWeight: '700',
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  createCard: {
    backgroundColor: 'rgba(16, 42, 67, 0.02)',
    borderRadius: 20,
    padding: 40,
    borderWidth: 2,
    borderColor: '#D1D9E4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    gap: 12,
  },
  createText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tasksArea: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  ownerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  taskCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  priorityhigh: { backgroundColor: '#FEE2E2' },
  prioritymedium: { backgroundColor: '#FEF3C7' },
  prioritylow: { backgroundColor: colors.surfaceSoft },
  priorityText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#334E68',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surfaceSoft,
  },
  statusCompleted: { backgroundColor: '#D1FAE5' },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
  },
  statusTextCompleted: { color: '#047857' },

  // ── Modal Styles ──
  modalScreen: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillActive: {
    backgroundColor: colors.accentTeal,
    borderColor: '#102A43',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  fullInput: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formColumn: {
    flex: 1,
  },
  inputIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowInput: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  notesInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingBottom: 40,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveBtnLarge: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  saveBtnLargeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // ── Picker Bottom Sheet Styles ──
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    alignItems: 'center', // Fixes the centering issue
  },
  pickerInternal: {
    width: Dimensions.get('window').width, // Forces full width container
    height: 220,
  },
  pickerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%', // Ensures the toolbar spans full width even if parent is centered
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.accentTeal,
    borderRadius: 8,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  calendarTabRoot: {
    flex: 1,
    gap: 16,
  },
  syncHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  syncHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  syncHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  syncHeaderSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  syncSettingsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surfaceSoft,
  },
  syncSettingsToggleBtnActive: {
    backgroundColor: colors.accentTeal,
    borderColor: colors.accentTeal,
  },
  syncSettingsToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  syncSettingsToggleBtnTextActive: {
    color: '#FFF',
  },
  settingsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 16,
  },
  settingsSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  settingsSwitchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  settingsSwitchDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  calendarListSection: {
    gap: 8,
  },
  calendarListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  noCalendarsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  calendarListContainer: {
    gap: 8,
  },
  calendarSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  calendarSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calendarSelectAccount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  agendaContainer: {
    gap: 20,
  },
  dayGroup: {
    gap: 10,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 5,
    elevation: 1,
  },
  eventTimeCol: {
    width: 80,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
  },
  eventTimeStart: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  eventTimeEnd: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  eventContentCol: {
    flex: 1,
    padding: 12,
    borderLeftWidth: 4,
    gap: 4,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  eventSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventSourceText: {
    fontSize: 9,
    fontWeight: '900',
  },
  eventNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventLocationText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  joinMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  joinMeetingBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  });
}