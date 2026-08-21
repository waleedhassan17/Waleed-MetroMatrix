// ============================================================================
// Resolve the chat/call room for a provider the customer has not (yet) opened
// a room with explicitly.
//
// A home-service room IS a booking: the realtime service authorizes both
// parties by looking the booking up and checking membership
// (metromatrix-realtime/src/utils/access.js — resolveRoom). It does NOT filter
// on booking status, so any booking shared by the two parties opens a real
// room; an active one is simply the most useful default.
//
// Why this exists: the Chat and Call buttons on the provider profile, the
// provider list and provider search all navigated with only a `provider`
// object and no bookingId, so both screens fell straight through to their
// "not available yet" placeholder — even when the customer *did* have a live
// booking with that provider. To QA that looks like a button wired to nothing.
// ============================================================================

import { fetchUserBookings, type UserBooking } from '../../networks/serviceProviders/userNetwork';

/**
 * Statuses that represent a live job, best-first. A room stays open after the
 * job ends (the server allows it), but an in-flight booking is the one the
 * customer almost certainly means when they tap Chat or Call.
 */
const ACTIVE_STATUS_PRIORITY: UserBooking['status'][] = [
  'in_progress',
  'confirmed',
  'upcoming',
  'pending',
];

/**
 * Find the booking that should back a chat/call room with `providerId`.
 * Prefers a live booking; falls back to the most recent one of any status.
 * Returns null when the customer has never booked this provider.
 */
export async function resolveProviderBookingId(
  providerId?: string | null
): Promise<string | null> {
  if (!providerId) return null;

  const res = await fetchUserBookings();
  if (!res.success || !Array.isArray(res.data)) return null;

  const mine = res.data.filter((b) => String(b.providerId) === String(providerId));
  if (!mine.length) return null;

  for (const status of ACTIVE_STATUS_PRIORITY) {
    const hit = mine.find((b) => b.status === status);
    if (hit) return String(hit.id);
  }

  // `/user/bookings` comes back sorted createdAt desc, so index 0 is newest.
  return String(mine[0].id);
}
