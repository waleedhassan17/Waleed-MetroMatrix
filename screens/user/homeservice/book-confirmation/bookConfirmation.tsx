import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ScrollView,
  Modal,
  Easing,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../../../constants/Colors';
import { Fonts } from '../../../../constants/Fonts';
import {
  setBookingStatus,
  cancelBooking,
  resetConfirmation,
  selectBookingConfirmation,
  selectConfirmationProvider,
  selectConfirmationDetails,
  BookingStatusType,
} from './bookConfirmationSlice';
import { RootState, AppDispatch } from '../../../../store/store';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

// Service type configurations - matching BookingScreen
const SERVICE_CONFIG: Record<string, {
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
  icon: string;
  pulseColor: string;
}> = {
  electricians: {
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
    pulseColor: 'rgba(245, 158, 11, 0.3)',
  },
  plumbers: {
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
    pulseColor: 'rgba(59, 130, 246, 0.3)',
  },
  'ac-repairers': {
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
    pulseColor: 'rgba(6, 182, 212, 0.3)',
  },
};

type BookConfirmationRouteParams = {
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

const TOTAL_WAIT_TIME = 300; // 5 minutes in seconds
const AUTO_ACCEPT_TIME = 10000; // 10 seconds for auto-accept

export default function BookConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: BookConfirmationRouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { category = 'ac-repairers' } = route.params || {};

  // Redux state
  const bookingConfirmation = useSelector(selectBookingConfirmation);
  const provider = useSelector(selectConfirmationProvider);
  const bookingDetails = useSelector(selectConfirmationDetails);

  // Local state
  const [timeLeft, setTimeLeft] = useState(TOTAL_WAIT_TIME);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(true);

  // Animation references - initialize to visible state
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heroAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringPulseAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const statusAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const buttonAnim1 = useRef(new Animated.Value(0)).current;
  const buttonAnim2 = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const serviceConfig = SERVICE_CONFIG[category] || SERVICE_CONFIG['ac-repairers'];
  const bookingStatus = bookingConfirmation?.status || 'waiting';

  // Callbacks
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTrackProvider = useCallback(() => {
    // @ts-ignore
    navigation.navigate('liveTracking', { category, bookingId: bookingDetails?.bookingId });
  }, [navigation, category, bookingDetails]);

  const handleCheckServiceStatus = useCallback(() => {
    // @ts-ignore
    navigation.navigate('serviceStatus', { category, bookingId: bookingDetails?.bookingId });
  }, [navigation, category, bookingDetails]);

  const handleBackToProviders = useCallback(() => {
    dispatch(resetConfirmation());
    navigation.goBack();
  }, [dispatch, navigation]);

  const handleCancelBooking = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    dispatch(cancelBooking());
    setIsTimerActive(false);
    setShowCancelModal(false);
    navigation.goBack();
  }, [dispatch, navigation]);

  const handleDismissCancelModal = useCallback(() => {
    setShowCancelModal(false);
  }, []);

  // Track animations ref for cleanup
  const animationsRef = useRef<Animated.CompositeAnimation | null>(null);
  const shimmerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Entrance animations - run when screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Set initial animation values when screen gains focus
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.95);
      heroAnim.setValue(0);
      shimmerAnim.setValue(0);

      // Start animations
      animationsRef.current = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(heroAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);
      animationsRef.current.start();

      // Shimmer loop
      shimmerLoopRef.current = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerLoopRef.current.start();

      // Cleanup: only stop animations, don't reset values
      return () => {
        if (animationsRef.current) {
          animationsRef.current.stop();
        }
        if (shimmerLoopRef.current) {
          shimmerLoopRef.current.stop();
        }
      };
    }, [])
  );

  // Pulse animation for waiting state
  useEffect(() => {
    if (bookingStatus === 'waiting') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      const ringAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringPulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      ringAnimation.start();

      return () => {
        pulseAnimation.stop();
        ringAnimation.stop();
      };
    }
  }, [bookingStatus, pulseAnim, ringPulseAnim]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerActive && timeLeft > 0 && bookingStatus === 'waiting') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            dispatch(setBookingStatus('timeout'));
            setIsTimerActive(false);
            Animated.spring(statusAnim, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }).start();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    Animated.timing(progressAnim, {
      toValue: timeLeft / TOTAL_WAIT_TIME,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeLeft, isTimerActive, bookingStatus, dispatch, statusAnim, progressAnim]);

  // Auto-accept after 10 seconds
  useEffect(() => {
    if (bookingStatus !== 'waiting') return;

    const autoAcceptTimeout = setTimeout(() => {
      dispatch(setBookingStatus('accepted'));
      setIsTimerActive(false);

      // Staggered success animations
      Animated.sequence([
        Animated.timing(statusAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Button animations with stagger
      Animated.stagger(150, [
        Animated.spring(buttonAnim1, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(buttonAnim2, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(checkmarkAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }).start();
    }, AUTO_ACCEPT_TIME);

    return () => clearTimeout(autoAcceptTimeout);
  }, [bookingStatus, dispatch, statusAnim, checkmarkAnim, checkmarkScale, buttonAnim1, buttonAnim2]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressColor = (): string => {
    const percentage = timeLeft / TOTAL_WAIT_TIME;
    if (percentage > 0.5) return '#10B981';
    if (percentage > 0.25) return '#F59E0B';
    return '#EF4444';
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Booking Status</Text>
            <View style={[styles.liveIndicator, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
              <Animated.View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: serviceConfig.accentColor,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Text style={[styles.liveText, { color: serviceConfig.accentColor }]}>LIVE</Text>
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderProviderHero = () => (
    <Animated.View
      style={[
        styles.heroSection,
        {
          opacity: heroAnim,
          transform: [
            {
              scale: heroAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={serviceConfig.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorativeCircle, styles.decorativeCircle1]} />
        <View style={[styles.decorativeCircle, styles.decorativeCircle2]} />
        <View style={[styles.decorativeCircle, styles.decorativeCircle3]} />

        <View style={styles.heroContent}>
          {/* Provider Image with Pulse Ring */}
          <View style={styles.providerImageWrapper}>
            {bookingStatus === 'waiting' && (
              <>
                <Animated.View
                  style={[
                    styles.pulseRing,
                    styles.pulseRingOuter,
                    {
                      opacity: ringPulseAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.6, 0.3, 0],
                      }),
                      transform: [
                        {
                          scale: ringPulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.8],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.pulseRing,
                    styles.pulseRingInner,
                    {
                      opacity: ringPulseAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.8, 0.4, 0],
                      }),
                      transform: [
                        {
                          scale: ringPulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.4],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </>
            )}

            <Animated.View
              style={[
                styles.providerImageContainer,
                {
                  transform: [{ scale: bookingStatus === 'waiting' ? pulseAnim : 1 }],
                },
              ]}
            >
              <View style={styles.providerImageBorder}>
                <Image
                  source={{ uri: provider?.image || 'https://randomuser.me/api/portraits/men/45.jpg' }}
                  style={styles.providerImage}
                />
              </View>

              {/* Status indicator */}
              {bookingStatus === 'accepted' && (
                <Animated.View
                  style={[
                    styles.statusIndicator,
                    styles.acceptedIndicator,
                    {
                      transform: [{ scale: checkmarkScale }],
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </Animated.View>
              )}

              {bookingStatus === 'waiting' && (
                <View style={[styles.statusIndicator, styles.onlineIndicator]}>
                  <View style={styles.onlineDot} />
                </View>
              )}
            </Animated.View>
          </View>

          <Text style={styles.heroProviderName}>{provider?.name || 'Bilal Ahmed'}</Text>
          <Text style={styles.heroProviderRole}>{provider?.specialty || 'AC Installation & Cooling Expert'}</Text>

          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Ionicons name="star" size={14} color="#FCD34D" />
              <Text style={styles.heroBadgeText}>{provider?.rating || 4.7}</Text>
            </View>
            <View style={styles.heroBadgeDivider} />
            <View style={styles.heroBadge}>
              <Feather name="award" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>{provider?.experience || '6+ years'}</Text>
            </View>
            <View style={styles.heroBadgeDivider} />
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>Verified</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderWaitingState = () => {
    if (bookingStatus !== 'waiting') return null;

    return (
      <Animated.View
        style={[
          styles.waitingSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Notification Card */}
        <View style={styles.notificationCard}>
          <LinearGradient
            colors={serviceConfig.lightGradient as [string, string]}
            style={styles.notificationIconBg}
          >
            <Ionicons name="notifications" size={24} color={serviceConfig.accentColor} />
          </LinearGradient>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Request Sent!</Text>
            <Text style={styles.notificationText}>
              Waiting for {provider?.name || 'provider'} to accept your booking
            </Text>
          </View>
          <View style={styles.notificationPulse}>
            <Animated.View
              style={[
                styles.notificationPulseDot,
                {
                  backgroundColor: serviceConfig.accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </View>
        </View>

        {/* Timer Card */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>Response Time Remaining</Text>
            <Text style={[styles.timerValue, { color: getProgressColor() }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: getProgressColor(),
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.timerSteps}>
            {[
              { icon: 'paper-plane-outline', label: 'Sent', done: true },
              { icon: 'notifications-outline', label: 'Notified', done: true },
              { icon: 'hourglass-outline', label: 'Waiting', active: true },
              { icon: 'checkmark-circle-outline', label: 'Confirmed', done: false },
            ].map((step, index) => (
              <View key={index} style={styles.timerStep}>
                <View
                  style={[
                    styles.timerStepIcon,
                    step.done && styles.timerStepIconDone,
                    step.active && { backgroundColor: `${serviceConfig.accentColor}15`, borderColor: serviceConfig.accentColor },
                  ]}
                >
                  <Ionicons
                    name={step.icon as any}
                    size={16}
                    color={step.done ? '#10B981' : step.active ? serviceConfig.accentColor : '#94A3B8'}
                  />
                </View>
                <Text
                  style={[
                    styles.timerStepLabel,
                    step.done && styles.timerStepLabelDone,
                    step.active && { color: serviceConfig.accentColor },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelRequestButton}
          onPress={handleCancelBooking}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          <Text style={styles.cancelRequestText}>Cancel Request</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderAcceptedState = () => {
    if (bookingStatus !== 'accepted') return null;

    return (
      <Animated.View
        style={[
          styles.acceptedSection,
          {
            opacity: statusAnim,
            transform: [
              {
                translateY: statusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Success Card - Clean Design */}
        <View style={styles.successCard}>
          {/* Checkmark Circle */}
          <Animated.View
            style={[
              styles.successIconWrapper,
              {
                transform: [{ scale: checkmarkScale }],
              },
            ]}
          >
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Success Message */}
          <Animated.View
            style={[
              styles.successMessageContainer,
              {
                opacity: checkmarkAnim,
              },
            ]}
          >
            <Text style={styles.successTitle}>Provider booked successfully!</Text>
            <Text style={styles.successDescription}>
              {provider?.name || 'Ali Khan'} has accepted your booking request. You can now track your service provider in real-time and check service status.
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  opacity: buttonAnim1,
                  transform: [
                    {
                      translateY: buttonAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.trackProviderButton}
                onPress={handleTrackProvider}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={serviceConfig.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.trackProviderGradient}
                >
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                  <Text style={styles.trackProviderText}>Track Provider</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  opacity: buttonAnim2,
                  transform: [
                    {
                      translateY: buttonAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.checkStatusButton, { borderColor: serviceConfig.accentColor }]}
                onPress={handleCheckServiceStatus}
                activeOpacity={0.9}
              >
                <Ionicons name="document-text" size={20} color={serviceConfig.accentColor} />
                <Text style={[styles.checkStatusText, { color: serviceConfig.accentColor }]}>
                  Check Service Status
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderDeclinedOrTimeoutState = () => {
    if (bookingStatus !== 'declined' && bookingStatus !== 'timeout' && bookingStatus !== 'cancelled') {
      return null;
    }

    const getStateConfig = () => {
      switch (bookingStatus) {
        case 'declined':
          return {
            icon: 'close-circle',
            iconColors: ['#EF4444', '#DC2626'] as [string, string],
            bgColors: ['#FEF2F2', '#FEE2E2'] as [string, string],
            title: 'Provider Unavailable',
            message: `${provider?.name || 'The provider'} is currently busy. Don't worry, there are other great providers available!`,
          };
        case 'timeout':
          return {
            icon: 'time',
            iconColors: ['#F59E0B', '#D97706'] as [string, string],
            bgColors: ['#FFFBEB', '#FEF3C7'] as [string, string],
            title: 'Request Timed Out',
            message: `${provider?.name || 'The provider'} didn't respond in time. Please try booking with another provider.`,
          };
        case 'cancelled':
          return {
            icon: 'remove-circle',
            iconColors: ['#64748B', '#475569'] as [string, string],
            bgColors: ['#F8FAFC', '#F1F5F9'] as [string, string],
            title: 'Booking Cancelled',
            message: 'Your booking request has been cancelled. You can book another provider anytime.',
          };
        default:
          return null;
      }
    };

    const config = getStateConfig();
    if (!config) return null;

    return (
      <Animated.View
        style={[
          styles.statusSection,
          {
            opacity: statusAnim,
            transform: [
              {
                translateY: statusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={config.bgColors} style={styles.failureBanner}>
          <View style={styles.failureIconContainer}>
            <LinearGradient colors={config.iconColors} style={styles.failureIconGradient}>
              <Ionicons name={config.icon as any} size={32} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.failureTitle}>{config.title}</Text>
          <Text style={styles.failureText}>{config.message}</Text>
        </LinearGradient>

        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={handleBackToProviders}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={serviceConfig.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryActionGradient}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Find Another Provider</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHelpCard = () => (
    <Animated.View
      style={[
        styles.helpCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.helpContent}>
        <View style={[styles.helpIconContainer, { backgroundColor: `${serviceConfig.accentColor}10` }]}>
          <Ionicons name="help-circle-outline" size={22} color={serviceConfig.accentColor} />
        </View>
        <Text style={styles.helpText}>
          Need help? Contact our support team anytime.
        </Text>
      </View>
    </Animated.View>
  );

  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      transparent
      animationType="fade"
      onRequestClose={handleDismissCancelModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleDismissCancelModal}
          />
        </View>

        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalIconContainer}>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              style={styles.modalIconBg}
            >
              <Ionicons name="warning" size={32} color="#F59E0B" />
            </LinearGradient>
          </View>

          <Text style={styles.modalTitle}>Cancel Booking?</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to cancel your booking request with{' '}
            <Text style={styles.modalProviderName}>{provider?.name || 'the provider'}</Text>?
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={handleDismissCancelModal}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSecondaryText}>Keep Waiting</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={handleConfirmCancel}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.modalPrimaryGradient}
              >
                <Text style={styles.modalPrimaryText}>Yes, Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={isAndroid ? '#FFFFFF' : 'transparent'}
        translucent={!isAndroid}
      />

      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        {renderProviderHero()}
        {renderWaitingState()}
        {renderAcceptedState()}
        {renderDeclinedOrTimeoutState()}
        {renderHelpCard()}
      </ScrollView>

      {renderCancelModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerGradient: {
    paddingTop: isAndroid ? 16 : 8,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 42,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroGradient: {
    padding: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle1: {
    width: 200,
    height: 200,
    top: -80,
    right: -60,
  },
  decorativeCircle2: {
    width: 120,
    height: 120,
    bottom: -40,
    left: -30,
  },
  decorativeCircle3: {
    width: 80,
    height: 80,
    top: 40,
    left: 20,
    opacity: 0.5,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  providerImageWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  pulseRingOuter: {
    width: 140,
    height: 140,
    top: -20,
    left: -20,
  },
  pulseRingInner: {
    width: 120,
    height: 120,
    top: -10,
    left: -10,
  },
  providerImageContainer: {
    position: 'relative',
  },
  providerImageBorder: {
    width: 100,
    height: 100,
    borderRadius: 30,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  providerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#F8FAFC',
  },
  statusIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  onlineIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
  },
  acceptedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroProviderName: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroProviderRole: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
    textAlign: 'center',
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
  },
  heroBadgeDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },

  // Waiting Section
  waitingSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  notificationIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  notificationText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#64748B',
    lineHeight: 18,
  },
  notificationPulse: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Timer Card
  timerCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#64748B',
  },
  timerValue: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  timerSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timerStep: {
    alignItems: 'center',
    flex: 1,
  },
  timerStepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerStepIconDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  timerStepLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#94A3B8',
    textAlign: 'center',
  },
  timerStepLabelDone: {
    color: '#10B981',
  },

  // Cancel Request Button
  cancelRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelRequestText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#EF4444',
  },

  // Accepted Section - Clean Professional Design
  acceptedSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  successIconWrapper: {
    marginBottom: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  successMessageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#166534',
    marginBottom: 10,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  actionButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  buttonWrapper: {
    width: '100%',
  },
  trackProviderButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  trackProviderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  trackProviderText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  checkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  checkStatusText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },

  // Status Section (for declined/timeout)
  statusSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },

  // Failure Banner
  failureBanner: {
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  failureIconContainer: {
    marginBottom: 16,
  },
  failureIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  failureTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  failureText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Action Buttons
  primaryActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  primaryActionText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Help Card - Simplified
  helpCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  helpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#64748B',
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalIconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalProviderName: {
    fontFamily: Fonts.bold,
    color: '#0F172A',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSecondaryText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#64748B',
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalPrimaryGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
});