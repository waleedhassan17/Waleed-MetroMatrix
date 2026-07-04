import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Platform,
  Dimensions,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  toggleCancelModal,
  cancelAppointment,
  setSelectedCancelReason,
  setCancelReasonText,
  selectAppointment,
  selectCanCancel,
  selectCanReschedule,
  selectCanJoinCall,
  selectIsUpcoming,
  selectFormattedTimeUntil,
  selectAppointmentTimeline,
  CANCELLATION_REASONS,
} from './appointmentDetailSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Appointment } from '../../../../models/healthcare/types';
import DoctorAvatar from '../../../../components/Healthcare/DoctorAvatar';
import { getAppointmentDoctorName } from '../../../../utils/healthcare/doctorDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Theme Colors (Consistent) ───────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#2A7FFF',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as const,
    header: ['#1857C0', '#1E6AE1'] as const,
    success: ['#10B981', '#059669'] as const,
    warning: ['#F59E0B', '#D97706'] as const,
    error: ['#EF4444', '#DC2626'] as const,
    info: ['#2A7FFF', '#1857C0'] as const,
    accent: ['#5A9FFF', '#1857C0'] as const,
  },
};

// ── Status Config ───────────────────────────

const STATUS_CONFIG: Record<
  Appointment['status'],
  {
    label: string;
    subtitle: string;
    gradient: readonly [string, string];
    icon: string;
    color: string;
  }
> = {
  pending: {
    label: 'Pending Confirmation',
    subtitle: 'Waiting for doctor to confirm',
    gradient: THEME.gradient.warning,
    icon: 'time-outline',
    color: THEME.warning,
  },
  confirmed: {
    label: 'Confirmed',
    subtitle: 'Your appointment is scheduled',
    gradient: THEME.gradient.info,
    icon: 'checkmark-circle-outline',
    color: THEME.info,
  },
  completed: {
    label: 'Completed',
    subtitle: 'Consultation completed',
    gradient: THEME.gradient.success,
    icon: 'checkmark-done-outline',
    color: THEME.success,
  },
  cancelled: {
    label: 'Cancelled',
    subtitle: 'This appointment was cancelled',
    gradient: THEME.gradient.error,
    icon: 'close-circle-outline',
    color: THEME.error,
  },
  'no-show': {
    label: 'No Show',
    subtitle: 'Missed appointment',
    gradient: THEME.gradient.error,
    icon: 'alert-circle-outline',
    color: THEME.error,
  },
};

// ── Skeleton Component ──────────────────────

const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#E5E7EB', opacity },
        style,
      ]}
    />
  );
};

// ── Detail Row Component ────────────────────

const DetailRow: React.FC<{
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  onPress?: () => void;
  isLink?: boolean;
}> = ({ icon, iconBg, iconColor, label, value, onPress, isLink }) => {
  const content = (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, isLink && styles.detailValueLink]}>
          {value}
        </Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ── Component ───────────────────────────────

const AppointmentDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const [refreshing, setRefreshing] = useState(false);

  const appointment = useAppSelector(selectAppointment);
  const canCancel = useAppSelector(selectCanCancel);
  const canReschedule = useAppSelector(selectCanReschedule);
  const canJoinCall = useAppSelector(selectCanJoinCall);
  const isUpcoming = useAppSelector(selectIsUpcoming);
  const timeUntil = useAppSelector(selectFormattedTimeUntil);
  const timeline = useAppSelector(selectAppointmentTimeline);
  
  const {
    loading,
    cancelling,
    cancelModalVisible,
    selectedCancelReason,
    cancelReasonText,
    cancelError,
    prescription,
  } = useAppSelector((s) => s.appointmentDetail);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Derived state
  const isVideo = appointment?.type === 'video';
  const isCompleted = appointment?.status === 'completed';
  const statusConfig = appointment ? STATUS_CONFIG[appointment.status] : null;

  // Handlers
  const handleBack = () => navigation.goBack();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Dispatch refresh action
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleJoinCall = () => {
    if (!appointment) return;
    navigation.navigate(HealthcareRouteNames.VideoCall, {
      appointmentId: appointment.appointmentId,
      roomId: appointment.appointmentId,
    });
  };

  const handleViewPrescription = () => {
    if (!prescription) return;
    navigation.navigate(HealthcareRouteNames.PrescriptionView, {
      prescriptionId: prescription.prescriptionId,
    });
  };

  const handleReschedule = () => {
    if (!appointment) return;
    navigation.navigate(HealthcareRouteNames.BookAppointment, {
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId,
    });
  };

  const handleCancelConfirm = () => {
    if (!appointment || !selectedCancelReason) return;
    dispatch(
      cancelAppointment({
        appointmentId: appointment.appointmentId,
        reason: selectedCancelReason,
        reasonText: cancelReasonText,
      })
    );
  };

  // ── Loading State ─────────────────────────

  if (loading && !appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />
        <LinearGradient
          colors={THEME.gradient.header as any}
          style={styles.loadingHeader}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContent}>
          <SkeletonBox width="100%" height={100} borderRadius={16} />
          <SkeletonBox width="100%" height={200} borderRadius={16} style={{ marginTop: 16 }} />
          <SkeletonBox width="100%" height={150} borderRadius={16} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty State ───────────────────────────

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.emptyHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.emptyBackButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.emptyHeaderTitle}>Appointment Detail</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Appointment Not Found</Text>
          <Text style={styles.emptySubtitle}>
            The appointment you're looking for doesn't exist or has been removed.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ───────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* Header */}
      <LinearGradient
        colors={THEME.gradient.header as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >

        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Appointment Detail</Text>
            {timeUntil && isUpcoming && (
              <View style={styles.timeUntilBadge}>
                <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                <Text style={styles.timeUntilText}>{timeUntil}</Text>
              </View>
            )}
          </View>

          <View style={{ width: 42 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[THEME.primary]}
            tintColor={THEME.primary}
          />
        }
      >
        {/* Status Banner */}
        {statusConfig && (
          <LinearGradient
            colors={statusConfig.gradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusBanner}
          >
            <View style={styles.statusIconBg}>
              <Ionicons name={statusConfig.icon as any} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>{statusConfig.label}</Text>
              <Text style={styles.statusSubtitle}>{statusConfig.subtitle}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Doctor Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconBg, { backgroundColor: '#EAF3FF' }]}>
              <MaterialCommunityIcons name="doctor" size={16} color={THEME.primary} />
            </View>
            <Text style={styles.cardTitle}>Doctor</Text>
          </View>

          <View style={styles.doctorRow}>
            <DoctorAvatar
              doctor={{ name: appointment.doctorName, profileImage: appointment.doctorImage }}
              size={52}
            />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{getAppointmentDoctorName(appointment)}</Text>
              <Text style={styles.doctorId}>
                {appointment.specialtyName || 'Specialist'}
              </Text>
            </View>
          </View>

          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} activeOpacity={0.7}>
              <View style={[styles.contactIconBg, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="call" size={16} color={THEME.success} />
              </View>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} activeOpacity={0.7}>
              <View style={[styles.contactIconBg, { backgroundColor: '#EAF3FF' }]}>
                <Ionicons name="chatbubble" size={16} color={THEME.primary} />
              </View>
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appointment Details Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconBg, { backgroundColor: '#EAF3FF' }]}>
              <Ionicons name="calendar" size={16} color={THEME.accent} />
            </View>
            <Text style={styles.cardTitle}>Appointment Details</Text>
          </View>

          <DetailRow
            icon="calendar-outline"
            iconBg="#EAF3FF"
            iconColor={THEME.primary}
            label="Date"
            value={appointment.date}
          />

          <View style={styles.detailDivider} />

          <DetailRow
            icon="time-outline"
            iconBg="#EAF3FF"
            iconColor={THEME.accent}
            label="Time"
            value={`${appointment.timeSlot.start} – ${appointment.timeSlot.end}`}
          />

          <View style={styles.detailDivider} />

          <DetailRow
            icon={isVideo ? 'videocam-outline' : 'business-outline'}
            iconBg={isVideo ? '#EAF3FF' : '#DCFCE7'}
            iconColor={isVideo ? THEME.accent : THEME.success}
            label="Type"
            value={isVideo ? 'Video Consultation' : 'In-Clinic Visit'}
          />

          {appointment.clinicId && (
            <>
              <View style={styles.detailDivider} />
              <DetailRow
                icon="location-outline"
                iconBg="#FEF3C7"
                iconColor={THEME.warning}
                label="Clinic"
                value={appointment.clinicId}
              />
            </>
          )}

          {appointment.symptoms && (
            <>
              <View style={styles.detailDivider} />
              <DetailRow
                icon="document-text-outline"
                iconBg="#FEE2E2"
                iconColor={THEME.error}
                label="Symptoms"
                value={appointment.symptoms}
              />
            </>
          )}
        </View>

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconBg, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="wallet" size={16} color={THEME.success} />
            </View>
            <Text style={styles.cardTitle}>Payment</Text>
          </View>

          <DetailRow
            icon="card-outline"
            iconBg="#EAF3FF"
            iconColor={THEME.primary}
            label="Method"
            value={appointment.payment.method}
          />

          <View style={styles.detailDivider} />

          <DetailRow
            icon="cash-outline"
            iconBg="#DCFCE7"
            iconColor={THEME.success}
            label="Amount"
            value={`PKR ${appointment.payment.amount?.toLocaleString()}`}
          />

          <View style={styles.detailDivider} />

          <View style={styles.paymentStatusRow}>
            <View style={[styles.detailIconBg, { backgroundColor: '#EAF3FF' }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={THEME.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Status</Text>
              <View
                style={[
                  styles.paymentStatusBadge,
                  {
                    backgroundColor:
                      appointment.payment.status === 'completed'
                        ? '#DCFCE7'
                        : '#FEF3C7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.paymentStatusText,
                    {
                      color:
                        appointment.payment.status === 'completed'
                          ? THEME.success
                          : THEME.warning,
                    },
                  ]}
                >
                  {appointment.payment.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Video Call Button */}
        {isVideo && appointment.status === 'confirmed' && (
          <TouchableOpacity
            style={[styles.actionButton, !canJoinCall && styles.actionButtonDisabled]}
            onPress={handleJoinCall}
            disabled={!canJoinCall}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canJoinCall ? THEME.gradient.accent : ['#CBD5E1', '#94A3B8']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="video-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>
                {canJoinCall ? 'Join Video Call' : 'Opens 15 min before'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Prescription Button */}
        {isCompleted && prescription && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewPrescription}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={THEME.gradient.success as any}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="file-document-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>View Prescription</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Cancel/Reschedule Buttons */}
        {isUpcoming && (
          <View style={styles.actionRow}>
            {canCancel && (
              <TouchableOpacity
                style={[styles.outlineButton, styles.cancelButton]}
                onPress={() => dispatch(toggleCancelModal())}
                activeOpacity={0.7}
              >
                <Ionicons name="close-outline" size={18} color={THEME.error} />
                <Text style={[styles.outlineButtonText, { color: THEME.error }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}

            {canReschedule && (
              <TouchableOpacity
                style={[styles.outlineButton, styles.rescheduleButton]}
                onPress={handleReschedule}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color={THEME.primary} />
                <Text style={[styles.outlineButtonText, { color: THEME.primary }]}>
                  Reschedule
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Cancel Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => dispatch(toggleCancelModal())}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="alert-circle" size={32} color={THEME.error} />
              </View>
              <Text style={styles.modalTitle}>Cancel Appointment?</Text>
              <Text style={styles.modalSubtitle}>
                Please let us know why you're cancelling
              </Text>
            </View>

            {/* Reason Selection */}
            <View style={styles.reasonsContainer}>
              {CANCELLATION_REASONS.map((reason) => {
                const isSelected = selectedCancelReason === reason.id;
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => dispatch(setSelectedCancelReason(reason.id))}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.reasonIconBg,
                        isSelected && styles.reasonIconBgSelected,
                      ]}
                    >
                      <Ionicons
                        name={reason.icon as any}
                        size={16}
                        color={isSelected ? '#FFFFFF' : Colors.text.tertiary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected && styles.reasonTextSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                    <View
                      style={[styles.reasonRadio, isSelected && styles.reasonRadioSelected]}
                    >
                      {isSelected && <View style={styles.reasonRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Other Reason Input */}
            {selectedCancelReason === 'other' && (
              <View style={styles.otherReasonInput}>
                <TextInput
                  style={styles.otherReasonTextInput}
                  placeholder="Please specify..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={cancelReasonText}
                  onChangeText={(t) => dispatch(setCancelReasonText(t))}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            {/* Error */}
            {cancelError && (
              <View style={styles.modalError}>
                <Ionicons name="alert-circle" size={14} color={THEME.error} />
                <Text style={styles.modalErrorText}>{cancelError}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalOutlineButton}
                onPress={() => dispatch(toggleCancelModal())}
                activeOpacity={0.7}
              >
                <Text style={styles.modalOutlineButtonText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalDangerButton,
                  !selectedCancelReason && styles.modalButtonDisabled,
                ]}
                onPress={handleCancelConfirm}
                disabled={!selectedCancelReason || cancelling}
                activeOpacity={0.7}
              >
                {cancelling ? (
                  <View style={styles.loadingDot} />
                ) : (
                  <Text style={styles.modalDangerButtonText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  timeUntilBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  timeUntilText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Loading
  loadingHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContent: {
    flex: 1,
    padding: 20,
  },

  // Empty
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  emptyBackButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginRight: 42,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Scroll
  scrollContent: {
    padding: 20,
  },

  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  // Doctor
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  doctorId: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
  },
  contactIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // Detail Row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 2,
  },
  detailValueLink: {
    color: THEME.primary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  // Payment Status
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Action Button
  actionButton: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cancelButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  rescheduleButton: {
    borderColor: THEME.primaryLight,
    backgroundColor: '#FAFCFF',
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Reasons
  reasonsContainer: {
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  reasonOptionSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primaryLight,
  },
  reasonIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonIconBgSelected: {
    backgroundColor: THEME.primary,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  reasonTextSelected: {
    color: THEME.primaryDark,
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonRadioSelected: {
    borderColor: THEME.primary,
  },
  reasonRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.primary,
  },

  // Other Reason
  otherReasonInput: {
    marginBottom: 16,
  },
  otherReasonTextInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Modal Error
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: THEME.error,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalOutlineButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modalOutlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  modalDangerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: THEME.error,
  },
  modalButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalDangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});

export default AppointmentDetailScreen;