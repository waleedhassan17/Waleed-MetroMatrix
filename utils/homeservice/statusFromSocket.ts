// ============================================================================
// What a `booking_status_changed` frame means for the customer's request.
//
// The server sends the HSBooking status in UPPER CASE (ACCEPTED, EN_ROUTE, …).
// The confirmation screen compared it against lower-case 'accepted' and
// 'confirmed', so the socket path never matched and a customer only learned
// their request was accepted from the 10-second poll. Normalise once, here.
// ============================================================================

export type RequestOutcome = 'accepted' | 'declined' | 'cancelled' | null;

/** Statuses that mean a provider has committed to the job. */
const ACCEPTED_LIKE = ['ACCEPTED', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
const DECLINED_LIKE = ['REJECTED', 'DECLINED'];

export function requestOutcomeFromStatus(raw: unknown): RequestOutcome {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const s = raw.trim().toUpperCase();
  if (ACCEPTED_LIKE.includes(s)) return 'accepted';
  if (DECLINED_LIKE.includes(s)) return 'declined';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'cancelled';
  return null; // PENDING, or anything unknown — keep waiting
}
