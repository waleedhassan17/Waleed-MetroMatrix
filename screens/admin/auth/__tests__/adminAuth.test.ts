import { AdminApiError } from '../../../../networks/admin/errors';
import { ADMIN_HOME_ROUTE, adminGateDecision, landingAfterSignIn } from '../adminGate';
import { formatWait, localPasswordProblems, passwordProblems, signInErrorMessage } from '../messages';

describe('adminGateDecision', () => {
  it.each([
    ['unknown', null, 'AdminDashboard', { kind: 'restore' }],
    ['restoring', null, 'AdminDashboard', { kind: 'wait' }],
    ['offline', null, 'AdminDashboard', { kind: 'offline' }],
    ['signedOut', null, 'AdminDashboard', { kind: 'redirect', route: 'SignIn' }],
    ['signedIn', null, 'AdminDashboard', { kind: 'render' }],
    ['signedIn', null, 'AdminChangePassword', { kind: 'render' }],
    ['signedIn', 'password_change', 'AdminDashboard', { kind: 'redirect', route: 'AdminChangePassword' }],
    ['signedIn', 'password_change', 'AdminChangePassword', { kind: 'render' }],
    ['signedIn', 'password_change', 'AdminTwoFactorEnrol', { kind: 'redirect', route: 'AdminChangePassword' }],
    ['signedIn', 'totp_enrol', 'UserManagement', { kind: 'redirect', route: 'AdminTwoFactorEnrol' }],
    ['signedIn', 'totp_enrol', 'AdminTwoFactorEnrol', { kind: 'render' }],
  ] as const)('%s / %s on %s', (status, restrict, route, expected) => {
    expect(adminGateDecision(status, restrict, route)).toEqual(expected);
  });

  it('lands a restricted sign-in on the screen that lifts the restriction', () => {
    expect(landingAfterSignIn(null)).toBe(ADMIN_HOME_ROUTE);
    expect(landingAfterSignIn('password_change')).toBe('AdminChangePassword');
    expect(landingAfterSignIn('totp_enrol')).toBe('AdminTwoFactorEnrol');
  });
});

describe('sign-in messages', () => {
  it('formats the lockout wait', () => {
    expect(formatWait(1)).toBe('in 1 second');
    expect(formatWait(45)).toBe('in 45 seconds');
    expect(formatWait(60)).toBe('in 1 minute');
    expect(formatWait(61)).toBe('in 2 minutes');
    expect(formatWait(900)).toBe('in 15 minutes');
  });

  it('tells a locked-out admin when to try again', () => {
    const error = new AdminApiError(429, 'TOO_MANY_ATTEMPTS', 'Too many', { retryAfterSeconds: 840 });
    expect(signInErrorMessage(error)).toBe('Too many failed attempts. Try again in 14 minutes.');
    expect(signInErrorMessage(new AdminApiError(429, 'TOO_MANY_ATTEMPTS', 'x'))).toBe(
      'Too many failed attempts. Try again later.'
    );
  });

  it('never says which part of the credentials was wrong', () => {
    const message = signInErrorMessage(new AdminApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    expect(message).toBe('That email and password do not match an admin account.');
  });

  it('passes network errors through and hides server internals', () => {
    expect(signInErrorMessage(new AdminApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'))).toBe(
      'Could not reach the server.'
    );
    expect(signInErrorMessage(new AdminApiError(500, 'INTERNAL_ERROR', 'TypeError: x is undefined'))).toBe(
      'Something went wrong on the server. Try again in a moment.'
    );
  });

  it('reads password problems from a WEAK_PASSWORD answer', () => {
    const error = new AdminApiError(400, 'WEAK_PASSWORD', 'x', { problems: ['This password is too common', 3] });
    expect(passwordProblems(error)).toEqual(['This password is too common']);
  });

  it('checks length and the email name locally', () => {
    expect(localPasswordProblems('short')).toEqual(['Use at least 10 characters']);
    expect(localPasswordProblems('aaaaaaaaaaaa')).toEqual(['Do not repeat a single character']);
    expect(localPasswordProblems('my-amina-password', 'amina@metromatrix.pk')).toEqual(['Do not include your email name']);
    expect(localPasswordProblems('correct horse battery')).toEqual([]);
  });
});
