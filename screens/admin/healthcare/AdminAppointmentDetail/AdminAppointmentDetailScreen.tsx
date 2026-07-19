import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  fetchAdminAppointmentDetailApi,
  forceAppointmentStatusApi,
  refundAppointmentAdminApi,
} from '../../../../networks/healthcare/adminApi';

const COLORS = {
  primary: '#2A7FFF',
  danger: '#E74C3C',
  success: '#27AE60',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const AdminAppointmentDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const appointmentId = route.params?.appointmentId as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminAppointmentDetailApi(appointmentId);
    if (res.success) setAppointment(res.data);
    else setError(res.message || 'Failed to load appointment');
    setLoading(false);
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const requireReason = (): string | null => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Admin actions are audited — enter a reason first.');
      return null;
    }
    return reason.trim();
  };

  const handleForce = (status: string) => {
    const r = requireReason();
    if (!r) return;
    Alert.alert(
      'Force status change',
      `Move this appointment to "${status}"?\n\nThis is recorded in the audit log with your admin ID.${status === 'cancelled' ? ' A paid appointment will be refunded in full.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            const res = await forceAppointmentStatusApi(appointmentId, status, r);
            setActing(false);
            if (res.success) load();
            else Alert.alert('Failed', res.message || 'Could not change status');
          },
        },
      ]
    );
  };

  const handleRefund = () => {
    const r = requireReason();
    if (!r) return;
    Alert.alert(
      'Manual refund',
      `Refund PKR ${(appointment?.payment?.amount || 0).toLocaleString()} to the patient's wallet?\n\nThis is recorded in the audit log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            const res = await refundAppointmentAdminApi(appointmentId, r);
            setActing(false);
            if (res.success) load();
            else Alert.alert('Failed', res.message || 'Could not refund');
          },
        },
      ]
    );
  };

  const doctorName = appointment?.doctorId?.providerId?.fullName || '—';
  const patientName = appointment?.patientId?.fullName || appointment?.patientInfo?.name || '—';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Appointment Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !appointment ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : error && !appointment ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : appointment ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.big}>{patientName} → Dr. {doctorName}</Text>
            <Text style={styles.meta}>Specialty: {appointment.doctorId?.specialtyId?.name || '—'}</Text>
            <Text style={styles.meta}>Clinic: {appointment.clinicId?.name || (appointment.type === 'video' ? 'Video consultation' : '—')}</Text>
            <Text style={styles.meta}>
              Slot: {appointment.slotId?.date ? new Date(appointment.slotId.date).toLocaleDateString('en-PK') : '—'} {appointment.slotId?.startTime || ''}
            </Text>
            <Text style={styles.meta}>
              Status: <Text style={styles.bold}>{appointment.status}</Text> · Type: <Text style={styles.bold}>{appointment.type}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment Trail</Text>
            <Text style={styles.meta}>Fee: PKR {(appointment.fee || 0).toLocaleString()} · Discount: PKR {(appointment.discount || 0).toLocaleString()}</Text>
            <Text style={styles.meta}>Total: <Text style={styles.bold}>PKR {(appointment.totalAmount || 0).toLocaleString()}</Text></Text>
            <Text style={styles.meta}>
              Payment: <Text style={styles.bold}>{appointment.payment?.status || 'unpaid'}</Text>
              {appointment.payment?.method ? ` via ${appointment.payment.method}` : ''}
              {appointment.payment?.paidAt ? ` · paid ${new Date(appointment.payment.paidAt).toLocaleString('en-PK')}` : ''}
            </Text>
            {appointment.payment?.refundedAt ? (
              <Text style={styles.meta}>
                Refunded PKR {(appointment.payment.refundAmount || 0).toLocaleString()} on {new Date(appointment.payment.refundedAt).toLocaleString('en-PK')}
              </Text>
            ) : null}
            {appointment.payout?.paidAt ? (
              <Text style={styles.meta}>
                Doctor payout: PKR {(appointment.payout.amount || 0).toLocaleString()} (commission PKR {(appointment.payout.commission || 0).toLocaleString()})
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.auditHeader}>
              <Ionicons name="shield-half-outline" size={16} color={COLORS.danger} />
              <Text style={styles.sectionTitle}>Admin actions (audited)</Text>
            </View>
            <Text style={styles.fieldLabel}>Reason (mandatory)</Text>
            <TextInput
              style={styles.input}
              placeholder="Why are you doing this?"
              placeholderTextColor={COLORS.textLight}
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.actionWrap}>
              {(NEXT_STATUSES[appointment.status] || []).map((status) => (
                <TouchableOpacity key={status} style={styles.forceBtn} disabled={acting} onPress={() => handleForce(status)}>
                  <Text style={styles.forceText}>→ {status}</Text>
                </TouchableOpacity>
              ))}
              {appointment.payment?.status === 'paid' && (
                <TouchableOpacity style={styles.refundBtn} disabled={acting} onPress={handleRefund}>
                  <Ionicons name="cash-outline" size={16} color="#FFF" />
                  <Text style={styles.refundText}>{acting ? 'Working…' : 'Manual Refund'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  center: { alignItems: 'center', padding: 24 },
  errorText: { color: COLORS.textLight, marginBottom: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  big: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  meta: { fontSize: 13, color: COLORS.textLight, marginTop: 3 },
  bold: { fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  auditHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: COLORS.text },
  actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  forceBtn: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  forceText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' },
  refundBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.danger, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  refundText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});

export default AdminAppointmentDetailScreen;
