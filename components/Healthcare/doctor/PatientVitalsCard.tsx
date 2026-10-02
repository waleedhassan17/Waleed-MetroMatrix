// ============================================================================
// A patient's recent vital signs, for the doctor treating them (read-only).
// The patient records these from a Bluetooth monitor or by hand; the API only
// shows them to a doctor the patient has an appointment with. Renders nothing
// when there are none.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Card, SectionHeader } from '../../ui';
import { S, T } from '../../../constants/theme';
import { ThemeColors, useTheme } from '../../../theme';
import { describeVital, fetchPatientVitals, type VitalsPage } from '../../../networks/healthcare/vitalsApi';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function PatientVitalsCard({ patientId, sectionStyle }: { patientId: string; sectionStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<VitalsPage | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (patientId) {
        fetchPatientVitals(patientId).then((res) => {
          if (alive && res.success) setData(res.data);
        });
      }
      return () => {
        alive = false;
      };
    }, [patientId])
  );

  if (!data || data.items.length === 0) return null;
  const recent = data.items.slice(0, 5);

  return (
    <View testID="patient-vitals">
      <SectionHeader title="Vitals" subtitle="Recorded by the patient" style={sectionStyle} />
      <Card>
        {recent.map((v, i) => (
          <View key={v.id} style={[styles.row, i > 0 && styles.divider]}>
            <Ionicons name={v.type === 'heart_rate' ? 'heart-outline' : 'speedometer-outline'} size={18} color={colors.accentDeep} />
            <View style={styles.text}>
              <Text style={styles.value}>{describeVital(v)}</Text>
              <Text style={styles.meta}>
                {when(v.measuredAt)} · {v.source.kind === 'ble' ? v.source.deviceName || 'Bluetooth monitor' : 'Typed in'}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.sm },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    text: { flex: 1 },
    value: { ...T.bodyStrong, color: c.ink },
    meta: { ...T.caption, color: c.inkMuted, marginTop: 1 },
  });
