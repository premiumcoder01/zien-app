import { PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  BackendTask,
  CalendarEvent,
  connectAppleCalendar,
  createBackendCalendarEvent,
  createBackendCalendarTask,
  deleteBackendCalendarEvent,
  disconnectBackendCalendar,
  getBackendCalendarEvents,
  getBackendCalendarStatus,
  getBackendCalendarTasks,
  getGoogleCalendarAuthUrl,
  getMicrosoftCalendarAuthUrl
} from '@/services/calendarService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabKey = 'calendar' | 'booking' | 'tasks' | 'integrations';

// Shared event color classification (video call / holiday / event) for both themes.
function getEventVisual(evt: CalendarEvent, isDark: boolean) {
  const isVideoCall = !!evt.meetingLink;
  const isHoliday =
    evt.calendarTitle?.toLowerCase().includes('holiday') ||
    evt.id.includes('holiday') ||
    evt.location?.toLowerCase().includes('holiday') ||
    evt.notes?.toLowerCase().includes('public holiday');

  if (isDark) {
    if (isVideoCall) return { barBg: 'rgba(14,165,233,0.22)', barText: '#7DD3FC', dot: '#38BDF8', border: '#0EA5E9' };
    if (isHoliday) return { barBg: 'rgba(16,185,129,0.22)', barText: '#6EE7B7', dot: '#34D399', border: '#10B981' };
    return { barBg: 'rgba(129,140,248,0.22)', barText: '#A5B4FC', dot: '#818CF8', border: '#6366F1' };
  }
  if (isVideoCall) return { barBg: '#EFF6FF', barText: '#1E40AF', dot: '#0EA5E9', border: '#0EA5E9' };
  if (isHoliday) return { barBg: '#F0FDF4', barText: '#166534', dot: '#10B981', border: '#10B981' };
  return { barBg: '#EEF2FF', barText: '#4F46E5', dot: '#6366F1', border: '#6366F1' };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function CalendarScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const isDark = colors.cardBackground !== '#FFFFFF';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth > 768;
  const numColumns = isWide ? 3 : (windowWidth > 540 ? 2 : 1);
  const cardWidth = numColumns > 1
    ? (windowWidth - 32 - (numColumns - 1) * 16) / numColumns
    : '100%';


  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [showModal, setShowModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDate, setNewItemDate] = useState('');
  const [newItemTime, setNewItemTime] = useState('');
  const [newItemEndDate, setNewItemEndDate] = useState('');
  const [newItemEndTime, setNewItemEndTime] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemType, setNewItemType] = useState('Calendar Event');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());
  const [timeValue, setTimeValue] = useState(new Date());
  const [endDateValue, setEndDateValue] = useState(new Date());
  const [endTimeValue, setEndTimeValue] = useState(new Date());

  // Month Switcher State (for Event Links tab)
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Backend Integration States
  const [isConnected, setIsConnected] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);
  const [isAppleConnected, setIsAppleConnected] = useState(false);
  const [calendarToDisconnect, setCalendarToDisconnect] = useState<'Google' | 'Microsoft' | 'Apple'>('Google');
  const [appleModalVisible, setAppleModalVisible] = useState(false);
  const [appleEmail, setAppleEmail] = useState('');
  const [appSpecificPassword, setAppSpecificPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isConnectingApple, setIsConnectingApple] = useState(false);
  const [backendEvents, setBackendEvents] = useState<CalendarEvent[]>([]);
  const [backendTasks, setBackendTasks] = useState<BackendTask[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // WebBrowser Redirect Session warm-up
  useEffect(() => {
    WebBrowser.warmUpAsync().catch(() => { });
    return () => {
      WebBrowser.coolDownAsync().catch(() => { });
    };
  }, []);

  // Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-100)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Web-aligned Calendar state hooks
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'day'>('month');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [activeDetailEvent, setActiveDetailEvent] = useState<CalendarEvent | null>(null);

  const openDetailsModal = (evt: CalendarEvent) => {
    setActiveDetailEvent(evt);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setActiveDetailEvent(null);
  };

  // Delete Confirmation State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Disconnect Confirmation State
  const [disconnectModalVisible, setDisconnectModalVisible] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Cancel any in-flight auto-hide so rapid toasts don't stack timers.
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast({ visible: true, message, type });

    // Animate In
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Auto hide after 3 seconds
      toastTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setToast(prev => ({ ...prev, visible: false }));
        });
      }, 3000);
    });
  };

  const loadSyncSettingsAndEvents = async () => {
    if (!accessToken) return;
    setIsLoadingEvents(true);
    try {
      // 1. Fetch backend calendar connection status
      const statusData = await getBackendCalendarStatus(accessToken);
      const googleConnected = statusData?.googleConnected === true;
      const microsoftConnected = statusData?.microsoftConnected === true;
      const appleConnected = statusData?.appleConnected === true;
      const connected = googleConnected || microsoftConnected || appleConnected;

      setIsConnected(connected);
      setIsGoogleConnected(googleConnected);
      setIsMicrosoftConnected(microsoftConnected);
      setIsAppleConnected(appleConnected);

      // 2. Fetch events & tasks if connected, otherwise clear
      if (connected) {
        const events = await getBackendCalendarEvents(accessToken);
        setBackendEvents(events);

        const tasksData = await getBackendCalendarTasks(accessToken);
        setBackendTasks(tasksData);
      } else {
        setBackendEvents([]);
        setBackendTasks([]);
      }
    } catch (e) {
      console.error('Failed to load backend calendar data', e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadSyncSettingsAndEvents();
  }, [accessToken]);

  // Clear any pending toast auto-hide timer on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleConnectGoogle = async () => {
    if (!accessToken) return;
    setIsLoadingEvents(true);
    let pollingInterval: any = null;
    let browserClosed = false;

    try {
      const url = await getGoogleCalendarAuthUrl(accessToken);
      console.log(url)
      if (url) {
        // Start polling the Google Calendar status in the background
        pollingInterval = setInterval(async () => {
          try {
            const statusData = await getBackendCalendarStatus(accessToken);
            if (statusData?.googleConnected === true && !browserClosed) {
              // 1. Clear interval immediately
              if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
              }
              // 2. Programmatically close the in-app browser
              await WebBrowser.dismissBrowser();
              // 3. Update connection state and load events
              setIsConnected(true);
              setIsGoogleConnected(true);
              await loadSyncSettingsAndEvents();
              showToast('Google Calendar connected successfully', 'success');
            }
          } catch (e) {
            // Silently swallow polling fetch errors
          }
        }, 2000);

        // Open secure system browser (Chrome Custom Tab/Safari View Controller)
        await WebBrowser.openBrowserAsync(url);
        browserClosed = true;

        // Clean up interval if browser is manually closed by the user
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }

        // Check updated status as fallback when browser is closed manually
        const statusData = await getBackendCalendarStatus(accessToken);
        const googleConnected = statusData?.googleConnected === true;
        const microsoftConnected = statusData?.microsoftConnected === true;
        const appleConnected = statusData?.appleConnected === true;
        const connected = googleConnected || microsoftConnected || appleConnected;

        setIsConnected(connected);
        setIsGoogleConnected(googleConnected);
        setIsMicrosoftConnected(microsoftConnected);
        setIsAppleConnected(appleConnected);

        if (googleConnected) {
          await loadSyncSettingsAndEvents();
          showToast('Google Calendar connected successfully', 'success');
        }
      } else {
        Alert.alert('Error', 'Failed to retrieve connection URL.');
      }
    } catch (e: any) {
      console.error('Failed to initiate calendar connection:', e);
      Alert.alert('Error', e.message || 'Failed to initiate Google Calendar connection.');
    } finally {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      setIsLoadingEvents(false);
    }
  };

  const handleConnectMicrosoft = async () => {
    if (!accessToken) return;
    setIsLoadingEvents(true);
    let pollingInterval: any = null;
    let browserClosed = false;

    try {
      const url = await getMicrosoftCalendarAuthUrl(accessToken);
      console.log(url)
      if (url) {
        // Start polling the Microsoft Calendar status in the background
        pollingInterval = setInterval(async () => {
          try {
            const statusData = await getBackendCalendarStatus(accessToken);
            if (statusData?.microsoftConnected === true && !browserClosed) {
              // 1. Clear interval immediately
              if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
              }
              // 2. Programmatically close the in-app browser
              await WebBrowser.dismissBrowser();
              // 3. Update connection state and load events
              setIsConnected(true);
              setIsMicrosoftConnected(true);
              await loadSyncSettingsAndEvents();
              showToast('Microsoft Outlook connected successfully', 'success');
            }
          } catch (e) {
            // Silently swallow polling fetch errors
          }
        }, 2000);

        // Open secure system browser (Chrome Custom Tab/Safari View Controller)
        await WebBrowser.openBrowserAsync(url);
        browserClosed = true;

        // Clean up interval if browser is manually closed by the user
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }

        // Check updated status as fallback when browser is closed manually
        const statusData = await getBackendCalendarStatus(accessToken);
        const googleConnected = statusData?.googleConnected === true;
        const microsoftConnected = statusData?.microsoftConnected === true;
        const appleConnected = statusData?.appleConnected === true;
        const connected = googleConnected || microsoftConnected || appleConnected;

        setIsConnected(connected);
        setIsGoogleConnected(googleConnected);
        setIsMicrosoftConnected(microsoftConnected);
        setIsAppleConnected(appleConnected);

        if (microsoftConnected) {
          await loadSyncSettingsAndEvents();
          showToast('Microsoft Outlook connected successfully', 'success');
        }
      } else {
        Alert.alert('Error', 'Failed to retrieve connection URL.');
      }
    } catch (e: any) {
      console.error('Failed to initiate calendar connection:', e);
      Alert.alert('Error', e.message || 'Failed to initiate Microsoft Outlook connection.');
    } finally {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      setIsLoadingEvents(false);
    }
  };

  const handleConnectApple = async () => {
    if (!accessToken) return;
    if (!appleEmail.trim() || !appSpecificPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter your Apple ID and App-Specific Password.');
      return;
    }

    setIsConnectingApple(true);
    try {
      await connectAppleCalendar(accessToken, appleEmail.trim(), appSpecificPassword.trim());
      
      // Close modal and clear inputs
      setAppleModalVisible(false);
      setAppleEmail('');
      setAppSpecificPassword('');
      
      // Update local connection states
      setIsConnected(true);
      setIsAppleConnected(true);
      setIsGoogleConnected(false);
      setIsMicrosoftConnected(false);
      
      await loadSyncSettingsAndEvents();
      showToast('Apple iCloud connected successfully', 'success');
    } catch (e: any) {
      console.error('Failed to connect Apple Calendar:', e);
      Alert.alert('Connection Failed', e.message || 'Please check your Apple ID and App-Specific Password.');
    } finally {
      setIsConnectingApple(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setCalendarToDisconnect('Google');
    setDisconnectModalVisible(true);
  };

  const cancelDisconnectGoogle = () => {
    setDisconnectModalVisible(false);
  };

  const confirmDisconnectGoogle = async () => {
    setDisconnectModalVisible(false);
    if (!accessToken) return;
    setIsLoadingEvents(true);
    try {
      await disconnectBackendCalendar(accessToken);
      setIsConnected(false);
      setIsGoogleConnected(false);
      setIsMicrosoftConnected(false);
      setIsAppleConnected(false);
      setBackendEvents([]);
      setBackendTasks([]);
      showToast(`${calendarToDisconnect} Calendar disconnected successfully`, 'success');
    } catch (e: any) {
      console.error('Failed to disconnect calendar:', e);
      Alert.alert('Error', e.message || 'Failed to disconnect calendar.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a title.');
      return;
    }

    if (!accessToken) {
      Alert.alert('Error', 'You must be logged in to create items.');
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
        const end = new Date(
          endDateValue.getFullYear(),
          endDateValue.getMonth(),
          endDateValue.getDate(),
          endTimeValue.getHours(),
          endTimeValue.getMinutes()
        );

        // Description includes location appended per API contract
        const description = newItemLocation.trim()
          ? `${newItemNotes}\n\nLocation: ${newItemLocation.trim()}`
          : newItemNotes;

        await createBackendCalendarEvent(accessToken, {
          title: newItemTitle,
          description,
          location: newItemLocation.trim() || undefined,
          start: start.toISOString(),
          end: (end > start ? end : new Date(start.getTime() + 60 * 60 * 1000)).toISOString(),
        });

        showToast('Event created successfully', 'success');

      } else if (newItemType === 'Appointment') {
        const start = new Date(
          dateValue.getFullYear(),
          dateValue.getMonth(),
          dateValue.getDate(),
          timeValue.getHours(),
          timeValue.getMinutes()
        );
        const end = new Date(
          endDateValue.getFullYear(),
          endDateValue.getMonth(),
          endDateValue.getDate(),
          endTimeValue.getHours(),
          endTimeValue.getMinutes()
        );

        // Appointment: title prefixed, description appended with location
        const description = newItemLocation.trim()
          ? `${newItemNotes}\n\nLocation: ${newItemLocation.trim()}`
          : newItemNotes;

        await createBackendCalendarEvent(accessToken, {
          title: `[Appointment] ${newItemTitle}`,
          description,
          location: newItemLocation.trim() || undefined,
          start: start.toISOString(),
          end: (end > start ? end : new Date(start.getTime() + 60 * 60 * 1000)).toISOString(),
        });

        showToast('Appointment created successfully', 'success');

      } else if (newItemType === 'Team Task') {
        const due = new Date(
          dateValue.getFullYear(),
          dateValue.getMonth(),
          dateValue.getDate(),
          23,
          59
        );

        await createBackendCalendarTask(accessToken, {
          title: newItemTitle,
          notes: newItemNotes || undefined,
          due: newItemDate ? due.toISOString() : undefined,
        });

        showToast('Task created successfully', 'success');
      }

      await loadSyncSettingsAndEvents();
    } catch (error: any) {
      console.error('Error creating item:', error);
      Alert.alert('Error', error.message || 'Failed to create item. Please try again.');
    } finally {
      setIsLoadingEvents(false);
      setNewItemTitle('');
      setNewItemDate('');
      setNewItemTime('');
      setNewItemEndDate('');
      setNewItemEndTime('');
      setNewItemLocation('');
      setNewItemNotes('');
      setNewItemType('Calendar Event');
      setIsEditing(false);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteModalVisible(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || !accessToken) return;
    setDeleteModalVisible(false);
    setIsLoadingEvents(true);
    try {
      await deleteBackendCalendarEvent(accessToken, eventToDelete);
      showToast('Event deleted successfully', 'success');
      await loadSyncSettingsAndEvents();
    } catch (e: any) {
      console.error('Failed to delete event:', e);
      showToast(e.message || 'Failed to delete event', 'error');
    } finally {
      setIsLoadingEvents(false);
      setEventToDelete(null);
    }
  };

  const cancelDeleteEvent = () => {
    setDeleteModalVisible(false);
    setEventToDelete(null);
  };

  const handleCopyLink = async (link: string) => {
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'Meeting link copied to clipboard!');
  };

  const openCreateModal = (type: string = 'Calendar Event') => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    setIsEditing(false);
    setNewItemTitle('');
    setNewItemDate(now.toLocaleDateString('en-US'));
    setNewItemTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setNewItemEndDate(oneHourLater.toLocaleDateString('en-US'));
    setNewItemEndTime(oneHourLater.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setNewItemLocation('');
    setNewItemNotes('');
    setNewItemType(type);
    setDateValue(now);
    setTimeValue(now);
    setEndDateValue(oneHourLater);
    setEndTimeValue(oneHourLater);
    setShowModal(true);
  };

  const openEditModal = (item: any, type: string) => {
    setIsEditing(true);
    setNewItemTitle(item.title);
    setNewItemType(type);
    const parsedDate = new Date(item.startDate || new Date());
    const parsedEnd = new Date(item.endDate || new Date(parsedDate.getTime() + 60 * 60 * 1000));
    setDateValue(parsedDate);
    setTimeValue(parsedDate);
    setEndDateValue(parsedEnd);
    setEndTimeValue(parsedEnd);
    setNewItemDate(parsedDate.toLocaleDateString('en-US'));
    setNewItemTime(parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setNewItemEndDate(parsedEnd.toLocaleDateString('en-US'));
    setNewItemEndTime(parsedEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setNewItemLocation(item.location || '');
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

  const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDateValue(selectedDate);
      setNewItemEndDate(selectedDate.toLocaleDateString('en-US'));
    }
  };

  const onEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndTimeValue(selectedTime);
      setNewItemEndTime(selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    }
  };

  // Map of YYYY-MM-DD -> events, expanding multi-day events across each day they span.
  const eventsByDate = useMemo(() => {
    const map: { [key: string]: CalendarEvent[] } = {};
    backendEvents.forEach(evt => {
      const start = new Date(evt.startDate);
      const end = new Date(evt.endDate);
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= last) {
        const key = toDateKey(cursor);
        if (!map[key]) map[key] = [];
        map[key].push(evt);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [backendEvents]);

  // Measured inner width of the calendar card so day cells fill exactly 7 columns.
  const [calGridWidth, setCalGridWidth] = useState(0);

  // Filter events for active switcher month on the Event Links tab
  const filteredEventsForMonth = useMemo(() => {
    return backendEvents.filter(evt => {
      const evtDate = new Date(evt.startDate);
      return (
        evtDate.getMonth() === selectedMonth.getMonth() &&
        evtDate.getFullYear() === selectedMonth.getFullYear()
      );
    });
  }, [backendEvents, selectedMonth]);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleThisMonth = () => {
    setSelectedMonth(new Date());
  };

  // O(1) lookup against the precomputed map (also covers multi-day events).
  const getEventsForDate = (date: Date) => eventsByDate[toDateKey(date)] || [];

  const handleGoToday = () => {
    const today = new Date();
    setSelectedMonth(today);
    setSelectedDay(today);
  };

  const handlePrev = () => {
    if (calendarViewMode === 'month') {
      const d = new Date(selectedMonth);
      d.setMonth(d.getMonth() - 1);
      setSelectedMonth(d);
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() - 1);
      setSelectedDay(d);
      setSelectedMonth(d);
    }
  };

  const handleNext = () => {
    if (calendarViewMode === 'month') {
      const d = new Date(selectedMonth);
      d.setMonth(d.getMonth() + 1);
      setSelectedMonth(d);
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() + 1);
      setSelectedDay(d);
      setSelectedMonth(d);
    }
  };

  const renderSelectedDayAgenda = () => {
    const dayEvents = getEventsForDate(selectedDay);

    return (
      <View style={styles.agendaDayContainer}>
        <Text style={styles.agendaDayTitle}>
          Schedule for {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>

        {dayEvents.length === 0 ? (
          <View style={styles.agendaDayEmpty}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={32} color={colors.textMuted} />
            <Text style={styles.agendaDayEmptyText}>No events scheduled</Text>
          </View>
        ) : (
          dayEvents.map(evt => {
            const startTime = new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const endTime = new Date(evt.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const v = getEventVisual(evt, isDark);

            return (
              <Pressable
                key={evt.id}
                style={[styles.agendaDayCard, { backgroundColor: v.barBg }]}
                onPress={() => openDetailsModal(evt)}
              >
                <View style={[styles.agendaCardBorderIndicator, { backgroundColor: v.border }]} />
                <View style={styles.agendaCardBody}>
                  <Text style={[styles.agendaCardTitle, { color: v.barText }]} numberOfLines={1}>{evt.title}</Text>
                  <Text style={[styles.agendaCardTime, { color: v.barText }]}>
                    {evt.allDay ? 'All Day' : `${startTime} - ${endTime}`}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={v.barText} />
              </Pressable>
            );
          })
        )}
      </View>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(selectedDay);

    // Bucket events once: all-day events get pinned on top, timed events by start hour.
    const allDayEvents: CalendarEvent[] = [];
    const byHour: { [hour: number]: CalendarEvent[] } = {};
    dayEvents.forEach(evt => {
      if (evt.allDay) {
        allDayEvents.push(evt);
        return;
      }
      const h = new Date(evt.startDate).getHours();
      (byHour[h] ||= []).push(evt);
    });

    const renderEventCard = (evt: CalendarEvent) => {
      const v = getEventVisual(evt, isDark);
      return (
        <Pressable
          key={evt.id}
          style={[styles.timelineEventCard, { backgroundColor: v.barBg, borderLeftColor: v.border }]}
          onPress={() => openDetailsModal(evt)}
        >
          <Text style={[styles.timelineEventCardTitle, { color: v.barText }]} numberOfLines={1}>{evt.title}</Text>
          <Text style={[styles.timelineEventCardTime, { color: v.barText }]}>
            {evt.allDay
              ? 'All Day'
              : new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
        </Pressable>
      );
    };

    return (
      <View style={styles.dayTimelineContainer}>
        {allDayEvents.length > 0 && (
          <View style={styles.timelineRow}>
            <View style={styles.timelineTimeLabelCol}>
              <Text style={styles.timelineTimeLabelText}>All day</Text>
            </View>
            <View style={styles.timelineEventCol}>
              {allDayEvents.map(renderEventCard)}
            </View>
          </View>
        )}

        {hours.map(hour => {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 === 0 ? 12 : hour % 12;
          const timeLabel = `${displayHour}:00 ${ampm}`;
          const hourEvents = byHour[hour] || [];

          return (
            <View key={hour} style={styles.timelineRow}>
              <View style={styles.timelineTimeLabelCol}>
                <Text style={styles.timelineTimeLabelText}>{timeLabel}</Text>
              </View>
              <View style={styles.timelineEventCol}>
                {hourEvents.map(renderEventCard)}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Reusable Month/Day view selector — its own segment so it can live anywhere and always works.
  const renderViewModeSwitch = () => (
    <View style={styles.viewSegmentRow}>
      <Pressable
        style={[styles.viewSegmentBtn, calendarViewMode === 'month' && styles.viewSegmentBtnActive]}
        onPress={() => setCalendarViewMode('month')}
      >
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={16}
          color={calendarViewMode === 'month' ? colors.textPrimary : colors.inputPlaceholder}
        />
        <Text style={[styles.viewSegmentText, calendarViewMode === 'month' && styles.viewSegmentTextActive]}>
          Month
        </Text>
      </Pressable>
      <Pressable
        style={[styles.viewSegmentBtn, calendarViewMode === 'day' && styles.viewSegmentBtnActive]}
        onPress={() => setCalendarViewMode('day')}
      >
        <MaterialCommunityIcons
          name="view-agenda-outline"
          size={16}
          color={calendarViewMode === 'day' ? colors.textPrimary : colors.inputPlaceholder}
        />
        <Text style={[styles.viewSegmentText, calendarViewMode === 'day' && styles.viewSegmentTextActive]}>
          Day
        </Text>
      </Pressable>
    </View>
  );

  const renderCalendarTab = () => {
    if (isLoadingEvents) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentTeal} />
          <Text style={styles.loadingText}>Fetching your schedule...</Text>
        </View>
      );
    }

    const monthYearString = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const selectedDayString = selectedDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const calendarTitleString = calendarViewMode === 'month' ? monthYearString : selectedDayString;

    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    return (
      <View style={styles.calendarTabRoot}>
        <View style={styles.calendarViewContainer}>
          {/* Month / Day view selector — its own dedicated segment, always available */}
          {renderViewModeSwitch()}

          {/* Custom Control Bar (Today, <, >, title) */}
          <View style={styles.calendarControlBar}>
            <Pressable style={styles.controlTodayBtn} onPress={handleGoToday}>
              <Text style={styles.controlTodayBtnText}>Today</Text>
            </Pressable>

            <View style={styles.arrowControls}>
              <Pressable style={styles.controlArrowBtn} onPress={handlePrev}>
                <MaterialCommunityIcons name="chevron-left" size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable style={styles.controlArrowBtn} onPress={handleNext}>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.calendarTitleLabel} numberOfLines={1}>{calendarTitleString}</Text>
          </View>

          {/* Render selected view */}
          {calendarViewMode === 'month' ? (
            <View style={styles.monthViewWrapper}>
              {/* Premium month grid (react-native-calendars) */}
              <View
                style={styles.calendarCard}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width - 12; // minus card horizontal padding
                  if (Math.abs(w - calGridWidth) > 1) setCalGridWidth(w);
                }}
              >
                {/* Weekday Headers */}
                <View style={styles.weekdayHeadersRow}>
                  {daysOfWeek.map(day => (
                    <Text key={day} style={styles.weekdayHeaderText}>{day}</Text>
                  ))}
                </View>

                {calGridWidth > 0 && (
                  <RNCalendar
                    key={`${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`}
                    current={toDateKey(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1))}
                    firstDay={0}
                    hideArrows
                    hideDayNames
                    disableMonthChange
                    renderHeader={() => null}
                    enableSwipeMonths
                    onMonthChange={(m) => setSelectedMonth(new Date(m.year, m.month - 1, 1))}
                    style={styles.rnCalendar}
                    theme={{
                      calendarBackground: 'transparent',
                      'stylesheet.calendar.main': {
                        container: { paddingLeft: 0, paddingRight: 0 },
                        week: { marginTop: 0, marginBottom: 0, flexDirection: 'row' },
                        dayContainer: { flex: 0 },
                      },
                    } as any}
                    dayComponent={({ date, state }: any) => {
                      if (!date) return <View style={{ width: calGridWidth / 7 }} />;
                      const cellDate = new Date(date.year, date.month - 1, date.day);
                      const dayEvents = eventsByDate[date.dateString] || [];
                      const isDisabled = state === 'disabled';
                      const isTodayCell = state === 'today';
                      const isSelectedCell =
                        date.year === selectedDay.getFullYear() &&
                        date.month - 1 === selectedDay.getMonth() &&
                        date.day === selectedDay.getDate();

                      return (
                        <Pressable
                          style={[
                            styles.monthDayCell,
                            { width: calGridWidth / 7 },
                            isSelectedCell && styles.monthDayCellSelected,
                          ]}
                          onPress={() => {
                            setSelectedDay(cellDate);
                            if (isDisabled) setSelectedMonth(cellDate);
                          }}
                        >
                          <View style={styles.dayNumWrap}>
                            <View
                              style={[
                                styles.dayNumCircle,
                                isTodayCell && styles.dayNumCircleToday,
                                isSelectedCell && !isTodayCell && styles.dayNumCircleSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayNumText,
                                  isTodayCell && styles.dayNumTextToday,
                                  isDisabled && styles.dayNumTextMuted,
                                ]}
                              >
                                {date.day}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.dayEvents}>
                            {dayEvents.slice(0, 2).map((evt, idx) => {
                              const v = getEventVisual(evt, isDark);
                              return (
                                <View
                                  key={evt.id || idx}
                                  style={[styles.dayEventBar, { backgroundColor: v.barBg }]}
                                >
                                  <Text
                                    style={[styles.dayEventBarText, { color: v.barText }]}
                                    numberOfLines={1}
                                  >
                                    {evt.title}
                                  </Text>
                                </View>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <Text style={styles.dayMoreText}>+{dayEvents.length - 2} more</Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    }}
                  />
                )}
              </View>

              {/* Day Agenda Details */}
              {renderSelectedDayAgenda()}
            </View>
          ) : (
            // Day View
            renderDayView()
          )}
        </View>
      </View>
    );
  };

  const renderBookingTab = () => {
    const monthYearString = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <View style={styles.contentArea}>
        {/* Month Switcher Header */}
        <View style={styles.monthControllerCard}>
          <Text style={styles.monthTitleText}>{monthYearString}</Text>
          <View style={styles.monthNavControls}>
            <Pressable style={styles.monthNavBtn} onPress={handleThisMonth}>
              <Text style={styles.monthNavBtnText}>This Month</Text>
            </Pressable>
            <Pressable style={styles.monthArrowBtn} onPress={handlePrevMonth}>
              <MaterialCommunityIcons name="chevron-left" size={20} color={colors.accentBlue} />
            </Pressable>
            <Pressable style={styles.monthArrowBtn} onPress={handleNextMonth}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.accentBlue} />
            </Pressable>
          </View>
        </View>

        {/* Monthly Event Cards list */}
        {filteredEventsForMonth.length === 0 ? (
          <View style={[styles.emptyState, { minHeight: 250, padding: 24 }]}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { fontSize: 16 }]}>No events found for this month</Text>
            <Text style={[styles.emptySubtitle, { fontSize: 12, marginBottom: 0 }]}>
              There are no sync events on your calendar for {monthYearString}.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {filteredEventsForMonth.map((evt) => {
              const dateObj = new Date(evt.startDate);
              const shortMonth = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const dayNum = dateObj.getDate();
              const isVideoCall = !!evt.meetingLink;

              // Check holiday classification
              const isHoliday = evt.calendarTitle?.toLowerCase().includes('holiday') ||
                evt.id.includes('holiday') ||
                evt.location?.toLowerCase().includes('holiday') ||
                evt.notes?.toLowerCase().includes('public holiday');

              const timeString = evt.allDay
                ? 'All Day'
                : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

              let themeBg = '#EFF6FF'; // light blue
              let themeText = '#1E40AF'; // deep blue
              let badgeLabel = 'EVENT';

              if (isVideoCall) {
                themeBg = '#EFF6FF';
                themeText = '#1E40AF';
                badgeLabel = 'VIDEO CALL';
              } else if (isHoliday) {
                themeBg = '#F0FDF4'; // light green
                themeText = '#166534'; // deep green
                badgeLabel = 'FESTIVAL';
              } else {
                themeBg = '#EEF2FF'; // light indigo
                themeText = '#4F46E5'; // deep indigo
                badgeLabel = 'EVENT';
              }

              return (
                <View
                  key={evt.id}
                  style={[styles.cardContainer, { width: cardWidth, marginBottom: numColumns > 1 ? 0 : 16 }]}
                >
                  {/* Header Row */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.datePill, { backgroundColor: themeBg }]}>
                      <Text style={[styles.dateText, { color: themeText }]}>{shortMonth}</Text>
                      <Text style={[styles.dateDayText, { color: themeText }]}>{dayNum}</Text>
                    </View>

                    <View style={styles.headerRightRow}>
                      <View style={[styles.tagPill, { backgroundColor: themeBg }]}>
                        <Text style={[styles.tagText, { color: themeText }]}>
                          {badgeLabel}
                        </Text>
                      </View>

                      {!isHoliday && (
                        <Pressable style={styles.trashBtn} onPress={() => handleDeleteEvent(evt.id)}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Event Metadata */}
                  <Text style={styles.cardTitle}>{evt.title}</Text>

                  <View style={styles.cardTimeRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.cardTimeText}>{timeString}</Text>
                  </View>

                  {/* Footer Section */}
                  {isVideoCall ? (
                    <View style={styles.meetLinkBox}>
                      <MaterialCommunityIcons name="video-outline" size={16} color={colors.accentBlue} />
                      <Text style={styles.meetLinkText} numberOfLines={1}>
                        {evt.meetingLink}
                      </Text>
                      <Pressable style={styles.meetLinkCopyBtn} onPress={() => handleCopyLink(evt.meetingLink!)}>
                        <MaterialCommunityIcons name="content-copy" size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.holidayBox}>
                      <MaterialCommunityIcons
                        name={evt.location ? "map-marker-outline" : "information-outline"}
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.holidayText} numberOfLines={1}>
                        {evt.location || evt.notes || 'Public Holiday'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderTasksTab = () => (
    <View style={styles.tasksArea}>
      {backendTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={56} color={colors.accentTeal} />
          </View>
          <Text style={styles.emptyTitle}>No Tasks Found</Text>
          <Text style={styles.emptySubtitle}>Sync your Google account or create tasks here to manage your checklist.</Text>
          <Pressable style={styles.mainActionBtn} onPress={() => openCreateModal('Team Task')}>
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.mainActionBtnText}>Create New Task</Text>
          </Pressable>
        </View>
      ) : (
        backendTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskCardHeader}>
              <Text style={styles.taskCardTitle}>{task.title}</Text>
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerText}>{task.owner[0]}</Text>
              </View>
            </View>

            {task.notes ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
                {task.notes}
              </Text>
            ) : null}

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
        ))
      )}
    </View>
  );

  const renderIntegrationsTab = () => {
    return (
      <View style={styles.integrationsRoot}>
        <View style={styles.integrationsHeader}>
          <Text style={styles.integrationsTitle}>Calendar Integrations</Text>
          <Text style={styles.integrationsSubtitle}>
            Connect your preferred calendar to sync events and tasks. You can only connect one calendar at a time.
          </Text>
        </View>

        <View style={styles.integrationsGrid}>
          {/* Google Calendar Card */}
          <View style={[styles.integrationCard, isGoogleConnected && styles.integrationCardConnected]}>
            <View style={styles.integrationCardHeader}>
              <View style={styles.integrationLogoBox}>
                <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
              </View>
              <View style={styles.integrationHeaderText}>
                <Text style={styles.integrationName}>Google Calendar</Text>
                <Text style={styles.integrationDesc}>Sync with Google Workspace or Gmail</Text>
              </View>
            </View>

            <View style={styles.dividerLine} />

            <View style={styles.integrationStatusRow}>
              <View style={isGoogleConnected ? styles.statusDotGreen : styles.statusDotGray} />
              <Text style={isGoogleConnected ? styles.statusTextGreen : styles.statusTextGray}>
                {isGoogleConnected ? 'Connected & Syncing' : 'Not connected'}
              </Text>
            </View>

            {isGoogleConnected ? (
              <Pressable
                style={styles.disconnectBtn}
                onPress={() => {
                  setCalendarToDisconnect('Google');
                  setDisconnectModalVisible(true);
                }}
              >
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </Pressable>
            ) : isMicrosoftConnected ? (
              <Pressable style={styles.disabledBtn} disabled>
                <Text style={styles.disabledBtnText}>Disconnect Outlook First</Text>
              </Pressable>
            ) : isAppleConnected ? (
              <Pressable style={styles.disabledBtn} disabled>
                <Text style={styles.disabledBtnText}>Disconnect Apple First</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.connectBtn} onPress={handleConnectGoogle}>
                <MaterialCommunityIcons name="google" size={14} color={colors.cardBackground} />
                <Text style={styles.connectBtnText}>Connect</Text>
              </Pressable>
            )}
          </View>

          {/* Microsoft Outlook Card */}
          <View style={[styles.integrationCard, isMicrosoftConnected && styles.integrationCardConnected]}>
            <View style={styles.integrationCardHeader}>
              <View style={styles.integrationLogoBox}>
                <MaterialCommunityIcons name="microsoft-outlook" size={20} color="#0078D4" />
              </View>
              <View style={styles.integrationHeaderText}>
                <Text style={styles.integrationName}>Microsoft Outlook</Text>
                <Text style={styles.integrationDesc}>Sync with Office 365 or Outlook</Text>
              </View>
            </View>

            <View style={styles.dividerLine} />

            <View style={styles.integrationStatusRow}>
              <View style={isMicrosoftConnected ? styles.statusDotGreen : styles.statusDotGray} />
              <Text style={isMicrosoftConnected ? styles.statusTextGreen : styles.statusTextGray}>
                {isMicrosoftConnected ? 'Connected & Syncing' : 'Not connected'}
              </Text>
            </View>

            {isMicrosoftConnected ? (
              <Pressable
                style={styles.disconnectBtn}
                onPress={() => {
                  setCalendarToDisconnect('Microsoft');
                  setDisconnectModalVisible(true);
                }}
              >
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </Pressable>
            ) : isGoogleConnected ? (
              <Pressable style={styles.disabledBtn} disabled>
                <Text style={styles.disabledBtnText}>Disconnect Google First</Text>
              </Pressable>
            ) : isAppleConnected ? (
              <Pressable style={styles.disabledBtn} disabled>
                <Text style={styles.disabledBtnText}>Disconnect Apple First</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.connectBtn} onPress={handleConnectMicrosoft}>
                <MaterialCommunityIcons name="microsoft" size={14} color={colors.cardBackground} />
                <Text style={styles.connectBtnText}>Connect</Text>
              </Pressable>
            )}
          </View>

          {/* Apple iCloud Card */}
          <View style={[styles.integrationCard, isAppleConnected && styles.integrationCardConnected]}>
            <View style={styles.integrationCardHeader}>
              <View style={styles.integrationLogoBox}>
                <MaterialCommunityIcons name="apple" size={20} color={colors.textPrimary} />
              </View>
              <View style={styles.integrationHeaderText}>
                <Text style={styles.integrationName}>Apple iCloud</Text>
                <Text style={styles.integrationDesc}>Sync with Apple Calendar & Reminders</Text>
              </View>
            </View>

            <View style={styles.dividerLine} />

            <View style={styles.integrationStatusRow}>
              <View style={isAppleConnected ? styles.statusDotGreen : styles.statusDotGray} />
              <Text style={isAppleConnected ? styles.statusTextGreen : styles.statusTextGray}>
                {isAppleConnected ? 'Connected & Syncing' : 'Not connected'}
              </Text>
            </View>

            {isAppleConnected ? (
              <Pressable
                style={styles.disconnectBtn}
                onPress={() => {
                  setCalendarToDisconnect('Apple');
                  setDisconnectModalVisible(true);
                }}
              >
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </Pressable>
            ) : isGoogleConnected ? (
              <Pressable style={styles.disabledBtn} disabled>
                <Text style={styles.disabledBtnText}>Disconnect Google First</Text>
              </Pressable>
            ) : isMicrosoftConnected ? (
              <Pressable style={styles.disabledBtn} disabled>
                <Text style={styles.disabledBtnText}>Disconnect Outlook First</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.connectBtn} onPress={() => setAppleModalVisible(true)}>
                <MaterialCommunityIcons name="apple" size={14} color={colors.cardBackground} />
                <Text style={styles.connectBtnText}>Connect Apple</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Rendered directly (not memoized): the calendar view depends on many pieces of
  // state (calendarViewMode, selectedDay, calGridWidth, …). A memo with a partial
  // dependency list previously froze the Month/Day switch until the month changed.
  const tabContent =
    activeTab === 'booking'
      ? renderBookingTab()
      : activeTab === 'tasks'
        ? renderTasksTab()
        : activeTab === 'integrations'
          ? renderIntegrationsTab()
          : renderCalendarTab();

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.background, { paddingTop: insets.top }]}>
      <PageHeader
        title="Calendar"
        subtitle="Manage events, bookings, and tasks"
        onBack={() => router.back()}
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
              Event Links
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
            onPress={() => setActiveTab('tasks')}>
            <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
              Tasks
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'integrations' && styles.tabActive]}
            onPress={() => setActiveTab('integrations')}>
            <Text style={[styles.tabText, activeTab === 'integrations' && styles.tabTextActive]}>
              Integrations
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}>
        {/* Tab Content */}
        {tabContent}
      </ScrollView>

      {/* Floating Add Event Button */}
      {activeTab !== 'integrations' && (
        <Pressable
          style={[styles.absoluteAddBtn, { bottom: insets.bottom + 20 }]}
          onPress={() => openCreateModal()}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.absoluteAddBtnText}>Add Event</Text>
        </Pressable>
      )}

      {/* Create Event Modal — full screen */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.ceScreen, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.ceHeader}>
            <Text style={styles.ceTitle}>{isEditing ? 'Edit Event' : 'Create Event'}</Text>
            <Pressable onPress={() => setShowModal(false)} style={styles.ceCloseBtn}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={styles.ceTabRow}>
            {(['Calendar Event', 'Team Task', 'Appointment'] as const).map((type) => (
              <Pressable
                key={type}
                style={[styles.ceTab, newItemType === type && styles.ceTabActive]}
                onPress={() => setNewItemType(type)}
              >
                <Text style={[styles.ceTabText, newItemType === type && styles.ceTabTextActive]}>
                  {type === 'Calendar Event' ? 'Event' : type === 'Team Task' ? 'Task' : 'Appointment'}
                </Text>
              </Pressable>
            ))}
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.ceForm} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Title */}
              <View style={styles.ceField}>
                <Text style={styles.ceLabel}>
                  {newItemType === 'Calendar Event' ? 'EVENT TITLE' : newItemType === 'Team Task' ? 'TASK TITLE' : 'APPOINTMENT TITLE'}
                  <Text style={styles.ceRequired}> *</Text>
                </Text>
                <View style={styles.ceInputRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.ceInput}
                    placeholder={
                      newItemType === 'Calendar Event' ? 'E.g., Property Showing at 123 Main St' :
                      newItemType === 'Team Task' ? 'E.g., Call the plumber' :
                      'E.g., Meeting with client'
                    }
                    placeholderTextColor={colors.inputPlaceholder}
                    value={newItemTitle}
                    onChangeText={setNewItemTitle}
                  />
                </View>
              </View>

              {/* Event / Appointment: Start + End date/time */}
              {(newItemType === 'Calendar Event' || newItemType === 'Appointment') && (
                <>
                  <View style={styles.ceRow}>
                    <View style={[styles.ceField, { flex: 1 }]}>
                      <Text style={styles.ceLabel}>START DATE <Text style={styles.ceRequired}>*</Text></Text>
                      <Pressable style={styles.ceInputRow} onPress={() => setShowDatePicker(true)}>
                        <TextInput
                          style={[styles.ceInput, { flex: 1 }]}
                          placeholder="dd/mm/yyyy"
                          placeholderTextColor={colors.inputPlaceholder}
                          value={newItemDate}
                          editable={false}
                          pointerEvents="none"
                        />
                        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                    <View style={[styles.ceField, { flex: 1 }]}>
                      <Text style={styles.ceLabel}>START TIME <Text style={styles.ceRequired}>*</Text></Text>
                      <Pressable style={styles.ceInputRow} onPress={() => setShowTimePicker(true)}>
                        <TextInput
                          style={[styles.ceInput, { flex: 1 }]}
                          placeholder="--:-- --"
                          placeholderTextColor={colors.inputPlaceholder}
                          value={newItemTime}
                          editable={false}
                          pointerEvents="none"
                        />
                        <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.ceRow}>
                    <View style={[styles.ceField, { flex: 1 }]}>
                      <Text style={styles.ceLabel}>END DATE <Text style={styles.ceRequired}>*</Text></Text>
                      <Pressable style={styles.ceInputRow} onPress={() => setShowEndDatePicker(true)}>
                        <TextInput
                          style={[styles.ceInput, { flex: 1 }]}
                          placeholder="dd/mm/yyyy"
                          placeholderTextColor={colors.inputPlaceholder}
                          value={newItemEndDate}
                          editable={false}
                          pointerEvents="none"
                        />
                        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                    <View style={[styles.ceField, { flex: 1 }]}>
                      <Text style={styles.ceLabel}>END TIME <Text style={styles.ceRequired}>*</Text></Text>
                      <Pressable style={styles.ceInputRow} onPress={() => setShowEndTimePicker(true)}>
                        <TextInput
                          style={[styles.ceInput, { flex: 1 }]}
                          placeholder="--:-- --"
                          placeholderTextColor={colors.inputPlaceholder}
                          value={newItemEndTime}
                          editable={false}
                          pointerEvents="none"
                        />
                        <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.ceField}>
                    <Text style={styles.ceLabel}>LOCATION (OPTIONAL)</Text>
                    <View style={styles.ceInputRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.ceInput}
                        placeholder="Add address..."
                        placeholderTextColor={colors.inputPlaceholder}
                        value={newItemLocation}
                        onChangeText={setNewItemLocation}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Task: Due Date only */}
              {newItemType === 'Team Task' && (
                <View style={styles.ceField}>
                  <Text style={styles.ceLabel}>DUE DATE (OPTIONAL)</Text>
                  <Pressable style={styles.ceInputRow} onPress={() => setShowDatePicker(true)}>
                    <TextInput
                      style={[styles.ceInput, { flex: 1 }]}
                      placeholder="dd/mm/yyyy"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={newItemDate}
                      editable={false}
                      pointerEvents="none"
                    />
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              )}

              {/* Description */}
              <View style={styles.ceField}>
                <Text style={styles.ceLabel}>DESCRIPTION (OPTIONAL)</Text>
                <TextInput
                  style={styles.ceTextarea}
                  placeholder="Add meeting agenda or notes..."
                  placeholderTextColor={colors.inputPlaceholder}
                  value={newItemNotes}
                  onChangeText={setNewItemNotes}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <View style={{ height: 120 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Sticky footer actions */}
          <View style={[styles.ceFooter, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable style={styles.ceCancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.ceCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.ceSubmitBtn} onPress={handleCreateItem}>
              <MaterialCommunityIcons name="calendar-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.ceSubmitText}>
                {isEditing ? 'Save Changes' :
                  newItemType === 'Calendar Event' ? 'Create Event' :
                  newItemType === 'Team Task' ? 'Create Task' : 'Create Appointment'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Start Date Picker */}
        <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowDatePicker(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerToolbar}>
                <Text style={styles.pickerTitle}>Start Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker value={dateValue} mode="date" display="spinner" onChange={onDateChange} textColor={colors.textPrimary} style={styles.pickerInternal} />
            </View>
          </Pressable>
        </Modal>

        {/* Start Time Picker */}
        <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowTimePicker(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerToolbar}>
                <Text style={styles.pickerTitle}>Start Time</Text>
                <Pressable onPress={() => setShowTimePicker(false)} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker value={timeValue} mode="time" display="spinner" is24Hour={false} onChange={onTimeChange} textColor={colors.textPrimary} style={styles.pickerInternal} />
            </View>
          </Pressable>
        </Modal>

        {/* End Date Picker */}
        <Modal visible={showEndDatePicker} transparent animationType="slide" onRequestClose={() => setShowEndDatePicker(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowEndDatePicker(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerToolbar}>
                <Text style={styles.pickerTitle}>End Date</Text>
                <Pressable onPress={() => setShowEndDatePicker(false)} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker value={endDateValue} mode="date" display="spinner" onChange={onEndDateChange} textColor={colors.textPrimary} style={styles.pickerInternal} />
            </View>
          </Pressable>
        </Modal>

        {/* End Time Picker */}
        <Modal visible={showEndTimePicker} transparent animationType="slide" onRequestClose={() => setShowEndTimePicker(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowEndTimePicker(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerToolbar}>
                <Text style={styles.pickerTitle}>End Time</Text>
                <Pressable onPress={() => setShowEndTimePicker(false)} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker value={endTimeValue} mode="time" display="spinner" is24Hour={false} onChange={onEndTimeChange} textColor={colors.textPrimary} style={styles.pickerInternal} />
            </View>
          </Pressable>
        </Modal>
      </Modal>


      {/* Google OAuth is handled securely via system WebBrowser session */}

      {/* Delete Confirmation Custom Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDeleteEvent}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconWrap}>
                <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
              </View>
              <Text style={styles.deleteModalTitle}>Confirm Deletion</Text>
            </View>

            <Text style={styles.deleteModalMsg}>
              Are you sure you want to delete this event?
            </Text>

            <View style={styles.deleteModalActions}>
              <Pressable style={styles.deleteModalCancelBtn} onPress={cancelDeleteEvent}>
                <Text style={styles.deleteModalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteModalConfirmBtn} onPress={confirmDeleteEvent}>
                <Text style={styles.deleteModalConfirmBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Event Detail Custom Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle} numberOfLines={2}>
                {activeDetailEvent?.title}
              </Text>
              <Pressable onPress={closeDetailsModal} style={styles.detailCloseCircle}>
                <MaterialCommunityIcons name="close" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            {activeDetailEvent && (
              <View style={styles.detailModalBody}>
                {/* Start Time Section */}
                <View style={styles.detailTimeSection}>
                  <View style={[styles.detailIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.detailTimeTextContainer}>
                    <Text style={styles.detailTimeLabel}>Start</Text>
                    <Text style={styles.detailTimeVal}>
                      {new Date(activeDetailEvent.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })} - {new Date(activeDetailEvent.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                </View>

                {/* End Time Section */}
                <View style={styles.detailTimeSection}>
                  <View style={[styles.detailIconBox, { backgroundColor: '#FFE8E8' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.detailTimeTextContainer}>
                    <Text style={styles.detailTimeLabel}>End</Text>
                    <Text style={styles.detailTimeVal}>
                      {new Date(activeDetailEvent.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })} - {new Date(activeDetailEvent.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                </View>

                {activeDetailEvent.location ? (
                  <View style={styles.detailTimeSection}>
                    <View style={[styles.detailIconBox, { backgroundColor: '#F0FDF4' }]}>
                      <MaterialCommunityIcons name="map-marker-outline" size={20} color="#166534" />
                    </View>
                    <View style={styles.detailTimeTextContainer}>
                      <Text style={styles.detailTimeLabel}>Location</Text>
                      <Text style={styles.detailTimeVal}>{activeDetailEvent.location}</Text>
                    </View>
                  </View>
                ) : null}

                {activeDetailEvent.notes ? (
                  <View style={styles.detailTimeSection}>
                    <View style={[styles.detailIconBox, { backgroundColor: '#F8FAFC' }]}>
                      <MaterialCommunityIcons name="text-box-outline" size={20} color="#64748B" />
                    </View>
                    <View style={styles.detailTimeTextContainer}>
                      <Text style={styles.detailTimeLabel}>Notes</Text>
                      <Text style={styles.detailTimeVal}>{activeDetailEvent.notes}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            <Pressable style={styles.detailModalCloseBtn} onPress={closeDetailsModal}>
              <Text style={styles.detailModalCloseBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Disconnect Confirmation Custom Modal */}
      <Modal
        visible={disconnectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDisconnectGoogle}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.disconnectModalContent}>
            <View style={styles.disconnectModalHeader}>
              <View style={styles.disconnectIconWrap}>
                <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
              </View>
              <Text style={styles.disconnectModalTitle}>Disconnect Calendar?</Text>
              <Pressable onPress={cancelDisconnectGoogle} style={styles.disconnectCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.disconnectModalBody}>
              <Text style={styles.disconnectModalSub}>
                Are you sure you want to disconnect your {calendarToDisconnect} Calendar?
              </Text>
              <Text style={styles.disconnectModalDesc}>
                This will remove all your upcoming events, event links, and tasks from the Zien dashboard. You can reconnect at any time.
              </Text>
            </View>

            <View style={styles.disconnectModalActions}>
              <Pressable style={styles.disconnectModalCancelBtn} onPress={cancelDisconnectGoogle}>
                <Text style={styles.disconnectModalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.disconnectModalConfirmBtn} onPress={confirmDisconnectGoogle}>
                <Text style={styles.disconnectModalConfirmBtnText}>Yes, Disconnect</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Connect iCloud Custom Modal */}
      <Modal
        visible={appleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAppleModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.appleModalContent}>
              {/* Header */}
              <View style={styles.appleModalHeader}>
                <View style={styles.appleIconWrap}>
                  <MaterialCommunityIcons name="apple" size={20} color={colors.textPrimary} />
                </View>
                <Text style={styles.appleModalTitle}>Connect iCloud</Text>
                <Pressable onPress={() => setAppleModalVisible(false)} style={styles.appleCloseBtn}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Body */}
              <View style={styles.appleModalBody}>
                <View style={styles.appleFormSection}>
                  <Text style={styles.appleInputLabel}>Apple ID (Email) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.appleTextInput}
                    placeholder="e.g. name@icloud.com"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={appleEmail}
                    onChangeText={setAppleEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.appleFormSection}>
                  <Text style={styles.appleInputLabel}>App-Specific Password <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <View style={styles.applePasswordInputContainer}>
                    <TextInput
                      style={styles.applePasswordInput}
                      placeholder="••••••••••••••••"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={appSpecificPassword}
                      onChangeText={setAppSpecificPassword}
                      secureTextEntry={secureTextEntry}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => setSecureTextEntry(!secureTextEntry)}
                      style={styles.applePasswordToggle}
                    >
                      <MaterialCommunityIcons
                        name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={() => Linking.openURL('https://support.apple.com/en-us/102654')}
                  style={styles.appleHelpLink}
                >
                  <Text style={styles.appleHelpLinkText}>
                    How to generate an App-Specific Password?
                  </Text>
                </Pressable>
              </View>

              {/* Actions */}
              <View style={styles.appleModalActions}>
                <Pressable
                  style={styles.appleModalCancelBtn}
                  onPress={() => setAppleModalVisible(false)}
                >
                  <Text style={styles.appleModalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.appleModalConfirmBtn,
                    (!appleEmail.trim() || !appSpecificPassword.trim() || isConnectingApple) && styles.appleModalConfirmBtnDisabled
                  ]}
                  onPress={handleConnectApple}
                  disabled={!appleEmail.trim() || !appSpecificPassword.trim() || isConnectingApple}
                >
                  {isConnectingApple ? (
                    <ActivityIndicator size="small" color={colors.cardBackground} />
                  ) : (
                    <Text style={styles.appleModalConfirmBtnText}>Connect</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Toast Notifications */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
              backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              borderColor: toast.type === 'success' ? '#10B981' : '#EF4444',
              top: insets.top + 8,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={toast.type === 'success' ? 'check-circle' : 'alert-circle'}
            size={18}
            color={toast.type === 'success' ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[
              styles.toastText,
              { color: toast.type === 'success' ? '#065F46' : '#991B1B' },
            ]}
          >
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

function getStyles(colors: any) {
  const isDark = colors.cardBackground !== '#FFFFFF';
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
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    tabRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft,
      padding: 4,
      borderRadius: 12,
      flex: 1,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
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
      textAlign: 'center',
    },
    tabTextActive: {
      color: colors.textPrimary,
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
      alignItems: 'center',
    },
    pickerInternal: {
      width: Dimensions.get('window').width,
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
      width: '100%',
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

    // ── Create Event Modal (full screen) ──
    ceScreen: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    ceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    ceTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    ceCloseBtn: {
      padding: 4,
    },
    ceTabRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    ceTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    ceTabActive: {
      borderColor: '#1D3A6B',
      backgroundColor: colors.cardBackground,
    },
    ceTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    ceTabTextActive: {
      fontWeight: '800',
      color: '#1D3A6B',
    },
    ceForm: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    ceField: {
      marginBottom: 16,
    },
    ceRow: {
      flexDirection: 'row',
      gap: 12,
    },
    ceLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    ceRequired: {
      color: '#EF4444',
    },
    ceInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 13,
    },
    ceInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    ceTextarea: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 13,
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 110,
    },
    ceFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
    },
    ceCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    ceCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    ceSubmitBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: '#1D3A6B',
    },
    ceSubmitText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    // legacy overlay styles kept for safety
    ceOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    ceCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      width: '100%',
      maxHeight: '92%',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 8,
    },
    ceActions: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'flex-end',
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
    // ── Active Sync & OAuth Styles ──
    syncHeaderRowActive: {
      flexDirection: 'column',
      alignItems: 'stretch',
      backgroundColor: '#ECFDF5',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#A7F3D0',
      gap: 12,
    },
    activeBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
    },
    syncHeaderTitleActive: {
      fontSize: 14,
      fontWeight: '800',
      color: '#065F46',
    },
    disconnectBtnHeader: {
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F87171',
      backgroundColor: '#FFF5F5',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    disconnectBtnHeaderText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#DC2626',
    },
    connectGoogleBtnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.accentTeal,
      alignSelf: 'center'
    },
    connectGoogleBtnHeaderText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFF',
    },
    webViewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
    },
    webViewTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    closeWebViewButton: {
      padding: 4,
    },
    webViewLoading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    absoluteAddBtn: {
      position: 'absolute',
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentTeal,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 28,
      shadowColor: colors.accentTeal,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 4,
      zIndex: 99,
    },
    absoluteAddBtnText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '800',
    },

    // ── Month Switcher & Event Link Tab Styles ──
    monthControllerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
    },
    monthTitleText: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    monthNavControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    monthNavBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
    },
    monthNavBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    monthArrowBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    cardContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.02,
      shadowRadius: 8,
      elevation: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    datePill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 46,
    },
    dateText: {
      fontWeight: '800',
      fontSize: 11,
    },
    dateDayText: {
      fontSize: 15,
      fontWeight: '900',
    },
    headerRightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tagPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 9,
      fontWeight: '900',
    },
    trashBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: '#FEF2F2',
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    cardTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    cardTimeText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    meetLinkBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    meetLinkText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '700',
      flex: 1,
    },
    meetLinkCopyBtn: {
      padding: 4,
    },
    holidayBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    holidayText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '700',
    },
    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      width: '100%',
    },
    createCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      padding: 16,
      marginTop: 8,
    },
    createText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    deleteModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    deleteModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    deleteIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFE8E8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteModalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      flex: 1,
    },
    deleteModalMsg: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 24,
      textAlign: 'left',
    },
    deleteModalActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    deleteModalCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteModalCancelBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    deleteModalConfirmBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    deleteModalConfirmBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    toastContainer: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 9999,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
      gap: 10,
    },
    toastText: {
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    // ── Web Calendar Month/Day Grid Styles ──
    calendarViewContainer: {
      gap: 16,
      width: '100%',
    },
    calendarControlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 8,
      width: '100%',
    },
    controlTodayBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
    },
    controlTodayBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    arrowControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    controlArrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    calendarTitleLabel: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
      flex: 1,
      marginLeft: 4,
    },
    // ── Month / Day view selector (own full-width segment) ──
    viewSegmentRow: {
      flexDirection: 'row',
      width: '100%',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 4,
    },
    viewSegmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    viewSegmentBtnActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    viewSegmentText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.inputPlaceholder,
    },
    viewSegmentTextActive: {
      color: colors.textPrimary,
    },
    monthViewWrapper: {
      width: '100%',
      gap: 16,
    },
    // ── Premium month calendar (react-native-calendars) ──
    calendarCard: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 22,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 6,
      paddingTop: 12,
      paddingBottom: 8,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
      overflow: 'hidden',
    },
    rnCalendar: {
      backgroundColor: 'transparent',
      marginTop: 2,
    },
    monthDayCell: {
      minHeight: 78,
      paddingTop: 4,
      paddingBottom: 3,
      borderRadius: 12,
      alignItems: 'stretch',
    },
    monthDayCellSelected: {
      backgroundColor: isDark ? 'rgba(0,167,181,0.12)' : '#EAF4FB',
    },
    dayNumWrap: {
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
    },
    dayNumCircle: {
      minWidth: 24,
      height: 24,
      paddingHorizontal: 5,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumCircleToday: {
      backgroundColor: colors.accentTeal,
    },
    dayNumCircleSelected: {
      borderWidth: 1.5,
      borderColor: colors.accentTeal,
    },
    dayNumText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    dayNumTextToday: {
      color: colors.textOnAccent,
      fontWeight: '800',
    },
    dayNumTextMuted: {
      color: colors.inputPlaceholder,
    },
    dayEvents: {
      gap: 2.5,
      paddingHorizontal: 3,
    },
    dayEventBar: {
      borderRadius: 5,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    dayEventBarText: {
      fontSize: 8.5,
      fontWeight: '700',
      lineHeight: 11,
    },
    dayMoreText: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.textMuted,
      paddingHorizontal: 3,
      marginTop: 1,
    },
    weekdayHeadersRow: {
      flexDirection: 'row',
      width: '100%',
      paddingBottom: 6,
    },
    weekdayHeaderText: {
      width: `${100 / 7}%`,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '900',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    monthGridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100%',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.cardBorder, // shows grid lines
      gap: 1, // grid line thickness
    },
    calendarCell: {
      width: `${(100 - 6 / 7) / 7}%`, // dynamic 7 column grid spacing
      aspectRatio: 0.58, // slightly taller to fit 2 event blocks
      backgroundColor: colors.cardBackground,
      padding: 2,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
    },
    calendarCellSelected: {
      backgroundColor: isDark ? 'rgba(0, 167, 181, 0.12)' : '#E0F2FE',
    },
    calendarCellMuted: {
      backgroundColor: isDark ? '#151D26' : '#F9FAFB',
      opacity: 0.4,
    },
    cellHeader: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 1,
      paddingRight: 2,
      marginBottom: 2,
      height: 18,
    },
    dayNumberCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayCircle: {
      backgroundColor: '#2563EB', // web highlighted blue
    },
    selectedCircle: {
      borderWidth: 1,
      borderColor: colors.textPrimary,
    },
    calendarCellText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    todayCellText: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    selectedCellText: {
      fontWeight: '800',
    },
    mutedCellText: {
      color: colors.inputPlaceholder,
    },
    cellEventsContainer: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-start',
      gap: 2,
      paddingHorizontal: 2,
    },
    cellEventBar: {
      borderRadius: 2,
      paddingHorizontal: 2,
      paddingVertical: 1,
      width: '100%',
    },
    cellEventText: {
      fontSize: 7.5,
      fontWeight: '800',
    },
    cellMoreText: {
      fontSize: 7,
      color: colors.textMuted,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 0.5,
    },
    cellDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      width: '100%',
      height: 6,
      marginTop: 2,
    },
    cellDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },

    // ── Selected Date Agenda Styles ──
    agendaDayContainer: {
      width: '100%',
      marginTop: 8,
      gap: 12,
    },
    agendaDayTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    agendaDayEmpty: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 8,
    },
    agendaDayEmptyText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    agendaDayCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      paddingRight: 16,
      gap: 12,
    },
    agendaCardBorderIndicator: {
      width: 5,
      height: '100%',
    },
    agendaCardBody: {
      flex: 1,
      paddingVertical: 14,
      gap: 4,
    },
    agendaCardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    agendaCardTime: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },

    // ── Day Timeline view Styles ──
    dayTimelineContainer: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      paddingVertical: 8,
    },
    timelineRow: {
      flexDirection: 'row',
      minHeight: 52,
      width: '100%',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    timelineTimeLabelCol: {
      width: 76,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 8,
      borderRightWidth: 1,
      borderRightColor: colors.cardBorder,
    },
    timelineTimeLabelText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    timelineEventCol: {
      flex: 1,
      padding: 6,
      justifyContent: 'center',
    },
    timelineEventCard: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 10,
      borderLeftWidth: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: 'center',
      gap: 2,
      marginVertical: 2,
    },
    timelineEventCardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    timelineEventCardTime: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    timelineEmptySlotLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.surfaceSoft,
      alignSelf: 'stretch',
      marginTop: 20,
    },

    // ── Custom Details Modal Styles ──
    detailModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    detailModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 20,
    },
    detailModalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      flex: 1,
      lineHeight: 26,
    },
    detailCloseCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailModalBody: {
      gap: 16,
      marginBottom: 24,
    },
    detailTimeSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailTimeTextContainer: {
      flex: 1,
      gap: 2,
    },
    detailTimeLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailTimeVal: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    detailModalCloseBtn: {
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      width: '100%',
    },
    detailModalCloseBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    // ── Disconnect Modal Custom Styles ──
    disconnectModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
      overflow: 'hidden',
    },
    disconnectModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 10,
    },
    disconnectIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disconnectModalTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: isDark ? '#F87171' : '#991B1B',
      flex: 1,
    },
    disconnectCloseBtn: {
      padding: 4,
    },
    disconnectModalBody: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
      gap: 12,
    },
    disconnectModalSub: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 20,
    },
    disconnectModalDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    disconnectModalActions: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
      width: '100%',
    },
    disconnectModalCancelBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    disconnectModalCancelBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    disconnectModalConfirmBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    disconnectModalConfirmBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // ── Integrations Tab Styles ──
    integrationsRoot: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 24,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor || '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    integrationsHeader: {
      marginBottom: 24,
      gap: 6,
    },
    integrationsTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    integrationsSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      lineHeight: 18,
    },
    integrationsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    integrationCard: {
      flex: 1,
      minWidth: 260,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 20,
      gap: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    integrationCardConnected: {
      borderColor: colors.accentTeal + '40',
    },
    integrationCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    integrationLogoBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    integrationHeaderText: {
      flex: 1,
      gap: 2,
    },
    integrationName: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    integrationDesc: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      lineHeight: 16,
    },
    integrationStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    statusDotGreen: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    statusDotGray: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#94A3B8',
    },
    statusTextGreen: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10B981',
    },
    statusTextGray: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    dividerLine: {
      height: 1,
      backgroundColor: colors.cardBorder,
      width: '100%',
    },
    connectBtn: {
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    connectBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.cardBackground,
    },
    disconnectBtn: {
      height: 44,
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#FCA5A5',
    },
    disconnectBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#DC2626',
    },
    disabledBtn: {
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    disabledBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.inputPlaceholder,
    },
    // ── Apple iCloud Modal Styles ──
    appleModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
      overflow: 'hidden',
    },
    appleModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 16,
      gap: 12,
    },
    appleIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    appleModalTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      flex: 1,
    },
    appleCloseBtn: {
      padding: 4,
    },
    appleModalBody: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      gap: 16,
    },
    appleFormSection: {
      gap: 8,
    },
    appleInputLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    appleTextInput: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    applePasswordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingRight: 12,
    },
    applePasswordInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    applePasswordToggle: {
      padding: 4,
    },
    appleHelpLink: {
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    appleHelpLinkText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#2563EB',
    },
    appleModalActions: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 24,
      width: '100%',
    },
    appleModalCancelBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    appleModalCancelBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    appleModalConfirmBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appleModalConfirmBtnDisabled: {
      opacity: 0.5,
    },
    appleModalConfirmBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.cardBackground,
    },
    keyboardAvoidingContainer: {
      flex: 1,
      width: '100%',
    },
  });
}