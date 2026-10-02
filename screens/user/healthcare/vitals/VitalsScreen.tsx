// ============================================================================
// Vitals — the patient's heart-rate and blood-pressure readings: from a
// Bluetooth monitor (Connect a monitor) or typed in. Doctors the patient has
// booked see the same readings (read-only) from the appointment.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, Button, Card, EmptyState, Screen, SectionHeader, SegmentedControl, StatTile, TextField } from '../../../../components/ui';
import { GUTTER, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import {
  deleteVital,
  describeVital,
  fetchMyVitals,
  saveVitals,
  type VitalReading,
  type VitalsPage,
  type VitalType,
} from '../../../../networks/healthcare/vitalsApi';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function VitalsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [data, setData] = useState<VitalsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<VitalType>('heart_rate');
  const [bpm, setBpm] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchMyVitals();
    setLoading(false);
    if (res.success) {
      setData(res.data);
      setError(null);
    } else setError(res.message || 'Could not load your readings.');
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const submit = async () => {
    const reading =
      type === 'heart_rate'
        ? { type, bpm: Number(bpm) }
        : { type, systolic: Number(systolic), diastolic: Number(diastolic), ...(pulse ? { pulse: Number(pulse) } : {}) };
    setSaving(true);
    const res = await saveVitals([
      { ...reading, measuredAt: new Date().toISOString(), source: { kind: 'manual' }, clientId: `manual-${Date.now()}` },
    ]);
    setSaving(false);
    const rejected = res.data?.rejected?.[0];
    if (!res.success || rejected) {
      Alert.alert('Not saved', rejected?.error || res.message || 'Please check the numbers and try again.');
      return;
    }
    setBpm('');
    setSystolic('');
    setDiastolic('');
    setPulse('');
    load();
  };

  const confirmDelete = (v: VitalReading) =>
    Alert.alert('Delete reading?', `${describeVital(v)} · ${when(v.measuredAt)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteVital(v.id);
          if (res.success) load();
          else Alert.alert('Could not delete', res.message || 'Please try again.');
        },
      },
    ]);

  const hr = data?.latest.heartRate;
  const bp = data?.latest.bloodPressure;
  const canSave = type === 'heart_rate' ? !!bpm : !!systolic && !!diastolic;

  return (
    <Screen>
      <AppBar title="Vitals" subtitle="Heart rate and blood pressure" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <View style={styles.tiles}>
          <StatTile
            style={styles.tile}
            value={hr?.heartRate ? `${hr.heartRate.bpm}` : '—'}
            label={hr ? `bpm · ${when(hr.measuredAt)}` : 'Heart rate'}
            tone="accent"
          />
          <StatTile
            style={styles.tile}
            value={bp?.bloodPressure ? `${Math.round(bp.bloodPressure.systolic)}/${Math.round(bp.bloodPressure.diastolic)}` : '—'}
            label={bp ? `mmHg · ${when(bp.measuredAt)}` : 'Blood pressure'}
            tone="accent"
          />
        </View>

        <Button
          label="Connect a Bluetooth monitor"
          icon="bluetooth"
          fullWidth
          onPress={() => navigation.navigate(HealthcareRouteNames.ConnectVitalsDevice)}
          style={styles.connect}
        />

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Add a reading</Text>
          <SegmentedControl<VitalType>
            options={[
              { value: 'heart_rate', label: 'Heart rate' },
              { value: 'blood_pressure', label: 'Blood pressure' },
            ]}
            value={type}
            onChange={setType}
            style={styles.segment}
          />
          {type === 'heart_rate' ? (
            <TextField label="Heart rate (bpm)" value={bpm} onChangeText={setBpm} keyboardType="number-pad" maxLength={3} />
          ) : (
            <>
              <View style={styles.row}>
                <TextField label="Systolic" value={systolic} onChangeText={setSystolic} keyboardType="number-pad" maxLength={3} containerStyle={styles.half} />
                <TextField label="Diastolic" value={diastolic} onChangeText={setDiastolic} keyboardType="number-pad" maxLength={3} containerStyle={styles.half} />
              </View>
              <TextField label="Pulse (optional)" value={pulse} onChangeText={setPulse} keyboardType="number-pad" maxLength={3} />
            </>
          )}
          <Button label="Save reading" onPress={submit} loading={saving} disabled={!canSave || saving} fullWidth style={styles.save} />
        </Card>

        <SectionHeader title="History" subtitle={data ? `${data.items.length} readings` : undefined} style={styles.section} />
        {error ? (
          <EmptyState icon="alert-circle-outline" title="Couldn't load readings" message={error} />
        ) : !loading && data && data.items.length === 0 ? (
          <EmptyState icon="pulse-outline" title="No readings yet" message="Connect a monitor or add one above." />
        ) : (
          (data?.items || []).map((v) => (
            <Pressable key={v.id} onLongPress={() => confirmDelete(v)} style={styles.item} accessibilityHint="Long-press to delete">
              <Ionicons name={v.type === 'heart_rate' ? 'heart-outline' : 'speedometer-outline'} size={20} color={colors.accentDeep} />
              <View style={styles.itemText}>
                <Text style={styles.itemValue}>{describeVital(v)}</Text>
                <Text style={styles.itemMeta}>
                  {when(v.measuredAt)} · {v.source.kind === 'ble' ? v.source.deviceName || 'Bluetooth monitor' : 'Typed in'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg, paddingBottom: S.huge },
    tiles: { flexDirection: 'row', gap: S.md },
    tile: { flex: 1 },
    connect: { marginTop: S.lg },
    card: { marginTop: S.lg },
    cardTitle: { ...T.subhead, color: c.ink, marginBottom: S.md },
    segment: { marginBottom: S.md },
    row: { flexDirection: 'row', gap: S.md },
    half: { flex: 1 },
    save: { marginTop: S.sm },
    section: { marginTop: S.xl, marginBottom: S.sm },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.md,
      paddingVertical: S.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    itemText: { flex: 1 },
    itemValue: { ...T.bodyStrong, color: c.ink },
    itemMeta: { ...T.caption, color: c.inkMuted, marginTop: 2 },
  });
