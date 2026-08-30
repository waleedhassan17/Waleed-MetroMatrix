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

// MUST MATCH metromatrix-realtime/src/utils/pushChannels.js EXACTLY.
//
// `calls_v2`, not `calls`, because an Android notification channel is IMMUTABLE
// once created: its sound, importance and vibration are fixed at creation and
// no amount of code can change them afterwards. Every install from a previous
// build has `calls` frozen at the system default — a one-second blip. A new
// channel id is the only way to deliver a real ringtone to those devices.
//
// The server's constant must move in the same release. Ship one without the
// other and Android routes call pushes to the manifest default (`messages`),
// so calls arrive as quiet chat notifications — worse than before.
export const CALLS_CHANNEL = 'calls_v2';
export const MESSAGES_CHANNEL = 'messages';

/** Bundled by the expo-notifications plugin `sounds` array into res/raw. */
const RINGTONE_SOUND = 'ringtone.wav';

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

  // NOTE: the CALLS channel is created by Notifee, not here.
  //
  // Both libraries were creating `calls_v2`, and Android channel creation is
  // FIRST-WRITE-WINS: whichever ran first froze the channel's importance,
  // vibration and audio attributes, and the loser's settings were silently
  // discarded with no error. Since Notifee owns the full-screen incoming-call
  // notification and the looping sound, it owns the channel too — see
  // services/call/callNotification.ts. One writer, no race.
  //
  // Messages stay here, because nothing else creates them.
  await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250],
    // Without this, message content is hidden on the lock screen and the
    // notification is useless until you unlock.
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  });

  // Accept / Decline buttons on the CALL push. The server already sends
  // `categoryId: 'incoming_call'` (callHandler.js), but the category was never
  // registered anywhere, so those actions never rendered.
  await Notifications.setNotificationCategoryAsync('incoming_call', [
    {
      identifier: 'accept',
      buttonTitle: 'Accept',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Decline',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]).catch(() => {
    /* categories are a nicety; never block registration on them */
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
  /**
   * 'call'        — a live ring; opens the incoming-call surface (needs callId)
   * 'missed_call' — after the fact; there is nothing to answer, so it opens the
   *                 conversation instead, where the user can call back
   * 'message'     — opens the thread
   */
  type: 'call' | 'missed_call' | 'message';
  roomId: string;
  roomType: 'homeservice' | 'healthcare';
  callId?: string;
  callerName?: string;
}

const ROUTABLE_TYPES = ['call', 'missed_call', 'message'];

/** Normalize a notification payload into something navigable, or null. */
export function routeFromNotification(data: any): NotificationRoute | null {
  if (!data?.type || !data?.roomId) return null;
  if (!ROUTABLE_TYPES.includes(data.type)) return null;
  return {
    type: data.type,
    roomId: String(data.roomId),
    roomType: data.roomType === 'healthcare' ? 'healthcare' : 'homeservice',
    callId: data.callId,
    callerName: data.callerName,
  };
}
