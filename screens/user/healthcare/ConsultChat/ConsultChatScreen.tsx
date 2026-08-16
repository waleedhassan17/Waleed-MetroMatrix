// ============================================================================
// Patient <-> doctor consultation chat (healthcare user side).
//
// New: the healthcare module previously had no networked chat at all. The only
// thing resembling one was InCallChatScreen, a local-Redux overlay inside the
// video call whose messages never left the device and which the doctor could
// never see.
//
// The room here is the APPOINTMENT, so roomType is 'healthcare' and the room id
// is the appointmentId. Everything else is identical to home-service chat —
// same events, same server code path.
// ============================================================================

import React, { useCallback, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import ChatThread from '../../../../components/chat/ChatThread';
import { ChatParticipant } from '../../../../models/serviceProviders';

type Params = { appointmentId: string; doctorName?: string };

const ACCENT = '#2563EB';
const ACCENT_SOFT = '#DBEAFE';

export default function ConsultChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { appointmentId, doctorName } = route.params || ({} as Params);

  const [doctor, setDoctor] = useState<ChatParticipant | null>(null);

  const handleParticipants = useCallback((counterpart: ChatParticipant) => {
    setDoctor(counterpart);
  }, []);

  const handleCall = useCallback(
    (counterpart: ChatParticipant | null) => {
      const target = counterpart || doctor;
      navigation.navigate('HealthcareConsultCall', {
        appointmentId,
        counterpartName: target?.name || doctorName,
        counterpartPhone: target?.phoneNumber,
        counterpartImage: target?.image,
      });
    },
    [navigation, appointmentId, doctor, doctorName]
  );

  return (
    <ChatThread
      roomId={appointmentId}
      roomType="healthcare"
      accent={ACCENT}
      accentSoft={ACCENT_SOFT}
      fallbackTitle={doctorName || 'Doctor'}
      onParticipantsLoaded={handleParticipants}
      onCall={handleCall}
    />
  );
}
