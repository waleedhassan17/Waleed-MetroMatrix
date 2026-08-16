// ============================================================================
// Provider-side chat (home service).
//
// Now a thin wrapper over the shared ChatThread — this screen's original
// implementation was the model the shared component was extracted from, so all
// four modules (home-service user/provider, patient/doctor) behave identically.
// ============================================================================

import React, { useCallback, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import ChatThread from '../../../../components/chat/ChatThread';
import { ChatParticipant } from '../../../../models/serviceProviders';

type Params = {
  bookingId: string;
  customerName?: string;
};

export default function ProviderChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId, customerName } = route.params || ({} as Params);

  const [customer, setCustomer] = useState<ChatParticipant | null>(null);

  const handleParticipants = useCallback((counterpart: ChatParticipant) => {
    setCustomer(counterpart);
  }, []);

  const handleCall = useCallback(
    (counterpart: ChatParticipant | null) => {
      const target = counterpart || customer;
      navigation.navigate('ProviderCallScreen', {
        bookingId,
        customerName: target?.name || customerName,
        // Previously omitted, which left the call screen's Dial button
        // permanently disabled — there was no number to hand the dialer.
        customerPhone: target?.phoneNumber,
        customerImage: target?.image,
      });
    },
    [navigation, bookingId, customer, customerName]
  );

  return (
    <ChatThread
      roomId={bookingId}
      roomType="homeservice"
      accent="#10B981"
      accentSoft="#D1FAE5"
      fallbackTitle={customerName || 'Customer'}
      onParticipantsLoaded={handleParticipants}
      onCall={handleCall}
    />
  );
}
