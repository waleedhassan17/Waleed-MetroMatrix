// ============================================================================
// useBookingSocket — thin backward-compatible alias for useRoomSocket.
//
// Rooms became polymorphic when healthcare chat landed (a room is now either an
// HSBooking or an Appointment), so the general hook is useRoomSocket. This
// wrapper keeps the existing home-service callers — liveTracking, map — working
// unchanged; they are always 'homeservice'.
//
// Prefer useRoomSocket directly in new code.
// ============================================================================

export { useRoomSocket } from './useRoomSocket';
export type { ProviderLocationUpdate } from './useRoomSocket';

import { useRoomSocket } from './useRoomSocket';

export function useBookingSocket(bookingId?: string) {
  return useRoomSocket(bookingId, 'homeservice');
}
