// ============================================================================
// Doctor <-> patient consultation chat (doctor side).
//
// New: the doctor module previously had no chat at all — the notifications
// empty state promised "patient messages will appear here" but nothing could
// ever produce one.
//
// IDENTITY NOTE: a doctor signs in as a Provider and their token carries the
// Provider _id, while the appointment references a Doctor _id. The server does
// that hop when it resolves the room (src/utils/access.js), so nothing special
// is needed here — the same appointmentId works for both sides.
// ============================================================================

import React, { useCallback, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import ChatThread from '../../../../components/chat/ChatThread';
import { ChatParticipant } from '../../../../models/serviceProviders';

type Params = { appointmentId: string; patientName?: string };

const ACCENT = '#0EA5E9';
const ACCENT_SOFT = '#E0F2FE';

export default function DoctorConsultChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { appointmentId, patientName } = route.params || ({} as Params);

  const [patient, setPatient] = useState<ChatParticipant | null>(null);

  const handleParticipants = useCallback((counterpart: ChatParticipant) => {
    setPatient(counterpart);
  }, []);

  const handleCall = useCallback(
    (counterpart: ChatParticipant | null) => {
      const target = counterpart || patient;
      navigation.navigate('HealthcareConsultCall', {
        appointmentId,
        counterpartName: target?.name || patientName,
        counterpartPhone: target?.phoneNumber,
        counterpartImage: target?.image,
      });
    },
    [navigation, appointmentId, patient, patientName]
  );

  return (
    <ChatThread
      roomId={appointmentId}
      roomType="healthcare"
      accent={ACCENT}
      accentSoft={ACCENT_SOFT}
      fallbackTitle={patientName || 'Patient'}
      onParticipantsLoaded={handleParticipants}
      onCall={handleCall}
    />
  );
}
