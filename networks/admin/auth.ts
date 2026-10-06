// ============================================================================
// Admin console authentication — sign-in, two-factor, password, sessions.
//
// All calls go through the typed client, so the paths and bodies are checked
// against the backend contract. Tokens are stored by networks/admin/session.ts
// and never pass through Redux.
//
// Sign-in is one or two steps:
//   signInAdmin(email, password)         → signed_in | totp_required
//   verifyAdminTotp(challenge, {code})   → signed_in
// A signed-in result can carry `restrict` ('password_change' | 'totp_enrol'):
// the server only accepts the calls needed to fix that until it is fixed.
// ============================================================================

import { Platform } from 'react-native';
import { adminApi, AdminApiError, type Schemas } from './client';
import { clearAdminSession, saveAdminSession, tokensFrom } from './session';
import { KeyForStorage, clearAuthData, removeData, retrieveData, saveData } from '../../utils/storage_utils/storageUtils';

export type AdminProfile = Schemas['AdminProfile'];
export type AdminPermissions = Schemas['Permissions'];
export type AdminSessionInfo = Schemas['Session'];
export type SessionRestriction = 'password_change' | 'totp_enrol' | null;

export type SignInResult =
  | { step: 'signed_in'; admin: AdminProfile; restrict: SessionRestriction }
  | { step: 'totp_required'; challengeToken: string; expiresInSeconds?: number };

export const restrictionFrom = (value: unknown): SessionRestriction =>
  value === 'password_change' || value === 'totp_enrol' ? value : null;

// Shown in the admin's session list ("Android app · last used 2 min ago").
const deviceLabel = (): string =>
  `${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'} app`;

async function completeSignIn(data: Schemas['LoginResult']): Promise<SignInResult> {
  if (data.step === 'totp_required') {
    if (!data.challengeToken) throw new AdminApiError(0, 'INVALID_RESPONSE', 'The server sent an incomplete sign-in response.');
    return { step: 'totp_required', challengeToken: data.challengeToken, expiresInSeconds: data.expiresInSeconds };
  }
  const tokens = tokensFrom(data);
  if (!tokens || !data.admin) {
    throw new AdminApiError(0, 'INVALID_RESPONSE', 'The server sent an incomplete sign-in response.');
  }
  // Switching accounts on this device: a customer or provider session left
  // in storage must not ride along with the admin one.
  await clearAuthData();
  await saveAdminSession(tokens);
  // Tells the next launch to resume the admin console (landingRoute.ts).
  await saveData(KeyForStorage.userType, 'admin');
  return { step: 'signed_in', admin: data.admin, restrict: restrictionFrom(data.restrict) };
}

export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  const { data } = await adminApi.post('/api/admin/auth/login', {
    body: { email: email.trim().toLowerCase(), password, deviceLabel: deviceLabel() },
  });
  return completeSignIn(data);
}

export async function verifyAdminTotp(
  challengeToken: string,
  second: { code: string } | { recoveryCode: string }
): Promise<SignInResult> {
  const { data } = await adminApi.post('/api/admin/auth/login/totp', {
    body: { challengeToken, ...second, deviceLabel: deviceLabel() },
  });
  return completeSignIn(data);
}

/**
 * Sign out this device (or every device). Local tokens are cleared even when
 * the server cannot be reached — signing out must always work.
 */
export async function signOutAdmin({ everywhere = false }: { everywhere?: boolean } = {}): Promise<void> {
  try {
    await adminApi.post(everywhere ? '/api/admin/auth/logout-all' : '/api/admin/auth/logout');
  } catch {
    // Offline or already expired: the local session still goes.
  } finally {
    await clearAdminSession();
    if ((await retrieveData(KeyForStorage.userType)) === 'admin') await removeData(KeyForStorage.userType);
  }
}

export const fetchAdminProfile = async (): Promise<AdminProfile> => (await adminApi.get('/api/admin/profile')).data;

export const updateAdminProfile = async (body: { fullName?: string; email?: string; currentPassword?: string }) =>
  (await adminApi.put('/api/admin/profile', { body })).data;

export const changeAdminPassword = async (currentPassword: string, newPassword: string) =>
  (await adminApi.put('/api/admin/change-password', { body: { currentPassword, newPassword } })).data;

export const startTwoFactorEnrolment = async (currentPassword: string) =>
  (await adminApi.post('/api/admin/auth/2fa/enrol', { body: { currentPassword } })).data;

export const confirmTwoFactor = async (code: string) =>
  (await adminApi.post('/api/admin/auth/2fa/verify', { body: { code } })).data;

export const disableTwoFactor = async (body: { currentPassword: string; code?: string; recoveryCode?: string }) =>
  (await adminApi.post('/api/admin/auth/2fa/disable', { body })).data;

export const listMySessions = async (): Promise<AdminSessionInfo[]> => (await adminApi.get('/api/admin/sessions')).data;

export const revokeMySession = async (sessionId: string) =>
  (await adminApi.delete('/api/admin/sessions/{sessionId}', { params: { sessionId } })).data;
