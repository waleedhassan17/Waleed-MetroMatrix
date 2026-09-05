import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { type ThemeMode } from '../../../../constants/theme';
import { useTheme } from '../../../../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setConfirmed,
  setAppointmentId,
  setConfirmationCode,
  fetchConfirmedAppointment,
  setShowConfetti,
  addToCalendar,
  shareAppointmentDetails,
  selectConfirmationDetails,
  selectShareMessage,
  selectNextSteps,
  selectAddedToCalendar,
  selectIsAddingToCalendar,
} from './appointmentConfirmSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { HealthcareStackParamList } from '../../../../models/healthcare/types';
import type { RouteProp } from '@react-navigation/native';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import {
  invoiceNumberFor,
  paymentMethodLabel as formatPaymentMethod,
  downloadInvoicePdf,
} from '../../../../utils/healthcare/invoice';
import { getAccessToken } from '../../../../utils/storage_utils/storageUtils';
import { formatFee } from '../../../../utils/healthcare/doctorDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ConfirmRoute = RouteProp<HealthcareStackParamList, 'AppointmentConfirm'>;

// ── Theme Colors (Consistent) ───────────────

// A function of the mode. Light returns exactly the literals this block
// always held; dark is derived by role — see constants/darkShift.ts.
const makeTHEME = (mode: ThemeMode) => {
  const { hue, ground, n, grad } = darkShift(mode);
  return {
  primary: hue('#2A7FFF'),
  primaryDark: hue('#1E6AE1'),
  primaryLight: ground('#EAF3FF', '#2A7FFF'),
  accent: hue('#5A9FFF'),
  success: hue('#10B981'),
  successDark: hue('#059669'),
  warning: hue('#F59E0B'),
  error: hue('#EF4444'),
  info: hue('#2A7FFF'),
  gradient: {
    primary: grad(['#2A7FFF', '#1857C0']),
    header: grad(['#1857C0', '#1E6AE1']),
    success: grad(['#10B981', '#059669']),
    accent: grad(['#5A9FFF', '#2A7FFF']),
  },
  };
};

// ── Confetti Particle ───────────────────────

interface ConfettiParticle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
}

const CONFETTI_COLORS = [
  '#2A7FFF',
  '#5A9FFF',
  '#10B981',
  '#F59E0B',
  '#1E6AE1',
  '#1857C0',
];

// ── Component ───────────────────────────────

const AppointmentConfirmScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const navigation = useNavigation<any>();
  const bottomBarPadding = useBottomBarPadding();
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const route = useRoute<ConfirmRoute>();
  const dispatch = useAppDispatch();

  const booking = useAppSelector((state) => state.healthcareBooking);
  const confirmationDetails = useAppSelector(selectConfirmationDetails);
  const shareMessage = useAppSelector(selectShareMessage);
  const nextSteps = useAppSelector(selectNextSteps);
  const addedToCalendar = useAppSelector(selectAddedToCalendar);
  const isAddingToCalendar = useAppSelector(selectIsAddingToCalendar);

  // Animations
  const checkAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  // Confetti
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [showConfetti, setShowConfettiState] = useState(true);

  // The booking screen hands over the real ids; without them this screen has
  // no appointment to describe and falls back to its placeholders.
  useEffect(() => {
    const appointmentId: string | undefined = route.params?.appointmentId;
    const confirmationCode: string | undefined = route.params?.confirmationCode;
    if (appointmentId) {
      dispatch(setAppointmentId(appointmentId));
      dispatch(fetchConfirmedAppointment(appointmentId));
    }
    if (confirmationCode) {
      dispatch(setConfirmationCode(confirmationCode));
    }
  }, [dispatch, route.params?.appointmentId, route.params?.confirmationCode]);

  useEffect(() => {
    dispatch(setConfirmed(true));

    // Generate confetti particles
    const particles: ConfettiParticle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * SCREEN_WIDTH),
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(Math.random() * 0.5 + 0.5),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));
    setConfetti(particles);

    // Animate confetti
    particles.forEach((particle, index) => {
      const duration = 2000 + Math.random() * 1000;
      const delay = index * 50;

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(particle.y, {
            toValue: 800,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotation, {
            toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: (Math.random() - 0.5) * 100,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Hide confetti after animation
    setTimeout(() => setShowConfettiState(false), 3500);

    // Main animations sequence
    Animated.sequence([
      // Check icon pops in
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
      // Content fades up
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
      ]),
    ]).start();

    // Staggered card animations
    cardAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 600 + index * 150,
        useNativeDriver: true,
      }).start();
    });

    // Pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleViewAppointments = () => {
    navigation.navigate(HealthcareRouteNames.MyAppointments);
  };

  const handleGoHome = () => {
    // HealthcareHome is also registered as a bare stack screen, and navigating
    // to that one dropped the shopper outside the tab shell — the bottom tab
    // bar disappeared. Go to the tabs, and reset so the finished booking flow
    // isn't left underneath.
    navigation.reset({
      index: 0,
      routes: [{ name: HealthcareRouteNames.HealthcareTabs as never }],
    });
  };

  const handleAddToCalendar = () => {
    dispatch(addToCalendar());
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: shareMessage,
      });
      dispatch(shareAppointmentDetails());
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const consultationType = booking.appointmentType === 'video' 
    ? 'Video Consultation' 
    : 'In-Clinic Visit';

  // ── Invoice ───────────────────────────────
  const invoiceAppointmentId =
    confirmationDetails?.appointmentId ?? route.params?.appointmentId ?? '';
  const invoiceNumber = invoiceNumberFor(invoiceAppointmentId);
  const invoiceAmount = formatFee(confirmationDetails?.fee) ?? 'PKR 0';
  const paymentMethodLabel = formatPaymentMethod(confirmationDetails?.paymentMethod);
  const isPaid = confirmationDetails?.paymentStatus === 'paid';

  const handleDownloadInvoice = useCallback(async () => {
    if (!invoiceAppointmentId) return;
    setDownloadingInvoice(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in again to download your invoice.');
      const uri = await downloadInvoicePdf(invoiceAppointmentId, token);
      await Share.share({
        url: uri,
        title: `${invoiceNumber}.pdf`,
        message: `MetroMatrix invoice ${invoiceNumber}`,
      });
    } catch (e: any) {
      Alert.alert(
        'Download failed',
        e?.message || 'The invoice could not be downloaded. Please try again.'
      );
    } finally {
      setDownloadingInvoice(false);
    }
  }, [invoiceAppointmentId, invoiceNumber]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={sh.n('#F8FBFF', 'bg')} />

      {/* Confetti */}
      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
          {confetti.map((particle) => (
            <Animated.View
              key={particle.id}
              style={[
                styles.confettiParticle,
                {
                  backgroundColor: particle.color,
                  transform: [
                    { translateX: particle.x },
                    { translateY: particle.y },
                    {
                      rotate: particle.rotation.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                    { scale: particle.scale },
                  ],
                },
              ]}
            />
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Section */}
        <View style={styles.successSection}>
          <Animated.View
            style={[
              styles.checkContainer,
              {
                transform: [{ scale: Animated.multiply(checkAnim, pulseAnim) }],
              },
            ]}
          >
            <LinearGradient
              colors={THEME.gradient.success as any}
              style={styles.checkGradient}
            >
              <Ionicons name="checkmark" size={52} color="#FFFFFF" />
            </LinearGradient>

            {/* Rings */}
            <View style={[styles.ring, styles.ring1]} />
            <View style={[styles.ring, styles.ring2]} />
          </Animated.View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your appointment has been successfully submitted.{'\n'}
              We'll notify you once the doctor confirms.
            </Text>
          </Animated.View>
        </View>

        {/* Confirmation Code */}
        <Animated.View
          style={[
            styles.codeCard,
            {
              opacity: cardAnimations[0],
              transform: [
                {
                  translateY: cardAnimations[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.codeHeader}>
            <View style={styles.codeIconBg}>
              <Ionicons name="ticket-outline" size={18} color={THEME.primary} />
            </View>
            <Text style={styles.codeLabel}>Confirmation Code</Text>
          </View>
          <Text style={styles.codeValue}>
            {confirmationDetails?.confirmationCode || 'HC-XXXXXX'}
          </Text>
          <TouchableOpacity style={styles.copyButton} activeOpacity={0.7}>
            <Ionicons name="copy-outline" size={16} color={THEME.primary} />
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Booking Details Card */}
        <Animated.View
          style={[
            styles.detailsCard,
            {
              opacity: cardAnimations[1],
              transform: [
                {
                  translateY: cardAnimations[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.detailsHeader}>
            <View style={[styles.detailsIconBg, { backgroundColor: sh.ground('#EAF3FF', '#2A7FFF') }]}>
              <Ionicons name="calendar" size={18} color={THEME.primary} />
            </View>
            <Text style={styles.detailsTitle}>Booking Details</Text>
          </View>

          {/* Consultation Type */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBg, { backgroundColor: sh.ground('#EAF3FF', '#2A7FFF') }]}>
              <MaterialCommunityIcons
                name={booking.appointmentType === 'video' ? 'video-outline' : 'hospital-building'}
                size={16}
                color={THEME.accent}
              />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Consultation Type</Text>
              <Text style={styles.detailValue}>{consultationType}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          {/* Symptoms */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBg, { backgroundColor: sh.ground('#FEF3C7', '#F59E0B') }]}>
              <Ionicons name="document-text-outline" size={16} color={THEME.warning} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Symptoms</Text>
              <Text style={styles.detailValue}>
                {booking.symptoms || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          {/* Status */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBg, { backgroundColor: sh.ground('#FEF3C7', '#F59E0B') }]}>
              <Ionicons name="time-outline" size={16} color={THEME.warning} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Pending Confirmation</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Invoice */}
        <Animated.View
          style={[
            styles.invoiceCard,
            {
              opacity: cardAnimations[1],
              transform: [
                {
                  translateY: cardAnimations[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.invoiceHead}>
            <View>
              <Text style={styles.invoiceTitle}>Invoice</Text>
              <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            </View>
            <View
              style={[
                styles.invoiceStatusPill,
                isPaid ? styles.invoiceStatusPaid : styles.invoiceStatusDue,
              ]}
            >
              <Ionicons
                name={isPaid ? 'checkmark-circle' : 'time-outline'}
                size={13}
                color={isPaid ? THEME.success : THEME.warning}
              />
              <Text
                style={[
                  styles.invoiceStatusText,
                  { color: isPaid ? THEME.success : THEME.warning },
                ]}
              >
                {isPaid ? 'PAID' : 'UNPAID'}
              </Text>
            </View>
          </View>

          <View style={styles.invoiceDivider} />

          <View style={styles.invoiceLine}>
            <Text style={styles.invoiceLineLabel} numberOfLines={2}>
              {confirmationDetails?.type === 'video'
                ? 'Video consultation'
                : 'In-clinic consultation'}
              {confirmationDetails?.doctorName
                ? ` — ${confirmationDetails.doctorName}`
                : ''}
            </Text>
            <Text style={styles.invoiceLineValue}>{invoiceAmount}</Text>
          </View>

          <View style={styles.invoiceLine}>
            <Text style={styles.invoiceLineLabel}>Payment method</Text>
            <Text style={styles.invoiceLineValue}>{paymentMethodLabel}</Text>
          </View>

          <View style={styles.invoiceDivider} />

          <View style={styles.invoiceTotalRow}>
            <Text style={styles.invoiceTotalLabel}>Total paid</Text>
            <Text style={styles.invoiceTotalValue}>{invoiceAmount}</Text>
          </View>

          <TouchableOpacity
            style={styles.invoiceDownloadBtn}
            onPress={handleDownloadInvoice}
            disabled={downloadingInvoice}
            activeOpacity={0.85}
          >
            {downloadingInvoice ? (
              <ActivityIndicator size="small" color={THEME.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={17} color={THEME.primary} />
                <Text style={styles.invoiceDownloadText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.invoiceFootnote}>
            Always available from this appointment in My Appointments.
          </Text>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.actionsCard,
            {
              opacity: cardAnimations[2],
              transform: [
                {
                  translateY: cardAnimations[2].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddToCalendar}
            activeOpacity={0.7}
            disabled={isAddingToCalendar || addedToCalendar}
          >
            <View
              style={[
                styles.actionIconBg,
                { backgroundColor: addedToCalendar ? '#DCFCE7' : '#EAF3FF' },
              ]}
            >
              <Ionicons
                name={addedToCalendar ? 'checkmark' : 'calendar-outline'}
                size={18}
                color={addedToCalendar ? THEME.success : THEME.primary}
              />
            </View>
            <Text
              style={[
                styles.actionText,
                addedToCalendar && { color: THEME.success },
              ]}
            >
              {addedToCalendar ? 'Added to Calendar' : 'Add to Calendar'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={addedToCalendar ? THEME.success : Colors.text.tertiary}
            />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBg, { backgroundColor: sh.ground('#EAF3FF', '#2A7FFF') }]}>
              <Ionicons name="share-social-outline" size={18} color={THEME.accent} />
            </View>
            <Text style={styles.actionText}>Share Details</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Next Steps Card */}
        <View style={styles.nextStepsCard}>
          <View style={styles.nextStepsHeader}>
            <View style={[styles.nextStepsIconBg]}>
              <Ionicons name="bulb-outline" size={18} color={THEME.warning} />
            </View>
            <Text style={styles.nextStepsTitle}>What's Next?</Text>
          </View>

          {nextSteps.length > 0 ? (
            nextSteps.map((step, index) => (
              <View key={index} style={styles.nextStepItem}>
                <View style={styles.nextStepNumber}>
                  <Text style={styles.nextStepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.nextStepText}>{step}</Text>
              </View>
            ))
          ) : (
            <>
              <View style={styles.nextStepItem}>
                <View style={styles.nextStepNumber}>
                  <Text style={styles.nextStepNumberText}>1</Text>
                </View>
                <Text style={styles.nextStepText}>
                  You'll receive a notification when the doctor confirms
                </Text>
              </View>

              <View style={styles.nextStepItem}>
                <View style={styles.nextStepNumber}>
                  <Text style={styles.nextStepNumberText}>2</Text>
                </View>
                <Text style={styles.nextStepText}>
                  Reminders will be sent before your appointment
                </Text>
              </View>

              <View style={styles.nextStepItem}>
                <View style={styles.nextStepNumber}>
                  <Text style={styles.nextStepNumberText}>3</Text>
                </View>
                <Text style={styles.nextStepText}>
                  You can cancel or reschedule up to 2 hours before
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomBarPadding }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleViewAppointments}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={THEME.gradient.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <MaterialCommunityIcons
              name="clipboard-list-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>View My Appointments</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGoHome}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={18} color={THEME.primary} />
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────

const makeStyles = (THEME: ReturnType<typeof makeTHEME>, sh: DarkShift) => StyleSheet.create({
  // ── Invoice ──
  invoiceCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: sh.n('#E2E8F0', 'line'),
  },
  invoiceHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  invoiceTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: 3,
    letterSpacing: 0.4,
  },
  invoiceStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  invoiceStatusPaid: { backgroundColor: sh.ground('#DCFCE7', '#10B981') },
  invoiceStatusDue: { backgroundColor: sh.ground('#FEF3C7', '#F59E0B') },
  invoiceStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
    marginVertical: 14,
  },
  invoiceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 10,
  },
  invoiceLineLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  invoiceLineValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  invoiceTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.primary,
  },
  invoiceDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.primary,
    backgroundColor: sh.ground('#EAF3FF', '#2A7FFF'),
  },
  invoiceDownloadText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
  invoiceFootnote: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 10,
  },

  container: {
    flex: 1,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },

  // Success Section
  successSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },
  checkContainer: {
    marginBottom: 28,
    position: 'relative',
  },
  checkGradient: {
    width: 100,
    height: 100,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: THEME.success,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  ring: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: THEME.success,
  },
  ring1: {
    width: 130,
    height: 130,
    top: -15,
    left: -15,
    opacity: 0.2,
  },
  ring2: {
    width: 160,
    height: 160,
    top: -30,
    left: -30,
    opacity: 0.1,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Code Card
  codeCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 22,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: THEME.primaryLight,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  codeIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: THEME.primaryLight,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Details Card
  detailsCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: sh.n('#EEF2FF', 'lineSoft'),
    ...Platform.select({
      ios: {
        shadowColor: sh.n('#64748B', 'inkMuted'),
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  detailsIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
    marginVertical: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: sh.ground('#FEF3C7', '#F59E0B'),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.warning,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: sh.hue('#B45309'),
  },

  // Actions Card
  actionsCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: sh.n('#F1F5F9', 'lineSoft'),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  actionDivider: {
    height: 1,
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
    marginHorizontal: 14,
  },

  // Next Steps Card
  nextStepsCard: {
    backgroundColor: sh.ground('#FFFBEB', '#F59E0B'),
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: sh.ground('#FEF3C7', '#F59E0B'),
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  nextStepsIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: sh.ground('#FEF3C7', '#F59E0B'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: sh.hue('#92400E'),
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: sh.hue('#FDE68A'),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextStepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: sh.hue('#92400E'),
  },
  nextStepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: sh.hue('#78350F'),
    lineHeight: 20,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: sh.n('#F1F5F9', 'lineSoft'),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },
});

export default AppointmentConfirmScreen;