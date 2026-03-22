import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setConfirmed,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ConfirmRoute = RouteProp<HealthcareStackParamList, 'AppointmentConfirm'>;

// ── Theme Colors (Consistent) ───────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  successDark: '#059669',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#2A7FFF',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    header: ['#1857C0', '#1E6AE1'],
    success: ['#10B981', '#059669'],
    accent: ['#5A9FFF', '#2A7FFF'],
  },
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
  const navigation = useNavigation<any>();
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
    navigation.navigate(HealthcareRouteNames.HealthcareHome);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />

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
            <View style={[styles.detailsIconBg, { backgroundColor: '#EAF3FF' }]}>
              <Ionicons name="calendar" size={18} color={THEME.primary} />
            </View>
            <Text style={styles.detailsTitle}>Booking Details</Text>
          </View>

          {/* Consultation Type */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBg, { backgroundColor: '#EAF3FF' }]}>
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
            <View style={[styles.detailIconBg, { backgroundColor: '#FEF3C7' }]}>
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
            <View style={[styles.detailIconBg, { backgroundColor: '#FEF3C7' }]}>
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
            <View style={[styles.actionIconBg, { backgroundColor: '#EAF3FF' }]}>
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
      <View style={styles.footer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
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
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
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
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
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
    color: '#B45309',
  },

  // Actions Card
  actionsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
  },

  // Next Steps Card
  nextStepsCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FEF3C7',
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
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
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextStepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  nextStepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#78350F',
    lineHeight: 20,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    borderRadius: 14,
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
    fontWeight: '700',
    color: '#FFFFFF',
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