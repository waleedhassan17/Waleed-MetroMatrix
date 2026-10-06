// ============================================================================
// How the console describes a shopping order. Pure, so it is tested.
// ============================================================================

/** The moves an admin may force (modules/shopping/services/orderService.js ALLOWED_TRANSITIONS). */
export const NEXT_ORDER_STATUSES: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  returned: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** Payment states of an order (Order.paymentStatus). */
export const PAYMENT_FILTERS = [
  { value: 'all', label: 'Any payment' },
  { value: 'pending', label: 'Not paid yet' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
];

export const paymentLabel = (status: string | undefined): string =>
  PAYMENT_FILTERS.find((p) => p.value === status)?.label ?? status ?? '—';

/** "cash on delivery" from "cash_on_delivery"; the console never shows a raw key. */
export const humanise = (value: string | undefined | null): string => (value ? value.replace(/_/g, ' ') : '');
