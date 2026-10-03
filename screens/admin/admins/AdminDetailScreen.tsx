// ============================================================================
// One admin: role and permissions (super admins only), disable / enable,
// reset password, reset two-factor, and their signed-in devices.
//
// The server holds the rules and its refusal is shown as-is: you cannot change
// your own role or disable yourself, and the last active super admin cannot be
// demoted or disabled.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, EntityRow, QueryState, Section } from '../../../components/admin';
import { Button, EmptyState, showToast } from '../../../components/ui';
import { useAdminProfile, useIsSuperAdmin } from '../../../hooks/useAdminPermission';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import {
  adminErrorOf,
  useListAdminSessionsQuery,
  useListAdminsQuery,
  useResetAdminPasswordMutation,
  useResetAdminTwoFactorMutation,
  useRevokeAdminSessionMutation,
  useUpdateAdminMutation,
} from '../../../networks/admin/adminApi';
import { formatAgo, formatDate } from '../../../utils/admin/format';
import { S } from '../../../theme';
import PermissionEditor from './PermissionEditor';
import TemporaryPasswordSheet from './TemporaryPasswordSheet';

type Confirm = null | 'disable' | 'enable' | 'reset-password' | 'reset-2fa' | 'save-access' | { sessionId: string; label: string };

export default function AdminDetailScreen() {
  const { adminId } = (useRoute().params ?? {}) as { adminId: string };
  const me = useAdminProfile();
  const isSuper = useIsSuperAdmin();
  const { data: meta } = useAdminMeta();
  const admins = useListAdminsQuery();
  const sessions = useListAdminSessionsQuery(adminId);
  const [updateAdmin, updateState] = useUpdateAdminMutation();
  const [resetPassword, resetPasswordState] = useResetAdminPasswordMutation();
  const [resetTwoFactor, resetTwoFactorState] = useResetAdminTwoFactorMutation();
  const [revokeSession, revokeState] = useRevokeAdminSessionMutation();

  const target = admins.data?.find((a) => a.id === adminId);
  const isSelf = me?.id === adminId;
  const [access, setAccess] = useState<{ role: string; permissions: Record<string, boolean> } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);

  useEffect(() => {
    if (target) setAccess({ role: target.role, permissions: { ...target.permissions } });
  }, [target]);

  const accessChanged =
    !!target && !!access && (access.role !== target.role || JSON.stringify(access.permissions) !== JSON.stringify(target.permissions));

  const close = () => {
    setConfirm(null);
    setError(null);
  };

  const run = async (reason: string) => {
    if (!target) return;
    let res: { error?: unknown; data?: any };
    if (confirm === 'disable' || confirm === 'enable') {
      res = await updateAdmin({ id: target.id, isActive: confirm === 'enable', reason });
    } else if (confirm === 'save-access' && access) {
      res = await updateAdmin({ id: target.id, role: access.role, permissions: access.role === 'super_admin' ? undefined : access.permissions, reason });
    } else if (confirm === 'reset-password') {
      res = await resetPassword({ id: target.id });
    } else if (confirm === 'reset-2fa') {
      res = await resetTwoFactor({ id: target.id });
    } else if (confirm && typeof confirm === 'object') {
      res = await revokeSession({ adminId: target.id, sessionId: confirm.sessionId });
    } else return;

    if (res.error) return setError(adminErrorOf(res.error)?.message || 'That did not work.');
    const done = confirm;
    close();
    if (done === 'reset-password') setTemp(res.data.temporaryPassword);
    else if (done === 'reset-2fa') showToast({ tone: 'success', message: 'Two-factor sign-in reset. They set it up again at next sign-in.' });
    else if (done === 'disable') showToast({ tone: 'success', message: `${target.fullName} disabled and signed out.` });
    else if (done === 'enable') showToast({ tone: 'success', message: `${target.fullName} can sign in again.` });
    else if (done === 'save-access') showToast({ tone: 'success', message: 'Access updated. Their sessions were signed out.' });
    else showToast({ tone: 'success', message: 'Device signed out.' });
    sessions.refetch();
  };

  const busy = updateState.isLoading || resetPasswordState.isLoading || resetTwoFactorState.isLoading || revokeState.isLoading;
  const confirmCopy: Record<string, { title: string; message: string; label: string; destructive?: boolean; reason?: boolean }> = {
    disable: { title: `Disable ${target?.fullName}?`, message: 'They are signed out everywhere and cannot sign in until enabled again.', label: 'Disable', destructive: true, reason: true },
    enable: { title: `Enable ${target?.fullName}?`, message: 'They can sign in again with their current password.', label: 'Enable', reason: true },
    'save-access': { title: 'Save access changes?', message: 'Their sessions are signed out so the new access applies at once.', label: 'Save', reason: true },
    'reset-password': { title: 'Reset password?', message: 'Their sessions are signed out. You get a temporary password to give them; they must change it at sign-in.', label: 'Reset password', destructive: true },
    'reset-2fa': { title: 'Reset two-factor sign-in?', message: 'Use this when they lost their phone. Their sessions are signed out.', label: 'Reset two-factor', destructive: true },
  };
  const copy = confirm && typeof confirm === 'string' ? confirmCopy[confirm] : confirm ? { title: 'Sign out this device?', message: `${confirm.label} will need to sign in again.`, label: 'Sign out', destructive: true } : null;

  return (
    <AdminScreen title={target?.fullName ?? 'Admin'} refreshing={admins.isFetching && !admins.isLoading} onRefresh={() => { admins.refetch(); sessions.refetch(); }}>
      <QueryState isLoading={admins.isLoading} error={admins.error} onRetry={admins.refetch} action="manage admins">
        {!target ? (
          <EmptyState icon="person-outline" title="Admin not found" message="They may have been removed." />
        ) : (
          <>
            <Section title="Account" card>
              <DetailRow label="Email" value={target.email} />
              <DetailRow label="Status" value={target.isActive ? 'Active' : 'Disabled'} />
              <DetailRow label="Two-factor sign-in" value={target.twoFactorEnabled ? 'On' : 'Off'} />
              <DetailRow label="Last signed in" value={target.lastLoginDate ? formatAgo(target.lastLoginDate) : 'Never'} />
              <DetailRow label="Added" value={formatDate(target.createdAt)} last />
            </Section>

            {meta && access && (
              <Section
                title="Access"
                caption={isSelf ? "You can't change your own access." : !isSuper ? 'Only a super admin can change roles and permissions.' : undefined}
                card
              >
                <PermissionEditor meta={meta} role={access.role} permissions={access.permissions} onChange={setAccess} disabled={isSelf || !isSuper} />
                {isSuper && !isSelf && (
                  <Button label="Save access" onPress={() => setConfirm('save-access')} disabled={!accessChanged} fullWidth style={{ marginVertical: S.md }} />
                )}
              </Section>
            )}

            {!isSelf && (
              <Section title="Actions" card>
                <View style={{ gap: S.sm, paddingVertical: S.md }}>
                  <Button label="Reset password" variant="secondary" onPress={() => setConfirm('reset-password')} fullWidth />
                  {target.twoFactorEnabled && <Button label="Reset two-factor sign-in" variant="secondary" onPress={() => setConfirm('reset-2fa')} fullWidth />}
                  {target.isActive ? (
                    <Button label="Disable account" variant="destructive" onPress={() => setConfirm('disable')} fullWidth />
                  ) : (
                    <Button label="Enable account" variant="secondary" onPress={() => setConfirm('enable')} fullWidth />
                  )}
                </View>
              </Section>
            )}

            <Section title="Signed-in devices">
              <QueryState isLoading={sessions.isLoading} error={sessions.error} onRetry={sessions.refetch} isEmpty={!sessions.data?.length} emptyTitle="Not signed in anywhere" skeletonCount={1}>
                <View>
                  {(sessions.data ?? []).map((s, i, all) => (
                    <EntityRow
                      key={s.id}
                      icon="phone-portrait-outline"
                      title={s.deviceLabel || 'Unknown device'}
                      subtitle={`Last active ${formatAgo(s.lastUsedAt)}${s.ip ? ` · ${s.ip}` : ''}`}
                      meta={isSelf ? undefined : 'Sign out'}
                      onPress={isSelf ? undefined : () => setConfirm({ sessionId: s.id, label: s.deviceLabel || 'The device' })}
                      divider={i < all.length - 1}
                    />
                  ))}
                </View>
              </QueryState>
            </Section>
          </>
        )}
      </QueryState>

      <ConfirmSheet
        visible={!!copy}
        title={copy?.title ?? ''}
        message={copy?.message}
        confirmLabel={copy?.label ?? 'Confirm'}
        destructive={copy?.destructive}
        requireReason={copy?.reason}
        busy={busy}
        error={error}
        onConfirm={run}
        onClose={close}
      />
      <TemporaryPasswordSheet visible={!!temp} email={target?.email} password={temp} onClose={() => setTemp(null)} />
    </AdminScreen>
  );
}
