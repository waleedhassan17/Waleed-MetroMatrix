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
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchHealthcareSettingsApi,
  updateHealthcareSettingsApi,
  type HealthcareSettingsView,
} from '../../../../networks/healthcare/adminApi';

const COLORS = {
  primary: '#2A7FFF',
  warn: '#F59E0B',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const FIELDS: { key: keyof Omit<HealthcareSettingsView, 'autoApproveDoctors'>; label: string; hint: string }[] = [
  { key: 'commissionPercent', label: 'Platform commission (%)', hint: 'Deducted from doctor payouts at completion' },
  { key: 'cancellationWindowHours', label: 'Cancellation window (hours)', hint: 'Full refund when cancelling at least this early' },
  { key: 'lateCancelRefundPercent', label: 'Late-cancel refund (%)', hint: 'Refunded inside the window (0 = forfeit)' },
  { key: 'defaultSlotDurationMinutes', label: 'Default slot duration (min)', hint: 'Used when generating slots' },
  { key: 'maxAdvanceBookingDays', label: 'Max advance booking (days)', hint: 'How far ahead patients can book' },
];

const AdminHealthcareSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [form, setForm] = useState<Record<string, string>>({});
  const [autoApprove, setAutoApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchHealthcareSettingsApi();
    if (res.success) {
      const s = res.data;
      setForm({
        commissionPercent: String(s.commissionPercent),
        cancellationWindowHours: String(s.cancellationWindowHours),
        lateCancelRefundPercent: String(s.lateCancelRefundPercent),
        defaultSlotDurationMinutes: String(s.defaultSlotDurationMinutes),
        maxAdvanceBookingDays: String(s.maxAdvanceBookingDays),
      });
      setAutoApprove(s.autoApproveDoctors);
    } else {
      setError(res.message || 'Failed to load settings');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    const patch: Record<string, number | boolean> = { autoApproveDoctors: autoApprove };
    for (const field of FIELDS) {
      const parsed = Number(form[field.key]);
      if (Number.isNaN(parsed) || parsed < 0) {
        Alert.alert('Invalid value', `${field.label} must be a non-negative number.`);
        return;
      }
      patch[field.key] = parsed;
    }
    setSaving(true);
    const res = await updateHealthcareSettingsApi(patch);
    setSaving(false);
    if (res.success) {
      Alert.alert('Saved', 'Settings updated — these values drive live booking and payment behaviour.');
    } else {
      Alert.alert('Could not save', res.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Healthcare Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warn} />
            <Text style={styles.warnText}>
              These values drive LIVE behaviour: consultation payments, refund windows, doctor payouts and approvals.
            </Text>
          </View>

          <View style={styles.card}>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={form[field.key] ?? ''}
                  onChangeText={(value) => setForm((f) => ({ ...f, [field.key]: value }))}
                />
                <Text style={styles.fieldHint}>{field.hint}</Text>
              </View>
            ))}

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Auto-approve new doctors</Text>
                <Text style={styles.fieldHint}>When off, doctors stay pending until approved in Doctor Management</Text>
              </View>
              <Switch
                value={autoApprove}
                onValueChange={setAutoApprove}
                trackColor={{ true: COLORS.primary, false: COLORS.border }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Ionicons name="save-outline" size={18} color="#FFF" />
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  warnBanner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 14 },
  warnText: { flex: 1, fontSize: 12, color: '#92400E' },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  fieldHint: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: COLORS.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default AdminHealthcareSettingsScreen;
