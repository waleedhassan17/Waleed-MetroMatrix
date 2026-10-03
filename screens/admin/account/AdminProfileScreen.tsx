// ============================================================================
// The signed-in admin's own account: details, password, two-factor sign-in,
// and every device currently signed in (each can be signed out from here).
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, EntityRow, QueryState, Section } from '../../../components/admin';
import { Button, FormSheet, ListRow, TextField, ToneBadge, showToast } from '../../../components/ui';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import { useAdminProfile } from '../../../hooks/useAdminPermission';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import { useAdminSignOut } from '../../../hooks/useAdminSignOut';
import {
  adminErrorOf,
  useListMySessionsQuery,
  useRevokeMySessionMutation,
  useUpdateMyProfileMutation,
  type AdminSession,
} from '../../../networks/admin/adminApi';
import { disableTwoFactor, fetchAdminProfile } from '../../../networks/admin/auth';
import { toAdminApiError } from '../../../networks/admin/errors';
import { adminProfileReceived } from '../auth/adminAuthSlice';
import { formatAgo, formatDate } from '../../../utils/admin/format';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';

type Editing = null | 'name' | 'email';

export default function AdminProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const admin = useAdminProfile();
  const { data: meta } = useAdminMeta();
  const signOut = useAdminSignOut();

  const sessions = useListMySessionsQuery();
  const [revoke, revokeState] = useRevokeMySessionMutation();
  const [updateProfile, updateState] = useUpdateMyProfileMutation();

  const [editing, setEditing] = useState<Editing>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AdminSession | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableBusy, setDisableBusy] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  const permissionLabels = (meta?.permissions ?? []).filter((p) => admin?.permissions?.[p.key]).map((p) => p.label);
  const roleLabel = (meta?.roles as { value?: string; label?: string }[] | undefined)?.find((r) => r.value === admin?.role)?.label;

  const openEdit = (what: Editing) => {
    setName(admin?.fullName ?? '');
    setEmail(admin?.email ?? '');
    setPassword('');
    setFormError(null);
    setEditing(what);
  };

  const saveProfile = async () => {
    const body = editing === 'name' ? { fullName: name.trim() } : { email: email.trim(), currentPassword: password };
    if (editing === 'name' && !body.fullName) return setFormError('Enter your name.');
    const res = await updateProfile(body);
    if ('error' in res) return setFormError(adminErrorOf(res.error)?.message || 'Could not save.');
    dispatch(adminProfileReceived(res.data));
    setEditing(null);
    showToast({ tone: 'success', message: editing === 'name' ? 'Name updated.' : 'Sign-in email updated.' });
  };

  const confirmRevoke = async () => {
    if (!revoking) return;
    const res = await revoke(revoking.id);
    setRevoking(null);
    if ('error' in res) return showToast({ tone: 'error', message: adminErrorOf(res.error)?.message || 'Could not sign that device out.' });
    if (res.data.current) await signOut();
    else showToast({ tone: 'success', message: 'Device signed out.' });
  };

  const turnOffTwoFactor = async () => {
    setDisableBusy(true);
    setDisableError(null);
    try {
      const code = disableCode.trim();
      await disableTwoFactor({ currentPassword: disablePassword, ...(/^\d{6}$/.test(code) ? { code } : { recoveryCode: code }) });
      dispatch(adminProfileReceived(await fetchAdminProfile()));
      setDisabling(false);
      showToast({ tone: 'success', message: 'Two-factor sign-in is off.' });
    } catch (err) {
      setDisableError(toAdminApiError(err).message);
    } finally {
      setDisableBusy(false);
    }
  };

  return (
    <AdminScreen title="Profile and security">
      <Section title="Details" card>
        <DetailRow label="Name" value={admin?.fullName} />
        <DetailRow label="Sign-in email" value={admin?.email} />
        <DetailRow label="Role" value={roleLabel || admin?.role} />
        <DetailRow label="Member since" value={formatDate(admin?.createdAt)} last />
        <View style={styles.actions}>
          <Button label="Edit name" variant="secondary" onPress={() => openEdit('name')} />
          <Button label="Change email" variant="secondary" onPress={() => openEdit('email')} />
        </View>
      </Section>

      <Section title="What you can do" caption={admin?.isSuperAdmin ? 'Super admins have every permission.' : undefined} card>
        {permissionLabels.length ? (
          <View style={styles.perms}>
            {permissionLabels.map((label) => (
              <ToneBadge key={label} label={label} tone="neutral" />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No permissions yet. Ask a super admin.</Text>
        )}
      </Section>

      <Section title="Security" card>
        <ListRow title="Change password" icon="key-outline" onPress={() => navigation.navigate('AdminChangePassword')} divider />
        {admin?.twoFactorEnabled ? (
          <ListRow title="Two-factor sign-in" subtitle="On" icon="shield-checkmark-outline" value="Turn off" onPress={() => setDisabling(true)} />
        ) : (
          <ListRow title="Two-factor sign-in" subtitle="Off — recommended" icon="shield-outline" value="Turn on" onPress={() => navigation.navigate('AdminTwoFactorEnrol')} />
        )}
      </Section>

      <Section title="Signed-in devices" caption="Sign out any device you don't recognise.">
        <QueryState isLoading={sessions.isLoading} error={sessions.error} onRetry={sessions.refetch} skeletonCount={2}>
          <View style={styles.card}>
            {(sessions.data ?? []).map((s, i, all) => (
              <EntityRow
                key={s.id}
                icon="phone-portrait-outline"
                title={s.deviceLabel || 'Unknown device'}
                subtitle={`Last active ${formatAgo(s.lastUsedAt)}${s.ip ? ` · ${s.ip}` : ''}`}
                badge={s.current ? { label: 'This device', tone: 'accent' } : null}
                meta="Sign out"
                onPress={() => setRevoking(s)}
                divider={i < all.length - 1}
              />
            ))}
          </View>
        </QueryState>
      </Section>

      <FormSheet
        visible={editing !== null}
        title={editing === 'name' ? 'Edit name' : 'Change sign-in email'}
        onClose={() => setEditing(null)}
        busy={updateState.isLoading}
        footer={<Button label="Save" onPress={saveProfile} loading={updateState.isLoading} fullWidth size="lg" />}
      >
        {editing === 'name' ? (
          <TextField label="Name" value={name} onChangeText={setName} autoFocus error={formError} />
        ) : (
          <>
            <TextField label="New email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoFocus />
            <TextField label="Current password" value={password} onChangeText={setPassword} secureTextEntry helper="Needed to change the email you sign in with." error={formError} />
          </>
        )}
      </FormSheet>

      <ConfirmSheet
        visible={!!revoking}
        title={revoking?.current ? 'Sign out this device?' : 'Sign out this device?'}
        message={revoking?.current ? 'This is the device you are using. You will need to sign in again.' : `${revoking?.deviceLabel || 'The device'} will need to sign in again.`}
        confirmLabel="Sign out"
        destructive
        busy={revokeState.isLoading}
        onConfirm={confirmRevoke}
        onClose={() => setRevoking(null)}
      />

      <FormSheet
        visible={disabling}
        title="Turn off two-factor sign-in?"
        subtitle="Signing in will need only your password."
        onClose={() => setDisabling(false)}
        busy={disableBusy}
        footer={<Button label="Turn off" variant="destructive" onPress={turnOffTwoFactor} loading={disableBusy} disabled={!disablePassword || !disableCode} fullWidth size="lg" />}
      >
        <TextField label="Current password" value={disablePassword} onChangeText={setDisablePassword} secureTextEntry />
        <TextField label="Code or recovery code" value={disableCode} onChangeText={setDisableCode} autoCapitalize="none" error={disableError} />
      </FormSheet>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    actions: { flexDirection: 'row', gap: S.sm, paddingVertical: S.md },
    perms: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingVertical: S.md },
    muted: { ...T.body, color: c.inkMuted, paddingVertical: S.md },
    card: { borderRadius: R.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, backgroundColor: c.surface, paddingHorizontal: S.lg },
  });
