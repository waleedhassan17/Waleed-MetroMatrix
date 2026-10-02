jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn(), AndroidImportance: {} }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
jest.mock('../../../networks/realtime/realtimeClient', () => ({ registerPushToken: jest.fn(), unregisterPushToken: jest.fn() }));
jest.mock('../../../utils/storage_utils/storageUtils', () => ({ KeyForStorage: {}, retrieveData: jest.fn(), saveData: jest.fn() }));
jest.mock('../../socket/socketClient', () => ({ isSocketConnected: () => false }));

import { routeFromNotification } from '../pushNotifications';

describe('routeFromNotification', () => {
  it.each([
    ['booking_update', 'booking'],
    ['booking_nearby', 'booking'],
    ['booking_reminder', 'booking'],
    ['review_received', 'booking'],
    ['payment_requested', 'booking'],
    ['identity_verified', 'booking'],
  ])('home-service %s → %s', (type, expected) => {
    expect(routeFromNotification({ type, bookingId: 'b1' })?.type).toBe(expected);
  });

  it('healthcare pushes route to the appointment, with audience and prescription', () => {
    expect(routeFromNotification({ type: 'appointment_update', appointmentId: 'a1', audience: 'patient' })).toMatchObject({
      type: 'appointment',
      appointmentId: 'a1',
      audience: 'patient',
    });
    expect(routeFromNotification({ type: 'prescription_ready', appointmentId: 'a1', prescriptionId: 'p9' })).toMatchObject({
      prescriptionId: 'p9',
    });
    expect(routeFromNotification({ type: 'video_call_starting', appointmentId: 'a1' })?.type).toBe('appointment');
  });

  it('shopping pushes route to the order', () => {
    expect(routeFromNotification({ type: 'order_update', orderId: 'o1', audience: 'customer' })).toMatchObject({
      type: 'order',
      orderId: 'o1',
      audience: 'customer',
    });
    expect(routeFromNotification({ type: 'return_update', orderId: 'o1', audience: 'vendor' })?.pushType).toBe('return_update');
  });

  it('unknown payloads route nowhere', () => {
    expect(routeFromNotification({ type: 'order_update' })).toBeNull(); // no orderId
    expect(routeFromNotification({ type: 'nonsense', bookingId: 'b1' })).toBeNull();
    expect(routeFromNotification(null)).toBeNull();
  });
});
