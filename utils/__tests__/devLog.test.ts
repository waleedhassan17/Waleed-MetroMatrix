import { redact } from '../devLog';

describe('redact', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.c2lnbmF0dXJlLXZhbHVl';

  it('masks JWT-shaped strings anywhere in text', () => {
    expect(redact(`Bearer ${jwt}`)).toBe('Bearer [jwt]');
  });

  it('masks values under sensitive keys, at any depth', () => {
    expect(
      redact({
        email: 'a@b.pk',
        password: 'hunter22',
        nested: { refreshToken: 'abc', accessTokenExpiresAt: '2026-01-01', items: [{ code: '123456' }] },
        headers: { Authorization: `Bearer ${jwt}` },
      })
    ).toEqual({
      email: 'a@b.pk',
      password: '[redacted]',
      nested: { refreshToken: '[redacted]', accessTokenExpiresAt: '[redacted]', items: [{ code: '[redacted]' }] },
      headers: { Authorization: '[redacted]' },
    });
  });

  it('leaves empty sensitive values and plain data alone', () => {
    expect(redact({ token: null, password: '', count: 3 })).toEqual({ token: null, password: '', count: 3 });
  });
});
