import { AdminApiError, buildAdminUrl, toAdminApiError } from '../errors';

describe('buildAdminUrl', () => {
  it('drops the /api prefix (the base URL has it) and fills path params', () => {
    expect(buildAdminUrl('/api/admin/providers/{providerId}/suspend', { providerId: 'a b' })).toBe('/admin/providers/a%20b/suspend');
    expect(buildAdminUrl('/api/v1/admin/doctors')).toBe('/v1/admin/doctors');
  });

  it('refuses to send a request with a missing path param', () => {
    expect(() => buildAdminUrl('/api/admin/users/{userId}')).toThrow(/userId/);
  });
});

describe('toAdminApiError', () => {
  it('reads the admin error envelope', () => {
    const err = toAdminApiError({
      response: {
        status: 409,
        data: { success: false, error: { code: 'DELETE_BLOCKED', message: 'Open bookings', details: { reasons: [{ type: 'open_bookings', count: 1 }] } }, requestId: 'r1' },
      },
    });
    expect(err).toBeInstanceOf(AdminApiError);
    expect(err).toMatchObject({ status: 409, code: 'DELETE_BLOCKED', message: 'Open bookings', requestId: 'r1' });
  });

  it('exposes field errors and the forbidden flag', () => {
    const v = toAdminApiError({ response: { status: 400, data: { error: { code: 'VALIDATION_FAILED', message: 'x', details: { fields: [{ field: 'reason', message: 'Required' }] } } } } });
    expect(v.fieldErrors).toEqual([{ field: 'reason', message: 'Required' }]);
    expect(toAdminApiError({ response: { status: 403, data: { error: { code: 'FORBIDDEN', message: 'no' } } } }).isForbidden).toBe(true);
  });

  it('tells "server unreachable" apart from a server answer', () => {
    expect(toAdminApiError({ message: 'Network Error' }).code).toBe('NETWORK_ERROR');
    expect(toAdminApiError({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }).code).toBe('TIMEOUT');
  });

  it('falls back to a status-derived code for non-envelope bodies', () => {
    expect(toAdminApiError({ response: { status: 404, data: { error: 'Not found' } } })).toMatchObject({ code: 'NOT_FOUND', message: 'Not found' });
  });
});
