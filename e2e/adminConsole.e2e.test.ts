/**
 * The app's admin network layer against a real backend.
 *
 * Opt-in: skipped unless ADMIN_E2E_API_URL and ADMIN_E2E_PASSWORD are set.
 * Run it against the backend's throwaway in-memory server:
 *
 *   (backend)  DEV_ADMIN_PASSWORD=… JWT_EXPIRE=1m npm run dev:memory
 *   (app)      EXPO_PUBLIC_API_URL=http://localhost:5055/api \
 *              ADMIN_E2E_API_URL=http://localhost:5055/api ADMIN_E2E_PASSWORD=… \
 *              npx jest e2e --no-cache
 *
 * It drives the same code the screens use — typed client, session storage,
 * refresh-on-401 — over real HTTP. Storage is in memory; nothing else is mocked.
 */

const mockStore = new Map<string, string>();
jest.mock('../utils/storage_utils/secureStorage', () => ({
  secureGetItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  secureSetItem: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  secureRemoveItem: jest.fn(async (k: string) => void mockStore.delete(k)),
  secureClearAll: jest.fn(async () => mockStore.clear()),
  isSecureKey: () => true,
  isSecure: () => true,
  SECURE_KEYS: [],
}));

import axios from 'axios';

const API = process.env.ADMIN_E2E_API_URL;
const PASSWORD = process.env.ADMIN_E2E_PASSWORD;
const EMAIL = process.env.ADMIN_E2E_EMAIL || 'admin@example.com';
const run = API && PASSWORD ? describe : describe.skip;

