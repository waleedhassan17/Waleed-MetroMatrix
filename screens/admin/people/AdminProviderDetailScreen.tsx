// ============================================================================
// One provider — a home-service provider, a doctor or a vendor. Every place in
// the console that names a provider opens this screen (screens/admin/people/
// openProvider.ts).
//
//   header     who they are, their state and rating, and quick actions:
//              call, email, and their bookings or brand
//   Analytics  what they did and were paid over 30 days / 90 days / 12 months
//   Profile    contact, work, account and documents
//   Activity   what admins have done, with reasons
//
// Decisions available in the current state sit in the footer:
//
//   pending   → approve (optional note) · reject (reason required)
//   approved  → suspend (reason required)
//   suspended → lift suspension
//   rejected  → approve
//
// Delete is in the "…" menu (reason required; refused while bookings, payouts
// or a wallet balance are open — the server's reasons are listed). Every
// decision is recorded in the audit log and shows under Activity.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AdminScreen, ConfirmSheet, PermissionGate, QueryState, Section, StatusBadge, StatusTimeline } from '../../../components/admin';
import { ActionSheet, Avatar, Button, SegmentedControl, showToast } from '../../../components/ui';
import { enumOptions, useAdminMeta } from '../../../hooks/useAdminMeta';
import { usePermission } from '../../../hooks/useAdminPermission';
import {
  adminErrorOf,
  useApproveProviderMutation,
  useDeleteProviderMutation,
  useGetProviderQuery,
  useRejectProviderMutation,
  useSuspendProviderMutation,
  useUnsuspendProviderMutation,
} from '../../../networks/admin/adminApi';
import { formatDate, formatRating } from '../../../utils/admin/format';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';
import ProviderAnalyticsPanel from './provider/ProviderAnalyticsPanel';
import ProviderProfilePanel from './provider/ProviderProfilePanel';
import type { ProviderState, ProviderView } from './provider/types';

type Action = 'approve' | 'reject' | 'suspend' | 'unsuspend' | 'delete';
type Tab = 'analytics' | 'profile' | 'activity';

const COPY: Record<Action, { title: string; message: string; label: string; destructive?: boolean; reason?: boolean; reasonLabel?: string }> = {
  approve: { title: 'Approve this provider?', message: 'They can start taking work straight away. Add a note for the record if useful.', label: 'Approve', reason: false },
  reject: { title: 'Reject this application?', message: 'The provider sees this reason and can resubmit.', label: 'Reject', destructive: true, reason: true, reasonLabel: 'Reason shown to the provider' },
  suspend: { title: 'Suspend this provider?', message: 'They are signed out and stop receiving work until the suspension is lifted.', label: 'Suspend', destructive: true, reason: true },
  unsuspend: { title: 'Lift the suspension?', message: 'They can sign in and take work again.', label: 'Lift suspension' },
  delete: {
    title: 'Delete this provider?',
    message: 'The account is removed and can no longer sign in. Bookings and payments stay in history. A super admin can restore it.',
    label: 'Delete',
    destructive: true,
    reason: true,
  },
};

const DONE: Record<Action, string> = {
  approve: 'Provider approved.',
  reject: 'Application rejected.',
  suspend: 'Provider suspended.',
  unsuspend: 'Suspension lifted.',
  delete: 'Provider deleted.',
};

const TABS: { value: Tab; label: string }[] = [
  { value: 'analytics', label: 'Analytics' },
  { value: 'profile', label: 'Profile' },
  { value: 'activity', label: 'Activity' },
];

export const actionsFor = (state?: ProviderState): Action[] => {
  switch (state) {
    case 'pending':
      return ['approve', 'reject'];
    case 'approved':
      return ['suspend'];
    case 'suspended':
      return ['unsuspend'];
    case 'rejected':
      return ['approve'];
    default:
      return [];
  }
};

