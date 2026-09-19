import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { type ThemeMode } from '../../../../constants/theme';
import { barStyleOn, useTheme } from '../../../../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { fromLocalISODate } from '../../../../utils/date/localDate';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setActiveTab,
  fetchMyAppointments,
  cancelMyAppointment,
  openCancelSheet,
  closeCancelSheet,
  APPOINTMENT_PAGE,
} from './myAppointmentsSlice';
import { CANCELLATION_REASONS } from '../AppointmentDetail/appointmentDetailSlice';
import { setAppointment as setRescheduleAppointment } from '../RescheduleAppointment/rescheduleAppointmentSlice';
import type { Appointment } from '../../../../models/healthcare/types';
import { BackButton, BackButtonSpacer } from '../../../../components/ui';
import DoctorAvatar from '../../../../components/Healthcare/DoctorAvatar';
import { getAppointmentDoctorName } from '../../../../utils/healthcare/doctorDisplay';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';

// ── Theme ─────────────────────────────────────

// A function of the mode. Light returns exactly the literals this block
// always held; dark is derived by role — see constants/darkShift.ts.
const makeTHEME = (mode: ThemeMode) => {
  const { hue, ground, n, grad } = darkShift(mode);
  return {
  primary: hue('#2A7FFF'),
  primaryLight: ground('#EAF3FF', '#2A7FFF'),
  accent: hue('#5A9FFF'),
  success: hue('#10B981'),
  warning: hue('#F59E0B'),
  error: hue('#EF4444'),
  gradient: {
    primary: grad(['#2A7FFF', '#1857C0']) as [string, string],
    video: grad(['#5A9FFF', '#1E6AE1']) as [string, string],
  },
  };
};

// ── Status Config ─────────────────────────────

const STATUS_CONFIG: Record<
  Appointment['status'],
  { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap; dot: string }
