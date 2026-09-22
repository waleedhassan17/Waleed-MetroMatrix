import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppointmentRow from '../../../../components/Healthcare/doctor/AppointmentRow';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  Chip,
  ErrorState,
  FormSheet,
  ListRow,
  Screen,
  SectionHeader,
  SkeletonCard,
  TextField,
  ToneBadge,
  showToast,
} from '../../../../components/ui';
import { APP_CURRENCY, formatMoney } from '../../../../constants/Currency';
import { GUTTER, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch } from '../../../../hooks/useReduxHooks';
import type { AppointmentDetail, DoctorAppointment } from '../../../../models/healthcare/doctorHub';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import {
  cancelDoctorAppointment,
  completeDoctorAppointment,
  confirmDoctorAppointment,
  fetchDoctorAppointmentDetail,
} from '../../../../networks/healthcare/doctorHubApi';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  CONSULT_LEAD_MINUTES,
  appointmentStatusMeta,
  consultationIcon,
  consultationLabel,
  formatDayHeading,
  formatDuration,
  formatTimeRange,
  isConsultationOpen,
  minutesBetween,
  todayKeyInZone,
  uses24HourClock,
} from '../../../../utils/healthcare/doctorFormat';
import { todayDateKey } from '../../../../utils/healthcare/timeRanges';
import { fetchDashboard } from '../doctor-home/doctorDashboardSlice';

// ============================================================================
// One appointment, and everything a doctor can do with it.
//
// There was no such screen. Approving a request lived in Manage Slots and the
// Schedule; starting a consultation only on Home; messaging or calling a
// patient only from the queue card, and only on the day. A future appointment
// could not be acted on at all. Every appointment row now opens this.
// ============================================================================

const DECLINE_REASONS = [
  'Not available at this time',
  'Outside my specialty',
  'Please book an in-clinic visit',
  'Emergency',
];

type Busy = 'confirm' | 'complete' | 'cancel' | null;

const genderLabel = (g: string): 'Male' | 'Female' | 'Other' | undefined =>
  g === 'male' ? 'Male' : g === 'female' ? 'Female' : g ? 'Other' : undefined;

const DetailRow: React.FC<{ icon: string; children: React.ReactNode }> = ({ icon, children }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={18} color={colors.inkMuted} style={styles.detailIcon} />
      <View style={styles.detailBody}>{children}</View>
    </View>
  );
};

const DoctorAppointmentDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const appointmentId: string = route.params?.appointmentId;
  const uses24h = useMemo(uses24HourClock, []);

  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchDoctorAppointmentDetail(appointmentId);
    setLoading(false);
    if (res.success) {
      setDetail(res.data);
      setError(null);
    } else {
      setError(res.message || "We couldn't load this appointment");
    }
  }, [appointmentId]);

  // On focus: a consultation finished in the notes screen changes the status.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const afterChange = (appointment: DoctorAppointment, message: string) => {
    setDetail((d) => (d ? { ...d, appointment } : d));
    showToast({ message, tone: 'success' });
    dispatch(fetchDashboard({ refresh: true }));
  };

  const run = async (kind: Exclude<Busy, null>) => {
    if (!detail || busy) return;
    setBusy(kind);
    const id = detail.appointment.id;
    if (kind === 'confirm') {
      const res = await confirmDoctorAppointment(id);
      if (res.success) afterChange(res.data, 'Request approved. The patient has been told.');
      else showToast({ message: res.message || "We couldn't approve this request", tone: 'error' });
    } else if (kind === 'complete') {
      const res = await completeDoctorAppointment(id);
      if (res.success) afterChange(res.data, 'Marked as completed');
      else showToast({ message: res.message || "We couldn't complete this appointment", tone: 'error' });
    }
    setBusy(null);
  };

  const submitCancel = async () => {
    if (!detail) return;
    const text = reason.trim();
    if (!text) {
      setReasonError('Choose or write a reason — the patient sees it');
      return;
    }
    setBusy('cancel');
    const pending = detail.appointment.status === 'pending';
    const res = await cancelDoctorAppointment(detail.appointment.id, text);
    setBusy(null);
    if (res.success) {
      setCancelOpen(false);
      setReason('');
      afterChange(
        res.data.appointment,
        res.data.refunded > 0
          ? `${pending ? 'Declined' : 'Cancelled'}. ${formatMoney(res.data.refunded, { code: APP_CURRENCY })} refunded to the patient.`
          : pending
            ? 'Request declined. The patient has been told.'
            : 'Appointment cancelled. The patient has been told.'
      );
    } else {
      showToast({ message: res.message || "We couldn't cancel this appointment", tone: 'error' });
    }
  };

  const body = () => {
    if (!detail) {
      if (error) return <ErrorState message={error} onRetry={load} />;
      return (
        <>
          <SkeletonCard lines={4} />
          <View style={styles.section}>
            <SkeletonCard lines={2} />
          </View>
        </>
      );
    }

    const a = detail.appointment;
    const status = appointmentStatusMeta(a.status);
    const today = todayDateKey();
    const duration = formatDuration(minutesBetween(a.startTime, a.endTime));
    const demographics = [a.patientAge ? `${a.patientAge} yrs` : '', genderLabel(a.patientGender) || '']
      .filter(Boolean)
      .join(' · ');
    // `dateKey` is the day at the CLINIC, so "has today arrived?" has to be
    // asked in the appointment's own zone — which is how the server decides it.
    // Compared against the phone's day, a travelling doctor gained or lost this
    // button a day early and then hit a 400 from the other side.
    const canComplete =
      a.status === 'confirmed' && !!a.dateKey && a.dateKey <= todayKeyInZone(a.timezone);
    // The consultation can only be held inside its own window. Without this the
    // call button rendered for any confirmed appointment, so a doctor could
    // open a room weeks early that the patient — whose own join opens 15
    // minutes before — could not enter, and then find no way to complete it.
    const consultOpen = isConsultationOpen(a.startUtc, a.endUtc);
    const active = a.status === 'pending' || a.status === 'confirmed';

    const openNotes = () =>
      navigation.navigate(DoctorRouteNames.ConsultationNotes, {
        appointmentId: a.id,
        patientId: a.patientId,
        patientName: a.patientName,
      });
    const call = (media: 'video' | 'audio') =>
      navigation.navigate('HealthcareConsultCall', {
        roomId: a.id,
        appointmentId: a.id,
        roomType: 'healthcare',
        media,
        counterpartName: a.patientName,
      });

    return (
      <>
        <Card elevation="raised">
          <View style={styles.patient}>
            <Avatar uri={a.patientPhoto} name={a.patientName} size={52} />
            <View style={styles.patientText}>
              <Text style={styles.patientName} numberOfLines={2}>
                {a.patientName}
              </Text>
              {!!demographics && <Text style={styles.muted}>{demographics}</Text>}
            </View>
            <ToneBadge label={status.label} tone={status.tone} />
          </View>

          <View style={styles.divider} />

          <DetailRow icon="calendar-outline">
            <Text style={styles.strong}>{a.dateKey ? formatDayHeading(a.dateKey, today) : 'Date unavailable'}</Text>
            <Text style={styles.muted}>{[formatTimeRange(a.startTime, a.endTime, uses24h), duration].filter(Boolean).join(' · ')}</Text>
          </DetailRow>
          <DetailRow icon={consultationIcon(a.type)}>
            <Text style={styles.strong}>{consultationLabel(a.type)} consultation</Text>
            {a.type === 'in-clinic' && !!a.clinic && (
              <Text style={styles.muted}>{[a.clinic.name, a.clinic.address].filter(Boolean).join(', ')}</Text>
            )}
          </DetailRow>
          <DetailRow icon="cash-outline">
            <Text style={styles.strong}>{formatMoney(a.totalAmount, { code: APP_CURRENCY })}</Text>
            <Text style={styles.muted}>{a.paymentStatus === 'paid' ? 'Paid' : a.paymentStatus === 'refunded' ? 'Refunded' : 'Not paid yet'}</Text>
          </DetailRow>
          {!!a.symptoms && (
            <DetailRow icon="document-text-outline">
              <Text style={styles.label}>Reason for visit</Text>
              <Text style={styles.bodyText}>{a.symptoms}</Text>
            </DetailRow>
          )}
          {a.status === 'cancelled' && !!a.cancellationReason && (
            <DetailRow icon="close-circle-outline">
              <Text style={styles.label}>Cancellation reason</Text>
              <Text style={styles.bodyText}>{a.cancellationReason}</Text>
            </DetailRow>
          )}
        </Card>

        {/* The one thing to do next, then everything else. */}
        <View style={styles.section}>
          {a.status === 'pending' && (
            <>
              <Button label="Approve request" icon="checkmark" loading={busy === 'confirm'} onPress={() => run('confirm')} />
              <Button
                label="Decline"
                variant="destructive"
                onPress={() => setCancelOpen(true)}
                disabled={!!busy}
                style={styles.stacked}
              />
            </>
          )}
          {a.status === 'confirmed' && (
            <>
              {a.type === 'video' ? (
                <Button
                  label={consultOpen ? 'Start video call' : `Opens ${CONSULT_LEAD_MINUTES} min before`}
                  icon={consultOpen ? 'videocam-outline' : 'time-outline'}
                  // Disabled rather than hidden: a control that vanishes is
                  // what made this confusing in the first place.
                  disabled={!consultOpen}
                  onPress={() => call('video')}
                />
              ) : (
                <Button label="Open consultation notes" icon="clipboard-outline" onPress={openNotes} />
              )}
              {canComplete && (
                <Button
                  label="Mark as completed"
                  variant="secondary"
                  icon="checkmark-done-outline"
                  loading={busy === 'complete'}
                  onPress={() => run('complete')}
                  style={styles.stacked}
                />
              )}
            </>
          )}
          {a.status === 'completed' &&
            (detail.prescription ? (
              <Card>
                <ListRow icon="medkit-outline" tone="accent" title="Prescription issued" subtitle={detail.prescription.diagnosis} />
              </Card>
            ) : (
              <Button
                label="Write prescription"
                icon="create-outline"
                onPress={() =>
                  navigation.navigate(DoctorRouteNames.PrescriptionWriter, {
                    patientId: a.patientId,
                    patientName: a.patientName,
                    appointmentId: a.id,
                    type: a.type,
                    age: a.patientAge ?? undefined,
                    gender: genderLabel(a.patientGender),
                  })
                }
              />
            ))}
        </View>

        <SectionHeader title="Patient" style={styles.section} />
        <Card>
          {a.status !== 'cancelled' && (
            <>
              <ListRow
                icon="chatbubble-ellipses-outline"
                title="Message"
                onPress={() => navigation.navigate('DoctorConsultChat', { appointmentId: a.id, patientName: a.patientName })}
              />
              <ListRow icon="call-outline" title="Voice call" onPress={() => call('audio')} divider />
            </>
          )}
          <ListRow
            icon="clipboard-outline"
            title="Consultation notes"
            onPress={openNotes}
            divider={a.status !== 'cancelled'}
          />
          <ListRow
            icon="time-outline"
            title="Visit history"
            onPress={() => navigation.navigate(DoctorRouteNames.PatientHistory, { patientId: a.patientId, patientName: a.patientName })}
            divider
          />
        </Card>

        {detail.patientHistory.length > 0 && (
          <>
            <SectionHeader title="Earlier visits" style={styles.section} />
            <Card padded={false} style={styles.listCard}>
              {detail.patientHistory.map((h, i) => (
                <AppointmentRow
                  key={h.id}
                  appointment={h}
                  showDate
                  todayKey={today}
                  uses24h={uses24h}
                  divider={i > 0}
                  onPress={(item) => navigation.push(DoctorRouteNames.AppointmentDetail, { appointmentId: item.id })}
                />
              ))}
            </Card>
          </>
        )}

        {active && (
          <Button
            label={a.status === 'pending' ? 'Decline request' : 'Cancel appointment'}
            variant="ghost"
            onPress={() => setCancelOpen(true)}
            disabled={!!busy}
            textStyle={{ color: colors.error }}
            style={styles.section}
          />
        )}
      </>
    );
  };

  const pending = detail?.appointment.status === 'pending';

  return (
    <Screen>
      <AppBar title="Appointment" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading && !!detail} onRefresh={load} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {body()}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <FormSheet
        visible={cancelOpen}
        title={pending ? 'Decline request' : 'Cancel appointment'}
        subtitle="The patient is notified with your reason and refunded in full."
        onClose={() => setCancelOpen(false)}
        busy={busy === 'cancel'}
        footer={
          <Button
            label={pending ? 'Decline request' : 'Cancel appointment'}
            variant="destructive"
            loading={busy === 'cancel'}
            onPress={submitCancel}
          />
        }
      >
        <View style={styles.reasons}>
          {DECLINE_REASONS.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={reason === r}
              onPress={() => {
                setReason(r);
                setReasonError(null);
              }}
              style={styles.reasonChip}
            />
          ))}
        </View>
        <TextField
          label="Reason"
          value={reason}
          onChangeText={(t) => {
            setReason(t);
            setReasonError(null);
          }}
          placeholder="Or write your own"
          maxLength={200}
          error={reasonError}
          multiline
        />
      </FormSheet>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg },
    section: { marginTop: SECTION },
    stacked: { marginTop: S.sm },
    patient: { flexDirection: 'row', alignItems: 'center' },
    patientText: { flex: 1, marginHorizontal: S.md },
    patientName: { ...T.heading, color: c.ink },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginVertical: S.lg },
    detailRow: { flexDirection: 'row', marginBottom: S.md },
    detailIcon: { marginRight: S.md, marginTop: 1 },
    detailBody: { flex: 1 },
    strong: { ...T.bodyStrong, color: c.ink },
    muted: { ...T.body, color: c.inkMuted, marginTop: 1 },
    label: { ...T.caption, color: c.inkMuted },
    bodyText: { ...T.body, color: c.ink, marginTop: 2 },
    listCard: { paddingHorizontal: S.lg },
    reasons: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: S.md },
    reasonChip: { marginRight: S.sm, marginBottom: S.sm },
    bottomSpace: { height: S.huge },
  });

export default DoctorAppointmentDetailScreen;
