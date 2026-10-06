// ============================================================================
// One healthcare appointment: the visit, the patient and doctor, the payment
// trail, and the two audited admin actions.
//
//  - Change status (reason required). Pending → confirmed or cancelled,
//    confirmed → completed or cancelled; the server enforces the same and its
//    refusal is shown as it is. Cancelling a paid appointment refunds it in
//    full; completing it pays the doctor.
//  - Refund (needs Finance). A paid appointment, in full, to the patient's
//    wallet.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, EntityRow, FilterChips, PermissionGate, QueryState, Section, StatusBadge } from '../../../../components/admin';
import { Button, ToneBadge, showToast } from '../../../../components/ui';
import type { Tone } from '../../../../constants/theme';
import { formatMoney } from '../../../../constants/Currency';
import { presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import {
  nameOf,
  useForceHCAppointmentStatusMutation,
  useGetHCAppointmentQuery,
  useRefundHCAppointmentMutation,
} from '../../../../networks/admin/healthcareApi';
import { formatDateTime } from '../../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import { idOf, openProvider } from '../../people/openProvider';
import { NEXT_STATUSES, appointmentWhen, typeLabel } from '../appointmentLabels';

const PAYMENT: Record<string, { label: string; tone: Tone }> = {
  unpaid: { label: 'Unpaid', tone: 'warning' },
  pending: { label: 'Payment pending', tone: 'info' },
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  failed: { label: 'Payment failed', tone: 'error' },
};

export default function AdminAppointmentDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { appointmentId } = (useRoute().params ?? {}) as { appointmentId: string };
  const { data: meta } = useAdminMeta();
  const query = useGetHCAppointmentQuery(appointmentId);
  const a = query.data;
  const [forceStatus, forceState] = useForceHCAppointmentStatusMutation();
  const [refund, refundState] = useRefundHCAppointmentMutation();

  const [sheet, setSheet] = useState<null | 'status' | 'refund'>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setSheet(null);
    setTarget(null);
    setError(null);
  };

  const next = a ? NEXT_STATUSES[a.status] ?? [] : [];
  const paid = a?.payment?.status === 'paid';
  const refundable = a?.payment?.amount ?? a?.totalAmount;

  const confirm = async (reason: string) => {
    if (!a) return;
    if (sheet === 'status') {
      if (!target) return setError('Choose the new status.');
      const res = await forceStatus({ id: a.id, status: target, reason });
      if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The status could not be changed.');
      close();
      showToast({ tone: 'success', message: `Status changed to ${presentStatus(meta, 'appointmentStatuses', target).label}.` });
    } else if (sheet === 'refund') {
      const res = await refund({ id: a.id, reason });
      if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The refund did not go through.');
      close();
      showToast({ tone: 'success', message: "Refunded to the patient's wallet." });
    }
  };

  const doctor = a?.doctorId?.providerId;
  const doctorId = idOf(doctor);
  const patientId = idOf(a?.patientId);
  const specialty = a?.doctorId?.specialtyId;
  const pay = a?.payment?.status ? PAYMENT[a.payment.status] ?? { label: a.payment.status, tone: 'neutral' as Tone } : PAYMENT.unpaid;

  return (
    <AdminScreen
      title="Appointment"
      subtitle="Healthcare"
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      footer={
        a && (next.length || paid) ? (
          <PermissionGate all={['canManageHealthcare']} fallback={null}>
            <View style={styles.footer}>
              {next.length > 0 && (
                <Button label="Change status" variant="secondary" onPress={() => setSheet('status')} style={styles.footerButton} />
              )}
              {paid && (
                <PermissionGate all={['canManageFinance']} fallback={null}>
                  <Button label="Refund" variant="secondary" onPress={() => setSheet('refund')} style={styles.footerButton} />
                </PermissionGate>
              )}
            </View>
          </PermissionGate>
        ) : undefined
      }
    >
      <PermissionGate all={['canManageHealthcare']} action="see this appointment">
        <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} skeleton="detail" action="see this appointment">
          {a && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{a.type === 'video' ? 'Video consultation' : 'In-clinic visit'}</Text>
                <Text style={styles.sub}>Booked {formatDateTime(a.createdAt)}</Text>
                <StatusBadge group="appointmentStatuses" value={a.status} style={styles.badge} />
              </View>

              <Section title="Visit" card>
                <DetailRow label="When" value={appointmentWhen(a)} />
                <DetailRow label="Type" value={typeLabel(a.type)} />
                <DetailRow label="Specialty" value={specialty && typeof specialty === 'object' ? specialty.name : null} />
                <DetailRow
                  label="Clinic"
                  value={a.clinicId?.name ? [a.clinicId.name, a.clinicId.city].filter(Boolean).join(', ') : a.type === 'video' ? 'Video consultation' : null}
                  last={!a.cancellationReason}
                />
                {!!a.cancellationReason && <DetailRow label="Cancelled" value={a.cancellationReason} last />}
              </Section>

              <Section title="People" card>
                <EntityRow
                  avatar={{ name: nameOf(a.patientId, a.patientInfo?.name || 'Patient') }}
                  title={nameOf(a.patientId, a.patientInfo?.name || 'Patient')}
                  subtitle={['Patient', typeof a.patientId === 'object' ? a.patientId?.email : null].filter(Boolean).join(' · ')}
                  onPress={patientId ? () => navigation.navigate('AdminUserDetail', { userId: patientId }) : undefined}
                />
                <EntityRow
                  avatar={{ name: nameOf(doctor, 'Doctor') }}
                  title={`Dr. ${nameOf(doctor, '—')}`}
                  subtitle={['Doctor', typeof doctor === 'object' ? doctor?.email : null].filter(Boolean).join(' · ')}
                  onPress={doctorId ? () => openProvider(navigation, doctorId) : undefined}
                  accessibilityLabel={`Dr. ${nameOf(doctor, 'unknown')}. Opens their details and analytics.`}
                  divider={false}
                />
              </Section>

              <Section title="Money" card>
                <DetailRow label="Fee" value={formatMoney(a.fee)} />
                <DetailRow label="Discount" value={formatMoney(a.discount)} />
                <DetailRow label="Total" value={formatMoney(a.totalAmount)} />
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Payment</Text>
                  <ToneBadge label={`${pay.label}${a.payment?.method ? ` · ${a.payment.method}` : ''}`} tone={pay.tone} />
                </View>
                <DetailRow label="Paid" value={a.payment?.paidAt ? formatDateTime(a.payment.paidAt) : null} />
                {!!a.payment?.refundedAt && (
                  <DetailRow label="Refunded" value={`${formatMoney(a.payment.refundAmount)} on ${formatDateTime(a.payment.refundedAt)}`} />
                )}
                <DetailRow label="Paid to the doctor" value={a.payout?.paidAt ? `${formatMoney(a.payout.amount)} on ${formatDateTime(a.payout.paidAt)}` : null} last />
              </Section>
            </>
          )}
        </QueryState>
      </PermissionGate>

      <ConfirmSheet
        visible={sheet !== null}
        title={sheet === 'status' ? 'Change appointment status' : "Refund to the patient's wallet"}
        message={
          sheet === 'status'
            ? 'For when the appointment is stuck. Cancelling a paid appointment refunds it in full; completing it pays the doctor.'
            : `${formatMoney(refundable)} goes back to the patient's wallet.`
        }
        confirmLabel={sheet === 'status' ? 'Change status' : 'Refund'}
        destructive={sheet === 'refund'}
        requireReason
        busy={forceState.isLoading || refundState.isLoading}
        error={error}
        onConfirm={confirm}
        onClose={close}
      >
        {sheet === 'status' && (
          <FilterChips
            options={next.map((s) => ({ value: s, label: presentStatus(meta, 'appointmentStatuses', s).label }))}
            value={target ?? ''}
            onChange={setTarget}
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
    footer: { flexDirection: 'row', gap: S.sm },
    footerButton: { flex: 1 },
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: S.lg,
      paddingVertical: S.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    paymentLabel: { ...T.body, color: c.inkMuted },
  });
