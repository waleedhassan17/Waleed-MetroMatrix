import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootState } from '../../../../store/store';
import { startWorkAsync, completeWorkAsync } from './jobInProgressSlice';
import { setAwaitingApprovalData } from '../awaiting-screen/awaitingScreenSlice';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, F, T } from '../../../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RootStackParamList = {
  AwaitingApproval: undefined;
  NavigationMap: undefined;
  ProviderJobChat: { bookingId: string; customerName?: string };
  ProviderCallScreen: { bookingId: string; customerName?: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const JobInProgressScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  // These screens rendered a bare View as their root, so on Android their
  // headers sat under the status bar and on notched iPhones under the
  // notch. Real insets, not StatusBar.currentHeight.
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  // Use jobInProgress slice
  const {
    jobId,
    serviceType,
    category,
    customerName,
    customerPhone,
    address,
    city,
    specialInstructions,
    estimatedPrice,
    coordinates,
    workStarted,
    startTime,
  } = useSelector((state: RootState) => state.jobInProgress);

  const [elapsedTime, setElapsedTime] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // The status indicator used to pulse forever. An animation that never
  // resolves is decoration, not feedback — `pulseAnim` stays at 1, so the
  // transform below is now the identity.

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (workStarted && startTime) {
      interval = setInterval(() => {
        const start = new Date(startTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workStarted, startTime]);

  // Progress animation when work starts
  useEffect(() => {
    if (workStarted) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [workStarted]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Both of these used to dispatch a SYNC reducer, so the booking never moved
  // server-side: the provider's clock started and the job "completed" purely in
  // local Redux. The booking only ever reached COMPLETED because the customer
  // could confirm it from their own app. These now go through the real
  // ARRIVED → IN_PROGRESS → COMPLETED transitions.
  const handleStartWork = () => {
    Alert.alert(
      'Start Work',
      'Are you ready to begin working on this job?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Start Now',
          onPress: async () => {
            const result = await dispatch(startWorkAsync(jobId) as any);
            if (result?.meta?.requestStatus === 'rejected') {
              Alert.alert(
                'Could not start work',
                (result.payload as string) || 'Please check your connection and try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleCompleteWork = () => {
    Alert.alert(
      'Complete Job',
      'Are you sure you want to mark this job as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Complete',
          style: 'default',
          onPress: async () => {
            const result = await dispatch(completeWorkAsync(jobId) as any);
            if (result?.meta?.requestStatus === 'rejected') {
              Alert.alert(
                'Could not complete job',
                (result.payload as string) || 'Please check your connection and try again.'
              );
              return; // stay on the job — it is still in progress on the server
            }

            // Prefer the server's duration over a locally-derived one, so the
            // provider and the customer are quoted the same number.
            const actualDuration =
              result.payload?.duration ??
              (startTime
                ? Math.round((Date.now() - new Date(startTime).getTime()) / 60000)
                : null);

            dispatch(setAwaitingApprovalData({
              jobId,
              serviceType,
              customerName,
              address,
              actualDuration,
              estimatedPrice,
            }));

            navigation.navigate('AwaitingApproval');
          },
        },
      ]
    );
  };

  // In-app call and chat, matching the job-detail screen. These two used to
  // hand off to the phone's dialer and to SMS, which meant the provider's
  // busiest screen — the one they are on while actually doing the job — was the
  // one place the in-app conversation was unreachable. It also put the exchange
  // outside the booking, where neither side could refer back to it.
  //
  // `jobId` is the booking id, and a booking is what the realtime service
  // authorizes a room against.
  const handleCallCustomer = () => {
    if (!jobId) return;
    navigation.navigate('ProviderCallScreen', {
      bookingId: jobId,
      customerName,
    });
  };

  const handleMessageCustomer = () => {
    if (!jobId) return;
    navigation.navigate('ProviderJobChat', {
      bookingId: jobId,
      customerName,
    });
  };

  const openDirections = () => {
    if (coordinates) {
      const { latitude, longitude } = coordinates;
      const url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  if (!jobId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['33%', '66%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {workStarted ? 'Work In Progress' : 'Ready to Start'}
          </Text>
          <Text style={styles.headerSubtitle}>{serviceType}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Animated.View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: workStarted ? HS.accent : C.warning,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <Text style={styles.statusTitle}>
              {workStarted ? 'Working' : 'Arrived at Location'}
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Icon name="clock-outline" size={24} color={C.inkMuted} />
            <Text style={styles.timerText}>
              {workStarted ? formatTime(elapsedTime) : '00:00:00'}
            </Text>
            <Text style={styles.timerLabel}>
              {workStarted ? 'Time Elapsed' : 'Ready to Begin'}
            </Text>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: workStarted ? progressWidth : '33%' },
                ]}
              />
            </View>
            <View style={styles.progressSteps}>
              <View style={styles.progressStep}>
                <View style={[styles.stepDot, styles.stepCompleted]}>
                  <Icon name="check" size={12} color={C.surface} />
                </View>
                <Text style={styles.stepLabel}>Arrived</Text>
              </View>
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.stepDot,
                    workStarted ? styles.stepActive : styles.stepPending,
                  ]}
                >
                  {workStarted && <Icon name="wrench" size={12} color={C.surface} />}
                </View>
                <Text style={[styles.stepLabel, workStarted && styles.stepLabelActive]}>
                  Working
                </Text>
              </View>
              <View style={styles.progressStep}>
                <View style={[styles.stepDot, styles.stepPending]} />
                <Text style={styles.stepLabel}>Complete</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Job Details Card */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Job Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBg, { backgroundColor: HS.accentSoft }]}>
                <Icon name="wrench" size={18} color={HS.accent} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailTitle}>{serviceType}</Text>
                <Text style={styles.detailSubtitle}>{category}</Text>
              </View>
            </View>
            {estimatedPrice > 0 && (
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>
                  Rs {estimatedPrice.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer Card */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Customer</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerAvatarContainer}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerInitial}>
                  {customerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerNameText}>{customerName}</Text>
              <Text style={styles.customerPhoneText}>{customerPhone}</Text>
            </View>
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationIconBg}>
              <Icon name="map-marker" size={18} color={C.warning} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationAddress}>{address}</Text>
              <Text style={styles.locationCity}>{city}</Text>
            </View>
          </View>
        </View>

        {/* Special Instructions */}
        {specialInstructions && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Special Instructions</Text>
            <View style={styles.instructionsCard}>
              <Icon name="information-outline" size={18} color={C.warning} />
              <Text style={styles.instructionsText}>
                {specialInstructions}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleCallCustomer}>
              <View style={[styles.quickActionIcon, { backgroundColor: HS.accentSoft }]}>
                <Icon name="phone" size={20} color={HS.accent} />
              </View>
              <Text style={styles.quickActionLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleMessageCustomer}>
              <View style={[styles.quickActionIcon, { backgroundColor: C.infoSoft }]}>
                <Icon name="message-text-outline" size={20} color={C.info} />
              </View>
              <Text style={styles.quickActionLabel}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={openDirections}>
              <View style={[styles.quickActionIcon, { backgroundColor: C.warningSoft }]}>
                <Icon name="navigation-variant" size={20} color={C.warning} />
              </View>
              <Text style={styles.quickActionLabel}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        {!workStarted ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartWork}
            activeOpacity={0.85}
          >
            <Icon name="play-circle" size={22} color={C.surface} />
            <Text style={styles.startButtonText}>Start Work</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteWork}
            activeOpacity={0.85}
          >
            <Icon name="check-circle" size={22} color={C.surface} />
            <Text style={styles.completeButtonText}>Mark as Complete</Text>
          </TouchableOpacity>
        )}
      </View>
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
    ...T.subhead,
    color: C.inkMuted,
    fontFamily: F.medium,
  },
  header: {
    backgroundColor: C.surface,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    ...T.heading,
    fontFamily: F.bold,
    color: C.ink,
  },
  headerSubtitle: {
    ...T.body,
    fontFamily: F.regular,
    color: C.inkMuted,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusTitle: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: C.ink,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.lineSoft,
  },
  timerText: {
    ...T.display,
    fontFamily: F.bold,
    color: C.ink,
    marginTop: 8,
  },
  timerLabel: {
    ...T.label,
    fontFamily: F.regular,
    color: C.inkMuted,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: C.line,
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: HS.accent,
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCompleted: {
    backgroundColor: HS.accent,
  },
  stepActive: {
    backgroundColor: HS.accent,
  },
  stepPending: {
    backgroundColor: C.line,
  },
  stepLabel: {
    ...T.caption,
    fontFamily: F.medium,
    color: C.inkFaint,
  },
  stepLabelActive: {
    color: HS.accent,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    ...T.label,
    fontFamily: F.semibold,
    color: C.inkMuted,
    marginBottom: 10,
    marginLeft: 2,
  },
  detailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    marginLeft: 12,
    flex: 1,
  },
  detailTitle: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.ink,
  },
  detailSubtitle: {
    ...T.label,
    fontFamily: F.regular,
    color: C.inkMuted,
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: HS.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    ...T.body,
    fontFamily: F.semibold,
    color: HS.accent,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  customerAvatarContainer: {
    position: 'relative',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: HS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    ...T.heading,
    fontFamily: F.bold,
    color: HS.accent,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerNameText: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: C.ink,
  },
  customerPhoneText: {
    ...T.label,
    fontFamily: F.regular,
    color: C.inkMuted,
    marginTop: 2,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.ink,
  },
  locationCity: {
    ...T.caption,
    fontFamily: F.regular,
    color: C.inkMuted,
    marginTop: 2,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.warningSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.warningSoft,
  },
  instructionsText: {
    flex: 1,
    marginLeft: 10,
    ...T.body,
    fontFamily: F.regular,
    color: C.warning,
    lineHeight: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    ...T.caption,
    fontFamily: F.medium,
    color: C.inkMuted,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: C.lineSoft,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.warning,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: C.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: C.surface,
    marginLeft: 8,
  },
  completeButton: {
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
  completeButtonText: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: C.surface,
    marginLeft: 8,
  },
});

export default JobInProgressScreen;