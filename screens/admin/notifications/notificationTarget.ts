// ============================================================================
// Where tapping a notification or a Queue item goes, from its `target`
// ({ type, id, providerId?, orderId? }). Pure, so it is tested. A record with
// a screen of its own opens that screen; a record without one opens the list
// that handles it. A target with no screen at all opens nothing rather than
// somewhere wrong.
// ============================================================================

export type RouteTarget = { name: string; params?: Record<string, unknown> };

export interface Target {
  type?: string;
  id?: string;
  /** The provider the work is about (doctor, brand, payout). */
  providerId?: string | null;
  /** A return request's order (vendors decide returns; the admin sees the order). */
  orderId?: string | null;
}

export function routeForTarget(target: Target | null | undefined): RouteTarget | null {
  if (!target?.type) return null;
  const id = target.id;
  switch (target.type) {
    case 'Provider':
      return id ? { name: 'AdminProviderDetail', params: { providerId: id } } : null;
    case 'User':
      return id ? { name: 'AdminUserDetail', params: { userId: id } } : null;
    case 'Doctor':
      // Verification lives with the doctors; the list opens on this one.
      return { name: 'DoctorManagement', params: id ? { doctorId: id } : undefined };
    case 'Dispute':
      return { name: 'AdminHSDisputes' };
    case 'PayoutRequest':
      return { name: 'AdminHSPayouts' };
    case 'Booking':
      return id ? { name: 'AdminHSBookingDetail', params: { bookingId: id } } : null;
    case 'Appointment':
      return id ? { name: 'AdminAppointmentDetail', params: { appointmentId: id } } : null;
    case 'Brand':
      return id
        ? { name: 'AdminShopping', params: { screen: 'AdminBrandDetail', params: { brandId: id } } }
        : { name: 'AdminShopping', params: { screen: 'AdminBrandList' } };
    case 'ReturnRequest':
      return target.orderId
        ? { name: 'AdminShopping', params: { screen: 'AdminShoppingOrderDetail', params: { orderId: target.orderId } } }
        : { name: 'AdminShopping', params: { screen: 'AdminShoppingOrders' } };
    case 'WalletAdjustment':
      return { name: 'AdminWallets', params: id ? { segment: 'adjustments', adjustmentId: id } : { segment: 'adjustments' } };
    case 'Order':
      return id
        ? { name: 'AdminShopping', params: { screen: 'AdminShoppingOrderDetail', params: { orderId: id } } }
        : { name: 'AdminShopping', params: { screen: 'AdminShoppingOrders' } };
    default:
      return null;
  }
}
