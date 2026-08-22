// ============================================================================
// Expo push registration + routing.
//
// The push token is registered with the REALTIME service (which owns chat and
// calling and is what actually sends the notifications), not the main API.
//
// REQUIRES AN EAS BUILD. Expo Go cannot obtain a push token for a project it
// does not own, so registration is skipped there rather than throwing — the app
// still runs, calls just will not wake it from the background.
//
// Two Android channels, because a chat message must not arrive with the same
// urgency as a ringing phone:
//   calls    — max importance, long vibration, bypasses Do Not Disturb where allowed
//   messages — default importance
// The server picks the channel per notification (see src/utils/push.js).
// ============================================================================

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  registerPushToken,
  unregisterPushToken,
} from '../../networks/realtime/realtimeClient';
import { KeyForStorage, retrieveData, saveData } from '../../utils/storage_utils/storageUtils';
import { isSocketConnected } from '../socket/socketClient';

export const CALLS_CHANNEL = 'calls';
export const MESSAGES_CHANNEL = 'messages';

/**
 * Foreground presentation policy. (Only consulted while the app is in the
 * foreground — a backgrounded or killed app is handled by the OS channel.)
 *
 * A call push is normally redundant: the socket delivers `call_ring` and
 * IncomingCallProvider throws up a full-screen sheet, so a banner on top of it
 * is noise. But that is only true WHILE THE SOCKET IS ACTUALLY CONNECTED.
 *
 * Suppressing unconditionally meant that an app which was foregrounded but
 * mid-reconnect — just resumed, weak signal, token refresh in flight — showed
 * nothing at all: no banner, because we suppressed it, and no sheet, because
 * no socket delivered the event. The call was silently dropped, which is the
 * worst possible failure for a ringing phone.
 *
 * So the push is now suppressed only when the sheet is genuinely going to
 * appear. When the socket is down the banner is the only signal there is.
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = notification.request.content.data?.type;
      const isCall = type === 'call';
      const suppress = isCall && isSocketConnected();
      return {
        shouldShowAlert: !suppress,
        shouldPlaySound: !suppress,
        shouldSetBadge: false,
        shouldShowBanner: !suppress,
        shouldShowList: true,
      };
    },
  });
}

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CALLS_CHANNEL, {
    name: 'Calls',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 700, 700, 700],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    enableVibrate: true,
    bypassDnd: false,
  });
  await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    sound: 'default',
  });
}

/**
 * Request permission, obtain the Expo token, and register it with the realtime
 * service. Safe to call on every login — the server $addToSets.
 *
 * @returns the token, or null when unavailable (simulator, Expo Go, denied).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    await ensureAndroidChannels();

    // Push tokens require real hardware.
    if (!Device.isDevice) {
      console.log('[push] skipped — not a physical device');
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      console.log('[push] permission not granted');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) {
      console.log('[push] no EAS projectId — cannot mint a token');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    const res = await registerPushToken(token);
    if (res.success) {
      await saveData(KeyForStorage.fcmToken, token);
      console.log('[push] registered with realtime service');
    } else {
      console.log('[push] registration rejected:', res.message);
    }
    return token;
  } catch (e: any) {
    // Never let push break sign-in.
    console.log('[push] registration failed:', e?.message);
    return null;
  }
}

/** Call on logout so a shared device stops receiving the old account's calls. */
export async function unregisterPushOnLogout(): Promise<void> {
  try {
    const token = await retrieveData(KeyForStorage.fcmToken);
    if (typeof token === 'string' && token) await unregisterPushToken(token);
  } catch {
    /* best effort */
  }
}

export interface NotificationRoute {
  type: 'call' | 'message';
  roomId: string;
  roomType: 'homeservice' | 'healthcare';
  callId?: string;
  callerName?: string;
}

/** Normalize a notification payload into something navigable, or null. */
export function routeFromNotification(data: any): NotificationRoute | null {
  if (!data?.type || !data?.roomId) return null;
  if (data.type !== 'call' && data.type !== 'message') return null;
  return {
    type: data.type,
    roomId: String(data.roomId),
    roomType: data.roomType === 'healthcare' ? 'healthcare' : 'homeservice',
    callId: data.callId,
    callerName: data.callerName,
  };
}
