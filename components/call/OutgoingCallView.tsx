// ============================================================================
// The call screen, both sides, every vertical.
//
// Two visual modes behind one state machine:
//   pre-connect  — avatar, name, "Ringing…"/"Incoming", and the outcome
//                  (busy / declined / no answer) if it never connects
//   in-call      — live controls, a duration timer, and for a video
//                  consultation the remote and local video tiles
//
// The audio itself is peer-to-peer WebRTC (see usePeerConnection). This used to
// hand off to the phone's native dialer, which is why it once carried a
// "standard carrier rates apply" footnote and a redial button — both are gone,
// along with the handoff.
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallSession, CallPhase } from '../../services/call/useCallSession';
import type { MediaKind } from '../../services/call/usePeerConnection';
import type { RoomType } from '../../services/socket/socketClient';
import {
  startVideoCallApi,
  endVideoCallApi,
} from '../../networks/healthcare/appointmentApi';

export interface OutgoingCallViewProps {
  roomId: string;
  roomType: RoomType;
  counterpartName?: string;
  counterpartImage?: string;
  accent?: string;
  /** Start ringing as soon as the screen opens. */
  autoRing?: boolean;
  /** Answering an incoming call rather than placing one. */
  incomingCallId?: string;
  /** Accept immediately — set when arriving from the incoming-call sheet. */
  autoAccept?: boolean;
  /** 'video' for healthcare consultations. */
  media?: MediaKind;
}

const STATUS_COPY: Record<CallPhase, string> = {
  idle: 'Ready to call',
  ringing: 'Ringing…',
  incoming: 'Incoming call',
  connected: 'Connected',
  busy: 'On another call',
  declined: 'Call declined',
  missed: 'No answer',
  ended: 'Call ended',
};

