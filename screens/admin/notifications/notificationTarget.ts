// ============================================================================
// Where tapping a notification goes, from its `target` ({ type, id }).
// Pure, so it is tested. A target with no screen yet (wallet adjustments wait
// for the Finance UI) opens nothing rather than somewhere wrong.
// ============================================================================

export type RouteTarget = { name: string; params?: Record<string, unknown> };

export function routeForTarget(target: { type?: string; id?: string } | null | undefined): RouteTarget | null {
  if (!target?.type) return null;
  const id = target.id;
  switch (target.type) {
    case 'Provider':
      return id ? { name: 'AdminProviderDetail', params: { providerId: id } } : null;
    case 'User':
      return id ? { name: 'AdminUserDetail', params: { userId: id } } : null;
    case 'Doctor':
      return { name: 'DoctorManagement' };
    case 'Dispute':
      return { name: 'AdminHSDisputes' };
    case 'PayoutRequest':
      return { name: 'AdminHSPayouts' };
    case 'Booking':
      return id ? { name: 'AdminHSBookingDetail', params: { bookingId: id } } : null;
    case 'Appointment':
      return id ? { name: 'AdminAppointmentDetail', params: { appointmentId: id } } : null;
    case 'Brand':
      return { name: 'AdminShopping', params: { screen: 'AdminBrandList' } };
    case 'ReturnRequest':
    case 'Order':
      return { name: 'AdminShopping', params: { screen: 'AdminShoppingOrders' } };
    default:
      return null;
  }
}
