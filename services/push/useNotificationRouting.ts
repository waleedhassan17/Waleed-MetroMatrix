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
import { useDispatch } from 'react-redux';
import { navigate } from '../../navigation-maps/navigationRef';
import { KeyForStorage, retrieveData } from '../../utils/storage_utils/storageUtils';
import { routeFromNotification, NotificationRoute } from './pushNotifications';
import { useIncomingCall } from '../../components/call/IncomingCallProvider';
import { fetchJobDetailData } from '../../screens/providers/homeservice/jobdetail-screen/jobDetailSlice';
import { setPaymentRequestData } from '../../screens/providers/homeservice/payment-screen/paymentRequestSlice';
import { initializeProviderPayment } from '../../networks/serviceProviders/paymentNetwork';

/**
 * A home-service job push. The customer lands on the booking (or straight on
 * the payment screen when they are being asked to pay); the provider on the
 * job — loaded fresh, because the job screen renders the job it is handed —
 * or on the payment screen when the push is about money.
 */
async function openBooking(route: NotificationRoute, isProvider: boolean, dispatch: any) {
  const bookingId = route.bookingId || route.roomId;
  if (!bookingId) return;

  if (!isProvider) {
    if (route.pushType === 'payment_requested') {
      navigate('PaymentScreen', { bookingId });
    } else {
      navigate('BookingDetail', { bookingId });
    }
    return;
  }

  if (route.pushType === 'payment_update' || route.pushType === 'payment_received') {
    const res = await initializeProviderPayment(bookingId);
    if (res.success && res.data) {
      dispatch(
        setPaymentRequestData({
          jobId: bookingId,
          serviceType: res.data.serviceType,
          customerName: res.data.customerName,
          serviceCharge: res.data.amount,
        })
      );
      navigate('PaymentRequest');
      return;
    }
  }

  try {
    const job = await dispatch(fetchJobDetailData(bookingId)).unwrap();
    navigate('JobDetail', { job });
  } catch {
    // The job could not be loaded (network, or it is no longer this
    // provider's). The jobs list is the honest fallback.
    navigate('HomeServiceProviderDashboard', { screen: 'Jobs' });
  }
}

async function openRoute(route: NotificationRoute, presentCall: (c: any) => void, dispatch: any) {
  const userType = await retrieveData(KeyForStorage.userType);
  const isProvider = userType === 'provider';

  if (route.type === 'booking') {
    await openBooking(route, isProvider, dispatch);
    return;
  }

  if (route.type === 'appointment') {
    // A doctor opens the appointment itself — a new request is approved from
    // there. Tapping one of these used to open nothing.
    if (isProvider && route.appointmentId) {
      navigate('DoctorStack', {
        screen: 'DoctorAppointmentDetail',
        params: { appointmentId: route.appointmentId },
      });
    }
    return;
  }

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

  // 'missed_call' and 'message' both land on the conversation. A missed call
  // has nothing left to answer — the ring is over — so dropping the user into
  // an incoming-call screen would be a dead end. The thread is where they can
  // see who called and call back.
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
  const dispatch = useDispatch();
  const handledColdStart = useRef(false);

  useEffect(() => {
    // Warm path: user tapped while the app was running or backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeFromNotification(response.notification.request.content.data);
      if (route) openRoute(route, present, dispatch);
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
        setTimeout(() => openRoute(route, present, dispatch), 600);
      }
    })();

    return () => sub.remove();
  }, [present, dispatch]);
}
