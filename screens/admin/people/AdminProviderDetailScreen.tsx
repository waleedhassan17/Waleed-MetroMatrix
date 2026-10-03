// ============================================================================
// One provider: who they are, their documents, what admins have done, and the
// decisions available in their current state.
//
//   pending   → approve (optional note) · reject (reason required)
//   approved  → suspend (reason required)
//   suspended → lift suspension
//   rejected  → approve
//   any       → delete (reason required; refused while bookings, payouts or a
//               wallet balance are open — the server's reasons are listed)
//
// Every decision is recorded in the audit log with its reason and shows up in
// the history below.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, PermissionGate, QueryState, Section, StatusBadge, StatusTimeline } from '../../../components/admin';
import { Avatar, Button, ListRow, showToast } from '../../../components/ui';
import { formatMoney } from '../../../constants/Currency';
import { enumOptions, useAdminMeta } from '../../../hooks/useAdminMeta';
import {
  adminErrorOf,
  useApproveProviderMutation,
  useDeleteProviderMutation,
  useGetProviderQuery,
  useRejectProviderMutation,
  useSuspendProviderMutation,
  useUnsuspendProviderMutation,
} from '../../../networks/admin/adminApi';
import { formatDate, formatDateTime, formatRating } from '../../../utils/admin/format';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';

type Action = 'approve' | 'reject' | 'suspend' | 'unsuspend' | 'delete';

type Detail = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  providerType: string;
  providerSubType?: string | null;
  city?: string | null;
  profilePhoto?: string | null;
  state: 'incomplete' | 'pending' | 'approved' | 'rejected' | 'suspended';
  submittedAt?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  rating?: { average?: number | null; count?: number } | null;
  emailVerified?: boolean;
  idNumber?: string | null;
  address?: string | null;
  experience?: number | null;
  briefDescription?: string | null;
  rate?: number | null;
  consultationFee?: number | null;
  professionalName?: string | null;
  businessName?: string | null;
  specialty?: string | null;
  profession?: string | null;
  category?: string | null;
  documents?: Record<string, { name?: string; url?: string; uploadedAt?: string; verified?: boolean } | undefined>;
  adminNotes?: string | null;
  history?: { id: string; action: string; actor?: { name?: string }; reason?: string | null; createdAt: string }[];
};

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

