// ============================================================================
// WebRTC self-check.
//
// react-native-webrtc@124 ships no codegenConfig — it defines no TurboModule
// or Fabric component — so under this app's `newArchEnabled: true` it runs
// through React Native's legacy interop layer. Whether that actually works is
// not something the docs answer; it has to be observed on a device.
//
// This screen answers four questions in order, because a failure in an earlier
// one explains every later one:
//   1. Does the JS module import at all?          (packaging)
//   2. Is the native module linked?               (build + autolinking)
//   3. Can we open the microphone?                (permissions + audio stack)
//   4. Does RTCView mount without crashing?       (Fabric interop — the risk)
//
// Keep it. When a call fails on a new device or OS version this is the fastest
// way to find out which layer broke, and it costs nothing at runtime.
// ============================================================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2, XCircle, CircleDashed } from 'lucide-react-native';

type CheckState = 'pending' | 'pass' | 'fail';

interface Check {
  id: string;
  label: string;
  state: CheckState;
  detail?: string;
}

const INITIAL: Check[] = [
  { id: 'import', label: 'JS module imports', state: 'pending' },
  { id: 'native', label: 'Native module linked', state: 'pending' },
  { id: 'mic', label: 'Microphone capture', state: 'pending' },
  { id: 'view', label: 'RTCView mounts (New Arch)', state: 'pending' },
];

export default function WebRTCDiagnosticScreen() {
  const navigation = useNavigation<any>();
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [running, setRunning] = useState(false);
  const [stream, setStream] = useState<any>(null);
  const [RTCViewComp, setRTCViewComp] = useState<any>(null);

  const set = useCallback((id: string, state: CheckState, detail?: string) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, state, detail } : c)));
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setChecks(INITIAL);
    setStream(null);
    setRTCViewComp(null);

    let webrtc: any;

    // 1. Import. In Expo Go this throws — the native side simply isn't there.
    try {
      webrtc = require('react-native-webrtc');
      set('import', 'pass', Object.keys(webrtc).slice(0, 4).join(', '));
    } catch (e: any) {
      set('import', 'fail', e?.message || 'require failed');
      set('native', 'fail', 'skipped');
      set('mic', 'fail', 'skipped');
      set('view', 'fail', 'skipped');
      setRunning(false);
      return;
    }

    // 2. Native linkage. The JS shim can import fine while the native module is
    // missing; constructing a peer connection is what proves the bridge.
    try {
      const pc = new webrtc.RTCPeerConnection({ iceServers: [] });
      pc.close();
      set('native', 'pass', 'RTCPeerConnection constructed');
    } catch (e: any) {
      set('native', 'fail', e?.message || 'RTCPeerConnection threw');
      set('mic', 'fail', 'skipped');
      set('view', 'fail', 'skipped');
      setRunning(false);
      return;
    }

    // 3. Microphone. Audio-only: a failure here is normally a denied permission
    // rather than a broken build, so the message matters.
    try {
      const s = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false });
      setStream(s);
      set('mic', 'pass', `${s.getAudioTracks().length} audio track(s)`);
    } catch (e: any) {
      set('mic', 'fail', e?.message || 'getUserMedia failed');
    }

    // 4. The actual New Architecture question. Mounting is async from here —
    // if RTCView is incompatible with Fabric, this is where it crashes.
    try {
      setRTCViewComp(() => webrtc.RTCView);
      set('view', 'pass', 'rendered below without crashing');
    } catch (e: any) {
      set('view', 'fail', e?.message || 'RTCView unavailable');
    }

    setRunning(false);
  }, [set]);

  const stop = useCallback(() => {
    try {
      stream?.getTracks?.().forEach((t: any) => t.stop());
    } catch {
      /* nothing useful to do */
    }
    setStream(null);
    setRTCViewComp(null);
    setChecks(INITIAL);
  }, [stream]);

  const Icon = ({ state }: { state: CheckState }) =>
    state === 'pass' ? (
      <CheckCircle2 size={20} color="#10B981" />
    ) : state === 'fail' ? (
      <XCircle size={20} color="#EF4444" />
    ) : (
      <CircleDashed size={20} color="#9CA3AF" />
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WebRTC self-check</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.blurb}>
          Verifies that the native WebRTC module builds, links and renders under the New
          Architecture on this device.
        </Text>

        <View style={styles.card}>
          {checks.map((c, i) => (
            <View key={c.id} style={[styles.row, i < checks.length - 1 && styles.rowBorder]}>
              <Icon state={c.state} />
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{c.label}</Text>
                {!!c.detail && (
                  <Text
                    style={[styles.rowDetail, c.state === 'fail' && styles.rowDetailFail]}
                    numberOfLines={3}
                  >
                    {c.detail}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, running && styles.btnDisabled]}
            onPress={run}
            disabled={running}
          >
            {running ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>Run checks</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={stop}>
            <Text style={styles.btnGhostText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* The real test. An audio-only stream paints nothing, which is the
            expected result — what matters is that mounting doesn't crash. */}
        {!!RTCViewComp && !!stream && (
          <View style={styles.viewBox}>
            <RTCViewComp
              streamURL={stream.toURL()}
              style={styles.rtcView}
              objectFit="cover"
            />
            <Text style={styles.viewNote}>
              RTCView is mounted above. Audio-only streams render blank — a black box here
              is a pass, a crash is a fail.
            </Text>
          </View>
        )}

        <Text style={styles.platform}>
          {Platform.OS} · New Architecture enabled
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  content: { padding: 20, paddingBottom: 48 },
  blurb: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: '#111827' },
  rowDetail: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  rowDetailFail: { color: '#EF4444' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#10B981' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  btnGhost: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  btnGhostText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  viewBox: { marginTop: 20 },
  rtcView: { width: '100%', height: 160, backgroundColor: '#000000', borderRadius: 12 },
  viewNote: { fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 17 },
  platform: { fontSize: 11, color: '#9CA3AF', marginTop: 24, textAlign: 'center' },
});
