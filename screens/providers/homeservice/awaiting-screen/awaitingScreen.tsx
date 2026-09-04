import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootState } from '../../../../store/store';
import { approveJob, checkApprovalStatusAsync } from './awaitingScreenSlice';
import { setPaymentRequestData } from '../payment-screen/paymentRequestSlice';
import { useRoomSocket } from '../../../../hooks/useRoomSocket';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C } from '../../../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RootStackParamList = {
  PaymentRequest: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AwaitingApprovalScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  // These screens rendered a bare View as their root, so on Android their
  // headers sat under the status bar and on notched iPhones under the
  // notch. Real insets, not StatusBar.currentHeight.
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  // Use awaitingApproval slice
  const {
    jobId,
    serviceType,
    customerName,
    address,
    actualDuration,
    estimatedPrice,
    isApproved,
  } = useSelector((state: RootState) => state.awaitingApproval);

  const [waitingTime, setWaitingTime] = useState(0);
  const [approved, setApproved] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;

  // Rotating animation for waiting indicator
  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotate.start();
    return () => rotate.stop();
  }, []);

  // The status indicator used to pulse forever. An animation that never
  // resolves is decoration, not feedback — `pulseAnim` stays at 1, so the
  // transform below is now the identity.

  // Waiting timer
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------
  // WAITING ON A REAL CUSTOMER.
  //
  // This screen used to arm `setTimeout(Math.random()*5000 + 5000)` on mount,
  // unconditionally — so it "approved" itself 5–10 seconds after the provider
  // arrived, whether or not a customer existed. It now asks the server.
  //
  // `isApproved` is true once the customer has either confirmed completion
  // themselves or paid; both are deliberate customer actions. Polled, because
  // the customer's confirmation is a plain REST call with no room event of its
  // own, and backed up by the room's status event for immediacy.
  // ---------------------------------------------------------------------
  const { roomStatus } = useRoomSocket(jobId || undefined, 'homeservice');
  const [checkFailed, setCheckFailed] = useState(false);
  const approvedRef = useRef(false);

  const checkApproval = useCallback(async () => {
    if (!jobId || approvedRef.current) return;
    const result = await dispatch(checkApprovalStatusAsync(jobId) as any);
    if (result?.meta?.requestStatus === 'rejected') {
      setCheckFailed(true); // shown as "still trying", never treated as approval
      return;
    }
    setCheckFailed(false);
    if (result.payload?.isApproved) {
      approvedRef.current = true;
      handleApproval();
    }
    // handleApproval is stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, dispatch]);

  useEffect(() => {
    if (!jobId) return;
    const id = setInterval(checkApproval, 6000);
    checkApproval();
    return () => clearInterval(id); // never outlive the screen
  }, [jobId, checkApproval]);

  // A booking status change is a good moment to re-ask rather than wait out
  // the next poll tick.
  useEffect(() => {
    if (roomStatus) checkApproval();
  }, [roomStatus, checkApproval]);

  const handleApproval = () => {
    setApproved(true);

    // Check animation
    Animated.spring(checkScaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Navigate after animation
    setTimeout(() => {
      dispatch(approveJob());
      
      // Set data for payment request slice
      dispatch(setPaymentRequestData({
        jobId,
        serviceType,
        customerName,
        serviceCharge: estimatedPrice,
      }));
      
      navigation.navigate('PaymentRequest');
    }, 1500);
  };

  const formatWaitingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return 'Calculating...';
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!jobId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Background Top */}
      <View style={styles.gradientTop} />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Waiting/Approved Animation */}
        <View style={styles.animationContainer}>
          {!approved ? (
            <>
              <Animated.View
                style={[
                  styles.outerRing,
                  { transform: [{ rotate: spin }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.middleRing,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <View style={styles.innerCircle}>
                <Icon name="clock-outline" size={48} color={HS.accent} />
              </View>
            </>
          ) : (
            <Animated.View
              style={[
                styles.approvedCircle,
                { transform: [{ scale: checkScaleAnim }] },
              ]}
            >
              <Icon name="check" size={56} color="#FFFFFF" />
            </Animated.View>
          )}
        </View>

        {/* Status Text */}
        <Text style={styles.statusTitle}>
          {approved ? 'Job Approved!' : 'Awaiting Customer Approval'}
        </Text>
        <Text style={styles.statusSubtitle}>
          {approved
            ? 'The customer has approved your work'
            : 'Please wait while the customer reviews your work'}
        </Text>

        {/* Waiting Timer */}
        {!approved && (
          <View style={styles.waitingTimer}>
            <Icon name="timer-sand" size={18} color={C.inkMuted} />
            <Text style={styles.waitingTimeText}>
              Waiting: {formatWaitingTime(waitingTime)}
            </Text>
          </View>
        )}

        {/* Job Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Icon name="clipboard-check-outline" size={20} color={HS.accent} />
            <Text style={styles.summaryTitle}>Job Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>{serviceType}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Customer</Text>
            <Text style={styles.summaryValue}>{customerName}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>
              {formatDuration(actualDuration)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {address}
            </Text>
          </View>
        </View>

        {/* Progress Indicators */}
        <View style={styles.progressIndicators}>
          <View style={styles.progressItem}>
            <View style={[styles.progressDot, styles.progressCompleted]}>
              <Icon name="check" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.progressLabel}>Arrived</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressItem}>
            <View style={[styles.progressDot, styles.progressCompleted]}>
              <Icon name="check" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.progressLabel}>Worked</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                approved ? styles.progressCompleted : styles.progressActive,
              ]}
            >
              {approved ? (
                <Icon name="check" size={12} color="#FFFFFF" />
              ) : (
                <Animated.View
                  style={[
                    styles.progressPulse,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
              )}
            </View>
            <Text style={[styles.progressLabel, !approved && styles.progressLabelActive]}>
              Approval
            </Text>
          </View>
          <View style={[styles.progressLine, !approved && styles.progressLinePending]} />
          <View style={styles.progressItem}>
            <View style={[styles.progressDot, styles.progressPending]} />
            <Text style={styles.progressLabel}>Payment</Text>
          </View>
        </View>

        {/* Info Note */}
        {!approved && (
          <View style={styles.infoNote}>
            <Icon name="information-outline" size={18} color={C.inkMuted} />
            <Text style={styles.infoText}>
              The customer has been notified and will approve your work shortly.
            </Text>
          </View>
        )}
      </View>

      {/* Check now. This slot used to hold "Simulate Customer Approval", which
          advanced the provider past a customer who had done nothing. The screen
          polls on its own; this is for the impatient, and for showing that the
          last check failed rather than silently looking like nobody replied. */}
      {!approved && (
        <View style={styles.bottomContainer}>
          {checkFailed && (
            <Text style={styles.checkFailedText}>
              Couldn't reach the server — still trying.
            </Text>
          )}
          <TouchableOpacity style={styles.manualApproveBtn} onPress={checkApproval}>
            <Text style={styles.manualApproveBtnText}>Check now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: C.inkMuted,
    fontFamily: 'Inter-Medium',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: HS.accentSoft,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  animationContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  outerRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: HS.accent,
    borderRightColor: HS.accent,
  },
  middleRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: HS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  approvedCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: HS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: HS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  statusTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: C.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  waitingTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  waitingTimeText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: C.inkMuted,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: C.ink,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: C.inkMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: C.ink,
    maxWidth: '60%',
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: C.lineSoft,
  },
  progressIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressCompleted: {
    backgroundColor: HS.accent,
  },
  progressActive: {
    backgroundColor: C.warning,
  },
  progressPending: {
    backgroundColor: C.line,
  },
  progressPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: C.inkFaint,
  },
  progressLabelActive: {
    color: C.warning,
  },
  progressLine: {
    width: 30,
    height: 3,
    backgroundColor: HS.accent,
    marginHorizontal: 4,
    marginBottom: 20,
    borderRadius: 2,
  },
  progressLinePending: {
    backgroundColor: C.line,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.lineSoft,
    borderRadius: 14,
    padding: 14,
    width: '100%',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: C.inkMuted,
    lineHeight: 18,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 10,
  },
  manualApproveBtn: {
    backgroundColor: C.line,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  manualApproveBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: C.inkMuted,
  },
  checkFailedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: C.error,
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default AwaitingApprovalScreen;