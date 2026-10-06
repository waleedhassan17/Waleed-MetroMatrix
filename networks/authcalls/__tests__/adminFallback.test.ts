jest.mock('../../network/network', () => ({ API: {} }));
jest.mock('../../admin/auth', () => ({ signInAdmin: jest.fn() }));
jest.mock('../socialAuth', () => ({}));

import { fallbackErrorSource, shouldTryAdminSignIn } from '../userSignin';

describe('admins other than the console account sign in from the same form', () => {
  it('tries the admin login when the customer login rejects the credentials', () => {
    expect(shouldTryAdminSignIn('second.admin@example.com', 401)).toBe(true);
  });

  it('never on a failure that says nothing about who is signing in', () => {
    expect(shouldTryAdminSignIn('someone@example.com', undefined)).toBe(false); // offline, timeout
    expect(shouldTryAdminSignIn('someone@example.com', 500)).toBe(false);
    expect(shouldTryAdminSignIn('someone@example.com', 503)).toBe(false); // maintenance
    expect(shouldTryAdminSignIn('someone@example.com', 403)).toBe(false); // blocked / unverified
    expect(shouldTryAdminSignIn('someone@example.com', 429)).toBe(false);
    expect(shouldTryAdminSignIn('someone@example.com', 400)).toBe(false);
  });

  it('not for the console account, which goes to the admin login first', () => {
    expect(shouldTryAdminSignIn('waleedhassansfd@gmail.com', 401)).toBe(false);
    expect(shouldTryAdminSignIn(' WaleedHassanSFD@gmail.com ', 401)).toBe(false);
  });

  it("keeps the customer's message unless the admin account is deactivated", () => {
    expect(fallbackErrorSource({ code: 'ACCOUNT_DEACTIVATED' })).toBe('admin');
    for (const code of ['INVALID_CREDENTIALS', 'TOO_MANY_ATTEMPTS', 'VALIDATION_FAILED', 'NETWORK_ERROR', 'INTERNAL_ERROR']) {
      expect(fallbackErrorSource({ code })).toBe('customer');
    }
  });
});
