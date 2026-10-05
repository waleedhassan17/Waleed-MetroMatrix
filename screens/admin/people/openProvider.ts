// ============================================================================
// One way to open a provider from anywhere in the console.
//
// Every screen that names a provider — a booking, a payout, a dispute, a
// doctor card, a brand's owner, a leaderboard row — opens the same screen:
// AdminProviderDetail, with their details and analytics. It is registered on
// the root stack, so navigating to it works from inside the nested healthcare
// and shopping stacks too.
// ============================================================================

import type { RouteTarget } from '../notifications/notificationTarget';

export const PROVIDER_ROUTE = 'AdminProviderDetail';

/** The route for a provider, or null when there is no provider to open (e.g. a brand the platform runs). */
export function providerRoute(providerId: string | null | undefined): RouteTarget | null {
  return providerId ? { name: PROVIDER_ROUTE, params: { providerId } } : null;
}

type Navigator = { navigate: (name: string, params?: Record<string, unknown>) => void };

/** Opens the provider and returns true, or returns false when there is none. */
export function openProvider(navigation: Navigator, providerId: string | null | undefined): boolean {
  const route = providerRoute(providerId);
  if (!route) return false;
  navigation.navigate(route.name, route.params);
  return true;
}

/** The id of a reference that may be populated ({ _id, ... }) or not (a string). */
export function idOf(ref: unknown): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  const r = ref as { _id?: unknown; id?: unknown };
  return r._id ? String(r._id) : r.id ? String(r.id) : null;
}

/** Where a row in a provider's recent activity opens. */
export function routeForActivity(kind: string, id: string): RouteTarget | null {
  switch (kind) {
    case 'booking':
      return { name: 'AdminHSBookingDetail', params: { bookingId: id } };
    case 'appointment':
      return { name: 'AdminAppointmentDetail', params: { appointmentId: id } };
    case 'order':
      return { name: 'AdminShopping', params: { screen: 'AdminShoppingOrderDetail', params: { orderId: id } } };
    default:
      return null;
  }
}
