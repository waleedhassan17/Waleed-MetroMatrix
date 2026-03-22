import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  joinWaitingRoom,
  setDevicePermissions,
  updateWaitingStatus,
  leaveWaitingRoom,
  type WaitingStatus,
  type DevicePermissions,
} from './videoWaitingRoomSlice';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';

// ── Theme ─────────────────────────────────────

const DARK = {
  bg: '#0A0F1E',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',
  primary: '#2A7FFF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  text: '#F1F5F9',
  textDim: 'rgba(241,245,249,0.55)',
  textFaint: 'rgba(241,245,249,0.28)',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    header: ['#2A7FFF', '#1857C0'] as [string, string],
  },
};

// ── Tips ──────────────────────────────────────

const WAITING_TIPS = [
  'Make sure you are in a well-lit, quiet room for the best experience.',
  'Have your medical reports or prescriptions ready if applicable.',
  'Write down your symptoms and questions beforehand.',
  'Ensure a stable internet connection for a smooth video call.',
  'Keep your device charged or plugged in during the consultation.',
  'Position your camera at eye level for the best video angle.',
];

// ── Status Config ─────────────────────────────

const getStatusConfig = (status: WaitingStatus) => {
  const cfgs = {
    connecting:       { label: 'Connecting…',         color: DARK.primary,  bgColor: 'rgba(14,165,233,0.12)',  icon: 'wifi' as const,              spinning: true  },
    waiting:          { label: 'Waiting for doctor',  color: DARK.warning,  bgColor: 'rgba(245,158,11,0.12)',  icon: 'time-outline' as const,      spinning: false },
    'doctor-joining': { label: 'Doctor is joining',   color: DARK.success,  bgColor: 'rgba(16,185,129,0.12)', icon: 'person-add-outline' as const, spinning: false },
    ready:            { label: 'Ready to start!',     color: DARK.success,  bgColor: 'rgba(16,185,129,0.12)', icon: 'checkmark-circle' as const,   spinning: false },
    error:            { label: 'Connection error',    color: DARK.error,    bgColor: 'rgba(239,68,68,0.12)',   icon: 'alert-circle-outline' as const, spinning: false },
  };
  return cfgs[status];
};

// ── Component ─────────────────────────────────

const VideoWaitingRoomScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const {
    appointment,
    doctor,
    waitingStatus,
    estimatedWait,
    devicePermissions,
    loading,
    error,
  } = useAppSelector((state) => state.videoWaitingRoom);

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tipFadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  // Tip rotation with fade
  useEffect(() => {
    tipIntervalRef.current = setInterval(() => {
      Animated.timing(tipFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setCurrentTipIndex((p) => (p + 1) % WAITING_TIPS.length);
        Animated.timing(tipFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 8000);
    return () => { if (tipIntervalRef.current) clearInterval(tipIntervalRef.current); };
  }, []);

  // Pulse for waiting
  useEffect(() => {
    if (waitingStatus === 'waiting' || waitingStatus === 'connecting') {
      const p = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      p.start();
      return () => p.stop();
    }
  }, [waitingStatus]);

  useEffect(() => { handleCheckPermissions(); }, []);

  useEffect(() => {
    const { camera, microphone } = devicePermissions;
    if (camera === 'granted' && microphone === 'granted' && !appointment) {
      handleJoinWaitingRoom();
    }
  }, [devicePermissions]);

  useEffect(() => {
    return () => { dispatch(leaveWaitingRoom()); };
  }, [dispatch]);

  useEffect(() => {
    if (waitingStatus === 'ready' && appointment) {
      const t = setTimeout(() => {
        navigation.replace(HealthcareRouteNames.VideoCall, {
          appointmentId: appointment.appointmentId,
          roomId: route.params?.roomId ?? '',
        });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [waitingStatus, appointment, navigation, route.params?.roomId]);

  // ── Handlers ──────────────────────────────

  const handleCheckPermissions = useCallback(async () => {
    try {
      dispatch(setDevicePermissions({ camera: 'granted', microphone: 'granted' }));
      setCameraReady(true);
    } catch {}
  }, [dispatch]);

  const handleJoinWaitingRoom = useCallback(async () => {
    const appointmentId = route.params?.appointmentId ?? 'apt-001';
    const doctorId = route.params?.doctorId ?? 'doc-001';
    dispatch(joinWaitingRoom({ appointmentId, doctorId }));
  }, [dispatch, route.params?.appointmentId, route.params?.doctorId]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave Waiting Room',
      'Are you sure you want to leave? You may lose your spot in the queue.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => { dispatch(leaveWaitingRoom()); navigation.goBack(); },
        },
      ],
    );
  }, [dispatch, navigation]);

  const statusConfig = getStatusConfig(waitingStatus);

  // ── Error Screen ──────────────────────────

  if (error && waitingStatus === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
        <View style={styles.errorScreen}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="wifi-outline" size={40} color="#EF4444" />
          </LinearGradient>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleJoinWaitingRoom} activeOpacity={0.85}>
            <LinearGradient colors={DARK.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackLink}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ───────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={DARK.gradient.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="video-wireless" size={20} color="#FFFFFF" />
            <View>
              <Text style={styles.headerTitle}>Video Waiting Room</Text>
              <Text style={styles.headerSubtitle}>Your consultation will begin soon</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
            <Ionicons name="exit-outline" size={16} color="#FCA5A5" />
            <Text style={styles.leaveBtnText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Doctor Card ── */}
        {doctor && (
          <View style={styles.doctorCard}>
            <View style={styles.doctorAvatarWrap}>
              {doctor.profileImage ? (
                <Image source={{ uri: doctor.profileImage }} style={styles.doctorImage} />
              ) : (
                <LinearGradient colors={['#1E3A5F', '#1E2D4F']} style={styles.doctorAvatarPlaceholder}>
                  <Text style={styles.doctorAvatarInitial}>
                    {(doctor.bio?.[0] ?? 'D').toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.doctorInfoBlock}>
              <Text style={styles.doctorName} numberOfLines={1}>Dr. {doctor.bio || 'Doctor'}</Text>
              <Text style={styles.doctorSpecialty}>{route.params?.specialtyName ?? 'Specialist'}</Text>
              <Text style={styles.doctorQuals} numberOfLines={1}>
                {doctor.qualifications.join(' · ')}
              </Text>
            </View>
          </View>
        )}

        {/* ── Self Preview ── */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>Your Camera</Text>
            <View style={styles.previewBadges}>
              <View style={[
                styles.deviceBadge,
                { backgroundColor: devicePermissions.camera === 'granted' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' },
              ]}>
                <Ionicons
                  name="camera-outline"
                  size={13}
                  color={devicePermissions.camera === 'granted' ? DARK.success : DARK.error}
                />
              </View>
              <View style={[
                styles.deviceBadge,
                { backgroundColor: devicePermissions.microphone === 'granted' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' },
              ]}>
                <Ionicons
                  name="mic-outline"
                  size={13}
                  color={devicePermissions.microphone === 'granted' ? DARK.success : DARK.error}
                />
              </View>
            </View>
          </View>

          {cameraReady && devicePermissions.camera === 'granted' ? (
            <View style={styles.previewFeed}>
              <MaterialCommunityIcons name="camera-outline" size={36} color="rgba(255,255,255,0.2)" />
              <Text style={styles.previewPlaceholderText}>Camera Preview</Text>
            </View>
          ) : (
            <View style={[styles.previewFeed, styles.previewFeedOff]}>
              <Ionicons name="videocam-off-outline" size={36} color="rgba(255,255,255,0.2)" />
              <Text style={styles.previewPlaceholderText}>Camera not available</Text>
            </View>
          )}
        </View>

        {/* ── Permission Denied ── */}
        {(devicePermissions.camera === 'denied' || devicePermissions.microphone === 'denied') && (
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={DARK.error} />
            </View>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>Permissions Required</Text>
              {devicePermissions.camera === 'denied' && (
                <Text style={styles.permissionText}>• Camera access needed for video</Text>
              )}
              {devicePermissions.microphone === 'denied' && (
                <Text style={styles.permissionText}>• Microphone access needed for audio</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={handleCheckPermissions}
            >
              <Text style={styles.permissionBtnText}>Grant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Status Indicator ── */}
        <Animated.View style={[styles.statusCard, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: statusConfig.bgColor }]}>
            {statusConfig.spinning ? (
              <ActivityIndicator size="small" color={statusConfig.color} />
            ) : (
              <Ionicons name={statusConfig.icon} size={22} color={statusConfig.color} />
            )}
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            {estimatedWait !== null && waitingStatus === 'waiting' && (
              <Text style={styles.estimatedWait}>~{estimatedWait} min estimated wait</Text>
            )}
          </View>
        </Animated.View>

        {/* ── Tips ── */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.tipsIconWrap}>
              <Ionicons name="bulb-outline" size={14} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.tipsTitle}>Preparation Tip</Text>
            <View style={styles.tipsDots}>
              {WAITING_TIPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.tipsDot,
                    i === currentTipIndex && styles.tipsDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
          <Animated.Text style={[styles.tipsText, { opacity: tipFadeAnim }]}>
            {WAITING_TIPS[currentTipIndex]}
          </Animated.Text>
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  leaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
  },

  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // Doctor card
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.card,
    borderRadius: 10,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: DARK.cardBorder,
  },
  doctorAvatarWrap: {
    position: 'relative',
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  doctorAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DARK.success,
    borderWidth: 2,
    borderColor: DARK.bg,
  },
  doctorInfoBlock: {
    flex: 1,
    gap: 3,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK.text,
  },
  doctorSpecialty: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK.primary,
  },
  doctorQuals: {
    fontSize: 11,
    fontWeight: '500',
    color: DARK.textFaint,
  },

  // Self preview
  previewCard: {
    backgroundColor: DARK.card,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK.cardBorder,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 10,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  deviceBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFeed: {
    height: 180,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  previewFeedOff: {
    backgroundColor: '#0A0F1E',
  },
  previewPlaceholderText: {
    fontSize: 13,
    fontWeight: '500',
    color: DARK.textFaint,
  },

  // Permission card
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  permissionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionInfo: {
    flex: 1,
    gap: 2,
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '500',
    color: DARK.textDim,
  },
  permissionBtn: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  permissionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
  },

  // Status card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.card,
    borderRadius: 10,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: DARK.cardBorder,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  estimatedWait: {
    fontSize: 13,
    fontWeight: '500',
    color: DARK.textDim,
    marginTop: 3,
  },

  // Tips card
  tipsCard: {
    backgroundColor: DARK.card,
    borderRadius: 10,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: DARK.cardBorder,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipsIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  tipsDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  tipsDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tipsDotActive: {
    width: 14,
    backgroundColor: DARK.warning,
  },
  tipsText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK.text,
    lineHeight: 22,
  },

  // Error screen
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK.text,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK.textDim,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  retryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goBackLink: {
    marginTop: 8,
    padding: 8,
  },
  goBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK.textDim,
  },
});

export default VideoWaitingRoomScreen;