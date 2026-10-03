// ============================================================================
// One customer: contact details, what they have done on the platform
// (bookings, appointments, orders, posts), their wallet balance, the admin
// history on the account, and activate / deactivate / delete.
//
// Delete is refused while something is still open — a booking in progress, an
// upcoming appointment, an undelivered order, money in the wallet — and the
// server's reasons are listed so the admin knows what to settle first.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, KpiGrid, KpiTile, PermissionGate, QueryState, Section, StatusTimeline } from '../../../components/admin';
import { Avatar, Button, ToneBadge, showToast } from '../../../components/ui';
import { formatMoney } from '../../../constants/Currency';
import {
  adminErrorOf,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useDeleteUserMutation,
  useGetUserQuery,
} from '../../../networks/admin/adminApi';
import { formatAgo, formatCount, formatDateTime } from '../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../theme';

type Action = 'activate' | 'deactivate' | 'delete';

type Detail = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  profilePhoto?: string | null;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  address?: string | null;
  gender?: string | null;
  counts?: { bookings?: number; appointments?: number; orders?: number; posts?: number };
  wallet?: { balance: number; currency?: string } | null;
  history?: { id: string; action: string; actor?: { name?: string }; reason?: string | null; createdAt: string }[];
};

const COPY: Record<Action, { title: string; message: string; label: string; destructive?: boolean; reason?: boolean }> = {
  activate: { title: 'Reactivate this customer?', message: 'They can sign in and use the app again.', label: 'Reactivate' },
  deactivate: { title: 'Deactivate this customer?', message: 'They are signed out and cannot sign in until reactivated.', label: 'Deactivate', destructive: true, reason: true },
  delete: {
    title: 'Delete this customer?',
    message: 'The account is removed and can no longer sign in. Bookings, orders and payments stay in history. A super admin can restore it.',
    label: 'Delete',
    destructive: true,
    reason: true,
  },
};

export default function AdminUserDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { userId } = (useRoute().params ?? {}) as { userId: string };
  const query = useGetUserQuery(userId);
  const u = query.data as Detail | undefined;

  const [activate, activateState] = useActivateUserMutation();
  const [deactivate, deactivateState] = useDeactivateUserMutation();
  const [remove, removeState] = useDeleteUserMutation();
  const busy = activateState.isLoading || deactivateState.isLoading || removeState.isLoading;

  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);

  const close = () => {
    setAction(null);
    setError(null);
    setBlockers([]);
  };

  const run = async (reason: string) => {
    if (!u || !action) return;
    const res =
      action === 'activate'
        ? await activate({ id: u.id })
        : action === 'deactivate'
          ? await deactivate({ id: u.id, reason })
          : await remove({ id: u.id, reason });
    if ('error' in res) {
      const err = adminErrorOf(res.error);
      if (err?.code === 'DELETE_BLOCKED') {
        const reasons = (err.details as { reasons?: { message?: string }[] } | undefined)?.reasons ?? [];
        setBlockers(reasons.map((r) => r.message).filter((m): m is string => !!m));
        setError('Settle these first, then try again.');
      } else {
        setError(err?.message || 'That did not work.');
      }
      return;
    }
    const done = action;
    close();
    showToast({ tone: 'success', message: done === 'delete' ? 'Customer deleted.' : done === 'activate' ? 'Customer reactivated.' : 'Customer deactivated.' });
    if (done === 'delete') navigation.goBack();
  };

  const copy = action ? COPY[action] : null;

  return (
    <AdminScreen
      title={u?.fullName ?? 'Customer'}
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      footer={
        u ? (
          <PermissionGate all={['canManageUsers']} fallback={null}>
            <Button
              label={u.isActive ? 'Deactivate' : 'Reactivate'}
              variant={u.isActive ? 'destructive' : 'primary'}
              onPress={() => setAction(u.isActive ? 'deactivate' : 'activate')}
              fullWidth
              size="lg"
            />
          </PermissionGate>
        ) : undefined
      }
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} action="see this customer">
        {u && (
          <>
            <View style={styles.header}>
              <Avatar name={u.fullName} uri={u.profilePhoto} size={64} />
              <View style={styles.headerText}>
                <Text style={styles.name}>{u.fullName}</Text>
                <Text style={styles.sub}>{u.email}</Text>
                <ToneBadge label={u.isActive ? 'Active' : 'Deactivated'} tone={u.isActive ? 'success' : 'error'} style={styles.badge} />
              </View>
            </View>

            <Section title="Activity" caption="All time">
              <KpiGrid>
                <KpiTile label="Home-service bookings" value={formatCount(u.counts?.bookings)} />
                <KpiTile label="Appointments" value={formatCount(u.counts?.appointments)} />
                <KpiTile label="Orders" value={formatCount(u.counts?.orders)} />
                <KpiTile label="Wallet balance" value={u.wallet ? formatMoney(u.wallet.balance, { code: u.wallet.currency }) : 'No wallet'} />
              </KpiGrid>
            </Section>

            <Section title="Contact" card>
              <DetailRow label="Phone" value={u.phoneNumber} />
              <DetailRow label="Email verified" value={u.emailVerified === undefined ? null : u.emailVerified ? 'Yes' : 'No'} />
              <DetailRow label="Address" value={u.address} />
              <DetailRow label="Joined" value={formatDateTime(u.createdAt)} />
              <DetailRow label="Last signed in" value={u.lastLoginAt ? formatAgo(u.lastLoginAt) : 'Never'} last />
            </Section>

            <Section title="History" card>
              <View style={styles.timeline}>
                <StatusTimeline entries={u.history ?? []} />
              </View>
            </Section>

            <PermissionGate all={['canManageUsers']} fallback={null}>
              <Button label="Delete customer" variant="ghost" onPress={() => setAction('delete')} fullWidth />
            </PermissionGate>
          </>
        )}
      </QueryState>

      <ConfirmSheet
        visible={!!copy}
        title={copy?.title ?? ''}
        message={copy?.message}
        confirmLabel={copy?.label ?? ''}
        destructive={copy?.destructive}
        requireReason={copy?.reason}
        busy={busy}
        error={error}
        onConfirm={run}
        onClose={close}
      >
        {blockers.length > 0 && (
          <View style={styles.blockers} accessibilityLiveRegion="polite">
            {blockers.map((b) => (
              <Text key={b} style={styles.blocker}>
                • {b}
              </Text>
            ))}
          </View>
        )}
      </ConfirmSheet>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: S.lg, marginBottom: S.xl },
    headerText: { flex: 1, minWidth: 0 },
    name: { ...T.heading, color: c.ink },
    sub: { ...T.body, color: c.inkMuted, marginTop: 2 },
    badge: { alignSelf: 'flex-start', marginTop: S.sm },
    timeline: { paddingTop: S.md },
    blockers: { marginBottom: S.md },
    blocker: { ...T.body, color: c.ink, marginTop: S.xs },
  });
