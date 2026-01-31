import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../../store/store';
import { resetJobCompletion, incrementJobsDone } from './jobCompletionSlice';
import { resetJobDetail } from '../jobdetail-screen/jobDetailSlice';
import { resetNavigationMap } from '../map-screen/mapSlice';
import { resetJobInProgress } from '../job-InProgress/jobInProgressSlice';
import { resetAwaitingApproval } from '../awaiting-screen/awaitingScreenSlice';
import { resetPaymentRequest } from '../payment-screen/paymentRequestSlice';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Jobs: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Confetti particle component
interface ConfettiProps {
  delay: number;
  color: string;
  left: number;
}

const ConfettiParticle: React.FC<ConfettiProps> = ({ delay, color, left }) => {
  const fallAnim = useRef(new Animated.Value(-50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fallAnim, {
          toValue: height + 50,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 10,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 10],
    outputRange: ['0deg', '3600deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: left,
          backgroundColor: color,
          transform: [{ translateY: fallAnim }, { rotate: spin }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

const JobCompletionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  
  // Use jobCompletion slice
  const {
    jobId,
    serviceType,
    customerName,
    actualDuration,
    earnings,
    paymentMethod,
    transactionId,
    stats,
  } = useSelector((state: RootState) => state.jobCompletion);

  const [showConfetti, setShowConfetti] = useState(true);

  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0)).current;
  const ringScale3 = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.4)).current;
  const ringOpacity3 = useRef(new Animated.Value(0.2)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  // Confetti colors
  const confettiColors = [
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#3B82F6', // Blue
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#EF4444', // Red
  ];

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    left: Math.random() * width,
  }));

  useEffect(() => {
    // Check animation
    Animated.spring(checkScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Ring animations
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(ringScale1, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity1, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(ringScale2, {
          toValue: 1.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity2, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(ringScale3, {
          toValue: 2.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity3, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Content fade in
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 600,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Auto navigate after 5 seconds
    const timeout = setTimeout(() => {
      handleGoHome();
    }, 8000);

    // Hide confetti after 4 seconds
    const confettiTimeout = setTimeout(() => {
      setShowConfetti(false);
    }, 4000);

    return () => {
      clearTimeout(timeout);
      clearTimeout(confettiTimeout);
    };
  }, []);

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const handleGoHome = () => {
    // Increment jobs done count
    dispatch(incrementJobsDone());
    
    // Reset all job flow slices
    dispatch(resetJobDetail());
    dispatch(resetNavigationMap());
    dispatch(resetJobInProgress());
    dispatch(resetAwaitingApproval());
    dispatch(resetPaymentRequest());
    dispatch(resetJobCompletion());

    // Reset navigation stack and go to Home
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'HomeServiceProviderDashboard' as never }],
      })
    );
  };

  const handleViewJobs = () => {
    // Increment jobs done count
    dispatch(incrementJobsDone());
    
    // Reset all job flow slices
    dispatch(resetJobDetail());
    dispatch(resetNavigationMap());
    dispatch(resetJobInProgress());
    dispatch(resetAwaitingApproval());
    dispatch(resetPaymentRequest());
    dispatch(resetJobCompletion());

    // Navigate to Jobs screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'HomeServiceProviderDashboard' as never }],
      })
    );
  };

  const earningsAmount = earnings || 0;

  return (
    <View style={styles.container}>
      {/* Confetti */}
      {showConfetti &&
        confettiParticles.map((particle) => (
          <ConfettiParticle
            key={particle.id}
            delay={particle.delay}
            color={particle.color}
            left={particle.left}
          />
        ))}

      {/* Green Gradient Background */}
      <View style={styles.gradientBg} />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Success Animation */}
        <View style={styles.animationContainer}>
          {/* Expanding rings */}
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale1 }],
                opacity: ringOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale2 }],
                opacity: ringOpacity2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale3 }],
                opacity: ringOpacity3,
              },
            ]}
          />

          {/* Check circle */}
          <Animated.View
            style={[
              styles.checkCircle,
              { transform: [{ scale: checkScaleAnim }] },
            ]}
          >
            <Icon name="check" size={60} color="#FFFFFF" />
          </Animated.View>
        </View>

        {/* Success Text */}
        <Animated.View style={[styles.textContainer, { opacity: contentFade }]}>
          <Text style={styles.successTitle}>Job Completed!</Text>
          <Text style={styles.successSubtitle}>
            Great work! You've successfully completed this job.
          </Text>
        </Animated.View>

        {/* Summary Card */}
        <Animated.View style={[styles.summaryCard, { opacity: contentFade }]}>
          {/* Service Icon */}
          <View style={styles.serviceIconBg}>
            <Icon name="wrench-outline" size={28} color="#10B981" />
          </View>

          {/* Service Name */}
          <Text style={styles.serviceName}>
            {serviceType || 'Service Completed'}
          </Text>

          {/* Duration */}
          <View style={styles.durationRow}>
            <Icon name="clock-outline" size={18} color="#6B7280" />
            <Text style={styles.durationText}>
              Duration: {formatDuration(actualDuration)}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Earnings */}
          <View style={styles.earningsContainer}>
            <Text style={styles.earningsLabel}>You Earned</Text>
            <Text style={styles.earningsValue}>
              Rs {earningsAmount.toLocaleString()}
            </Text>
          </View>

          {/* Payment Method Badge */}
          <View
            style={[
              styles.paymentBadge,
              paymentMethod === 'cash' ? styles.cashBadge : styles.onlineBadge,
            ]}
          >
            <Icon
              name={paymentMethod === 'cash' ? 'cash' : 'credit-card-outline'}
              size={16}
              color={paymentMethod === 'cash' ? '#10B981' : '#3B82F6'}
            />
            <Text
              style={[
                styles.paymentBadgeText,
                paymentMethod === 'cash'
                  ? styles.cashBadgeText
                  : styles.onlineBadgeText,
              ]}
            >
              {paymentMethod === 'cash' ? 'Cash Payment' : 'Online Payment'}
            </Text>
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View style={[styles.statsRow, { opacity: contentFade }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="briefcase-check" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>+1</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="trending-up" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Level Up</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Actions */}
      <Animated.View style={[styles.bottomContainer, { opacity: contentFade }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewJobs}
            activeOpacity={0.85}
          >
            <Icon name="clipboard-list-outline" size={20} color="#10B981" />
            <Text style={styles.secondaryButtonText}>View All Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoHome}
            activeOpacity={0.85}
          >
            <Icon name="home-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.autoRedirectText}>
          Auto-redirecting to home in a few seconds...
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    backgroundColor: '#10B981',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
    zIndex: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    alignItems: 'center',
  },
  animationContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  serviceIconBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  durationText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  cardDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  earningsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cashBadge: {
    backgroundColor: '#ECFDF5',
  },
  onlineBadge: {
    backgroundColor: '#EFF6FF',
  },
  paymentBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  cashBadgeText: {
    color: '#10B981',
  },
  onlineBadgeText: {
    color: '#3B82F6',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginLeft: 8,
  },
  primaryButton: {
    flex: 0.52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  autoRedirectText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});

export default JobCompletionScreen;