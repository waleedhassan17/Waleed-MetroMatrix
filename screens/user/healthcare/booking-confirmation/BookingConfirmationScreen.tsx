import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setBookingData,
  setPatientDetails,
  setPaymentMethod,
  applyCoupon,
  removeCoupon,
  confirmBooking,
  clearBooking,
  selectFeeBreakdown,
} from './bookingConfirmationSlice';
import type { BookingSummary, PatientDetails } from './bookingConfirmationSlice';
import type { HealthcareStackParamList, PaymentRecord } from '../../../../models/healthcare/types';
import { getDoctorById } from '../../../../dummy-data/healthcare/doctors';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';

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
  star: '#FBBF24',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    header: ['#1857C0', '#1E6AE1'],
    accent: ['#5A9FFF', '#2A7FFF'],
    success: ['#10B981', '#059669'],
  },
};

// ── Route / Nav Types ───────────────────────

type BookingConfirmationRoute = RouteProp<HealthcareStackParamList, 'BookingConfirmation'>;
type Nav = NativeStackNavigationProp<HealthcareStackParamList>;

// ── Helpers ─────────────────────────────────

const formatTime12 = (time24: string): string => {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// ── Payment Methods ─────────────────────────

const PAYMENT_METHODS: {
  key: PaymentRecord['method'];
  label: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: 'cash',
    label: 'Cash',
    description: 'Pay at the clinic',
    icon: 'cash-outline',
    iconBg: '#DCFCE7',
    iconColor: THEME.success,
  },
  {
    key: 'card',
    label: 'Credit/Debit Card',
    description: 'Visa, Mastercard, etc.',
    icon: 'card-outline',
    iconBg: '#EAF3FF',
    iconColor: THEME.primary,
  },
  {
    key: 'online',
    label: 'Online Banking',
    description: 'Bank transfer',
    icon: 'globe-outline',
    iconBg: '#EAF3FF',
    iconColor: THEME.accent,
  },
  {
    key: 'insurance',
    label: 'Insurance',
    description: 'Use your health insurance',
    icon: 'shield-checkmark-outline',
    iconBg: '#FEF3C7',
    iconColor: THEME.warning,
  },
];

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