// "medicalLicense" → "Medical license"
const documentLabel = (key: string) => {
  const words = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// A national ID shown in full is more than the screen needs.
const maskId = (id?: string | null) => (id ? `•••• ${id.replace(/\D/g, '').slice(-4)}` : null);

export default function AdminProviderDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { providerId } = (useRoute().params ?? {}) as { providerId: string };
  const { data: meta } = useAdminMeta();
  const query = useGetProviderQuery(providerId);
  const p = query.data as Detail | undefined;

  const [approve, approveState] = useApproveProviderMutation();
  const [reject, rejectState] = useRejectProviderMutation();
  const [suspend, suspendState] = useSuspendProviderMutation();
  const [unsuspend, unsuspendState] = useUnsuspendProviderMutation();
  const [remove, removeState] = useDeleteProviderMutation();
  const busy = approveState.isLoading || rejectState.isLoading || suspendState.isLoading || unsuspendState.isLoading || removeState.isLoading;

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
        setError("Settle these first, then try again.");
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
  const documents = Object.entries(p?.documents ?? {}).filter(([, d]) => d?.url);

  const actionsFor = (state?: Detail['state']): Action[] => {
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

  const copy = action ? COPY[action] : null;

  return (
    <AdminScreen
      title={p?.fullName ?? 'Provider'}
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      footer={
        p && actionsFor(p.state).length ? (
          <PermissionGate all={['canApproveProviders']} fallback={null}>
            <View style={styles.footer}>
              {actionsFor(p.state).map((a) => (
                <Button key={a} label={COPY[a].label} variant={COPY[a].destructive ? 'destructive' : 'primary'} onPress={() => setAction(a)} style={styles.footerButton} />
              ))}
            </View>
          </PermissionGate>
        ) : undefined
      }
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} action="see this provider">
        {p && (
          <>
            <View style={styles.header}>
              <Avatar name={p.fullName} uri={p.profilePhoto} size={64} />
              <View style={styles.headerText}>
                <Text style={styles.name}>{p.fullName}</Text>
                <Text style={styles.sub}>{[subTypeLabel(p.providerSubType) || typeLabel(p.providerType), p.city].filter(Boolean).join(' · ')}</Text>
                <StatusBadge group="providerStates" value={p.state} style={styles.badge} />
              </View>
            </View>

            {p.state === 'rejected' && !!p.rejectionReason && (
              <Text style={styles.notice}>Rejected {p.rejectedAt ? formatDate(p.rejectedAt) : ''}: “{p.rejectionReason}”</Text>
            )}
            {p.state === 'suspended' && !!p.suspendedReason && (
              <Text style={styles.notice}>Suspended {p.suspendedAt ? formatDate(p.suspendedAt) : ''}: “{p.suspendedReason}”</Text>
            )}

            <Section title="Contact" card>
              <DetailRow label="Email" value={p.email} />
              <DetailRow label="Email verified" value={p.emailVerified ? 'Yes' : 'No'} />
              <DetailRow label="Phone" value={p.phoneNumber} />
              <DetailRow label="Address" value={p.address} />
              <DetailRow label="ID number" value={maskId(p.idNumber)} last />
            </Section>

            <Section title="Profile" card>
              <DetailRow label="Business name" value={p.businessName} />
              <DetailRow label="Professional name" value={p.professionalName} />
              <DetailRow label="Specialty or profession" value={p.specialty || p.profession || p.category} />
              <DetailRow label="Experience" value={p.experience === null || p.experience === undefined ? null : `${p.experience} year${p.experience === 1 ? '' : 's'}`} />
              <DetailRow label={p.consultationFee !== null && p.consultationFee !== undefined ? 'Consultation fee' : 'Rate'} value={formatMoney(p.consultationFee ?? p.rate)} />
              <DetailRow label="Rating" value={formatRating(p.rating?.average, p.rating?.count)} />
              <DetailRow label="Signed up" value={formatDateTime(p.createdAt)} />
              <DetailRow label="Submitted for review" value={p.submittedAt ? formatDateTime(p.submittedAt) : null} last />
              {!!p.briefDescription && <Text style={styles.description}>{p.briefDescription}</Text>}
            </Section>

            <Section title="Documents" caption={documents.length ? undefined : 'Nothing uploaded.'} card={documents.length > 0}>
              {documents.map(([key, d], i) => (
                <ListRow
                  key={key}
                  title={documentLabel(key)}
                  subtitle={d?.uploadedAt ? `Uploaded ${formatDate(d.uploadedAt)}` : d?.name}
                  icon="document-text-outline"
                  value="Open"
                  onPress={() => d?.url && Linking.openURL(d.url)}
                  divider={i < documents.length - 1}
                />
              ))}
            </Section>

            <Section title="History" card>
              <View style={styles.timeline}>
                <StatusTimeline entries={p.history ?? []} />
              </View>
            </Section>

            <PermissionGate all={['canApproveProviders']} fallback={null}>
              <Button label="Delete provider" variant="ghost" onPress={() => setAction('delete')} fullWidth />
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
    badge: { alignSelf: 'flex-start', marginTop: S.sm },
    notice: { ...T.body, color: c.ink, backgroundColor: c.warningSoft, padding: S.md, borderRadius: R.card, marginBottom: S.lg },
    description: { ...T.body, color: c.ink, paddingVertical: S.md },
    timeline: { paddingTop: S.md },
    footer: { flexDirection: 'row', gap: S.sm },
    footerButton: { flex: 1 },
    blockers: { marginBottom: S.md },
    blocker: { ...T.body, color: c.ink, marginTop: S.xs },
  });
