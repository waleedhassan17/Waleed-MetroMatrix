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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../../store/store';
import { startWork, completeWork } from './jobInProgressSlice';
import { setAwaitingApprovalData } from '../awaiting-screen/awaitingScreenSlice';

type RootStackParamList = {
  AwaitingApproval: undefined;
  NavigationMap: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const JobInProgressScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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

  // Pulse animation for status indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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

  const handleStartWork = () => {
    Alert.alert(
      'Start Work',
      'Are you ready to begin working on this job?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Start Now',
          onPress: () => dispatch(startWork()),
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
          onPress: () => {
            dispatch(completeWork());
            
            // Calculate actual duration
            const actualDuration = startTime
              ? Math.round((Date.now() - new Date(startTime).getTime()) / 60000)
              : null;
            
            // Set data for awaiting approval slice
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

  const handleCallCustomer = () => {
    if (customerPhone && customerPhone !== 'N/A') {
      Linking.openURL(`tel:${customerPhone}`);
    }
  };

  const handleMessageCustomer = () => {
    if (customerPhone && customerPhone !== 'N/A') {
      Linking.openURL(`sms:${customerPhone}`);
    }
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
    <View style={styles.container}>
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
                  backgroundColor: workStarted ? '#10B981' : '#F59E0B',
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
            <Icon name="clock-outline" size={24} color="#6B7280" />
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
                  <Icon name="check" size={12} color="#FFFFFF" />
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
                  {workStarted && <Icon name="wrench" size={12} color="#FFFFFF" />}
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
              <View style={[styles.detailIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="wrench" size={18} color="#10B981" />
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
              <Icon name="map-marker" size={18} color="#F59E0B" />
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
              <Icon name="information-outline" size={18} color="#F59E0B" />
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
              <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="phone" size={20} color="#10B981" />
              </View>
              <Text style={styles.quickActionLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleMessageCustomer}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="message-text-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionLabel}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={openDirections}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="navigation-variant" size={20} color="#F59E0B" />
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
            <Icon name="play-circle" size={22} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Work</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteWork}
            activeOpacity={0.85}
          >
            <Icon name="check-circle" size={22} color="#FFFFFF" />
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  timerText: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 8,
  },
  timerLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
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
    backgroundColor: '#10B981',
  },
  stepActive: {
    backgroundColor: '#10B981',
  },
  stepPending: {
    backgroundColor: '#E5E7EB',
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  stepLabelActive: {
    color: '#10B981',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 10,
    marginLeft: 2,
  },
  detailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
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
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  detailSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
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
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerNameText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  customerPhoneText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  locationCity: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
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
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  completeButton: {
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
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default JobInProgressScreen;