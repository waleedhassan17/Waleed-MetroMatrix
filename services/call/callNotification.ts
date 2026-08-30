// ============================================================================
// The lock-screen / background incoming-call notification.
//
// WHY THIS EXISTS SEPARATELY FROM IncomingCallProvider
// ----------------------------------------------------
// That component renders a React Modal, which only exists while the app is
// foregrounded. A phone in a pocket has no React tree on screen, so a ring
// delivered over the socket to a backgrounded app produced nothing a person
// could see or act on. This is the surface for that case: a real Android
// full-screen-intent notification with Accept and Decline, which the OS can
// raise over the lock screen.
//
// WHAT THIS DOES *NOT* SOLVE
// --------------------------
// A fully KILLED app has no JS running to call this. That case is covered by
// the push notification itself landing on the `calls_v2` channel, which carries
// the ringtone and MAX importance — a loud heads-up notification, but not a
// full-screen call UI. Getting a true full-screen intent from a killed process
// requires a data-only FCM message and a native background handler, i.e.
// replacing Expo's push transport with @react-native-firebase/messaging. That
// is a transport change, not a UI change, and is deliberately not attempted
// here. See CHAT_CALL_CHANGELOG.md.
//
// Everything is best-effort: notifee is loaded lazily so a build without the
// native module falls back to the in-app sheet instead of failing to start.
// ============================================================================

import { Platform } from 'react-native';
import { CALLS_CHANNEL } from '../push/pushNotifications';
import { getNotifee } from '../native/optionalNativeModule';

const NOTIFICATION_ID = 'incoming-call';

// Notifee throws "Notifee native module not found." from a GETTER on first API
// ACCESS, not at import — so a try/catch around require() catches nothing and
// the first real call throws uncaught. getNotifee() checks
// NativeModules.NotifeeApiModule (the exact value that getter reads) before
// touching the API at all. See optionalNativeModule.ts.

export interface CallNotificationInput {
  callId: string;
  roomId: string;
  roomType: string;
  callerName?: string;
}

/**
 * Raise the incoming-call notification. Single fixed id, so a second ring
 * replaces the first rather than stacking two ringing calls.
 */
export async function showIncomingCallNotification(call: CallNotificationInput): Promise<void> {
  if (Platform.OS !== 'android') return;
  const loaded = getNotifee();
  // No Notifee in this build: the in-app modal remains the incoming-call
  // surface. A backgrounded device loses the lock-screen UI, which is a real
  // degradation — but far better than an uncaught throw on every call.
  if (!loaded) return;
  const { api: notifee, constants: mod } = loaded;

  try {
    // Notifee owns its own channel registry, separate from expo-notifications'.
    // Same id and same sound, so the two agree about what a call sounds like.
    await notifee.createChannel({
      id: CALLS_CHANNEL,
      name: 'Incoming calls',
      importance: mod.AndroidImportance.HIGH,
      sound: 'ringtone',
      vibration: true,
      vibrationPattern: [300, 1000, 300, 1000],
      bypassDnd: true,
      visibility: mod.AndroidVisibility.PUBLIC,
    });

    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Incoming call',
      body: `${call.callerName || 'Someone'} is calling you`,
      data: {
        type: 'call',
        callId: call.callId,
        roomId: call.roomId,
        roomType: call.roomType,
        callerName: call.callerName || '',
      },
      android: {
        channelId: CALLS_CHANNEL,
        category: mod.AndroidCategory.CALL,
        importance: mod.AndroidImportance.HIGH,
        // CALL ranks above every other notification, which is the point.
        // Without it a ring queues behind whatever else arrived.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...( { asForegroundService: false } as any ),
        // Keeps it on screen until acted on — a call the user can swipe away by
        // accident is worse than no notification.
        ongoing: true,
        autoCancel: false,
        loopSound: true,
        // The lock-screen UI. Requires USE_FULL_SCREEN_INTENT (app.json).
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'default', launchActivity: 'default' },
        actions: [
          { title: 'Decline', pressAction: { id: 'decline' } },
          { title: 'Accept', pressAction: { id: 'accept', launchActivity: 'default' } },
        ],
        timestamp: Date.now(),
        showTimestamp: true,
      },
    });
  } catch {
    /* the in-app sheet remains the fallback */
  }
}

/**
 * Take the call notification down.
 *
 * MUST be called on every terminal transition. `ongoing: true` means the user
 * cannot dismiss it themselves, so a leaked notification is a permanently
 * ringing phone with no way to stop it.
 */
export async function dismissIncomingCallNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const notifee = getNotifee()?.api;
  if (!notifee) return;
  try {
    await notifee.cancelNotification(NOTIFICATION_ID);
  } catch {
    /* already gone */
  }
}
