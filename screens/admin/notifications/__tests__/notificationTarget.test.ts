import { routeForTarget } from '../notificationTarget';

describe('routeForTarget', () => {
  it.each([
    [{ type: 'Provider', id: 'p1' }, { name: 'AdminProviderDetail', params: { providerId: 'p1' } }],
    [{ type: 'User', id: 'u1' }, { name: 'AdminUserDetail', params: { userId: 'u1' } }],
    [{ type: 'Doctor', id: 'doc1', providerId: 'p9' }, { name: 'DoctorManagement', params: { doctorId: 'doc1' } }],
    [{ type: 'Dispute', id: 'd1' }, { name: 'AdminHSDisputes' }],
    [{ type: 'PayoutRequest', id: 'x' }, { name: 'AdminHSPayouts' }],
    [{ type: 'Brand', id: 'b1' }, { name: 'AdminShopping', params: { screen: 'AdminBrandDetail', params: { brandId: 'b1' } } }],
    [{ type: 'Brand' }, { name: 'AdminShopping', params: { screen: 'AdminBrandList' } }],
    [
      { type: 'ReturnRequest', id: 'r1', orderId: 'o1' },
      { name: 'AdminShopping', params: { screen: 'AdminShoppingOrderDetail', params: { orderId: 'o1' } } },
    ],
    [{ type: 'ReturnRequest', id: 'r1' }, { name: 'AdminShopping', params: { screen: 'AdminShoppingOrders' } }],
    [{ type: 'Order', id: 'o2' }, { name: 'AdminShopping', params: { screen: 'AdminShoppingOrderDetail', params: { orderId: 'o2' } } }],
    [{ type: 'WalletAdjustment', id: 'w1' }, { name: 'AdminWallets', params: { segment: 'adjustments', adjustmentId: 'w1' } }],
  ])('%j', (target, expected) => {
    expect(routeForTarget(target)).toEqual(expected);
  });

  it('opens nothing for targets without a screen, or without an id where one is needed', () => {
    expect(routeForTarget({ type: 'Unknown', id: 'w1' })).toBeNull();
    expect(routeForTarget({ type: 'Provider' })).toBeNull();
    expect(routeForTarget(undefined)).toBeNull();
  });
});
