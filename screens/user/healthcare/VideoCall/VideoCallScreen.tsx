import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  startConnecting,
  connectionEstablished,
  startReconnecting,
  connectionFailed,
  toggleMute,
  toggleVideo,
  toggleSpeaker,
  updateDuration,
  updateNetworkQuality,
  endCall,
  resetCall,
  type CallStatus,
  type NetworkQuality,
} from './videoCallSlice';
import InCallChatScreen from '../InCallChat/InCallChatScreen';
import { clearChat } from '../InCallChat/inCallChatSlice';

// ── Constants ─────────────────────────────────

const PIP_WIDTH = 110;
const PIP_HEIGHT = 148;

const DARK = {
  bg: '#070B18',
  surface: 'rgba(255,255,255,0.07)',
  surfaceHigh: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.09)',
  primary: '#2A7FFF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  text: '#F1F5F9',
  textDim: 'rgba(241,245,249,0.55)',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    danger: ['#EF4444', '#DC2626'] as [string, string],
  },
};

// ── Helpers ───────────────────────────────────

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const NETWORK_CONFIG: Record<NetworkQuality, { bars: number; color: string; label: string }> = {
  excellent:    { bars: 4, color: DARK.success,  label: 'Excellent' },
  good:         { bars: 3, color: DARK.success,  label: 'Good' },
  poor:         { bars: 1, color: DARK.warning,  label: 'Poor' },
  disconnected: { bars: 0, color: DARK.error,    label: 'No Signal' },
};

const STATUS_LABEL: Partial<Record<CallStatus, string>> = {
  connecting:   'Connecting…',
  reconnecting: 'Reconnecting…',
  failed:       'Connection failed',
  ended:        'Call ended',
};

// ── Component ─────────────────────────────────

const VideoCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const { callStatus, isMuted, isVideoEnabled, isSpeakerOn, duration, networkQuality, error } =
    useAppSelector((state) => state.videoCall);

  const [chatVisible, setChatVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Entry fade
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Pulse for connecting/reconnecting
  useEffect(() => {
    if (callStatus === 'connecting' || callStatus === 'reconnecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [callStatus]);

  // Controls fade
  useEffect(() => {
    Animated.timing(controlsAnim, {
      toValue: controlsVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible]);

  // Connection setup
  useEffect(() => {
    const appointmentId = route.params?.appointmentId ?? '';
    dispatch(startConnecting(appointmentId));
    const t = setTimeout(() => dispatch(connectionEstablished()), 2000);
    return () => {
      clearTimeout(t);
      dispatch(resetCall());
      dispatch(clearChat());
    };
  }, [dispatch, route.params?.appointmentId]);

  // Duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      durationRef.current = setInterval(() => {
        dispatch(updateDuration(duration + 1));
      }, 1000);
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [callStatus, duration, dispatch]);

  // Reconnect
  useEffect(() => {
    if (callStatus === 'reconnecting') {
      reconnectTimerRef.current = setTimeout(() => {
        dispatch(connectionEstablished());
      }, 3000);
    }
    return () => { if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current); };
  }, [callStatus, dispatch]);

  // Network quality simulation
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const q: NetworkQuality[] = ['excellent', 'good', 'good', 'good', 'poor'];
    const t = setInterval(() => {
      dispatch(updateNetworkQuality(q[Math.floor(Math.random() * q.length)]));
    }, 10000);
    return () => clearInterval(t);
  }, [callStatus, dispatch]);

  // Auto-hide controls
  useEffect(() => {
    if (controlsVisible && callStatus === 'connected' && !chatVisible) {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 5000);
    }
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [controlsVisible, callStatus, chatVisible]);

  // Navigate on ended
  useEffect(() => {
    if (callStatus === 'ended') {
      const t = setTimeout(() => navigation.goBack(), 2200);
      return () => clearTimeout(t);
    }
  }, [callStatus, navigation]);

  // ── Handlers ──────────────────────────────

  const handleToggleControls = useCallback(() => {
    if (!chatVisible) setControlsVisible((v) => !v);
  }, [chatVisible]);

  const handleEndCall = useCallback(() => {
    Alert.alert('End Call', 'Are you sure you want to end this consultation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Call', style: 'destructive', onPress: () => dispatch(endCall()) },
    ]);
  }, [dispatch]);

  const handleToggleChat = useCallback(() => {
    setChatVisible((v) => !v);
    setControlsVisible(true);
  }, []);

  // ── Network bars ──────────────────────────

  const netCfg = NETWORK_CONFIG[networkQuality];
  const statusLabel = STATUS_LABEL[callStatus];

  // ── Control Button ────────────────────────

  const ControlBtn: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    active?: boolean;
    danger?: boolean;
    badge?: boolean;
    onPress: () => void;
  }> = ({ icon, label, active = false, danger = false, badge = false, onPress }) => (
    <TouchableOpacity
      style={[styles.controlBtn, active && styles.controlBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {danger ? (
        <LinearGradient colors={DARK.gradient.danger} style={styles.controlBtnGradient}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </LinearGradient>
      ) : active ? (
        <LinearGradient colors={DARK.gradient.primary} style={styles.controlBtnGradient}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={styles.controlBtnInner}>
          <Ionicons name={icon} size={22} color={DARK.text} />
        </View>
      )}
      {badge && <View style={styles.controlBtnBadge} />}
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // ── Render ────────────────────────────────────

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.container}>
        <StatusBar hidden />

        {/* Remote video (full-screen placeholder) */}
        <TouchableOpacity
          style={styles.remoteVideo}
          activeOpacity={1}
          onPress={handleToggleControls}
        >
          <View style={styles.remoteVideoPlaceholder}>
            <View style={styles.remoteAvatarWrap}>
              <MaterialCommunityIcons name="doctor" size={56} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.remoteVideoLabel}>Remote Video Feed</Text>
          </View>

          {/* Status overlay */}
          {statusLabel && (
            <View style={styles.statusOverlay}>
              <Animated.View style={[styles.statusPulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.statusOverlayText}>{statusLabel}</Text>
              {(callStatus === 'connecting' || callStatus === 'reconnecting') && (
                <View style={styles.statusDots}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.statusDot, { opacity: 0.4 + i * 0.2 }]} />
                  ))}
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* PIP self-view */}
        <View style={styles.pipContainer}>
          <View style={[styles.pipVideo, !isVideoEnabled && styles.pipVideoOff]}>
            {isVideoEnabled ? (
              <>
                <MaterialCommunityIcons name="camera-outline" size={22} color="rgba(255,255,255,0.3)" />
                <Text style={styles.pipLabel}>You</Text>
              </>
            ) : (
              <>
                <Ionicons name="videocam-off-outline" size={22} color="rgba(255,255,255,0.25)" />
                <Text style={styles.pipLabel}>Cam Off</Text>
              </>
            )}
          </View>
        </View>

        {/* Top bar */}
        <Animated.View style={[styles.topBar, { opacity: controlsAnim }]}>
          {/* Duration */}
          <View style={styles.durationBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>

          {/* Network quality */}
          <View style={styles.networkBadge}>
            <View style={styles.networkBars}>
              {[1, 2, 3, 4].map((b) => (
                <View
                  key={b}
                  style={[
                    styles.networkBar,
                    { height: 4 + b * 3 },
                    b <= netCfg.bars
                      ? { backgroundColor: netCfg.color }
                      : { backgroundColor: 'rgba(255,255,255,0.2)' },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.networkLabel, { color: netCfg.color }]}>{netCfg.label}</Text>
          </View>
        </Animated.View>

        {/* Control bar */}
        <Animated.View style={[styles.controlBar, { opacity: controlsAnim }]}>
          <View style={styles.controlBarInner}>
            <ControlBtn
              icon={isMuted ? 'mic-off' : 'mic-outline'}
              label={isMuted ? 'Unmute' : 'Mute'}
              active={isMuted}
              onPress={() => dispatch(toggleMute())}
            />
            <ControlBtn
              icon={isVideoEnabled ? 'videocam-outline' : 'videocam-off-outline'}
              label={isVideoEnabled ? 'Cam Off' : 'Cam On'}
              active={!isVideoEnabled}
              onPress={() => dispatch(toggleVideo())}
            />
            <ControlBtn
              icon={isSpeakerOn ? 'volume-high-outline' : 'volume-low-outline'}
              label={isSpeakerOn ? 'Speaker' : 'Earpiece'}
              active={!isSpeakerOn}
              onPress={() => dispatch(toggleSpeaker())}
            />
            <ControlBtn
              icon="chatbubble-ellipses-outline"
              label="Chat"
              active={chatVisible}
              badge={chatVisible}
              onPress={handleToggleChat}
            />
            <ControlBtn
              icon="call"
              label="End"
              danger
              onPress={handleEndCall}
            />
          </View>
        </Animated.View>

        {/* In-call chat */}
        <InCallChatScreen visible={chatVisible} onClose={handleToggleChat} />

        {/* Error banner */}
        {error && callStatus !== 'ended' && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={14} color="#FCA5A5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </SafeAreaView>
    </Animated.View>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },

  // Remote video
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F1425',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  remoteAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  remoteVideoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.25)',
  },

  // Status overlay
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7,11,24,0.75)',
    gap: 12,
  },
  statusPulseRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(14,165,233,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusOverlayText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: -0.3,
  },
  statusDots: {
    flexDirection: 'row',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DARK.primary,
  },

  // PIP
  pipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 46,
    right: 16,
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },
  pipVideo: {
    flex: 1,
    backgroundColor: '#1A2035',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  pipVideoOff: {
    backgroundColor: '#0F1425',
  },
  pipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 46,
    left: 16,
    right: PIP_WIDTH + 16 + 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7,11,24,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: DARK.error,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK.text,
    fontVariant: ['tabular-nums'],
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7,11,24,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  networkBar: {
    width: 3,
    borderRadius: 1.5,
  },
  networkLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Control bar
  controlBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(7,11,24,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  controlBtn: {
    alignItems: 'center',
    gap: 5,
    position: 'relative',
  },
  controlBtnActive: {},
  controlBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: DARK.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK.border,
  },
  controlBtnGradient: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  controlBtnBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DARK.error,
    borderWidth: 1.5,
    borderColor: DARK.bg,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: DARK.textDim,
    textAlign: 'center',
  },

  // Error
  errorBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FCA5A5',
    flex: 1,
  },
});

export default VideoCallScreen;