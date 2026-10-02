// ============================================================================
// Connect a Bluetooth monitor — scan for standard heart-rate straps/watches
// (GATT 0x180D) and blood-pressure cuffs (0x1810), connect, watch the live
// reading, save it. Works with any monitor that follows the Bluetooth SIG
// medical profiles; nRF Connect's heart-rate simulator works for testing.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, Button, Card, EmptyState, Screen } from '../../../../components/ui';
import { GUTTER, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  bluetoothState,
  connectAndMonitor,
  isBleSupported,
  requestBlePermissions,
  scanForMonitors,
  type LiveReading,
  type VitalsDevice,
} from '../../../../services/ble/bleVitals';
import { saveVitals } from '../../../../networks/healthcare/vitalsApi';

const SCAN_MS = 15000;
type Phase = 'idle' | 'scanning' | 'connecting' | 'live';

export default function ConnectVitalsDeviceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const supported = useMemo(() => isBleSupported(), []);

  const [phase, setPhase] = useState<Phase>('idle');
  const [devices, setDevices] = useState<VitalsDevice[]>([]);
  const [device, setDevice] = useState<VitalsDevice | null>(null);
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stopScan = useRef<() => void>(() => {});
  const disconnect = useRef<() => void>(() => {});
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (scanTimer.current) clearTimeout(scanTimer.current);
    stopScan.current();
    disconnect.current();
    stopScan.current = () => {};
    disconnect.current = () => {};
  }, []);
  useEffect(() => cleanup, [cleanup]);

  const startScan = useCallback(async () => {
    setError(null);
    if (!(await requestBlePermissions())) {
      setError('Allow "Nearby devices" (Bluetooth) to find your monitor.');
      return;
    }
    const state = await bluetoothState();
    if (state !== 'PoweredOn') {
      setError('Turn Bluetooth on, then scan again.');
      return;
    }
    cleanup();
    setDevices([]);
    setPhase('scanning');
    stopScan.current = scanForMonitors(
      (d) => setDevices((list) => (list.some((x) => x.id === d.id) ? list : [...list, d])),
      (e) => {
        setError(e.message || 'Scanning failed.');
        setPhase('idle');
      }
    );
    scanTimer.current = setTimeout(() => {
      stopScan.current();
      setPhase((p) => (p === 'scanning' ? 'idle' : p));
    }, SCAN_MS);
  }, [cleanup]);

  const connect = useCallback(
    async (d: VitalsDevice) => {
      cleanup();
      setDevice(d);
      setReading(null);
      setPhase('connecting');
      try {
        disconnect.current = await connectAndMonitor(d, setReading, (e) => setError(e.message || 'Lost the connection.'));
        setPhase('live');
      } catch (e: any) {
        setError(e?.message || 'Could not connect. Keep the monitor close and try again.');
        setPhase('idle');
      }
    },
    [cleanup]
  );

  const save = async () => {
    if (!reading || !device) return;
    const measuredAt = (reading.type === 'blood_pressure' && reading.measuredAt) || new Date();
    const base = {
      measuredAt: measuredAt.toISOString(),
      source: { kind: 'ble' as const, deviceName: device.name },
      clientId: `${device.id}-${measuredAt.getTime()}`.slice(0, 64),
    };
    setSaving(true);
    const res = await saveVitals([
      reading.type === 'heart_rate'
        ? { ...base, type: 'heart_rate', bpm: reading.bpm }
        : {
            ...base,
            type: 'blood_pressure',
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            meanArterial: reading.meanArterial,
            ...(reading.pulse ? { pulse: reading.pulse } : {}),
          },
    ]);
    setSaving(false);
    const rejected = res.data?.rejected?.[0];
    if (!res.success || rejected) {
      Alert.alert('Not saved', rejected?.error || res.message || 'Please try again.');
      return;
    }
    cleanup();
    navigation.goBack();
  };

  if (!supported) {
    return (
      <Screen>
        <AppBar title="Connect a monitor" onBack={() => navigation.goBack()} />
        <View style={styles.content}>
          <EmptyState
            icon="bluetooth-outline"
            title="Bluetooth needs the latest app"
            message="This version of the app was built without Bluetooth support. Install the latest build, or add your reading by hand on the Vitals screen."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar title="Connect a monitor" subtitle="Heart-rate strap, watch or BP cuff" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {phase === 'live' || phase === 'connecting' ? (
          <Card style={styles.live}>
            <Text style={styles.deviceName}>{device?.name}</Text>
            {phase === 'connecting' ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.accentDeep} />
                <Text style={styles.caption}>Connecting…</Text>
              </View>
            ) : !reading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.accentDeep} />
                <Text style={styles.caption}>
                  {device?.kind === 'blood_pressure' ? 'Start a measurement on the cuff…' : 'Waiting for the first reading…'}
                </Text>
              </View>
            ) : reading.type === 'heart_rate' ? (
              <View style={styles.center}>
                <Text style={styles.big} accessibilityLiveRegion="polite">{reading.bpm}</Text>
                <Text style={styles.caption}>
                  bpm{reading.contact === false ? ' · no skin contact — adjust the strap' : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.big}>
                  {Math.round(reading.systolic)}/{Math.round(reading.diastolic)}
                </Text>
                <Text style={styles.caption}>mmHg{reading.pulse ? ` · pulse ${reading.pulse}` : ''}</Text>
              </View>
            )}
            <Button label="Save reading" onPress={save} loading={saving} disabled={!reading || saving} fullWidth style={styles.saveBtn} />
            <Button
              label="Disconnect"
              variant="ghost"
              onPress={() => {
                cleanup();
                setPhase('idle');
                setReading(null);
              }}
              fullWidth
            />
          </Card>
        ) : (
          <>
            <Text style={styles.help}>
              Wake your monitor (put the strap on, or press the cuff's Bluetooth button) and keep it within a metre of the phone.
            </Text>
            <Button
              label={phase === 'scanning' ? 'Scanning…' : 'Scan for monitors'}
              icon="bluetooth"
              loading={phase === 'scanning'}
              disabled={phase === 'scanning'}
              onPress={startScan}
              fullWidth
            />
            {devices.map((d) => (
              <Pressable key={d.id} style={styles.device} onPress={() => connect(d)} accessibilityRole="button">
                <Ionicons name={d.kind === 'heart_rate' ? 'heart-outline' : 'speedometer-outline'} size={22} color={colors.accentDeep} />
                <View style={styles.deviceText}>
                  <Text style={styles.deviceTitle}>{d.name}</Text>
                  <Text style={styles.caption}>{d.kind === 'heart_rate' ? 'Heart-rate monitor' : 'Blood-pressure monitor'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </Pressable>
            ))}
            {phase === 'idle' && devices.length === 0 && !error && (
              <Text style={[styles.caption, styles.none]}>No monitors found yet.</Text>
            )}
          </>
        )}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            {/Allow/.test(error) && (
              <Button label="Open settings" variant="secondary" size="sm" onPress={() => Linking.openSettings()} style={styles.errorBtn} />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg, paddingBottom: S.huge },
    help: { ...T.body, color: c.inkMuted, marginBottom: S.lg },
    device: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.md,
      paddingVertical: S.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    deviceText: { flex: 1 },
    deviceTitle: { ...T.bodyStrong, color: c.ink },
    caption: { ...T.caption, color: c.inkMuted },
    none: { marginTop: S.lg, textAlign: 'center' },
    live: { alignItems: 'stretch' },
    deviceName: { ...T.subhead, color: c.ink, textAlign: 'center' },
    center: { alignItems: 'center', paddingVertical: S.xl, gap: S.sm },
    big: { ...T.display, color: c.ink },
    saveBtn: { marginBottom: S.sm },
    errorBox: { marginTop: S.lg },
    error: { ...T.body, color: c.error },
    errorBtn: { marginTop: S.sm, alignSelf: 'flex-start' },
  });
