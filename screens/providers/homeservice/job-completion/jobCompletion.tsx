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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootState } from '../../../../store/store';
import { resetJobCompletion, incrementJobsDone, submitCompletionAsync } from './jobCompletionSlice';
import { resetJobDetail } from '../jobdetail-screen/jobDetailSlice';
import { resetNavigationMap } from '../map-screen/mapSlice';
import { resetJobInProgress } from '../job-InProgress/jobInProgressSlice';
import { resetAwaitingApproval } from '../awaiting-screen/awaitingScreenSlice';
import { resetPaymentRequest } from '../payment-screen/paymentRequestSlice';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, F, T } from '../../../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Jobs: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const JobCompletionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  // These screens rendered a bare View as their root, so on Android their
  // headers sat under the status bar and on notched iPhones under the
  // notch. Real insets, not StatusBar.currentHeight.
  const insets = useSafeAreaInsets();
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


  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0)).current;
  const ringScale3 = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.4)).current;
  const ringOpacity3 = useRef(new Animated.Value(0.2)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  // Confirm with the server that this job really is complete before
  // celebrating. `finalize` asserts the booking reached COMPLETED and changes
  // nothing, so it is safe to call on mount — but if it fails, the provider is
  // looking at a success screen for a job the server does not consider done,
  // and they should be told rather than shown confetti.
  useEffect(() => {
    if (!jobId) return;
    dispatch(submitCompletionAsync(jobId) as any);
  }, [dispatch, jobId]);

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

    return () => {
      clearTimeout(timeout);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
            <Icon name="check" size={60} color={C.surface} />
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
            <Icon name="wrench-outline" size={28} color={HS.accent} />
          </View>

          {/* Service Name */}
          <Text style={styles.serviceName}>
            {serviceType || 'Service Completed'}
          </Text>

          {/* Duration */}
          <View style={styles.durationRow}>
            <Icon name="clock-outline" size={18} color={C.inkMuted} />
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
              color={paymentMethod === 'cash' ? HS.accent : C.info}
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
            <View style={[styles.statIconBg, { backgroundColor: C.warningSoft }]}>
              <Icon name="star" size={20} color={C.warning} />
            </View>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: HS.accentSoft }]}>
              <Icon name="briefcase-check" size={20} color={HS.accent} />
            </View>
            <Text style={styles.statValue}>+1</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: C.infoSoft }]}>
              <Icon name="trending-up" size={20} color={C.info} />
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
            <Icon name="clipboard-list-outline" size={20} color={HS.accent} />
            <Text style={styles.secondaryButtonText}>View All Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoHome}
            activeOpacity={0.85}
          >
            <Icon name="home-outline" size={20} color={C.surface} />
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
    backgroundColor: C.bg,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    backgroundColor: HS.accent,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
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
    borderColor: C.surface,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: HS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: HS.accent,
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
    ...T.title,
    fontFamily: F.bold,
    color: C.surface,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    ...T.body,
    fontFamily: F.regular,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  serviceIconBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: HS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceName: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: C.ink,
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  durationText: {
    marginLeft: 6,
    ...T.body,
    fontFamily: F.regular,
    color: C.inkMuted,
  },
  cardDivider: {
    width: '100%',
    height: 1,
    backgroundColor: C.lineSoft,
    marginBottom: 20,
  },
  earningsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsLabel: {
    ...T.label,
    fontFamily: F.medium,
    color: C.inkMuted,
    marginBottom: 4,
  },
  earningsValue: {
    ...T.display,
    fontFamily: F.bold,
    color: HS.accent,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cashBadge: {
    backgroundColor: HS.accentSoft,
  },
  onlineBadge: {
    backgroundColor: C.infoSoft,
  },
  paymentBadgeText: {
    marginLeft: 6,
    ...T.label,
    fontFamily: F.medium,
  },
  cashBadgeText: {
    color: HS.accent,
  },
  onlineBadgeText: {
    color: C.info,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: C.ink,
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
    ...T.subhead,
    fontFamily: F.bold,
    color: C.ink,
    marginBottom: 2,
  },
  statLabel: {
    ...T.caption,
    fontFamily: F.regular,
    color: C.inkMuted,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: C.line,
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
    backgroundColor: HS.accentSoft,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: HS.accentLine,
  },
  secondaryButtonText: {
    ...T.body,
    fontFamily: F.semibold,
    color: HS.accent,
    marginLeft: 8,
  },
  primaryButton: {
    flex: 0.52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: HS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.surface,
    marginLeft: 8,
  },
  autoRedirectText: {
    textAlign: 'center',
    ...T.caption,
    fontFamily: F.regular,
    color: C.inkFaint,
  },
});

export default JobCompletionScreen;