/** RTCView is only loadable in a build with the native module linked. */
function loadRTCView(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-webrtc').RTCView;
  } catch {
    return null;
  }
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const OutgoingCallView: React.FC<OutgoingCallViewProps> = ({
  roomId,
  roomType,
  counterpartName,
  counterpartImage,
  accent = '#2563EB',
  autoRing = true,
  incomingCallId,
  autoAccept = false,
  media = 'audio',
}) => {
  const navigation = useNavigation<any>();
  // React Native's SafeAreaView is a no-op on Android, so the action row could
  // sit under the gesture bar — on a call screen that means End is unreachable.
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(0);

  const { phase, error, ring, accept, decline, end, media: peer } = useCallSession({
    roomId,
    roomType,
    counterpartName,
    media,
    incomingCallId,
    onClosed: (final) => {
      // Leave the outcome on screen briefly so the user sees WHY it ended
      // rather than being bounced back with no explanation.
      const delay = final === 'busy' || final === 'missed' || final === 'declined' ? 1800 : 700;
      setTimeout(() => navigation.canGoBack() && navigation.goBack(), delay);
    },
  });

  useEffect(() => {
    if (autoAccept) accept();
    else if (autoRing && !incomingCallId) ring();
    // Intentionally once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The timer counts CONNECTED time, not ringing time — it starts when media
  // is actually flowing, so it reflects what a call would be billed for if it
  // ever were.
  const live = peer.state === 'connected';
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [live]);

  const RTCView = useMemo(() => (media === 'video' ? loadRTCView() : null), [media]);

  // Healthcare consultations keep a VideoCall record (created / active /
  // ended) that billing and history read. The media no longer comes from that
  // endpoint, but the record still has to be opened and closed — and opening
  // it is also what publishes `video_call_started`, which pulls a patient
  // sitting in the waiting room straight into the call.
  //
  // Deliberately best-effort in both directions: a failure here must never
  // stop a consultation that is otherwise connecting fine.
  const videoCallIdRef = useRef<string | null>(null);
  const isConsult = roomType === 'healthcare' && media === 'video';

  useEffect(() => {
    if (!isConsult || peer.state !== 'connected' || videoCallIdRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await startVideoCallApi(roomId);
        if (!cancelled && res.success && res.data?.callId) {
          videoCallIdRef.current = String(res.data.callId);
        }
      } catch {
        /* bookkeeping only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConsult, peer.state, roomId]);

  const terminal =
    phase === 'busy' || phase === 'declined' || phase === 'missed' || phase === 'ended';

  // Close the record once, when the call reaches a terminal state.
  useEffect(() => {
    if (!terminal) return;
    const id = videoCallIdRef.current;
    if (!id) return;
    videoCallIdRef.current = null;
    endVideoCallApi(id).catch(() => {
      /* bookkeeping only */
    });
  }, [terminal]);
  const inCall = phase === 'connected' && !terminal;
  const showVideo = inCall && media === 'video' && !!RTCView;

  // What the status line says while connecting: peer.state is more truthful
  // than phase here, because "accepted" and "media flowing" are not the same
  // moment and the gap is exactly where users wonder if it broke.
  const statusLine = () => {
    if (error) return error;
    if (phase !== 'connected') return STATUS_COPY[phase];
    if (peer.state === 'preparing') return 'Connecting…';
    if (peer.state === 'negotiating') return 'Connecting…';
    if (peer.state === 'connected') return formatDuration(seconds);
    if (peer.state === 'failed') return 'Connection failed';
    return STATUS_COPY[phase];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Remote video fills the screen behind everything else. */}
      {showVideo && !!peer.remoteStream && (
        <RTCView
          streamURL={peer.remoteStream.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
        />
      )}

      <View style={[styles.top, showVideo && styles.topOverVideo]}>
        {!showVideo && (
          <>
            {counterpartImage ? (
              <Image source={{ uri: counterpartImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={48} color="#94A3B8" />
              </View>
            )}
          </>
        )}
        <Text style={styles.name}>{counterpartName || 'Contact'}</Text>
        <Text style={styles.status}>{statusLine()}</Text>

        {phase === 'ringing' && <ActivityIndicator style={{ marginTop: 18 }} color="#94A3B8" />}

        {phase === 'busy' && (
          <Text style={styles.hint}>They are already on a call. Try again in a moment.</Text>
        )}
      </View>

      {/* Local preview, video only. */}
      {showVideo && !!peer.localStream && peer.cameraEnabled && (
        <RTCView
          streamURL={peer.localStream.toURL()}
          style={styles.localTile}
          objectFit="cover"
          zOrder={1}
          mirror
        />
      )}

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
        {inCall && (
          <>
            <View style={styles.control}>
              <TouchableOpacity
                style={[styles.roundBtn, styles.utilBtn, !peer.micEnabled && styles.utilBtnOff]}
                onPress={peer.toggleMic}
                accessibilityLabel={peer.micEnabled ? 'Mute' : 'Unmute'}
              >
                <Ionicons name={peer.micEnabled ? 'mic' : 'mic-off'} size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{peer.micEnabled ? 'Mute' : 'Unmute'}</Text>
            </View>

            {media === 'video' && (
              <>
                <View style={styles.control}>
                  <TouchableOpacity
                    style={[styles.roundBtn, styles.utilBtn, !peer.cameraEnabled && styles.utilBtnOff]}
                    onPress={peer.toggleCamera}
                    accessibilityLabel={peer.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                  >
                    <Ionicons
                      name={peer.cameraEnabled ? 'videocam' : 'videocam-off'}
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <Text style={styles.controlLabel}>
                    {peer.cameraEnabled ? 'Camera' : 'Camera off'}
                  </Text>
                </View>
                <View style={styles.control}>
                  <TouchableOpacity
                    style={[styles.roundBtn, styles.utilBtn]}
                    onPress={peer.switchCamera}
                    accessibilityLabel="Switch camera"
                  >
                    <Ionicons name="camera-reverse" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.controlLabel}>Flip</Text>
                </View>
              </>
            )}
          </>
        )}

        {/* An unanswered incoming call still offers Decline as well as End. */}
        {phase === 'incoming' && (
          <TouchableOpacity style={[styles.roundBtn, styles.endBtn]} onPress={decline}>
            <Ionicons
              name="call"
              size={26}
              color="#fff"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>
        )}

        {!terminal && phase !== 'incoming' && (
          <TouchableOpacity
            style={[styles.roundBtn, styles.endBtn]}
            onPress={end}
            accessibilityLabel="End call"
          >
            <Ionicons
              name="call"
              size={26}
              color="#fff"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>
        )}

        {terminal && (
          <TouchableOpacity
            style={[styles.roundBtn, { backgroundColor: accent }]}
            onPress={() => navigation.canGoBack() && navigation.goBack()}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.footnote}>
        {roomType === 'healthcare'
          ? 'Encrypted in-app consultation — uses your internet connection.'
          : 'Connects over the internet — no call charges.'}
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  control: { alignItems: 'center', gap: 6 },
  controlLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '500' },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingVertical: 56,
  },
  top: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  topOverVideo: {
    backgroundColor: 'rgba(15,23,42,0.55)',
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 22 },
  avatarFallback: { backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  status: { color: '#94A3B8', fontSize: 16, marginTop: 10 },
  hint: { color: '#64748B', fontSize: 13, marginTop: 16, textAlign: 'center', lineHeight: 19 },
  localTile: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 104,
    height: 148,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  roundBtn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  utilBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)' },
  utilBtnOff: { backgroundColor: 'rgba(255,255,255,0.38)' },
  endBtn: { backgroundColor: '#DC2626' },
  footnote: { color: '#475569', fontSize: 12, textAlign: 'center', paddingHorizontal: 32 },
});

export default OutgoingCallView;
