// ============================================================================
// Healthcare voice call — used by BOTH the patient and the doctor.
//
// This is the socket-signalled + native-dialer voice call. It sits ALONGSIDE
// the existing Jitsi video consultation (VideoCallScreen /
// DoctorVideoConsultationScreen), which is untouched:
//
//   Video call  → scheduled telemedicine consult, in-app, Jitsi in a WebView
//   Voice call  → quick "can you talk now", over the phone line
//
// The room is the appointment, so a call is only possible between the actual
// patient and the actual doctor on that appointment.
// ============================================================================

import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import OutgoingCallView from '../../../../components/call/OutgoingCallView';

type Params = {
  appointmentId: string;
  counterpartName?: string;
  counterpartPhone?: string;
  counterpartImage?: string;
};

export default function ConsultCallScreen() {
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { appointmentId, counterpartName, counterpartPhone, counterpartImage } =
    route.params || ({} as Params);

  return (
    <OutgoingCallView
      roomId={appointmentId}
      roomType="healthcare"
      counterpartName={counterpartName}
      counterpartPhone={counterpartPhone}
      counterpartImage={counterpartImage}
      accent="#2563EB"
    />
  );
}
