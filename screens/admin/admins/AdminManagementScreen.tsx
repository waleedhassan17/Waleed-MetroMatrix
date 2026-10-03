// ============================================================================
// Admins — who has access to the console, with what role, and whether they
// use two-factor sign-in. Super admins add admins here; the new admin gets a
// temporary password shown once and must change it at first sign-in.
// ============================================================================

import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, EntityRow, PermissionGate, QueryState } from '../../../components/admin';
import { Button, FormSheet, TextField, showToast } from '../../../components/ui';
import { useIsSuperAdmin } from '../../../hooks/useAdminPermission';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import { adminErrorOf, useCreateAdminMutation, useListAdminsQuery } from '../../../networks/admin/adminApi';
import { formatAgo } from '../../../utils/admin/format';
import PermissionEditor from './PermissionEditor';
import TemporaryPasswordSheet from './TemporaryPasswordSheet';

export default function AdminManagementScreen() {
  const navigation = useNavigation<any>();
  const isSuper = useIsSuperAdmin();
  const { data: meta } = useAdminMeta();
  const admins = useListAdminsQuery();
  const [create, createState] = useCreateAdminMutation();

  const [adding, setAdding] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [access, setAccess] = useState<{ role: string; permissions: Record<string, boolean> }>({ role: 'moderator', permissions: {} });
  const [error, setError] = useState<string | null>(null);
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

  const startAdding = () => {
    const preset = (meta?.roles as { value: string; preset?: Record<string, boolean> }[] | undefined)?.find((r) => r.value === 'moderator')?.preset;
    setFullName('');
    setEmail('');
    setAccess({ role: 'moderator', permissions: { ...(preset ?? {}) } });
    setError(null);
    setAdding(true);
  };

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) return setError('Enter a name and an email.');
    const res = await create({ fullName: fullName.trim(), email: email.trim().toLowerCase(), role: access.role, permissions: access.permissions });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'Could not add the admin.');
    setAdding(false);
    setTemp({ email: res.data.admin.email, password: res.data.temporaryPassword });
    showToast({ tone: 'success', message: `${res.data.admin.fullName} added.` });
  };

  const roleLabel = (value: string) => (meta?.roles as { value: string; label: string }[] | undefined)?.find((r) => r.value === value)?.label ?? value;

  return (
    <AdminScreen
      title="Admins"
      refreshing={admins.isFetching && !admins.isLoading}
      onRefresh={admins.refetch}
      footer={isSuper ? <Button label="Add admin" icon="person-add-outline" onPress={startAdding} fullWidth size="lg" /> : undefined}
    >
      <PermissionGate all={['canManageAdmins']} action="manage admins">
        <QueryState isLoading={admins.isLoading} error={admins.error} onRetry={admins.refetch} isEmpty={!admins.data?.length} emptyTitle="No admins">
          <View>
            {(admins.data ?? []).map((a, i, all) => (
              <EntityRow
                key={a.id}
                avatar={{ name: a.fullName, uri: a.avatar }}
                title={a.fullName}
                subtitle={`${a.email} · ${a.lastLoginDate ? `last signed in ${formatAgo(a.lastLoginDate)}` : 'never signed in'}`}
                badge={
                  !a.isActive
                    ? { label: 'Disabled', tone: 'error' }
                    : { label: `${roleLabel(a.role)}${a.twoFactorEnabled ? ' · 2FA' : ''}`, tone: a.isSuperAdmin ? 'accent' : 'neutral' }
                }
                onPress={() => navigation.navigate('AdminDetail', { adminId: a.id })}
                divider={i < all.length - 1}
              />
            ))}
          </View>
        </QueryState>
      </PermissionGate>

      <FormSheet
        visible={adding}
        title="Add admin"
        subtitle="They sign in with a temporary password and choose their own."
        onClose={() => setAdding(false)}
        busy={createState.isLoading}
        footer={<Button label="Add admin" onPress={submit} loading={createState.isLoading} fullWidth size="lg" />}
      >
        <TextField label="Full name" value={fullName} onChangeText={setFullName} autoFocus />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={error} />
        {meta && <PermissionEditor meta={meta} role={access.role} permissions={access.permissions} onChange={setAccess} />}
      </FormSheet>

      <TemporaryPasswordSheet visible={!!temp} email={temp?.email} password={temp?.password ?? null} onClose={() => setTemp(null)} />
    </AdminScreen>
  );
}
