// ============================================
// Admin: home-services settings (HS8) — commission %, cancellation window,
// default search radius, the three matching-score weights, minimum payout.
// These are the SAME values HS2/HS4 read at runtime (one source of truth).
// ============================================

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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchAdminHSSettings,
  updateAdminHSSettings,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';

const COLORS = {
  primary: '#2A7FFF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const AdminHomeServiceSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commission, setCommission] = useState('10');
  const [cancelWindow, setCancelWindow] = useState('2');
  const [radius, setRadius] = useState('15');
  const [wDistance, setWDistance] = useState('0.4');
  const [wRating, setWRating] = useState('0.4');
  const [wAvailability, setWAvailability] = useState('0.2');
  const [minPayout, setMinPayout] = useState('500');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminHSSettings();
    if (res.success && res.data) {
      const d = res.data;
      setCommission(String(d.commissionPercent));
      setCancelWindow(String(d.cancellationWindowHours));
      setRadius(String(d.defaultSearchRadiusKm));
      setWDistance(String(d.matchingWeights?.distance ?? 0.4));
      setWRating(String(d.matchingWeights?.rating ?? 0.4));
      setWAvailability(String(d.matchingWeights?.availability ?? 0.2));
      setMinPayout(String(d.minPayoutAmount));
    } else {
      setError(res.message || 'Failed to load settings');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weightSum = (Number(wDistance) || 0) + (Number(wRating) || 0) + (Number(wAvailability) || 0);

  const save = async () => {
    if (Math.abs(weightSum - 1) > 0.01) {
      Alert.alert(
        'Weights must sum to 1',
        `distance + rating + availability = ${weightSum.toFixed(2)}. Adjust before saving.`
      );
      return;
    }
    setSaving(true);
    const res = await updateAdminHSSettings({
      commissionPercent: Number(commission),
      cancellationWindowHours: Number(cancelWindow),
      defaultSearchRadiusKm: Number(radius),
      matchingWeights: {
        distance: Number(wDistance),
        rating: Number(wRating),
        availability: Number(wAvailability),
      },
      minPayoutAmount: Number(minPayout),
    });
    setSaving(false);
    if (res.success) Alert.alert('Saved', 'Home services settings updated.');
    else Alert.alert('Error', res.message || 'Could not save settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Services Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.liveBanner}>
            <Ionicons name="flash" size={16} color="#92400E" />
            <Text style={styles.liveText}>
              These values drive LIVE behaviour — provider search ranking, commission on
              every payment, and payout eligibility.
            </Text>
          </View>

          <Field label="Platform commission (%)" value={commission} onChange={setCommission} />
          <Field
            label="Cancellation window (hours)"
            value={cancelWindow}
            onChange={setCancelWindow}
          />
          <Field label="Default search radius (km)" value={radius} onChange={setRadius} />
          <Field label="Minimum payout amount (Rs.)" value={minPayout} onChange={setMinPayout} />

          <Text style={styles.sectionTitle}>Matching score weights</Text>
          <Text style={styles.hint}>
            score = distance × distanceScore + rating × ratingScore + availability ×
            availabilityBonus. Must sum to 1.
          </Text>
          <Field label="Distance weight" value={wDistance} onChange={setWDistance} />
          <Field label="Rating weight" value={wRating} onChange={setWRating} />
          <Field label="Availability weight" value={wAvailability} onChange={setWAvailability} />
          <Text
            style={[
              styles.weightSum,
              { color: Math.abs(weightSum - 1) > 0.01 ? '#E74C3C' : '#27AE60' },
            ]}
          >
            Sum: {weightSum.toFixed(2)}
          </Text>

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save settings</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  liveText: { color: '#92400E', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 17 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 10, marginBottom: 4 },
  hint: { fontSize: 12, color: COLORS.textLight, marginBottom: 12, lineHeight: 17 },
  weightSum: { fontSize: 12, fontWeight: '700', marginTop: -6, marginBottom: 14 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: COLORS.textLight, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default AdminHomeServiceSettingsScreen;
