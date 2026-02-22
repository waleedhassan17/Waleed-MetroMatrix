// screens/user/homeservice/call-screen/callScreen.tsx
//
// Real voice calling powered by Agora RTC + Socket.IO signaling.
//
// Prerequisites (install in project):
//   npx expo install react-native-agora
//   npm install socket.io-client
//
// Note: react-native-agora requires Expo bare workflow or EAS Build with a custom dev client.
// Run: npx expo prebuild (if not already done)
//
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from 'react-native-agora';

import SocketService from '../../../../utils/socketService';
import { chatNetwork } from '../../../../networks/serviceProviders/chatNetwork';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// ─── Service configuration ───────────────────────────────────────────────────

const SERVICE_CONFIG: Record<string, {
  title: string;
  gradient: string[];
  accentColor: string;
}> = {
  electricians: { title: 'Electrician', gradient: ['#F59E0B', '#D97706'], accentColor: '#F59E0B' },
  plumbers: { title: 'Plumber', gradient: ['#3B82F6', '#2563EB'], accentColor: '#3B82F6' },
  'ac-repairers': { title: 'AC Repairer', gradient: ['#06B6D4', '#0891B2'], accentColor: '#06B6D4' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderInfo {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image?: string;
  phoneNumber?: string;
}

type CallState = 'ringing' | 'connecting' | 'connected' | 'ended' | 'rejected' | 'missed';

type CallScreenRouteParams = {
  provider?: ProviderInfo;
  serviceType?: 'electricians' | 'plumbers' | 'ac-repairers';
  // When answering an incoming call, these are pre-populated
  incomingCallData?: {
    callerId: string;
    callerRole: string;
    channelName: string;
    callerInfo: ProviderInfo;
  };
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CallScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: CallScreenRouteParams }, 'params'>>();

  const {
    provider,
    serviceType = 'electricians',
    incomingCallData,
  } = route.params || {};

  const serviceConfig = SERVICE_CONFIG[serviceType] || SERVICE_CONFIG.electricians;
  const isIncoming = !!incomingCallData;

  // ── Call state ─────────────────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [channelName, setChannelName] = useState(incomingCallData?.channelName || '');
  const [agoraToken, setAgoraToken] = useState<string | null>(null);
  const [agoraAppId, setAgoraAppId] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const engine = useRef<IRtcEngine | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const ringAnim = useRef(new Animated.Value(0.3)).current;
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // ── Entry animation ────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Pulse animation while ringing ──────────────────────────────────────────
  useEffect(() => {
    if (callState === 'ringing' || callState === 'connecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      ring.start();
      return () => { pulse.stop(); ring.stop(); };
    }
  }, [callState]);

  // ── Duration timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'connected') {
      callStartTimeRef.current = Date.now();
      durationTimerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // ── Socket: listen for call events ────────────────────────────────────────
  useEffect(() => {
    // Caller: provider accepted
    const unsubAccepted = SocketService.onCallEvent('call:accepted', async ({ channelName: ch }) => {
      setChannelName(ch);
      await joinAgoraChannel(ch);
    });

    // Provider rejected
    const unsubRejected = SocketService.onCallEvent('call:rejected', () => {
      setCallState('rejected');
      setTimeout(() => navigation.goBack(), 1500);
    });

    // Remote party ended
    const unsubEnded = SocketService.onCallEvent('call:ended', ({ durationSeconds }) => {
      leaveAgoraChannel();
      setCallState('ended');
      setTimeout(() => navigation.goBack(), 1000);
    });

    return () => {
      unsubAccepted();
      unsubRejected();
      unsubEnded();
    };
  }, []);

  // ── Outgoing call: request token + signal via socket ──────────────────────
  useEffect(() => {
    if (!isIncoming && provider?.id) {
      initiateOutgoingCall();
    }
  }, []);

  // ── Incoming call: accept/reject flow handled via UI (see buttons below) ──

  // ── Agora setup ────────────────────────────────────────────────────────────
  const setupAgora = useCallback(async (appId: string) => {
    try {
      engine.current = createAgoraRtcEngine();
      engine.current.initialize({ appId });
      engine.current.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      engine.current.enableAudio();
      engine.current.disableVideo();

      engine.current.addListener('onUserOffline', () => {
        // Remote party left
        endCall();
      });

      engine.current.addListener('onJoinChannelSuccess', () => {
        setCallState('connected');
      });

      engine.current.addListener('onError', (errorCode) => {
        console.error('Agora error:', errorCode);
      });
    } catch (err) {
      console.error('Agora setup failed:', err);
    }
  }, []);

  const joinAgoraChannel = useCallback(async (ch: string) => {
    try {
      setCallState('connecting');

      // Fetch Agora token from backend
      const { token, appId } = await chatNetwork.generateCallToken(ch, 0);
      setAgoraToken(token);
      setAgoraAppId(appId);

      if (!engine.current) {
        await setupAgora(appId);
      }

      engine.current?.joinChannel(token, ch, 0, {});
    } catch (err) {
      console.error('Failed to join Agora channel:', err);
      Alert.alert('Call Failed', 'Could not connect to the call. Please try again.');
      navigation.goBack();
    }
  }, [setupAgora]);

  const leaveAgoraChannel = useCallback(() => {
    engine.current?.leaveChannel();
    engine.current?.release();
    engine.current = null;
  }, []);

  // ── Outgoing call flow ─────────────────────────────────────────────────────
  const initiateOutgoingCall = useCallback(async () => {
    try {
      const ch = `call_${provider!.id}_${Date.now()}`;
      setChannelName(ch);

      // Signal provider via Socket.IO
      SocketService.initiateCall({
        receiverId: provider!.id,
        receiverRole: 'provider',
        channelName: ch,
        callerInfo: {
          name: 'User', // replace with actual user name from Redux
          serviceType,
        },
        serviceType,
      });

      setCallState('ringing');

      // Timeout: if no answer in 30s
      setTimeout(() => {
        setCallState((current) => {
          if (current === 'ringing') {
            setCallState('missed');
            saveCallLog(ch, 'missed', 0);
            setTimeout(() => navigation.goBack(), 1500);
          }
          return current;
        });
      }, 30000);
    } catch (err) {
      console.error('initiateOutgoingCall error:', err);
    }
  }, [provider, serviceType]);

  // ── Accept incoming call ───────────────────────────────────────────────────
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCallData) return;
    const { callerId, callerRole, channelName: ch } = incomingCallData;

    SocketService.acceptCall({ callerId, callerRole, channelName: ch });
    await joinAgoraChannel(ch);
  }, [incomingCallData, joinAgoraChannel]);

  // ── End / reject call ──────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    const duration = durationTimerRef.current
      ? Math.floor((Date.now() - (callStartTimeRef.current || Date.now())) / 1000)
      : 0;

    // Signal other party
    if (provider?.id) {
      SocketService.endCall({
        otherPartyId: incomingCallData?.callerId || provider.id,
        otherPartyRole: incomingCallData ? incomingCallData.callerRole : 'provider',
        channelName,
        durationSeconds: duration,
      });
    }

    leaveAgoraChannel();
    saveCallLog(channelName, 'ended', duration);
    setCallState('ended');
    setTimeout(() => navigation.goBack(), 800);
  }, [channelName, provider, incomingCallData, leaveAgoraChannel]);

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCallData) return;
    SocketService.rejectCall({
      callerId: incomingCallData.callerId,
      callerRole: incomingCallData.callerRole,
      channelName: incomingCallData.channelName,
    });
    setCallState('rejected');
    setTimeout(() => navigation.goBack(), 800);
  }, [incomingCallData]);

  // ── Save call log to backend ───────────────────────────────────────────────
  const saveCallLog = useCallback(async (ch: string, status: string, duration: number) => {
    try {
      await chatNetwork.saveCallLog({
        receiverId: incomingCallData?.callerId || provider?.id || '',
        receiverType: isIncoming ? 'User' : 'Provider',
        channelName: ch,
        status,
        durationSeconds: duration,
        serviceType,
      });
    } catch (err) {
      // Non-critical
    }
  }, [incomingCallData, provider, isIncoming, serviceType]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      leaveAgoraChannel();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    engine.current?.muteLocalAudioStream(next);
  }, [isMuted]);

  const handleSpeaker = useCallback(() => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    engine.current?.setEnableSpeakerphone(next);
  }, [isSpeaker]);

  const handleChat = useCallback(() => {
    // @ts-ignore
    navigation.replace('ProviderChatScreen', {
      provider: incomingCallData?.callerInfo || provider,
      serviceType,
    });
  }, [navigation, provider, incomingCallData, serviceType]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const displayProvider = incomingCallData?.callerInfo || provider;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case 'ringing': return isIncoming ? 'Incoming Call...' : 'Ringing...';
      case 'connecting': return 'Connecting...';
      case 'connected': return formatDuration(callDuration);
      case 'ended': return 'Call Ended';
      case 'rejected': return 'Call Rejected';
      case 'missed': return 'No Answer';
    }
  };

  const statusColor = {
    ringing: serviceConfig.accentColor,
    connecting: '#F59E0B',
    connected: '#10B981',
    ended: '#EF4444',
    rejected: '#EF4444',
    missed: '#94A3B8',
  }[callState];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* ── Header ── */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={[styles.serviceBadge, { backgroundColor: `${serviceConfig.accentColor}30` }]}>
                <Text style={[styles.serviceBadgeText, { color: serviceConfig.accentColor }]}>
                  {serviceConfig.title}
                </Text>
              </View>

              <TouchableOpacity style={styles.headerBtn} onPress={handleChat}>
                <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* ── Avatar ── */}
            <View style={styles.avatarSection}>
              {(callState === 'ringing' || callState === 'connecting') && (
                <>
                  <Animated.View
                    style={[styles.pulseRingOuter, {
                      opacity: ringAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.1, 0.3] }),
                      transform: [{ scale: pulseAnim }],
                    }]}
                  />
                  <Animated.View
                    style={[styles.pulseRingInner, {
                      opacity: ringAnim,
                      transform: [{ scale: pulseAnim.interpolate({ inputRange: [1, 1.15], outputRange: [1, 1.08] }) }],
                    }]}
                  />
                </>
              )}

              <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient colors={serviceConfig.gradient as [string, string]} style={styles.avatarRing}>
                  <View style={styles.avatarInner}>
                    {displayProvider?.image ? (
                      <Image source={{ uri: displayProvider.image }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: serviceConfig.accentColor }]}>
                        <Text style={styles.avatarInitial}>
                          {displayProvider?.name?.[0]?.toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>

            {/* ── Provider Info ── */}
            <View style={styles.infoSection}>
              <Text style={styles.providerName}>{displayProvider?.name || 'Service Provider'}</Text>
              <Text style={styles.providerSpecialty}>{displayProvider?.specialty || serviceConfig.title}</Text>

              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusText}>{getStatusText()}</Text>
              </View>

              {displayProvider?.rating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{displayProvider.rating}</Text>
                  <Text style={styles.reviewsText}>({displayProvider.reviews} reviews)</Text>
                </View>
              )}
            </View>

            {/* ── Controls (when connected) ── */}
            {(callState === 'connected' || callState === 'ringing' || callState === 'connecting') && !isIncoming && (
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                  onPress={handleMute}
                >
                  <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFFFFF" />
                  <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
                  onPress={handleSpeaker}
                >
                  <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={24} color="#FFFFFF" />
                  <Text style={styles.controlLabel}>{isSpeaker ? 'Speaker On' : 'Speaker'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlBtn} onPress={handleChat}>
                  <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.controlLabel}>Message</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── End Call Button (outgoing / connected) ── */}
            {!isIncoming && (
              <View style={styles.endCallSection}>
                <TouchableOpacity style={styles.endCallButton} onPress={endCall} activeOpacity={0.8}>
                  <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.endCallGradient}>
                    <Ionicons name="call" size={30} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.endCallLabel}>End Call</Text>
              </View>
            )}

            {/* ── Accept / Reject for incoming call ── */}
            {isIncoming && callState === 'ringing' && (
              <View style={styles.incomingActions}>
                <View style={styles.incomingAction}>
                  <TouchableOpacity style={styles.rejectButton} onPress={rejectIncomingCall} activeOpacity={0.8}>
                    <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.incomingBtnGradient}>
                      <Ionicons name="call" size={30} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                    </LinearGradient>
                  </TouchableOpacity>
                  <Text style={styles.incomingLabel}>Decline</Text>
                </View>

                <View style={styles.incomingAction}>
                  <TouchableOpacity style={styles.acceptButton} onPress={acceptIncomingCall} activeOpacity={0.8}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.incomingBtnGradient}>
                      <Ionicons name="call" size={30} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                  <Text style={styles.incomingLabel}>Accept</Text>
                </View>
              </View>
            )}

          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: isAndroid ? (StatusBar.currentHeight || 0) + 10 : 10,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  serviceBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  serviceBadgeText: { fontSize: 13, fontWeight: '600' },

  // Avatar
  avatarSection: { alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  pulseRingOuter: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  pulseRingInner: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarContainer: { width: 120, height: 120 },
  avatarRing: { width: 120, height: 120, borderRadius: 60, padding: 4 },
  avatarInner: { flex: 1, borderRadius: 56, overflow: 'hidden', backgroundColor: '#1a1a2e' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '700', color: '#FFFFFF' },

  // Info
  infoSection: { alignItems: 'center', marginTop: 24, paddingHorizontal: 20 },
  providerName: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  providerSpecialty: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, gap: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  reviewsText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  // Controls
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingHorizontal: 20 },
  controlBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  controlLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.7)',
    marginTop: 8, position: 'absolute', bottom: -22,
  },

  // End call
  endCallSection: { alignItems: 'center' },
  endCallButton: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  endCallGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  endCallLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10 },

  // Incoming call actions
  incomingActions: { flexDirection: 'row', justifyContent: 'space-around', width: '70%' },
  incomingAction: { alignItems: 'center', gap: 10 },
  rejectButton: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  acceptButton: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden' },
  incomingBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  incomingLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
