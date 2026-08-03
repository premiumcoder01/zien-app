import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { registerDeviceToken } from './authService';

let notificationsInitialized = false;
let listenerSubscription: any = null;

/**
 * Lazy-load expo-notifications safely at runtime
 * Won't crash if native binary doesn't have the module yet
 */
function getNativeNotifications(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications');
    // Verify the native module is actually available by checking a safe property
    if (mod && typeof mod.getPermissionsAsync === 'function') {
      return mod;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

/**
 * Configure foreground notification handler (lazy – called only once)
 */
function initNotificationHandler(): void {
  if (notificationsInitialized) return;
  const Notif = getNativeNotifications();
  if (!Notif) return;
  try {
    Notif.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationsInitialized = true;
  } catch (_e) {
    // native module not ready – silently skip
  }
}

/**
 * Request permission & fetch FCM / device push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const Notif = getNativeNotifications();
    if (!Notif) {
      console.log('[NotificationService] Native notifications module unavailable. Rebuild required.');
      return null;
    }

    initNotificationHandler();

    // Android: create high-priority channel first
    if (Platform.OS === 'android') {
      try {
        await Notif.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notif.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0a2341',
        });
      } catch (_e) { /* ignore */ }

      // Android 13+ (API 33+): POST_NOTIFICATIONS is a runtime permission —
      // expo-notifications' requestPermissionsAsync handles this, but we must
      // always call it even if getPermissionsAsync returns 'undetermined'.
      try {
        const { PermissionsAndroid } = require('react-native');
        if (PermissionsAndroid?.PERMISSIONS?.POST_NOTIFICATIONS) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'Zien needs permission to send you real-time alerts for leads, updates, and activity.',
              buttonPositive: 'Allow',
              buttonNegative: 'Don\'t Allow',
            }
          );
        }
      } catch (_e) { /* ignore – will fallback to expo method below */ }
    }

    console.log('[NotificationService] registerForPushNotificationsAsync started on platform:', Platform.OS);
    const { status: existing } = await Notif.getPermissionsAsync();
    console.log('[NotificationService] Existing permission status:', existing);
    let final = existing;

    if (existing !== 'granted') {
      console.log('[NotificationService] Requesting notification permissions...');
      const { status } = await Notif.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      final = status;
      console.log('[NotificationService] Permission request result:', final);
    }

    if (final !== 'granted') {
      console.log('[NotificationService] Permission denied or not granted. Final status:', final);
      // Even if status is not granted on some Android versions, attempt token fetch as fallback
      if (Platform.OS !== 'android') {
        return null;
      }
    }

    // Fetch native device push token (FCM on Android, APNs-backed on iOS)
    let token = '';

    // Method 1: Try @react-native-firebase/messaging
    try {
      console.log('[NotificationService] Attempting Method 1: @react-native-firebase/messaging');
      const messaging = require('@react-native-firebase/messaging').default;
      if (messaging && typeof messaging().getToken === 'function') {
        token = await messaging().getToken();
        if (token) {
          console.log('[NotificationService] SUCCESS: FCM token obtained via @react-native-firebase/messaging:', token);
          return token;
        }
      }
    } catch (fcmErr: any) {
      console.log('[NotificationService] Method 1 failed:', fcmErr?.message || fcmErr);
    }

    // Method 2: Try Notif.getDevicePushTokenAsync()
    try {
      console.log('[NotificationService] Attempting Method 2: Notif.getDevicePushTokenAsync()');
      const t = await Notif.getDevicePushTokenAsync();
      console.log('[NotificationService] getDevicePushTokenAsync raw response:', JSON.stringify(t));
      if (t?.data) {
        token = typeof t.data === 'string' ? t.data : (t.data.token || JSON.stringify(t.data));
        console.log('[NotificationService] SUCCESS: Device push token obtained via getDevicePushTokenAsync:', token);
        return token;
      }
    } catch (e1: any) {
      console.log('[NotificationService] Method 2 failed:', e1?.message || e1);
    }

    // Method 3: Fallback to Notif.getExpoPushTokenAsync({ projectId })
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || 'ed74813d-5b63-41ce-a0d7-d176593d86c1';
      console.log('[NotificationService] Attempting Method 3: getExpoPushTokenAsync with projectId:', projectId);
      const t = await Notif.getExpoPushTokenAsync({ projectId });
      console.log('[NotificationService] getExpoPushTokenAsync raw response:', JSON.stringify(t));
      token = t?.data ?? '';
      if (token) {
        console.log('[NotificationService] SUCCESS: Expo push token obtained via getExpoPushTokenAsync:', token);
        return token;
      }
    } catch (e2: any) {
      console.log('[NotificationService] Method 3 failed:', e2?.message || e2);
    }

    if (token) {
      console.log('[NotificationService] final device_token obtained:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.log('[NotificationService] registerForPushNotificationsAsync error:', error);
    return null;
  }
}

/**
 * Sync device_token with backend after login / register / session restore
 */
export async function syncDeviceTokenWithBackend(accessToken: string): Promise<void> {
  if (!accessToken) return;
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      console.log(`[NotificationService] Sending device_token to backend (${platform})`);
      await registerDeviceToken(accessToken, { device_token: token, platform });
    }
  } catch (e) {
    console.log('[NotificationService] syncDeviceTokenWithBackend error:', e);
  }
}

/**
 * Setup deep-linking listener for notification taps.
 * Safe to call before native module is ready – returns a no-op cleanup if unavailable.
 */
export function setupNotificationListeners(): () => void {
  const Notif = getNativeNotifications();
  if (!Notif || typeof Notif.addNotificationResponseReceivedListener !== 'function') {
    return () => {};
  }

  initNotificationHandler();

  try {
    if (listenerSubscription) {
      try { listenerSubscription.remove(); } catch (_e) {}
    }

    listenerSubscription = Notif.addNotificationResponseReceivedListener((response: any) => {
      try {
        const data = response?.notification?.request?.content?.data;
        console.log('[NotificationService] Notification tapped:', data);
        const target: string | undefined = data?.route ?? data?.url ?? data?.path;
        if (target) {
          setTimeout(() => { router.push(target as any); }, 200);
        } else {
          router.push('/(main)/notifications');
        }
      } catch (err) {
        console.log('[NotificationService] Tap handler error:', err);
      }
    });

    return () => {
      try { listenerSubscription?.remove(); listenerSubscription = null; } catch (_e) {}
    };
  } catch (e) {
    console.log('[NotificationService] setupNotificationListeners error:', e);
    return () => {};
  }
}
