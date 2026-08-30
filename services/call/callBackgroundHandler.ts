import { getNotifee } from '../native/optionalNativeModule';

// ============================================================================
// Notifee background events — Accept / Decline pressed while the app is not
// foregrounded.
//
// WHY THIS FILE EXISTS AT MODULE SCOPE
// ------------------------------------
// Notifee routes an action press to `onForegroundEvent` ONLY while the app is
// foregrounded. Everything else — locked screen, backgrounded, killed — goes to
// `onBackgroundEvent`, which Notifee requires to be registered outside the
// React tree, at import time, because there may be no React tree yet.
//
// Nothing registered it. So on the exact surface the full-screen call
// notification exists for — a locked phone — Decline did nothing at all. And
// because the notification is created `ongoing: true, autoCancel: false`, the
// user could not swipe it away either: a looping, unswipeable notification with
// no way out but force-quitting the app.
//
// Accept must open the app, so it only needs to cancel the notification and let
// the cold-start notification-tap path (useNotificationRouting) surface the call
// from the payload. Decline must work WITHOUT opening the app, so it tells the
// server directly over REST — the socket may not exist in a killed process.
// ============================================================================

let registered = false;

export function registerCallBackgroundHandler(): void {
  if (registered) return;
  const loaded = getNotifee();
  if (!loaded) return;
  const { api: notifee, constants: mod } = loaded;
  if (!notifee?.onBackgroundEvent) return;

  registered = true;

  notifee.onBackgroundEvent(async ({ type, detail }: any) => {
    try {
      if (type !== mod.EventType.ACTION_PRESS) return;
      const id = detail?.pressAction?.id;
      const data = detail?.notification?.data || {};

      // Always take the notification down. It is `ongoing`, so leaving it up
      // means the user cannot dismiss it themselves.
      if (detail?.notification?.id) {
        await notifee.cancelNotification(detail.notification.id).catch(() => {});
      }

      if (id !== 'decline') return;

      // Decline from a locked device. There may be no socket in this process,
      // so this goes over REST — a fire-and-forget best effort. If it fails the
      // caller simply sees the ring time out, which is the pre-existing
      // behaviour rather than a regression.
      const { declineCallApi } = await import('../../networks/realtime/callRest');
      if (data.callId && data.roomId) {
        await declineCallApi(String(data.callId), String(data.roomId), String(data.roomType || 'homeservice'));
      }
    } catch {
      /* a background handler must never throw — it would crash the process */
    }
  });
}
