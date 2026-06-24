import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://staging-api.zien.ai/api';

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  location?: string;
  notes?: string;
  calendarId: string;
  calendarTitle?: string;
  source: 'google' | 'outlook' | 'apple' | 'local';
  color?: string;
  meetingLink?: string;
  allDay?: boolean;
}

export interface LocalSyncConfig {
  enabled: boolean;
  selectedCalendarIds: string[];
}

export interface BackendCalendarStatus {
  connected?: boolean;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  appleConnected?: boolean;
  googleExpiresAt?: string;
  microsoftExpiresAt?: string;
}

export interface BackendTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  owner: string;
  notes?: string;
  webViewLink?: string;
}

const LOCAL_EVENTS_KEY = 'zien_local_events';
const SYNC_CONFIG_KEY = 'zien_calendar_sync_config';

// Extract meeting links like Zoom, Google Meet, Teams, etc.
export const extractMeetingLink = (notes?: string | null, location?: string | null): string | undefined => {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const findLink = (text?: string | null) => {
    if (!text) return undefined;
    const matches = text.match(urlRegex);
    if (matches) {
      const meetingMatch = matches.find(url =>
        url.includes('zoom.us') ||
        url.includes('teams.microsoft.com') ||
        url.includes('meet.google.com') ||
        url.includes('webex.com') ||
        url.includes('teams.live.com')
      );
      return meetingMatch || matches[0];
    }
    return undefined;
  };
  return findLink(location) || findLink(notes);
};

// Classify calendar provider based on properties
export const getCalendarSource = (cal: Calendar.Calendar): 'google' | 'outlook' | 'apple' | 'local' => {
  const name = (cal.source?.name || '').toLowerCase();
  const title = (cal.title || '').toLowerCase();
  const type = (cal.source?.type || '').toLowerCase();

  if (name.includes('gmail') || name.includes('google') || title.includes('google') || name.includes('@gmail.com')) {
    return 'google';
  }
  if (name.includes('outlook') || name.includes('microsoft') || name.includes('office365') || name.includes('exchange') || name.includes('hotmail')) {
    return 'outlook';
  }
  if (name.includes('icloud') || name.includes('apple') || type.includes('caldav') || name === 'default') {
    return 'apple';
  }
  return 'local';
};

// Request permissions for Calendar on iOS & Android
export const requestCalendarPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  
  const { status: calendarStatus } = await Calendar.requestCalendarPermissionsAsync();
  
  // Reminders permission is also recommended on iOS for full access
  let remindersStatus = 'granted';
  if (Platform.OS === 'ios') {
    const res = await Calendar.requestRemindersPermissionsAsync();
    remindersStatus = res.status;
  }
  
  return calendarStatus === 'granted' && remindersStatus === 'granted';
};

// Fetch calendars on device
export const getDeviceCalendars = async (): Promise<Calendar.Calendar[]> => {
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) return [];
  
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return calendars;
  } catch (error) {
    console.error('Error fetching device calendars:', error);
    return [];
  }
};

// Fetch events from selected native calendars in a date window
export const getDeviceEvents = async (
  calendarIds: string[],
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  if (calendarIds.length === 0) return [];
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) return [];

  try {
    const rawEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calMap = new Map(calendars.map(c => [c.id, c]));

    return rawEvents.map(evt => {
      const parentCal = calMap.get(evt.calendarId);
      const source = parentCal ? getCalendarSource(parentCal) : 'local';
      
      return {
        id: evt.id,
        title: evt.title || 'Untitled Event',
        startDate: new Date(evt.startDate).toISOString(),
        endDate: new Date(evt.endDate).toISOString(),
        location: evt.location ?? undefined,
        notes: evt.notes ?? undefined,
        calendarId: evt.calendarId,
        calendarTitle: parentCal?.title,
        source,
        color: parentCal?.color || '#0E7C7B',
        meetingLink: extractMeetingLink(evt.notes, evt.location),
      };
    });
  } catch (error) {
    console.error('Error fetching device calendar events:', error);
    return [];
  }
};