export default function AdminProviderDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { providerId } = (useRoute().params ?? {}) as { providerId: string };
  const { data: meta } = useAdminMeta();
  const canDecide = usePermission('canApproveProviders');
  const query = useGetProviderQuery(providerId);
  const p = query.data as ProviderView | undefined;

  const [approve, approveState] = useApproveProviderMutation();
  const [reject, rejectState] = useRejectProviderMutation();
  const [suspend, suspendState] = useSuspendProviderMutation();
  const [unsuspend, unsuspendState] = useUnsuspendProviderMutation();
  const [remove, removeState] = useDeleteProviderMutation();
  const busy = approveState.isLoading || rejectState.isLoading || suspendState.isLoading || unsuspendState.isLoading || removeState.isLoading;

  const [tab, setTab] = useState<Tab>('analytics');
  const [menu, setMenu] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);

  const close = () => {
    setAction(null);
    setError(null);
    setBlockers([]);
  };

  const run = async (reason: string) => {
    if (!p || !action) return;
    const calls = {
      approve: () => approve({ id: p.id, notes: reason || undefined }),
      reject: () => reject({ id: p.id, reason }),
      suspend: () => suspend({ id: p.id, reason }),
      unsuspend: () => unsuspend({ id: p.id }),
      delete: () => remove({ id: p.id, reason }),
    };
    const res = await calls[action]();
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
    showToast({ tone: 'success', message: DONE[done] });
    if (done === 'delete') navigation.goBack();
  };

  const typeLabel = (value?: string | null) => (value ? enumOptions(meta, 'providerTypes').find((o) => o.value === value)?.label ?? value : null);
  const subTypeLabel = (value?: string | null) => (value ? enumOptions(meta, 'providerSubTypes').find((o) => o.value === value)?.label ?? value : null);
  const brand = p?.links?.brands?.length === 1 ? p.links.brands[0] : null;

  const quick: { icon: string; label: string; onPress: () => void }[] = p
    ? [
        ...(p.phoneNumber ? [{ icon: 'call-outline', label: 'Call', onPress: () => Linking.openURL(`tel:${p.phoneNumber}`) }] : []),
        { icon: 'mail-outline', label: 'Email', onPress: () => Linking.openURL(`mailto:${p.email}`) },
        ...(p.providerType === 'home_service'
          ? [{ icon: 'calendar-outline', label: 'Bookings', onPress: () => navigation.navigate('AdminHSBookings', { providerId: p.id, providerName: p.fullName }) }]
          : []),
        ...(brand
          ? [{ icon: 'storefront-outline', label: 'Brand', onPress: () => navigation.navigate('AdminShopping', { screen: 'AdminBrandDetail', params: { brandId: brand.id } }) }]
          : []),
      ]
    : [];

  const copy = action ? COPY[action] : null;
  const decisions = actionsFor(p?.state as ProviderState | undefined);

  return (
    <AdminScreen
      title={p?.fullName ?? 'Provider'}
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      headerActions={p && canDecide ? [{ icon: 'ellipsis-horizontal', label: 'More actions', onPress: () => setMenu(true) }] : undefined}
      footer={
        p && decisions.length ? (
          <PermissionGate all={['canApproveProviders']} fallback={null}>
            <View style={styles.footer}>
              {decisions.map((a) => (
                <Button key={a} label={COPY[a].label} variant={COPY[a].destructive ? 'destructive' : 'primary'} onPress={() => setAction(a)} style={styles.footerButton} />
              ))}
            </View>
          </PermissionGate>
        ) : undefined
      }
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} skeleton="detail" action="see this provider">
        {p && (
          <>
            <View style={styles.header}>
              <Avatar name={p.fullName} uri={p.profilePhoto} size={64} />
              <View style={styles.headerText}>
                <Text style={styles.name}>{p.fullName}</Text>
                <Text style={styles.sub}>{[subTypeLabel(p.providerSubType) || typeLabel(p.providerType), p.city].filter(Boolean).join(' · ')}</Text>
                <View style={styles.badges}>
                  <StatusBadge group="providerStates" value={p.state} />
                  {!!p.rating?.count && (
                    <Text style={styles.rating} accessibilityLabel={`Rated ${formatRating(p.rating.average, p.rating.count)}`}>
                      ★ {formatRating(p.rating.average, p.rating.count)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {quick.length > 0 && (
              <View style={styles.quick}>
                {quick.map((q) => (
                  <Pressable
                    key={q.label}
                    onPress={q.onPress}
                    style={({ pressed }) => [styles.quickItem, pressed && styles.quickPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={q.label}
                  >
                    <Ionicons name={q.icon as any} size={20} color={colors.accent} />
                    <Text style={styles.quickLabel}>{q.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {p.state === 'rejected' && !!p.rejectionReason && (
              <Text style={styles.notice}>Rejected {p.rejectedAt ? formatDate(p.rejectedAt) : ''}: “{p.rejectionReason}”</Text>
            )}
            {p.state === 'suspended' && !!p.suspendedReason && (
              <Text style={styles.notice}>Suspended {p.suspendedAt ? formatDate(p.suspendedAt) : ''}: “{p.suspendedReason}”</Text>
            )}

            <SegmentedControl options={TABS} value={tab} onChange={setTab} style={styles.tabs} />

            {tab === 'analytics' && <ProviderAnalyticsPanel providerId={p.id} />}
            {tab === 'profile' && <ProviderProfilePanel p={p} />}
            {tab === 'activity' && (
              <Section title="What admins have done" count={p.history?.length || null} card>
                <View style={styles.timeline}>
                  <StatusTimeline entries={p.history ?? []} />
                </View>
              </Section>
            )}
          </>
        )}
      </QueryState>

      <ActionSheet
        visible={menu}
        title={p?.fullName}
        options={[{ label: 'Delete provider', icon: 'trash-outline', tone: 'destructive', onPress: () => { setMenu(false); setAction('delete'); } }]}
        onClose={() => setMenu(false)}
      />

      <ConfirmSheet
        visible={!!copy}
        title={copy?.title ?? ''}
        message={copy?.message}
        confirmLabel={copy?.label ?? ''}
        destructive={copy?.destructive}
        requireReason={copy?.reason}
        reasonLabel={copy?.reasonLabel ?? 'Reason'}
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
    header: { flexDirection: 'row', alignItems: 'center', gap: S.lg, marginBottom: S.lg },
    headerText: { flex: 1, minWidth: 0 },
    name: { ...T.heading, color: c.ink },
    sub: { ...T.body, color: c.inkMuted, marginTop: 2 },
    badges: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm, flexWrap: 'wrap' },
    rating: { ...T.caption, color: c.inkMuted },
    quick: {
      flexDirection: 'row',
      marginBottom: S.lg,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    quickItem: { flex: 1, alignItems: 'center', paddingVertical: S.md, gap: S.xs },
    quickPressed: { backgroundColor: c.surfaceSunken },
    quickLabel: { ...T.caption, color: c.ink },
    notice: { ...T.body, color: c.ink, backgroundColor: c.warningSoft, padding: S.md, borderRadius: R.card, marginBottom: S.lg },
    tabs: { marginBottom: S.lg },
    timeline: { paddingTop: S.md },
    footer: { flexDirection: 'row', gap: S.sm },
    footerButton: { flex: 1 },
    blockers: { marginBottom: S.md },
    blocker: { ...T.body, color: c.ink, marginTop: S.xs },
  });