> = {
  pending:   { label: 'Pending',   bg: '#FFFBEB', text: '#D97706', icon: 'time-outline',              dot: '#F59E0B' },
  confirmed: { label: 'Confirmed', bg: '#F0F7FF', text: '#1857C0', icon: 'checkmark-circle-outline',  dot: '#2A7FFF' },
  completed: { label: 'Completed', bg: '#F0FDF4', text: '#16A34A', icon: 'checkmark-done-outline',    dot: '#10B981' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', icon: 'close-circle-outline',      dot: '#EF4444' },
  'no-show': { label: 'No Show',   bg: '#FEF2F2', text: '#DC2626', icon: 'alert-circle-outline',      dot: '#EF4444' },
};

const TABS = [
  { key: 'upcoming' as const, label: 'Upcoming', icon: 'calendar-outline' as const },
  { key: 'past' as const,     label: 'Past',     icon: 'checkmark-done-outline' as const },
];

// ── Component ─────────────────────────────────

const MyAppointmentsScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isInTab = route.params?.isTab === true;

  const { appointments, activeTab, loading, error, cancelTargetId, cancelling, cancelError } =
    useAppSelector((state) => state.myAppointments);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab === 'upcoming' ? 0 : 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  // ── Filtered Appointments ──────────────────

  const filteredAppointments = useMemo(() => {
    if (activeTab === 'upcoming') {
      return appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
    }
    return appointments.filter(
      (a) => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no-show',
    );
  }, [appointments, activeTab]);

  // ── Handlers ──────────────────────────────

  const handleTabPress = (tab: 'upcoming' | 'past') => dispatch(setActiveTab(tab));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchMyAppointments({ limit: APPOINTMENT_PAGE }));
    setRefreshing(false);
  }, [dispatch]);

  // This list was once only ever fetched on pull-to-refresh. Load on every
  // focus — the tab stays mounted, so returning from a booking must refetch.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchMyAppointments({ limit: APPOINTMENT_PAGE }));
    }, [dispatch])
  );

  // ── Cancel ────────────────────────────────

  const handleCancel = useCallback(
    (id: string) => {
      setCancelReason(null);
      setCancelReasonText('');
      dispatch(openCancelSheet(id));
    },
    [dispatch],
  );

  const handleCancelDismiss = useCallback(() => dispatch(closeCancelSheet()), [dispatch]);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTargetId || !cancelReason) return;
    dispatch(
      cancelMyAppointment({
        appointmentId: cancelTargetId,
        reason: cancelReason,
        reasonText: cancelReasonText,
      }),
    );
  }, [dispatch, cancelTargetId, cancelReason, cancelReasonText]);

  // ── Reschedule ────────────────────────────

  // Seeding the slice first is required, not incidental: RescheduleAppointment
  // renders from `state.rescheduleAppointment.appointment`, and arriving there
  // with it unset leaves the patient on a screen with no appointment to move.
  const handleReschedule = useCallback(
    (appointment: Appointment) => {
      dispatch(setRescheduleAppointment(appointment));
      navigation.navigate(HealthcareRouteNames.RescheduleAppointment, {
        appointmentId: appointment.appointmentId,
      });
    },
    [dispatch, navigation],
  );

  // Was `(a: Appointment) => {}` — an empty function, so the "Join Call" button
  // on every appointment card did nothing at all.
  const handleJoinCall = (a: Appointment) => {
    if (!a?.appointmentId) return;
    if (a.type === 'video') {
      // Video consultations now run on the same WebRTC stack as every other
      // call — one signalling path, one TURN account, one in-call UI. The
      // appointment IS the room, which is what the realtime service
      // authorizes against.
      navigation.navigate('HealthcareConsultCall', {
        roomId: a.appointmentId,
        appointmentId: a.appointmentId,
        roomType: 'healthcare',
        media: 'video',
        counterpartName: a.doctorName,
      });
      return;
    }
    // In-clinic appointments have no video room; offer the voice call instead.
    navigation.navigate('HealthcareConsultCall', {
      appointmentId: a.appointmentId,
      roomType: 'healthcare',
      // EXPLICITLY AUDIO — see the note in patientQueue.
      media: 'audio',
      counterpartName: (a as any).doctorName,
    });
  };

  // ── Status Badge ──────────────────────────

  const StatusBadge = ({ status }: { status: Appointment['status'] }) => {
    const cfg = STATUS_CONFIG[status];
    return (
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
        <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
      </View>
    );
  };

  // ── Appointment Card ──────────────────────

  const renderAppointmentCard = ({ item, index }: { item: Appointment; index: number }) => {
    const isUpcoming = item.status === 'pending' || item.status === 'confirmed';
    const isVideo = item.type === 'video';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate(HealthcareRouteNames.AppointmentDetail, {
            appointmentId: item.appointmentId,
          })
        }
      >
        {/* Type stripe */}
        <LinearGradient
          colors={isVideo ? THEME.gradient.video : THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardStripe}
        />

        {/* Doctor identity */}
        <View style={styles.cardHeader}>
          <DoctorAvatar
            doctor={{ name: item.doctorName, profileImage: item.doctorImage }}
            size={48}
          />
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardDoctorName} numberOfLines={1}>
              {getAppointmentDoctorName(item)}
            </Text>
            <Text style={styles.cardType} numberOfLines={1}>
              {item.specialtyName ||
                (isVideo ? 'Video Consultation' : 'In-Clinic Visit')}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Consultation type + id */}
        <View style={styles.cardTypeRow}>
          <View style={styles.typeTag}>
            <MaterialCommunityIcons
              name={isVideo ? 'video-outline' : 'stethoscope'}
              size={13}
              color={isVideo ? THEME.accent : THEME.primary}
            />
            <Text style={styles.typeTagText}>
              {isVideo ? 'Video Consultation' : 'In-Clinic Visit'}
            </Text>
          </View>
          <Text style={styles.cardId}>#{item.appointmentId.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Details */}
        <View style={styles.cardDetails}>
          <View style={styles.detailChip}>
            <Ionicons name="calendar-outline" size={13} color="#64748B" />
            <Text style={styles.detailChipText}>
              {item.date
                ? fromLocalISODate(item.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                : '—'}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailChip}>
            <Ionicons name="time-outline" size={13} color="#64748B" />
            <Text style={styles.detailChipText}>{item.timeSlot.start} – {item.timeSlot.end}</Text>
          </View>
        </View>

        {item.symptoms ? (
          <View style={styles.symptomsRow}>
            <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
            <Text style={styles.symptomsText} numberOfLines={1}>{item.symptoms}</Text>
          </View>
        ) : null}

        {/* Payment */}
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Consultation Fee</Text>
          <Text style={styles.paymentAmount}>PKR {item.payment.amount?.toLocaleString()}</Text>
        </View>

        {/* Actions */}
        {isUpcoming && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCancel}
              onPress={() => handleCancel(item.appointmentId)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={15} color={THEME.error} />
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionReschedule}
              onPress={() => handleReschedule(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={15} color={THEME.primary} />
              <Text style={styles.actionRescheduleText}>Reschedule</Text>
            </TouchableOpacity>

            {isVideo && item.status === 'confirmed' && (
              <TouchableOpacity
                style={styles.actionJoin}
                onPress={() => handleJoinCall(item)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={THEME.gradient.video}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionJoinGradient}
                >
                  <MaterialCommunityIcons name="video-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.actionJoinText}>Join Call</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Empty State ──────────────────────────

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading appointments…</Text>
        </View>
      );
    }

    // A failed load used to render as "No Upcoming Appointments" — the slice
    // stored `error` and nothing read it, so a network failure was
    // indistinguishable from genuinely having no appointments.
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <LinearGradient colors={sh.grad(['#FEF2F2', '#FEE2E2'])} style={styles.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Couldn't load appointments</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.emptyActionBtn} onPress={onRefresh} activeOpacity={0.85}>
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyActionBtnGradient}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    const isUpcoming = activeTab === 'upcoming';
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={isUpcoming ? ['#F0F7FF', '#D6E8FF'] : ['#F0FDF4', '#DCFCE7']}
          style={styles.emptyIconWrap}
        >
          <Ionicons
            name={isUpcoming ? 'calendar-outline' : 'checkmark-done-outline'}
            size={40}
            color={isUpcoming ? THEME.primary : THEME.success}
          />
        </LinearGradient>
        <Text style={styles.emptyTitle}>
          {isUpcoming ? 'No Upcoming Appointments' : 'No Past Appointments'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isUpcoming
            ? 'Book a consultation with a doctor to get started.'
            : 'Your completed appointments will appear here.'}
        </Text>
        {isUpcoming && (
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => navigation.navigate(HealthcareRouteNames.DoctorSearch)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyActionBtnGradient}
            >
              <Ionicons name="search-outline" size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Find a Doctor</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Render ────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={barStyleOn(THEME.gradient.primary[0])} backgroundColor={THEME.gradient.primary[0]} />

      {/* Gradient Header + Tabs */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Title row */}
        <View style={styles.headerRow}>
          {/* As a tab root there is nowhere to go back to, so the slot holds
              its width and shows nothing. It used to show a static calendar
              glyph, which looked like a button and did not respond to one. */}
          {isInTab ? (
            <BackButtonSpacer />
          ) : (
            <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>My Appointments</Text>
            <Text style={styles.headerSubtitle}>
              {filteredAppointments.length} {activeTab === 'upcoming' ? 'upcoming' : 'past'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={onRefresh}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh appointments"
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                left: tabIndicatorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['2%', '51%'],
                }),
              },
            ]}
          />
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? THEME.primary : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Content

          One always-mounted list. The loading state used to be a sibling
          branch, which meant the very first fetch swapped this Animated.View
          out mid-entrance-animation: the native-driven `fadeAnim` was detached
          part-way and never reached 1, so when the list came back it rendered
          at a fraction of full opacity — present, but invisible. Leaving
          Healthcare and re-entering remounted the screen and, with the data
          already cached, never took the loading branch, so the list appeared.
          That was the "go back and come again" bug. Loading, error and empty
          are all ListEmptyComponent states now, so nothing unmounts. */}
      <Animated.View style={[styles.listWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <FlatList
          data={filteredAppointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.appointmentId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.primary]}
              tintColor={THEME.primary}
              progressViewOffset={8}
            />
          }
        />
      </Animated.View>

      {/* Cancel sheet — the same reasons the detail screen offers, so an
          appointment is cancelled the same way from either place. */}
      <Modal
        visible={!!cancelTargetId}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="alert-circle" size={30} color={THEME.error} />
              </View>
              <Text style={styles.modalTitle}>Cancel Appointment?</Text>
              <Text style={styles.modalSubtitle}>
                Please let us know why you're cancelling
              </Text>
            </View>

            <View style={styles.reasonsWrap}>
              {CANCELLATION_REASONS.map((reason) => {
                const isSelected = cancelReason === reason.id;
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                    onPress={() => setCancelReason(reason.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={reason.icon as any}
                      size={16}
                      color={isSelected ? THEME.primary : '#94A3B8'}
                    />
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {reason.label}
                    </Text>
                    <View style={[styles.reasonRadio, isSelected && styles.reasonRadioSelected]}>
                      {isSelected && <View style={styles.reasonRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {cancelReason === 'other' && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Please specify…"
                placeholderTextColor="#94A3B8"
                value={cancelReasonText}
                onChangeText={setCancelReasonText}
                multiline
              />
            )}

            {!!cancelError && (
              <View style={styles.modalError}>
                <Ionicons name="alert-circle" size={14} color={THEME.error} />
                <Text style={styles.modalErrorText}>{cancelError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalGhostBtn}
                onPress={handleCancelDismiss}
                disabled={cancelling}
                activeOpacity={0.7}
              >
                <Text style={styles.modalGhostBtnText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDangerBtn, !cancelReason && styles.modalDangerBtnDisabled]}
                onPress={handleCancelConfirm}
                // The backend requires a 3–500 character reason, so an empty
                // submit could only ever come back as a validation error.
                disabled={!cancelReason || cancelling}
                activeOpacity={0.7}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDangerBtnText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────

const makeStyles = (THEME: ReturnType<typeof makeTHEME>, sh: DarkShift) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
  },

  // Header
  gradientHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  // Was `backButton`, and was a glass square. The back control is a shared
  // component now, and this is the trailing action — bare, so the two sides of
  // the header match each other and match AppBar.
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 4,
    position: 'relative',
    height: 48,
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '47%',
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 10,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  tabTextActive: {
    color: THEME.primary,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: sh.n('#64748B', 'inkMuted'),
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 60,
    flexGrow: 1,
  },

  // Card
  card: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: sh.n('#F1F5F9', 'lineSoft'),
    paddingLeft: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  cardStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingRight: 16,
    marginBottom: 12,
    gap: 12,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardDoctorName: {
    fontSize: 15,
    fontWeight: '800',
    color: sh.n('#0F172A', 'ink'),
    letterSpacing: -0.2,
  },
  cardType: {
    fontSize: 12.5,
    fontWeight: '600',
    color: sh.hue('#2A7FFF'),
    marginTop: 1,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginBottom: 12,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'),
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: sh.n('#475569', 'inkMuted'),
  },
  cardId: {
    fontSize: 11,
    fontWeight: '600',
    color: sh.n('#94A3B8', 'inkFaint'),
    marginTop: 1,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Details
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 10,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
    borderRadius: 10,
    padding: 10,
  },
  detailChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: sh.n('#475569', 'inkMuted'),
  },
  detailDivider: {
    width: 1,
    height: 14,
    backgroundColor: sh.n('#E2E8F0', 'line'),
    marginHorizontal: 8,
  },
  symptomsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
    marginBottom: 12,
    paddingLeft: 2,
  },
  symptomsText: {
    fontSize: 12,
    fontWeight: '500',
    color: sh.n('#94A3B8', 'inkFaint'),
    flex: 1,
  },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: sh.n('#F1F5F9', 'lineSoft'),
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: sh.n('#94A3B8', 'inkFaint'),
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: sh.n('#0F172A', 'ink'),
    letterSpacing: -0.3,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  actionCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: sh.ground('#FECACA', '#EF4444'),
    backgroundColor: sh.ground('#FEF2F2', '#EF4444'),
  },
  actionCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.error,
  },
  actionReschedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: sh.hue('#BFDBFE'),
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'),
  },
  actionRescheduleText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  actionJoin: {
    marginLeft: 'auto',
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: THEME.accent,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  actionJoinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionJoinText: {
    fontSize: 12,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: sh.n('#94A3B8', 'inkFaint'),
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyActionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  emptyActionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Cancel sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: sh.ground('#FEE2E2', '#EF4444'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: sh.n('#0F172A', 'ink'),
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: sh.n('#64748B', 'inkMuted'),
    textAlign: 'center',
  },
  reasonsWrap: {
    gap: 8,
    marginBottom: 14,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: sh.n('#E2E8F0', 'line'),
  },
  reasonRowSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primaryLight,
  },
  reasonText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: sh.n('#475569', 'inkMuted'),
  },
  reasonTextSelected: {
    color: THEME.primary,
  },
  reasonRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: sh.n('#CBD5E1', 'disabled'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonRadioSelected: {
    borderColor: THEME.primary,
  },
  reasonRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: THEME.primary,
  },
  reasonInput: {
    borderWidth: 1.5,
    borderColor: sh.n('#E2E8F0', 'line'),
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    color: sh.n('#0F172A', 'ink'),
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: sh.ground('#FEE2E2', '#EF4444'),
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    color: THEME.error,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalGhostBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: sh.n('#E2E8F0', 'line'),
  },
  modalGhostBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: sh.n('#475569', 'inkMuted'),
  },
  modalDangerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: THEME.error,
  },
  modalDangerBtnDisabled: {
    backgroundColor: sh.n('#CBD5E1', 'disabled'),
  },
  modalDangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
});

export default MyAppointmentsScreen;