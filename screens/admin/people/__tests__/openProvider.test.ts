import { idOf, openProvider, providerRoute, routeForActivity } from '../openProvider';

describe('openProvider', () => {
  it('opens the provider screen with the id', () => {
    const navigate = jest.fn();
    expect(openProvider({ navigate }, 'p1')).toBe(true);
    expect(navigate).toHaveBeenCalledWith('AdminProviderDetail', { providerId: 'p1' });
  });

  it('does nothing when there is no provider (a brand the platform runs)', () => {
    const navigate = jest.fn();
    expect(openProvider({ navigate }, null)).toBe(false);
    expect(openProvider({ navigate }, undefined)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(providerRoute('')).toBeNull();
  });

  it('reads an id from a populated or plain reference', () => {
    expect(idOf('abc')).toBe('abc');
    expect(idOf({ _id: 'def', fullName: 'Dr. A' })).toBe('def');
    expect(idOf({ id: 'ghi' })).toBe('ghi');
    expect(idOf(null)).toBeNull();
    expect(idOf({ fullName: 'no id' })).toBeNull();
  });

  it('sends recent activity to the booking, appointment or order', () => {
    expect(routeForActivity('booking', 'b1')).toEqual({ name: 'AdminHSBookingDetail', params: { bookingId: 'b1' } });
    expect(routeForActivity('appointment', 'a1')).toEqual({ name: 'AdminAppointmentDetail', params: { appointmentId: 'a1' } });
    expect(routeForActivity('order', 'o1')).toEqual({ name: 'AdminShopping', params: { screen: 'AdminShoppingOrderDetail', params: { orderId: 'o1' } } });
    expect(routeForActivity('other', 'x')).toBeNull();
  });
});
