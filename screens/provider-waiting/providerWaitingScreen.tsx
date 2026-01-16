import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  selectProviderType,
  selectProviderSubType,
} from '../provider-selection/providerSlice';
import { checkProviderApprovalStatus } from '../../networks/authcalls/providerProfile';
import { retrieveData } from '../../utils/storage_utils/storageUtils';

const isAndroid = Platform.OS === 'android';

type RootStackParamList = {
  RoleSelection: undefined;
  ProviderSignIn: undefined;
};

const PROVIDER_ICONS: Record<string, any> = {
  doctor: 'stethoscope',
  electrician: 'lightning-bolt',
  plumber: 'pipe-wrench',
  ac_repairer: 'air-conditioner',
  vendor: 'store',
};

const PROVIDER_COLORS: Record<string, string> = {
  doctor: '#ec4899',
  electrician: '#f59e0b',
  plumber: '#3b82f6',
  ac_repairer: '#06b6d4',
  vendor: '#8b5cf6',
};

export default function ProviderWaitingScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  
  const providerType = useAppSelector(selectProviderType);
  const providerSubType = useAppSelector(selectProviderSubType);

  // State
  const [isChecking, setIsChecking] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  // Animation values
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  // Check approval status on mount and every 30 seconds
  useEffect(() => {
    checkApprovalStatus();
    
    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      checkApprovalStatus();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const checkApprovalStatus = async () => {
    try {
      setIsChecking(true);
      
      // Get email from storage
      const email = await retrieveData('tempEmail');
      if (!email) {
        console.log('No email found in storage');
        return;
      }

      console.log('🔍 Checking approval status for:', email);
      
      const response = await checkProviderApprovalStatus(email);
      
      console.log('✅ Approval status response:', response);
      console.log('📊 Status:', response.status);
      console.log('📊 Email Verified:', response.provider?.emailVerified);
      console.log('📊 Admin Verified:', response.provider?.adminVerified);
      
      setLastCheckTime(new Date());
      
      // Check adminVerified flag (v64 API)
      const isApproved = response.provider?.adminVerified === 'active' || response.status === 'approved';
      const isRejected = response.provider?.adminVerified === 'inactive' || response.status === 'rejected';
      
      if (isApproved) {
        setApprovalStatus('approved');
        
        // Show success alert and navigate to sign in
        Alert.alert(
          '🎉 Account Approved!',
          'Your provider account has been approved by our admin team. You can now sign in and start using the platform.',
          [
            {
              text: 'Sign In',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'ProviderSignIn' }],
                });
              }
            }
          ]
        );
      } else if (isRejected) {
        setApprovalStatus('rejected');
        
        // Show rejection alert
        Alert.alert(
          '❌ Application Rejected',
          response.rejectionReason || 'Unfortunately, your application was not approved. Please contact support for more details.',
          [{ text: 'OK' }]
        );
      } else {
        // pending_approval or other status
        setApprovalStatus('pending');
      }
      
    } catch (error: any) {
      console.error('❌ Error checking approval status:', error);
      // Don't show error to user - just log it
      // They can manually refresh if needed
    } finally {
      setIsChecking(false);
    }
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getProviderDisplay = () => {
    if (providerType === 'home_service' && providerSubType) {
      const subTypeMap: Record<string, string> = {
        'electrician': 'Electrician',
        'plumber': 'Plumber',
        'ac_repairer': 'AC Repairer'
      };
      return subTypeMap[providerSubType] || 'Home Service Provider';
    }
    
    if (providerType === 'doctor') return 'Doctor';
    if (providerType === 'vendor') return 'Vendor';
    
    return 'Provider';
  };

  const getProviderIcon = () => {
    if (providerType === 'home_service' && providerSubType) {
      return PROVIDER_ICONS[providerSubType] || 'construct';
    }
    return PROVIDER_ICONS[providerType || 'vendor'] || 'briefcase';
  };

  const getProviderColor = () => {
    if (providerType === 'home_service' && providerSubType) {
      return PROVIDER_COLORS[providerSubType] || '#f59e0b';
    }
    return PROVIDER_COLORS[providerType || 'vendor'] || '#6366f1';
  };

  const handleBackToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ProviderSignIn' }],
    });
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Please email us at support@metromatrix.com for any inquiries.',
      [{ text: 'OK' }]
    );
  };

  const handleRefreshStatus = () => {
    checkApprovalStatus();
  };

  const primaryColor = getProviderColor();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={isAndroid ? '#FFFFFF' : 'transparent'}
        translucent={!isAndroid}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Animated Icon */}
          <View style={styles.iconSection}>
            <Animated.View
              style={[
                styles.iconContainer,
                { 
                  backgroundColor: `${primaryColor}15`,
                  borderColor: `${primaryColor}30`,
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <MaterialCommunityIcons 
                name={getProviderIcon()} 
                size={80} 
                color={primaryColor} 
              />
            </Animated.View>

            {/* Animated Circles */}
            <Animated.View
              style={[
                styles.rotatingCircle,
                styles.circle1,
                { 
                  borderColor: `${primaryColor}20`,
                  transform: [{ rotate: rotateInterpolate }]
                }
              ]}
            />
            <Animated.View
              style={[
                styles.rotatingCircle,
                styles.circle2,
                { 
                  borderColor: `${primaryColor}10`,
                  transform: [{ 
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['360deg', '0deg'],
                    })
                  }]
                }
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Email Verified! ✓</Text>
            <Text style={styles.subtitle}>Waiting for Admin Approval</Text>
            
            {/* Provider Badge */}
            <View style={[styles.providerBadge, { backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}40` }]}>
              <Text style={[styles.providerBadgeText, { color: primaryColor }]}>
                {getProviderDisplay()}
              </Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="time-outline" size={32} color={primaryColor} />
            </View>
            <Text style={styles.infoTitle}>Your Application is Under Review</Text>
            <Text style={styles.infoText}>
              Thank you for verifying your email! Our admin team is currently reviewing your application and documents.
            </Text>
            <Text style={styles.infoText}>
              You will receive a notification once your account has been approved.
            </Text>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>Application Progress</Text>
            
            {/* Step 1 - Completed */}
            <View style={styles.timelineStep}>
              <View style={[styles.stepIcon, styles.stepCompleted]}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitleCompleted}>Account Created</Text>
                <Text style={styles.stepDescription}>Your account has been successfully created</Text>
              </View>
            </View>

            {/* Step 2 - Completed */}
            <View style={styles.timelineStep}>
              <View style={[styles.stepIcon, styles.stepCompleted]}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitleCompleted}>Email Verified</Text>
                <Text style={styles.stepDescription}>Your email has been verified</Text>
              </View>
            </View>

            {/* Step 3 - In Progress */}
            <View style={styles.timelineStep}>
              <View style={[styles.stepIcon, styles.stepInProgress, { backgroundColor: primaryColor }]}>
                <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitleInProgress, { color: primaryColor }]}>Admin Review</Text>
                <Text style={styles.stepDescription}>Waiting for admin approval</Text>
              </View>
            </View>

            {/* Step 4 - Pending */}
            <View style={styles.timelineStep}>
              <View style={[styles.stepIcon, styles.stepPending]}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitlePending}>Account Activation</Text>
                <Text style={styles.stepDescription}>You'll be able to sign in once approved</Text>
              </View>
            </View>
          </View>

          {/* What happens next */}
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>What Happens Next?</Text>
            
            <View style={styles.nextStep}>
              <Ionicons name="document-text-outline" size={20} color={primaryColor} />
              <Text style={styles.nextStepText}>
                Admin reviews your profile and documents
              </Text>
            </View>

            <View style={styles.nextStep}>
              <Ionicons name="mail-outline" size={20} color={primaryColor} />
              <Text style={styles.nextStepText}>
                You'll receive an email notification
              </Text>
            </View>

            <View style={styles.nextStep}>
              <Ionicons name="log-in-outline" size={20} color={primaryColor} />
              <Text style={styles.nextStepText}>
                Once approved, you can sign in and start using the platform
              </Text>
            </View>
          </View>

          {/* Estimated Time */}
          <View style={styles.estimateCard}>
            <Ionicons name="information-circle-outline" size={24} color="#6366f1" />
            <View style={styles.estimateTextContainer}>
              <Text style={styles.estimateText}>
                Approval typically takes 24-48 hours
              </Text>
              {lastCheckTime && (
                <Text style={styles.lastCheckText}>
                  Last checked: {lastCheckTime.toLocaleTimeString()}
                </Text>
              )}
            </View>
          </View>

          {/* Refresh Status Button */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshStatus}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={primaryColor} />
            )}
            <Text style={[styles.refreshButtonText, { color: primaryColor }]}>
              {isChecking ? 'Checking Status...' : 'Refresh Status'}
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {/* Back to Login */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: primaryColor }]}
              onPress={handleBackToLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>

            {/* Contact Support */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleContactSupport}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={20} color="#6366f1" style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  iconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
    height: 180,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  rotatingCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 1000,
    borderStyle: 'dashed',
  },
  circle1: {
    width: 200,
    height: 200,
    top: '50%',
    left: '50%',
    marginLeft: -100,
    marginTop: -100,
  },
  circle2: {
    width: 260,
    height: 260,
    top: '50%',
    left: '50%',
    marginLeft: -130,
    marginTop: -130,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  providerBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 2,
  },
  providerBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  timelineContainer: {
    marginBottom: 24,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepInProgress: {
    backgroundColor: '#F59E0B',
  },
  stepPending: {
    backgroundColor: '#E5E7EB',
  },
  stepContent: {
    flex: 1,
  },
  stepTitleCompleted: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  stepTitleInProgress: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepTitlePending: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  nextStepsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    marginLeft: 12,
    lineHeight: 20,
  },
  estimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  estimateTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  estimateText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 4,
  },
  lastCheckText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '400',
  },
  refreshButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 0,
  },
});