run('admin console against a live API', () => {
  jest.setTimeout(60_000);
  // Loaded lazily so a skipped run never touches the network modules.
  let net: typeof import('../networks/network/network');
  let auth: typeof import('../networks/admin/auth');
  let client: typeof import('../networks/admin/client');
  let session: typeof import('../networks/admin/session');
  const newPassword = `${PASSWORD}-rotated-${Date.now()}`;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    net = require('../networks/network/network');
    auth = require('../networks/admin/auth');
    client = require('../networks/admin/client');
    session = require('../networks/admin/session');
    expect(net.API_URL).toBe(API);
    // Node's fetch: jest resolves axios's browser build, which has no http adapter.
    net.MainAxiosInstance.defaults.adapter = 'fetch';
    axios.defaults.adapter = 'fetch';
  });

  const tamperAccessToken = async () => {
    const s = (await session.loadAdminSession())!;
    // Same claims, broken signature: the server answers 401, as for an expired token.
    await session.saveAdminSession({ ...s, accessToken: `${s.accessToken.slice(0, -4)}AAAA` });
    return s;
  };

  it('Q01/Q02: signs in, and a temporary password restricts the session', async () => {
    const res = await auth.signInAdmin(EMAIL, PASSWORD!);
    expect(res.step).toBe('signed_in');
    if (res.step !== 'signed_in') return;
    expect(res.admin.isSuperAdmin).toBe(true);
    expect(res.restrict).toBe('password_change');

    await expect(client.adminApi.get('/api/admin/overview')).rejects.toMatchObject({ status: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
  });

  it('Q02: changing the password lifts the restriction', async () => {
    const out = await auth.changeAdminPassword(PASSWORD!, newPassword);
    expect(out.restrict).toBeNull();
    const overview = await client.adminApi.get('/api/admin/overview');
    expect(Array.isArray(overview.data.queues)).toBe(true);
  });

  it('Q12: meta describes statuses with labels and tones', async () => {
    const { data } = await client.adminApi.get('/api/admin/meta');
    const pending = (data.enums.providerStates as { value: string; label: string; tone: string }[]).find((o) => o.value === 'pending');
    expect(pending).toMatchObject({ label: expect.any(String), tone: expect.any(String) });
    expect(data.viewer.email).toBe(EMAIL);
  });

  it('Q13: the queue shows the waiting provider, oldest first', async () => {
    const { data: overview } = await client.adminApi.get('/api/admin/overview');
    expect(overview.queues.find((q) => q.type === 'provider_approval')?.count).toBe(1);
    const { data: queue } = await client.adminApi.get('/api/admin/queue');
    expect(queue[0]).toMatchObject({ type: 'provider_approval', target: { type: 'Provider' } });
  });

  it('Q03: an expired access token is renewed transparently and the refresh token rotates', async () => {
    const before = await tamperAccessToken();
    const { data } = await client.adminApi.get('/api/admin/profile');
    expect(data.email).toBe(EMAIL);
    const after = (await session.loadAdminSession())!;
    expect(after.refreshToken).not.toBe(before.refreshToken);
    expect(after.sessionId).toBe(before.sessionId);
  });

  it('Q04: concurrent 401s refresh once (a second refresh would replay the rotated token and revoke the session)', async () => {
    await tamperAccessToken();
    const results = await Promise.all([
      client.adminApi.get('/api/admin/profile'),
      client.adminApi.get('/api/admin/meta'),
      client.adminApi.get('/api/admin/notifications/unread-count'),
    ]);
    expect(results).toHaveLength(3);
    // Still alive: the session was not revoked by refresh-token reuse.
    const { data } = await client.adminApi.get('/api/admin/sessions');
    expect(data.some((s) => s.current)).toBe(true);
  });

  it('Q14/Q16: approving a provider moves it out of the queue and records history', async () => {
    const { data: list } = await client.adminApi.get('/api/admin/providers', { query: { state: 'pending' } });
    expect(list).toHaveLength(1);
    const { data: approved } = await client.adminApi.put('/api/admin/providers/{providerId}/approve', { params: { providerId: list[0].id } });
    expect((approved as { state: string }).state).toBe('approved');
    const { data: detail } = await client.adminApi.get('/api/admin/providers/{providerId}', { params: { providerId: list[0].id } });
    expect((detail as { history: { action: string }[] }).history.map((h) => h.action)).toContain('provider.approve');
    const { data: overview } = await client.adminApi.get('/api/admin/overview');
    expect(overview.queues.find((q) => q.type === 'provider_approval')?.count).toBe(0);
  });

  it('A1: there is no platform commission — no setting, and sending one is refused', async () => {
    const { data: settings } = await client.adminApi.get('/api/admin/homeservice/settings');
    expect(settings).not.toHaveProperty('commissionPercent');
    await expect(
      client.adminApi.patch('/api/admin/homeservice/settings', { body: { commissionPercent: 10, reason: 'E2E' } as never })
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
  });

  it('A2: every kind of provider has analytics, paid in full', async () => {
    const { data: approved } = await client.adminApi.get('/api/admin/providers', { query: { state: 'approved' } });
    const byType = Object.fromEntries((approved as { id: string; providerType: string }[]).map((p) => [p.providerType, p.id]));
    expect(Object.keys(byType).sort()).toEqual(['doctor', 'home_service', 'vendor']);
    const analytics = async (id: string, range: '30d' | '90d' | '12m' = '30d') =>
      (await client.adminApi.get('/api/admin/providers/{providerId}/analytics', { params: { providerId: id }, query: { range } })).data;
    const metric = (a: Awaited<ReturnType<typeof analytics>>, key: string) => a.summary.find((m) => m.key === key)?.value;

    const hs = await analytics(byType.home_service);
    expect(hs.type).toBe('home_service');
    expect(hs.series).toHaveLength(30);
    expect(metric(hs, 'paid')).toBe(2500);

    const doctor = await analytics(byType.doctor, '90d');
    expect(doctor.links.doctorId).toEqual(expect.any(String));
    expect(metric(doctor, 'paid')).toBe(2000);

    const vendor = await analytics(byType.vendor, '12m');
    expect(vendor.bucket).toBe('month');
    expect(vendor.links.brands?.[0]?.name).toBe('Dev Threads');
    expect(metric(vendor, 'delivered_value')).toBe(3750);
  });

  it('Q19: a booking refund defaults to what was paid and cannot be repeated', async () => {
    const { data: bookings } = await client.adminApi.get('/api/admin/bookings');
    const booking = (bookings as unknown as { id: string }[])[0];
    const first = await client.adminApi.post('/api/admin/bookings/{id}/refund', { params: { id: booking.id }, body: { reason: 'E2E check' } });
    expect(first.data).toMatchObject({ refunded: true, amount: 2500 });
    await expect(
      client.adminApi.post('/api/admin/bookings/{id}/refund', { params: { id: booking.id }, body: { reason: 'Again' } })
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });

  it('Q20: a delete without a reason is refused with field errors', async () => {
    const { data: users } = await client.adminApi.get('/api/admin/users');
    await expect(client.adminApi.delete('/api/admin/users/{userId}', { params: { userId: users[0].id } })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
    });
  });

  it('Q05: sign-out ends the session on the server and on the device', async () => {
    const before = (await session.loadAdminSession())!;
    await auth.signOutAdmin();
    expect(await session.loadAdminSession()).toBeNull();
    // The old refresh token is dead server-side too.
    await expect(axios.post(`${API}/admin/auth/refresh-token`, { refreshToken: before.refreshToken })).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it('Q06: wrong passwords lock the account and the lockout says when to try again', async () => {
    let last: { status?: number; code?: string; details?: unknown } = {};
    for (let i = 0; i < 6; i++) {
      try {
        await auth.signInAdmin(EMAIL, 'definitely-not-it');
      } catch (err) {
        last = err as typeof last;
      }
    }
    expect(last).toMatchObject({ status: 429, code: 'TOO_MANY_ATTEMPTS' });
    expect((last.details as { retryAfterSeconds?: number }).retryAfterSeconds).toBeGreaterThan(0);
  });
});
