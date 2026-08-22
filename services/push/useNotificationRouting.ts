// ============================================================================
// Turns a tapped notification into a screen.
//
// Handles both entry points:
//   - the app was already running (addNotificationResponseReceivedListener)
//   - the app was launched BY the tap (getLastNotificationResponseAsync)
// Missing the second one is why notification taps commonly appear to "do
// nothing" from a cold start.
//
// Which chat screen to open depends on the vertical AND on which side of the
// conversation this device is signed in as — the same roomId maps to a
// different screen for the customer and the provider.
// ============================================================================

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { navigate } from '../../navigation-maps/navigationRef';
import { KeyForStorage, retrieveData } from '../../utils/storage_utils/storageUtils';
import { routeFromNotification, NotificationRoute } from './pushNotifications';
import { useIncomingCall } from '../../components/call/IncomingCallProvider';

async function openRoute(route: NotificationRoute, presentCall: (c: any) => void) {
  const userType = await retrieveData(KeyForStorage.userType);
  const isProvider = userType === 'provider';

  if (route.type === 'call') {
    // Re-present the ring. If the socket already delivered it, the provider
    // dedupes on callId and this is a no-op.
    if (route.callId) {
      presentCall({
        callId: route.callId,
        roomId: route.roomId,
        roomType: route.roomType,
        callerName: route.callerName,
      });
    }
    return;
  }

  // type === 'message'
  if (route.roomType === 'healthcare') {
    navigate(isProvider ? 'DoctorConsultChat' : 'HealthcareConsultChat', {
      appointmentId: route.roomId,
    });
    return;
  }
  navigate(isProvider ? 'ProviderJobChat' : 'ProviderChatScreen', {
    bookingId: route.roomId,
  });
}

export function useNotificationRouting() {
  const { present } = useIncomingCall();
  const handledColdStart = useRef(false);

  useEffect(() => {
    // Warm path: user tapped while the app was running or backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeFromNotification(response.notification.request.content.data);
      if (route) openRoute(route, present);
    });

    // Cold path: the tap is what launched the app.
    (async () => {
      if (handledColdStart.current) return;
      handledColdStart.current = true;
      const last = await Notifications.getLastNotificationResponseAsync();
      if (!last) return;
      const route = routeFromNotification(last.notification.request.content.data);
      if (route) {
        // Let the navigator finish mounting before pushing a screen onto it.
        setTimeout(() => openRoute(route, present), 600);
      }
    })();

    return () => sub.remove();
  }, [present]);
}