// ── Section Header Component ────────────────

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  iconBg?: string;
  iconColor?: string;
}> = ({ icon, title, iconBg = THEME.primaryLight, iconColor = THEME.primary }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconBg, { backgroundColor: iconBg }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ── Main Screen ─────────────────────────────

const BookingConfirmationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const route = useRoute<BookingConfirmationRoute>();
  const { doctorId } = route.params;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bottomBarAnim = useRef(new Animated.Value(100)).current;

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

    setTimeout(() => {
      Animated.spring(bottomBarAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, 200);
  }, []);

  const slotSelection = useAppSelector((s) => s.slotSelection);
  const clinicSelection = useAppSelector((s) => s.clinicSelection);
  const {
    bookingData,
    patientDetails,
    paymentMethod,
    coupon,
    loading,
    bookingStatus,
    error,
  } = useAppSelector((s) => s.bookingConfirmation);
  
  const feeBreakdown = useAppSelector(selectFeeBreakdown);

  const [couponInput, setCouponInput] = useState('');
  const [couponFocused, setCouponFocused] = useState(false);

  // Build booking summary from previous screens
  useEffect(() => {
    const doctor = getDoctorById(doctorId);
    if (!doctor || !slotSelection.selectedSlot) return;

    const consultationType = slotSelection.consultationType;
    const fee =
      consultationType === 'video'
        ? doctor.videoConsultationFee
        : doctor.consultationFee;

    const summary: BookingSummary = {
      doctor,
      slot: slotSelection.selectedSlot,
      clinic:
        consultationType === 'in-clinic' ? clinicSelection.selectedClinic : null,
      consultationType,
      fee,
    };
    dispatch(setBookingData(summary));

    return () => {
      dispatch(clearBooking());
    };
  }, [
    dispatch,
    doctorId,
    slotSelection.selectedSlot,
    slotSelection.consultationType,
    clinicSelection.selectedClinic,
  ]);

  // Navigate on confirmed
  useEffect(() => {
    if (bookingStatus === 'confirmed') {
      Alert.alert(
        '🎉 Booking Confirmed!',
        'Your appointment has been booked successfully. You will receive a confirmation SMS shortly.',
        [
          {
            text: 'View Appointments',
            onPress: () => navigation.navigate('MyAppointments' as any),
          },
          {
            text: 'Done',
            onPress: () => navigation.navigate('HealthcareHome' as any),
          },
        ]
      );
    }
  }, [bookingStatus, navigation]);

  // Handlers
  const handleApplyCoupon = useCallback(() => {
    if (!couponInput.trim()) return;
    dispatch(applyCoupon(couponInput.trim()));
  }, [dispatch, couponInput]);

  const handleRemoveCoupon = useCallback(() => {
    dispatch(removeCoupon());
    setCouponInput('');
  }, [dispatch]);

  const handleConfirm = useCallback(() => {
    if (!bookingData) return;

    if (patientDetails.bookingFor === 'other') {
      if (!patientDetails.name.trim() || !patientDetails.phone.trim()) {
        Alert.alert(
          'Missing Details',
          'Please fill in patient name and phone number.'
        );
        return;
      }
    }

    const doctorName = bookingData.doctor.bio?.split(' ')[1] || 'Doctor';

    Alert.alert(
      'Confirm Booking',
      `Book appointment with Dr. ${doctorName} for Rs. ${feeBreakdown.total}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => dispatch(confirmBooking()) },
      ]
    );
  }, [dispatch, bookingData, patientDetails, feeBreakdown.total]);

  // ── Loading State ───────────────────────────

  if (!bookingData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />
        <LinearGradient
          colors={THEME.gradient.header as any}
          style={styles.loadingHeader}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContent}>
          <SkeletonBox width="100%" height={180} borderRadius={20} />
          <SkeletonBox
            width="100%"
            height={120}
            borderRadius={20}
            style={{ marginTop: 16 }}
          />
          <SkeletonBox
            width="100%"
            height={200}
            borderRadius={20}
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { doctor, slot, clinic, consultationType } = bookingData;
  const doctorName = doctor.bio?.split(' ')[1] || 'Doctor';

  // ── Render ──────────────────────────────────

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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Confirm Booking</Text>
            <Text style={styles.headerSubtitle}>Review and confirm details</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>
      </LinearGradient>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Appointment Summary Card ────────── */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.doctorAvatar}>
                  <MaterialCommunityIcons
                    name="doctor"
                    size={28}
                    color={THEME.primary}
                  />
                </View>
                <View style={styles.doctorInfo}>
                  <View style={styles.doctorNameRow}>
                    <Text style={styles.doctorName} numberOfLines={1}>
                      Dr. {doctorName}
                    </Text>
                    {doctor.isVerified && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={THEME.primary}
                      />
                    )}
                  </View>
                  <Text style={styles.doctorSpec} numberOfLines={1}>
                    {doctor.subspecialties?.[0] || 'Specialist'}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color={THEME.star} />
                    <Text style={styles.ratingText}>
                      {doctor.rating?.toFixed(1) || '4.5'} ({doctor.totalReviews || 0}{' '}
                      reviews)
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              {/* Appointment Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconBg, { backgroundColor: '#EAF3FF' }]}>
                    <Ionicons name="calendar" size={16} color={THEME.primary} />
                  </View>
                  <View style={styles.detailTexts}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{formatDate(slot.date)}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={[styles.detailIconBg, { backgroundColor: '#EAF3FF' }]}>
                    <Ionicons name="time" size={16} color={THEME.accent} />
                  </View>
                  <View style={styles.detailTexts}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {formatTime12(slot.startTime)} - {formatTime12(slot.endTime)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View
                    style={[
                      styles.detailIconBg,
                      {
                        backgroundColor:
                          consultationType === 'video' ? '#EAF3FF' : '#DCFCE7',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        consultationType === 'video' ? 'videocam' : 'business'
                      }
                      size={16}
                      color={
                        consultationType === 'video'
                          ? THEME.accent
                          : THEME.success
                      }
                    />
                  </View>
                  <View style={styles.detailTexts}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>
                      {consultationType === 'video'
                        ? 'Video Consultation'
                        : clinic?.name ?? 'In-Clinic'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Patient Details ────────────────── */}
            <View style={styles.section}>
              <SectionHeader
                icon="person-outline"
                title="Patient Details"
                iconBg="#EAF3FF"
                iconColor={THEME.primary}
              />

              {/* Toggle: Self / Other */}
              <View style={styles.toggleRow}>
                {(['self', 'other'] as const).map((opt) => {
                  const isActive = patientDetails.bookingFor === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
                      onPress={() =>
                        dispatch(setPatientDetails({ bookingFor: opt }))
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt === 'self' ? 'person' : 'people'}
                        size={18}
                        color={isActive ? '#FFFFFF' : Colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.toggleText,
                          isActive && styles.toggleTextActive,
                        ]}
                      >
                        {opt === 'self' ? 'Myself' : 'Someone Else'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fields for "other" */}
              {patientDetails.bookingFor === 'other' && (
                <View style={styles.fieldsContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Patient Name *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={Colors.text.tertiary}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter full name"
                        placeholderTextColor={Colors.text.tertiary}
                        value={patientDetails.name}
                        onChangeText={(t) =>
                          dispatch(setPatientDetails({ name: t }))
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color={Colors.text.tertiary}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="03XX XXXXXXX"
                        placeholderTextColor={Colors.text.tertiary}
                        keyboardType="phone-pad"
                        value={patientDetails.phone}
                        onChangeText={(t) =>
                          dispatch(setPatientDetails({ phone: t }))
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Relation (Optional)</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="heart-outline"
                        size={18}
                        color={Colors.text.tertiary}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Father, Mother, Spouse"
                        placeholderTextColor={Colors.text.tertiary}
                        value={patientDetails.relation ?? ''}
                        onChangeText={(t) =>
                          dispatch(setPatientDetails({ relation: t }))
                        }
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* ── Payment Method ─────────────────── */}
            <View style={styles.section}>
              <SectionHeader
                icon="wallet-outline"
                title="Payment Method"
                iconBg="#DCFCE7"
                iconColor={THEME.success}
              />

              <View style={styles.paymentGrid}>
                {PAYMENT_METHODS.map((pm) => {
                  const isActive = paymentMethod === pm.key;
                  return (
                    <TouchableOpacity
                      key={pm.key}
                      style={[
                        styles.paymentCard,
                        isActive && styles.paymentCardActive,
                      ]}
                      onPress={() => dispatch(setPaymentMethod(pm.key))}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.paymentIconBg,
                          { backgroundColor: pm.iconBg },
                          isActive && styles.paymentIconBgActive,
                        ]}
                      >
                        <Ionicons
                          name={pm.icon as any}
                          size={20}
                          color={isActive ? '#FFFFFF' : pm.iconColor}
                        />
                      </View>
                      <Text
                        style={[
                          styles.paymentLabel,
                          isActive && styles.paymentLabelActive,
                        ]}
                      >
                        {pm.label}
                      </Text>
                      <Text style={styles.paymentDescription}>
                        {pm.description}
                      </Text>
                      {isActive && (
                        <View style={styles.paymentCheck}>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={THEME.primary}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Coupon Section ─────────────────── */}
            <View style={styles.section}>
              <SectionHeader
                icon="pricetag-outline"
                title="Promo Code"
                iconBg="#FEF3C7"
                iconColor={THEME.warning}
              />

              {coupon.applied ? (
                <View style={styles.couponApplied}>
                  <View style={styles.couponAppliedLeft}>
                    <View style={styles.couponSuccessIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={THEME.success}
                      />
                    </View>
                    <View>
                      <Text style={styles.couponAppliedCode}>{coupon.code}</Text>
                      <Text style={styles.couponAppliedDiscount}>
                        {coupon.discount}% discount applied
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleRemoveCoupon}
                    style={styles.couponRemoveBtn}
                  >
                    <Ionicons name="close" size={18} color={THEME.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.couponInputContainer,
                    couponFocused && styles.couponInputContainerFocused,
                  ]}
                >
                  <Ionicons
                    name="ticket-outline"
                    size={18}
                    color={couponFocused ? THEME.primary : Colors.text.tertiary}
                  />
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter promo code"
                    placeholderTextColor={Colors.text.tertiary}
                    value={couponInput}
                    onChangeText={setCouponInput}
                    onFocus={() => setCouponFocused(true)}
                    onBlur={() => setCouponFocused(false)}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[
                      styles.couponApplyBtn,
                      !couponInput.trim() && styles.couponApplyBtnDisabled,
                    ]}
                    onPress={handleApplyCoupon}
                    disabled={!couponInput.trim() || loading}
                    activeOpacity={0.7}
                  >
                    {loading ? (
                      <View style={styles.couponLoading}>
                        <View style={styles.loadingDot} />
                      </View>
                    ) : (
                      <Text style={styles.couponApplyText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {error && !coupon.applied && (
                <View style={styles.couponErrorContainer}>
                  <Ionicons name="alert-circle" size={14} color={THEME.error} />
                  <Text style={styles.couponError}>{error}</Text>
                </View>
              )}
            </View>

            {/* ── Fee Breakdown ──────────────────── */}
            <View style={styles.section}>
              <SectionHeader
                icon="receipt-outline"
                title="Payment Summary"
                iconBg="#EAF3FF"
                iconColor={THEME.accent}
              />

              <View style={styles.feeCard}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Consultation Fee</Text>
                  <Text style={styles.feeValue}>
                    Rs. {feeBreakdown.subtotal}
                  </Text>
                </View>

                {coupon.applied && (
                  <View style={styles.feeRow}>
                    <View style={styles.feeDiscountLabel}>
                      <Ionicons
                        name="pricetag"
                        size={12}
                        color={THEME.success}
                      />
                      <Text style={styles.feeDiscountText}>
                        Discount ({coupon.discount}%)
                      </Text>
                    </View>
                    <Text style={styles.feeDiscountValue}>
                      - Rs. {feeBreakdown.discount}
                    </Text>
                  </View>
                )}

                <View style={styles.feeDivider} />

                <View style={styles.feeRow}>
                  <Text style={styles.feeTotalLabel}>Total Amount</Text>
                  <Text style={styles.feeTotalValue}>
                    Rs. {feeBreakdown.total}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 120 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* ── Bottom Bar ───────────────────── */}
      <Animated.View
        style={[
          styles.bottomBar,
          { transform: [{ translateY: bottomBarAnim }] },
        ]}
      >
        <View style={styles.bottomContent}>
          <View style={styles.bottomLeft}>
            <Text style={styles.bottomLabel}>Total Payable</Text>
            <Text style={styles.bottomAmount}>Rs. {feeBreakdown.total}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              bookingStatus === 'confirming' && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={bookingStatus === 'confirming'}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={THEME.gradient.success as any}
              style={styles.confirmButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {bookingStatus === 'confirming' ? (
                <View style={styles.confirmingLoader}>
                  <View style={styles.loadingDot} />
                  <Text style={styles.confirmButtonText}>Confirming...</Text>
                </View>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default BookingConfirmationScreen;

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Loading
  loadingHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContent: {
    flex: 1,
    padding: 20,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  doctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  doctorSpec: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  detailsGrid: {
    gap: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTexts: {
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

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },

  // Input Fields
  fieldsContainer: {
    marginTop: 16,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FBFF',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },

  // Payment Grid
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentCard: {
    width: (SCREEN_WIDTH - 86) / 2,
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  paymentCardActive: {
    backgroundColor: THEME.primaryLight,
    borderColor: THEME.primary,
  },
  paymentIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentIconBgActive: {
    backgroundColor: THEME.primary,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  paymentLabelActive: {
    color: THEME.primaryDark,
  },
  paymentDescription: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  paymentCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  // Coupon
  couponInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingLeft: 14,
    backgroundColor: '#F8FBFF',
  },
  couponInputContainerFocused: {
    borderColor: THEME.primary,
    backgroundColor: '#FFFFFF',
  },
  couponInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  couponApplyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: THEME.primary,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  couponApplyBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  couponApplyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  couponLoading: {
    width: 40,
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.success,
  },
  couponAppliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  couponSuccessIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponAppliedCode: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.success,
  },
  couponAppliedDiscount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginTop: 2,
  },
  couponRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  couponError: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.error,
  },

  // Fee Card
  feeCard: {
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    padding: 14,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  feeDiscountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeDiscountText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.success,
  },
  feeDiscountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.success,
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  feeTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  feeTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.primary,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomLeft: {
    flex: 1,
    marginRight: 12,
  },
  bottomLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  bottomAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 2,
  },
  confirmButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmingLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});