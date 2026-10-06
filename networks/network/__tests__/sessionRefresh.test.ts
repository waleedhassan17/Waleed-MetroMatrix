// Storage is mocked: these tests are about what is posted, stored and reported.
const mockStore = new Map<string, string>();
jest.mock('../../../utils/storage_utils/secureStorage', () => ({
  secureGetItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  secureSetItem: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  secureRemoveItem: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
const mockAccountTokens: { access?: string; refresh?: string } = {};
jest.mock('../../../utils/storage_utils/storageUtils', () => ({
  getAccessToken: jest.fn(async () => mockAccountTokens.access ?? null),
  getRefreshToken: jest.fn(async () => mockAccountTokens.refresh ?? null),
  saveAuthTokens: jest.fn(async (a: string, r?: string) => {
    mockAccountTokens.access = a;
    if (r) mockAccountTokens.refresh = r;
    return true;
  }),
  syncProviderAccessToken: jest.fn(async () => undefined),
  retrieveData: jest.fn(async () => null),
  KeyForStorage: { accessToken: 'accessToken', providerAccessToken: 'providerAccessToken', userType: 'userType' },
}));

import { AxiosError } from 'axios';
import { syncProviderAccessToken } from '../../../utils/storage_utils/storageUtils';
import { createSessionRefresher } from '../sessionRefresh';
import { onAdminSessionRefreshed } from '../authEvents';
import {
  ADMIN_SESSION_KEY,
  __resetAdminSessionCache,
  clearAdminSession,
  loadAdminSession,
  saveAdminSession,
  tokensFrom,
} from '../../admin/session';

const adminTokens = (n: number) => ({
  accessToken: `admin-access-token-${n}`,
  refreshToken: `admin-refresh-token-${n}`,
  accessTokenExpiresAt: '2026-10-03T10:15:00.000Z',
  sessionId: 'sess-1',
});

const httpError = (status?: number) =>
  new AxiosError('fail', status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK', undefined, null, status ? ({ status, data: {} } as any) : undefined);

beforeEach(() => {
  // Failure cases log a dev warning by design.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockStore.clear();
  delete mockAccountTokens.access;
  delete mockAccountTokens.refresh;
  __resetAdminSessionCache();
});

describe('admin session storage', () => {
  it('stores all four values under one key and reads them back', async () => {
    await saveAdminSession(adminTokens(1));
    expect([...mockStore.keys()]).toEqual([ADMIN_SESSION_KEY]);
    __resetAdminSessionCache();
    await expect(loadAdminSession()).resolves.toEqual(adminTokens(1));
  });

  it('deletes tokens written by older builds instead of using them', async () => {
    mockStore.set('adminToken', 'legacy-access');
    mockStore.set('adminRefreshToken', 'legacy-refresh');
    mockStore.set('adminInfo', '{}');
    await expect(loadAdminSession()).resolves.toBeNull();
    expect(mockStore.size).toBe(0);
  });

  it('clear removes the session', async () => {
    await saveAdminSession(adminTokens(1));
    await clearAdminSession();
    await expect(loadAdminSession()).resolves.toBeNull();
    expect(mockStore.size).toBe(0);
  });

  it('rejects a response without both tokens', () => {
    expect(tokensFrom({ accessToken: 'a' })).toBeNull();
    expect(tokensFrom(null)).toBeNull();
  });
});

describe('createSessionRefresher', () => {
  it('admin: posts the stored refresh token, stores the rotation and reports the profile', async () => {
    await saveAdminSession(adminTokens(1));
    const post = jest.fn(async () => ({
      data: { success: true, data: { ...adminTokens(2), restrict: null, admin: { id: 'a1' } } },
    }));
    const reported: unknown[] = [];
    const off = onAdminSessionRefreshed((d) => reported.push(d));

    const refresh = createSessionRefresher(post);
    await expect(refresh('admin')).resolves.toEqual({ token: 'admin-access-token-2' });
    off();

    expect(post).toHaveBeenCalledWith('admin/auth/refresh-token', { refreshToken: 'admin-refresh-token-1' });
    __resetAdminSessionCache();
    await expect(loadAdminSession()).resolves.toEqual(adminTokens(2));
    expect(reported).toEqual([{ admin: { id: 'a1' }, restrict: null }]);
  });

  it('admin: concurrent refreshes post once', async () => {
    await saveAdminSession(adminTokens(1));
    const post = jest.fn(async () => ({ data: { data: adminTokens(2) } }));
    const refresh = createSessionRefresher(post);
    await Promise.all([refresh('admin'), refresh('admin'), refresh('admin')]);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('admin: no stored session means nothing to refresh', async () => {
    const post = jest.fn();
    await expect(createSessionRefresher(post)('admin')).resolves.toEqual({ token: null, transient: false });
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    [401, false],
    [403, false],
    [429, true],
    [500, true],
    [undefined, true],
  ])('a refresh answered %s is transient: %s', async (status, transient) => {
    await saveAdminSession(adminTokens(1));
    const post = jest.fn(async () => {
      throw httpError(status);
    });
    await expect(createSessionRefresher(post)('admin')).resolves.toEqual({ token: null, transient });
    // A transient failure keeps the stored session.
    await expect(loadAdminSession()).resolves.toEqual(adminTokens(1));
  });

  it('account: uses /auth/refresh and the user refresh token, never the admin one', async () => {
    await saveAdminSession(adminTokens(1));
    mockAccountTokens.refresh = 'user-refresh-token-1';
    const post = jest.fn(async () => ({ data: { accessToken: 'user-access-token-2', refreshToken: 'user-refresh-token-2' } }));
    const onAccountToken = jest.fn();
    await expect(createSessionRefresher(post, { onAccountToken })('account')).resolves.toEqual({
      token: 'user-access-token-2',
    });
    expect(post).toHaveBeenCalledWith('auth/refresh', { refreshToken: 'user-refresh-token-1' });
    expect(onAccountToken).toHaveBeenCalledWith('user-access-token-2');
    expect(mockAccountTokens).toEqual({ access: 'user-access-token-2', refresh: 'user-refresh-token-2' });
    __resetAdminSessionCache();
    await expect(loadAdminSession()).resolves.toEqual(adminTokens(1));
  });

  it("account: renews the provider's second token copy too", async () => {
    mockAccountTokens.refresh = 'provider-refresh-token-1';
    const post = jest.fn(async () => ({ data: { accessToken: 'provider-access-token-2', refreshToken: 'provider-refresh-token-2' } }));
    await createSessionRefresher(post)('account');
    expect(syncProviderAccessToken).toHaveBeenCalledWith('provider-access-token-2');
  });

  it('account: a 401 after another browser tab rotated the token keeps the session', async () => {
    mockAccountTokens.access = 'user-access-token-1';
    mockAccountTokens.refresh = 'user-refresh-token-1';
    // The other tab wins the race: it stores its rotation, then the server
    // refuses this tab's now-stale refresh token.
    const post = jest.fn(async () => {
      mockAccountTokens.access = 'user-access-token-2';
      mockAccountTokens.refresh = 'user-refresh-token-2';
      throw httpError(401);
    });
    await expect(createSessionRefresher(post)('account')).resolves.toEqual({ token: 'user-access-token-2' });
  });

  it('account: a 401 with no newer token stored ends the session', async () => {
    mockAccountTokens.access = 'user-access-token-1';
    mockAccountTokens.refresh = 'user-refresh-token-1';
    const post = jest.fn(async () => {
      throw httpError(401);
    });
    await expect(createSessionRefresher(post)('account')).resolves.toEqual({ token: null, transient: false });
  });
});
