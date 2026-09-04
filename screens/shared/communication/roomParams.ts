// ============================================================================
// One param contract for every chat/call entry point in the app.
//
// Chat and calling are ONE feature, centralised the way the wallet is: a
// single Chat screen and a single Call screen serve home services and
// healthcare, customer side and provider side. Only the room differs.
//
//   roomType 'homeservice' → roomId is an HSBooking  _id (customer <-> provider)
//   roomType 'healthcare'  → roomId is an Appointment _id (patient  <-> doctor)
//
// Before this, six near-identical wrapper screens each re-declared the same
// state, the same participant callback and the same navigate-to-call handler,
// differing only in which param name carried the room id, an accent colour and
// a fallback title. Fixes had to be made six times and, in practice, were not.
//
// LEGACY PARAM NAMES are accepted here on purpose. Call sites across the app
// pass `bookingId` (home services) or `appointmentId` (healthcare), and the
// counterpart's name arrives as customerName / doctorName / patientName /
// counterpartName depending on which screen navigated. Normalising in one
// place means those call sites did not all have to change at once.
// ============================================================================

import type { RoomType } from '../../../services/socket/socketClient';
import { MODULE_PALETTES } from '../../../theme/palettes';

export type RoomParams = {
  // Room id — canonical, then the vertical-specific aliases.
  roomId?: string;
  bookingId?: string;
  appointmentId?: string;

  roomType?: RoomType;

  // Answering rather than placing: set by the incoming-call sheet and by a
  // call push tap. `autoAccept` means the user already pressed Accept, so the
  // call screen should not make them press it again.
  incomingCallId?: string;
  autoAccept?: boolean;
  /** Overrides the per-vertical default (healthcare = video, otherwise audio). */
  media?: 'audio' | 'video';

  // Counterpart labelling — canonical, then per-screen aliases.
  counterpartName?: string;
  customerName?: string;
  doctorName?: string;
  patientName?: string;
  counterpartImage?: string;
  customerImage?: string;

  /** Theme override; otherwise derived from roomType. */
  accent?: string;
  accentSoft?: string;

  /** Pre-booking entry points pass a provider instead of a room. */
  provider?: {
    id?: string;
    name?: string;
    image?: string;
    profileImage?: string;
  };
  serviceType?: string;
};

/**
 * Home services is green-accented, healthcare blue — matching each vertical.
 *
 * Read from the module palettes rather than typed as hex: these were a third
 * hand-written pair (`#10B981` / `#2563EB`) that had drifted off both modules'
 * real accents, so a chat header was a slightly different green from the app
 * bar on the screen that opened it.
 */
const THEME: Record<RoomType, { accent: string; accentSoft: string }> = {
  homeservice: {
    accent: MODULE_PALETTES.homeservice.accent,
    accentSoft: MODULE_PALETTES.homeservice.accentSoft,
  },
  healthcare: {
    accent: MODULE_PALETTES.healthcare.accent,
    accentSoft: MODULE_PALETTES.healthcare.accentSoft,
  },
};

export interface NormalizedRoom {
  roomId: string;
  roomType: RoomType;
  name?: string;
  image?: string;
  accent: string;
  accentSoft: string;
  providerId?: string;
  serviceType?: string;
}

export function normalizeRoomParams(p: RoomParams = {}): NormalizedRoom {
  const roomId = p.roomId || p.bookingId || p.appointmentId || '';
  // An appointmentId alias is only ever passed by healthcare screens, so it
  // also tells us the vertical when roomType was not given explicitly.
  const roomType: RoomType =
    p.roomType || (p.appointmentId && !p.bookingId ? 'healthcare' : 'homeservice');
  const theme = THEME[roomType];

  return {
    roomId,
    roomType,
    name: p.counterpartName || p.customerName || p.doctorName || p.patientName || p.provider?.name,
    image: p.counterpartImage || p.customerImage || p.provider?.image || p.provider?.profileImage,
    accent: p.accent || theme.accent,
    accentSoft: p.accentSoft || theme.accentSoft,
    providerId: p.provider?.id,
    serviceType: p.serviceType,
  };
}
