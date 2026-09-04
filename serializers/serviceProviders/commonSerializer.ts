// ============================================
// COMMON SERIALIZERS
// ============================================

import { isServiceCategory, ServiceCategory } from '../../constants/HomeServiceTheme';
import { Pagination } from '../../models/serviceProviders';

/**
 * A service category the app can actually act on, or `undefined`.
 *
 * Four serializers each defaulted a missing category to `'electricians'`. That
 * is not a safe default — it is a fabricated fact. A provider with no category
 * was labelled, filtered and coloured as an electrician, and there was no way
 * to tell that apart from a real one. It is a large part of why the "every
 * category shows electricians" report was so hard to pin down: the lie was
 * being told in four places on the client and one on the server.
 *
 * `categoryAccent()` and `bookingStatus()` already degrade an unknown value to
 * a readable neutral, so `undefined` renders honestly. Callers that genuinely
 * need a string should show a neutral label, not pick a trade.
 */
export function toServiceCategory(value: unknown): ServiceCategory | undefined {
  return isServiceCategory(value as string) ? (value as ServiceCategory) : undefined;
}

export function paginationSerializer(data: any): Pagination {
  return {
    currentPage: data?.currentPage || data?.page || 1,
    totalPages: data?.totalPages || 1,
    totalItems: data?.totalItems || data?.total || 0,
    itemsPerPage: data?.itemsPerPage || data?.limit || 15,
    hasNext: data?.hasNext ?? (data?.currentPage < data?.totalPages),
    hasPrevious: data?.hasPrevious ?? (data?.currentPage > 1),
  };
}
