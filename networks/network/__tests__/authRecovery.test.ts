import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import {
  attachAuthRecovery,
  audienceForUrl,
  createSingleFlight,
  type AuthRecoveryOptions,
  type RefreshOutcome,
} from '../authRecovery';
import type { SessionAudience } from '../authEvents';

describe('audienceForUrl', () => {
  it.each([
    ['admin/profile', 'admin'],
    ['/admin/providers/abc', 'admin'],
    ['admin', 'admin'],
    ['v1/admin/doctors', 'admin'],
    ['/v1/admin/healthcare/dashboard', 'admin'],
    ['shopping/admin/brands', 'admin'],
    ['providers/me', 'provider'],
    ['provider/approval-status', 'provider'],
    ['users/profile', 'user'],
    ['users', 'user'],
    ['wallet/balance', null],
    ['auth/refresh', null],
    ['v1/healthcare/doctors', null],
    ['administrators', null],
  ])('%s → %s', (url, expected) => {
    expect(audienceForUrl(url)).toBe(expected);
  });
});

describe('createSingleFlight', () => {
  it('runs once for concurrent callers with the same key, separately per key', async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const once = createSingleFlight(async (key: string) => {
      calls.push(key);
      await gate;
      return `${key}-done`;
    });

    const a = once('admin');
    const b = once('admin');
    const c = once('account');
    release();
    await expect(Promise.all([a, b, c])).resolves.toEqual(['admin-done', 'admin-done', 'account-done']);
    expect(calls).toEqual(['admin', 'account']);

    // After settling, the next call runs again.
    await once('admin');
    expect(calls).toEqual(['admin', 'account', 'admin']);
  });
});

/**
 * An axios instance backed by a fake server: `valid` holds the access tokens
 * the server currently accepts.
 */
function setup(overrides: Partial<AuthRecoveryOptions> = {}) {
  const tokens: Record<SessionAudience, string> = { admin: 'admin-token-1', account: 'user-token-1' };
  const valid = new Set<string>();
  const seen: { url?: string; auth?: string }[] = [];
  const refreshes: SessionAudience[] = [];
  const lost: SessionAudience[] = [];
  let refreshImpl = async (audience: SessionAudience): Promise<RefreshOutcome> => {
    const n = Number(tokens[audience].split('-').pop()) + 1;
    tokens[audience] = `${audience === 'admin' ? 'admin' : 'user'}-token-${n}`;
    valid.add(tokens[audience]);
    return { token: tokens[audience] };
  };

  const instance = axios.create({
    adapter: async (config: InternalAxiosRequestConfig) => {
      const auth = config.headers.Authorization as string | undefined;
      seen.push({ url: config.url, auth });
      const token = auth?.replace('Bearer ', '');
      if (config.url?.startsWith('open/') || (token && valid.has(token))) {
        return { data: { ok: true, auth }, status: 200, statusText: 'OK', headers: {}, config };
      }
      const response = { data: { success: false }, status: 401, statusText: 'Unauthorized', headers: {}, config };
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response as any);
    },
  });

  const refresh = createSingleFlight(async (audience: SessionAudience) => {
    refreshes.push(audience);
    await new Promise((r) => setTimeout(r, 5));
    return refreshImpl(audience);
  });

  attachAuthRecovery(instance, {
    isPublic: (url) => !!url?.startsWith('open/'),
    tokenFor: async (url) => {
      const audience: SessionAudience = audienceForUrl(url) === 'admin' ? 'admin' : 'account';
      return { token: tokens[audience], audience };
    },
    currentToken: async (audience) => tokens[audience],
    refresh,
    onSessionLost: (audience) => {
      lost.push(audience);
    },
    ...overrides,
  });

  return {
    instance,
    valid,
    tokens,
    seen,
    refreshes,
    lost,
    setRefresh: (impl: typeof refreshImpl) => (refreshImpl = impl),
  };
}

describe('attachAuthRecovery', () => {
  it('attaches the token for the route audience', async () => {
    const t = setup();
    t.valid.add('admin-token-1');
    t.valid.add('user-token-1');
    await t.instance.get('admin/profile');
    await t.instance.get('users/profile');
    expect(t.seen.map((s) => s.auth)).toEqual(['Bearer admin-token-1', 'Bearer user-token-1']);
  });

  it('sends no Authorization header to public endpoints', async () => {
    const t = setup();
    await t.instance.get('open/login', { headers: { Authorization: 'Bearer stale' } });
    expect(t.seen[0].auth).toBeUndefined();
  });

  it('two concurrent admin 401s cause exactly one admin refresh, and both succeed', async () => {
    const t = setup();
    const [a, b] = await Promise.all([t.instance.get('admin/profile'), t.instance.get('admin/overview')]);
    expect(t.refreshes).toEqual(['admin']);
    expect(a.data.auth).toBe('Bearer admin-token-2');
    expect(b.data.auth).toBe('Bearer admin-token-2');
    expect(t.lost).toEqual([]);
  });

  it('admin and user sessions refresh independently', async () => {
    const t = setup();
    await Promise.all([t.instance.get('admin/profile'), t.instance.get('users/profile')]);
    expect(t.refreshes.sort()).toEqual(['account', 'admin']);
    expect(t.tokens).toEqual({ admin: 'admin-token-2', account: 'user-token-2' });
  });

  it('a failed admin refresh ends only the admin session', async () => {
    const t = setup();
    t.valid.add('user-token-1');
    t.setRefresh(async () => ({ token: null, transient: false }));
    await expect(t.instance.get('admin/profile')).rejects.toMatchObject({ response: { status: 401 } });
    expect(t.lost).toEqual(['admin']);
    await expect(t.instance.get('users/profile')).resolves.toMatchObject({ status: 200 });
  });

  it('a transient refresh failure (offline) keeps the session', async () => {
    const t = setup();
    t.setRefresh(async () => ({ token: null, transient: true }));
    await expect(t.instance.get('admin/profile')).rejects.toBeTruthy();
    expect(t.lost).toEqual([]);
  });

  it('a 401 after the retry ends the session without refreshing again', async () => {
    const t = setup();
    t.setRefresh(async () => ({ token: 'admin-token-rejected' }));
    await expect(t.instance.get('admin/profile')).rejects.toBeTruthy();
    expect(t.refreshes).toEqual(['admin']);
    expect(t.lost).toEqual(['admin']);
  });

  it('uses a token renewed by another request instead of rotating again', async () => {
    const t = setup();
    // Simulate: the request went out with token-1, meanwhile token-2 was stored.
    const first = t.instance.get('admin/profile');
    t.tokens.admin = 'admin-token-2';
    t.valid.add('admin-token-2');
    await expect(first).resolves.toMatchObject({ data: { auth: 'Bearer admin-token-2' } });
    expect(t.refreshes).toEqual([]);
  });

  it('does not try to recover a 401 on a request sent without a token', async () => {
    const t = setup({ tokenFor: async () => ({ token: null, audience: 'account' }) });
    await expect(t.instance.get('users/profile')).rejects.toBeTruthy();
    expect(t.refreshes).toEqual([]);
    expect(t.lost).toEqual([]);
  });
});