// Save a new event locally in Zien AsyncStorage
export const saveLocalEvent = async (event: Omit<CalendarEvent, 'id' | 'source'>): Promise<CalendarEvent> => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_EVENTS_KEY);
    const list: CalendarEvent[] = stored ? JSON.parse(stored) : [];
    
    const newEvent: CalendarEvent = {
      ...event,
      id: `zien-local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: 'local',
      color: '#0E7C7B',
      meetingLink: extractMeetingLink(event.notes, event.location),
    };
    
    list.push(newEvent);
    await AsyncStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(list));
    return newEvent;
  } catch (error) {
    console.error('Error saving local event:', error);
    throw error;
  }
};

// Get all stored local events
export const getLocalEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting local events:', error);
    return [];
  }
};

// Save event to external selected native device calendars
export const saveEventToDeviceCalendar = async (
  calendarId: string,
  event: {
    title: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
    location?: string;
  }
): Promise<string> => {
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) throw new Error('Calendar permission not granted');

  try {
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      notes: event.notes,
      location: event.location,
      timeZone: 'UTC', // Default to UTC timezone
    });
    return eventId;
  } catch (error) {
    console.error('Failed to create event in native calendar:', error);
    throw error;
  }
};

// Save Sync Configuration (which calendars are enabled)
export const saveSyncConfig = async (config: LocalSyncConfig): Promise<void> => {
  try {
    await AsyncStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving sync configuration:', error);
  }
};

// Get Sync Configuration
export const getSyncConfig = async (): Promise<LocalSyncConfig> => {
  try {
    const stored = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
    return stored ? JSON.parse(stored) : { enabled: false, selectedCalendarIds: [] };
  } catch (error) {
    console.error('Error getting sync configuration:', error);
    return { enabled: false, selectedCalendarIds: [] };
  }
};

// ── Backend API Calendar Integrations ──

export const getBackendCalendarStatus = async (token: string): Promise<BackendCalendarStatus> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch calendar status');
  }
  return json.data;
};

export const getGoogleCalendarAuthUrl = async (token: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/google/auth-url`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch auth url');
  }
  return json.url;
};

export const disconnectBackendCalendar = async (token: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/disconnect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to disconnect calendar');
  }
  return json.ok || json.success || true;
};

export const getBackendCalendarEvents = async (token: string): Promise<CalendarEvent[]> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/events`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch calendar events');
  }
  
  const rawEvents = json.data || [];
  return rawEvents.map((evt: any) => {
    const startDate = evt.start?.dateTime || evt.start?.date || new Date().toISOString();
    const endDate = evt.end?.dateTime || evt.end?.date || new Date().toISOString();
    const allDay = !evt.start?.dateTime;
    const source = evt.source || 'google';
    const calendarTitle = evt.calendarTitle || 
      (source === 'google' ? 'Google Calendar' : source === 'outlook' || source === 'microsoft' ? 'Outlook Calendar' : 'iCloud Calendar');
    const color = evt.color || 
      (source === 'google' ? '#EA4335' : source === 'outlook' || source === 'microsoft' ? '#0078D4' : '#5856D6');
    
    return {
      id: evt.id,
      title: evt.summary || 'Untitled Event',
      startDate,
      endDate,
      location: evt.location || undefined,
      notes: evt.description || undefined,
      calendarId: source,
      calendarTitle,
      source: source === 'microsoft' ? 'outlook' : (source === 'apple' || source === 'icloud' ? 'apple' : 'google'),
      color,
      meetingLink: evt.hangoutLink || evt.meetingLink || undefined,
      allDay,
    };
  });
};

export const getBackendCalendarTasks = async (token: string): Promise<BackendTask[]> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/tasks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch calendar tasks');
  }
  
  const rawTasks = json.data || [];
  return rawTasks.map((t: any) => {
    const status = t.status === 'completed' ? 'completed' : 'pending';
    
    let dueDate = 'No due date';
    if (t.due) {
      const d = new Date(t.due);
      dueDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    return {
      id: t.id,
      title: t.title || 'Untitled Task',
      dueDate,
      priority: 'medium',
      status,
      owner: 'Google',
      notes: t.notes || undefined,
      webViewLink: t.webViewLink || undefined,
    };
  });
};

export const createBackendCalendarEvent = async (
  token: string,
  event: { title: string; description?: string; location?: string; start: string; end: string }
): Promise<any> => {
  const body = {
    title: event.title,
    description: event.description,
    location: event.location,
    start: event.start,
    end: event.end,
  };

  const response = await fetch(`${API_BASE_URL}/solo/calendar/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to create calendar event');
  }
  return json.data;
};

export const createBackendCalendarTask = async (
  token: string,
  task: { title: string; notes?: string; due?: string }
): Promise<any> => {
  const body = {
    title: task.title,
    notes: task.notes,
    due: task.due,
  };

  const response = await fetch(`${API_BASE_URL}/solo/calendar/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to create calendar task');
  }
  return json.data;
};

export const deleteBackendCalendarEvent = async (token: string, eventId: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to delete calendar event');
  }
  return json.ok || json.success || true;
};

export const getMicrosoftCalendarAuthUrl = async (token: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/microsoft/auth-url`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch Microsoft Outlook auth url');
  }
  return json.url;
};

export const connectAppleCalendar = async (
  token: string,
  appleId: string,
  appSpecificPassword: string
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/calendar/apple/connect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appleId,
      appSpecificPassword,
    }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to connect Apple iCloud calendar');
  }
  return json;
};
