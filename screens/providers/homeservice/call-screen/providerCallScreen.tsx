// ============================================================================
// Provider-side call screen (home service) — SIGNALLING ONLY.
//
// ring / accept / decline / end travel over the socket; the actual audio is
// handed to the phone's native dialer. There is no in-app voice. Now shares
// OutgoingCallView with every other module.
//
// What changed: this screen used to emit call_ring / call_accept / call_end
// carrying only a bookingId, and listened for NOTHING in return — nowhere in
// the app listened for those events either, so "Ringing…" never resolved and
// the End button blocked for five seconds waiting on an ack the server never
// sent. Call state is now driven by the server's replies (accept / decline /
// end / busy / missed), and `customerPhone` is supplied by the chat screen so
// the dialer handoff actually has a number.
// ============================================================================

import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import OutgoingCallView from '../../../../components/call/OutgoingCallView';

type Params = {
  bookingId: string;
  customerName?: string;
  customerPhone?: string;
  customerImage?: string;
};

export default function ProviderCallScreen() {
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId, customerName, customerPhone, customerImage } =
    route.params || ({} as Params);

  return (
    <OutgoingCallView
      roomId={bookingId}
      roomType="homeservice"
      counterpartName={customerName}
      counterpartPhone={customerPhone}
      counterpartImage={customerImage}
      accent="#10B981"
    />
  );
}
