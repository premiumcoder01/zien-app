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

    // Check & request permission via expo-notifications
    // Always call requestPermissionsAsync when not granted —
    // on iOS this shows the system popup; on Android it double-confirms.
    const { status: existing } = await Notif.getPermissionsAsync();
    let final = existing;

    if (existing !== 'granted') {
      // iOS requires explicit provisionalStatus options
      const { status } = await Notif.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      final = status;
    }

    if (final !== 'granted') {
      console.log('[NotificationService] Permission denied or not granted:', final);
      return null;
    }

    // Fetch native device push token (FCM on Android, APNs-backed on iOS)
    let token = '';
    try {
      const t = await Notif.getDevicePushTokenAsync();
      token = t?.data ?? '';
    } catch (_e) {
      try {
        const t = await Notif.getExpoPushTokenAsync();
        token = t?.data ?? '';
      } catch (_e2) { /* ignore */ }
    }

    if (token) {
      console.log('[NotificationService] device_token obtained:', token);
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
