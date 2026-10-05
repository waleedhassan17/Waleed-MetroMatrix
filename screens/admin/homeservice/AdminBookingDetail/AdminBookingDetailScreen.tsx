// ============================================================================
// One home-service booking: what, who, when, money, its status history, and
// the two audited admin actions.
//
//  - Change status (reason required). The server's state machine decides what
//    is allowed; its refusal is shown as it is.
//  - Refund (needs Home services + Finance). The server caps refunds at what
//    the customer paid minus earlier refunds; the remaining amount is shown
//    and is the default.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { EntityRow, AdminScreen, ConfirmSheet, DetailRow, FilterChips, PermissionGate, QueryState, Section, StatusBadge } from '../../../../components/admin';
import { Button, ListRow, TextField, ToneBadge, showToast } from '../../../../components/ui';
import type { Tone } from '../../../../constants/theme';
import { formatMoney } from '../../../../constants/Currency';
import { enumOptions, presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import { useForceHSBookingStatusMutation, useGetHSBookingQuery, useRefundHSBookingMutation } from '../../../../networks/admin/homeServicesApi';
import { formatDateTime } from '../../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import { categoryLabel } from '../labels';
import { openProvider } from '../../people/openProvider';

const PAYMENT: Record<string, { label: string; tone: Tone }> = {
  unpaid: { label: 'Unpaid', tone: 'warning' },
  requested: { label: 'Payment requested', tone: 'info' },
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export default function AdminBookingDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { bookingId } = (useRoute().params ?? {}) as { bookingId: string };
  const { data: meta } = useAdminMeta();
  const query = useGetHSBookingQuery(bookingId);
  const b = query.data;
  const [forceStatus, forceState] = useForceHSBookingStatusMutation();
  const [refund, refundState] = useRefundHSBookingMutation();

  const [sheet, setSheet] = useState<null | 'status' | 'refund'>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setSheet(null);
    setError(null);
    setTarget(null);
    setAmount('');
  };

  const confirm = async (reason: string) => {
    if (!b) return;
    if (sheet === 'status') {
      if (!target) return setError('Choose the new status.');
      const res = await forceStatus({ id: b.id, status: target, reason });
      if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The status could not be changed.');
      close();
      showToast({ tone: 'success', message: `Status changed to ${presentStatus(meta, 'bookingStatuses', target).label}.` });
    } else if (sheet === 'refund') {
      const value = amount.trim() ? Number(amount) : undefined;
      if (value !== undefined && !(value > 0)) return setError('Enter an amount above 0, or leave it empty to refund the rest.');
      const res = await refund({ id: b.id, amount: value, reason });
      if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The refund did not go through.');
      close();
      showToast({ tone: 'success', message: `${formatMoney(res.data.amount)} refunded to the customer's wallet.` });
    }
  };

  const statusOptions = enumOptions(meta, 'bookingStatuses').filter((o) => o.value !== b?.status);
  const remaining = b?.refund?.remaining;

  return (
    <AdminScreen
      title="Booking"
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      footer={
        b ? (
          <PermissionGate all={['canManageHomeServices']} fallback={null}>
            <View style={styles.footer}>
              <Button label="Change status" variant="secondary" onPress={() => setSheet('status')} style={styles.footerButton} />
              <PermissionGate all={['canManageFinance']} fallback={null}>
                <Button
                  label="Refund"
                  variant="secondary"
                  onPress={() => setSheet('refund')}
                  disabled={b.payment.status !== 'paid' || remaining === 0}
                  style={styles.footerButton}
                />
              </PermissionGate>
            </View>
          </PermissionGate>
        ) : undefined
      }
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} action="see this booking">
        {b && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{categoryLabel(meta, b.serviceType || b.serviceCategory)}</Text>
              <Text style={styles.sub}>Booked {formatDateTime(b.createdAt)}</Text>
              <StatusBadge group="bookingStatuses" value={b.status} style={styles.badge} />
            </View>

            <Section title="Job" card>
              <DetailRow label="Scheduled for" value={formatDateTime(b.scheduledFor)} />
              <DetailRow label="Address" value={[b.address?.line1, b.address?.area, b.address?.city || b.city].filter(Boolean).join(', ')} />
              <DetailRow label="Description" value={b.description} />
              <DetailRow label="Instructions" value={b.instructions} last />
            </Section>

            <Section title="People" card>
              <EntityRow
                avatar={{ name: b.customer?.name }}
                title={b.customer?.name ?? 'Customer removed'}
                subtitle={b.customer ? `Customer · ${b.customer.email}` : 'Customer'}
                onPress={b.customer ? () => navigation.navigate('AdminUserDetail', { userId: b.customer!.id }) : undefined}
              />
              <EntityRow
                avatar={{ name: b.provider?.name }}
                icon={b.provider ? undefined : 'person-outline'}
                title={b.provider?.name ?? 'Not assigned'}
                subtitle={b.provider ? `Provider · ${b.provider.email}` : 'Provider'}
                onPress={b.provider ? () => openProvider(navigation, b.provider!.id) : undefined}
                accessibilityLabel={b.provider ? `Provider ${b.provider.name}. Opens their details and analytics.` : 'No provider assigned'}
                divider={false}
              />
            </Section>

            <Section title="Money" card>
              <DetailRow label="Price" value={formatMoney(b.price)} />
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment</Text>
                <ToneBadge
                  label={`${PAYMENT[b.payment.status]?.label ?? b.payment.status}${b.payment.method ? ` · ${b.payment.method}` : ''}`}
                  tone={PAYMENT[b.payment.status]?.tone ?? 'neutral'}
                />
              </View>
              <DetailRow label="Paid" value={b.payment.paidAt ? formatDateTime(b.payment.paidAt) : null} />
              {b.refund && <DetailRow label="Refunded so far" value={formatMoney(b.refund.refunded)} />}
              {b.refund && <DetailRow label="Still refundable" value={formatMoney(b.refund.remaining)} last />}
            </Section>

            {(b.dispute || b.review || b.cancellation) && (
              <Section title="Afterwards" card>
                {b.cancellation && <DetailRow label="Cancelled" value={[b.cancellation.by, b.cancellation.reason].filter(Boolean).join(' — ')} />}
                {b.review && <DetailRow label="Review" value={`${b.review.rating} ★${b.review.comment ? ` — “${b.review.comment}”` : ''}`} />}
                {b.dispute && (
                  <ListRow
                    title={`Dispute: ${b.dispute.reason}`}
                    subtitle={presentStatus(meta, 'disputeStatuses', b.dispute.status).label}
                    icon="chatbox-ellipses-outline"
                    onPress={() => navigation.navigate('AdminHSDisputes')}
                  />
                )}
              </Section>
            )}

            <Section title="Status history" card>
              {b.statusHistory.length === 0 ? (
                <Text style={styles.muted}>No changes recorded.</Text>
              ) : (
                [...b.statusHistory].reverse().map((h, i, all) => (
                  <View key={`${h.status}-${h.changedAt}-${i}`} style={[styles.history, i < all.length - 1 && styles.divider]}>
                    <Text style={styles.historyStatus}>{presentStatus(meta, 'bookingStatuses', h.status).label}</Text>
                    <Text style={styles.historyMeta}>
                      {formatDateTime(h.changedAt)} · by {h.role}
                      {h.note ? ` — ${h.note}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </Section>

          </>
        )}
      </QueryState>

      <ConfirmSheet
        visible={sheet !== null}
        title={sheet === 'status' ? 'Change booking status' : 'Refund to customer wallet'}
        message={
          sheet === 'status'
            ? 'For when the booking is stuck. The customer and provider apps follow the new status.'
            : remaining !== undefined
              ? `Up to ${formatMoney(remaining)} can still be refunded. Leave the amount empty to refund all of it.`
              : undefined
        }
        confirmLabel={sheet === 'status' ? 'Change status' : 'Refund'}
        destructive={sheet === 'refund'}
        requireReason
        busy={forceState.isLoading || refundState.isLoading}
        error={error}
        onConfirm={confirm}
        onClose={close}
      >
        {sheet === 'status' && <FilterChips options={statusOptions} value={target ?? ''} onChange={setTarget} />}
        {sheet === 'refund' && (
          <TextField
            label="Amount (PKR)"
            placeholder={remaining !== undefined ? String(remaining) : undefined}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
          />
        )}
      </ConfirmSheet>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { marginBottom: S.xl },
    title: { ...T.heading, color: c.ink },
    sub: { ...T.body, color: c.inkMuted, marginTop: 2 },
    badge: { alignSelf: 'flex-start', marginTop: S.sm },
    muted: { ...T.body, color: c.inkMuted, paddingVertical: S.md },
    history: { paddingVertical: S.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    historyStatus: { ...T.bodyStrong, color: c.ink },
    historyMeta: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    footer: { flexDirection: 'row', gap: S.sm },
    footerButton: { flex: 1 },
    paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.lg, paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    paymentLabel: { ...T.body, color: c.inkMuted },
  });
