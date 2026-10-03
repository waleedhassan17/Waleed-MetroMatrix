jest.mock('../../network/network', () => ({ API: {} }));
jest.mock('../../admin/auth', () => ({ signInAdmin: jest.fn() }));
jest.mock('../socialAuth', () => ({}));

import { signInAdmin } from '../../admin/auth';
import { adminConsoleLogin, isAdminConsoleEmail } from '../userSignin';

describe('admin console sign-in from the regular form', () => {
  it('recognises the admin email however it is typed', () => {
    expect(isAdminConsoleEmail('waleedhassansfd@gmail.com')).toBe(true);
    expect(isAdminConsoleEmail('  WaleedHassanSFD@Gmail.com ')).toBe(true);
  });

  it('sends every other email down the customer path', () => {
    expect(isAdminConsoleEmail('customer@example.com')).toBe(false);
    expect(isAdminConsoleEmail('waleedhassansfd@gmail.com.evil.io')).toBe(false);
    expect(isAdminConsoleEmail('')).toBe(false);
  });

  it('hands the password to the admin login API for the server to check', async () => {
    (signInAdmin as jest.Mock).mockResolvedValue({ step: 'totp_required', challengeToken: 'c' });
    await expect(adminConsoleLogin('waleedhassansfd@gmail.com', 'secret')).resolves.toEqual({ step: 'totp_required', challengeToken: 'c' });
    expect(signInAdmin).toHaveBeenCalledWith('waleedhassansfd@gmail.com', 'secret');
  });
});
