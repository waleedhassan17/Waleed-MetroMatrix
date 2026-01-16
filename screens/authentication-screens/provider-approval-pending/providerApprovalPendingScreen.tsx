import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  setEmail,
  checkProviderApprovalAsync,
  selectApprovalStatus,
  selectIsChecking,
  selectIsPending,
  selectIsApproved,
  selectIsRejected,
  selectApprovalError,
  selectRejectionReason,
} from './providerApprovalSlice';
import { retrieveData } from '../../../utils/storage_utils/storageUtils';

interface RouteParams {
  email?: string;
}

const ProviderApprovalPendingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const params = route.params as RouteParams;

  const approvalStatus = useAppSelector(selectApprovalStatus);
  const isChecking = useAppSelector(selectIsChecking);
  const isPending = useAppSelector(selectIsPending);
  const isApproved = useAppSelector(selectIsApproved);
  const isRejected = useAppSelector(selectIsRejected);
  const error = useAppSelector(selectApprovalError);
  const rejectionReason = useAppSelector(selectRejectionReason);

  const [countdown, setCountdown] = useState<number>(10);
  const [totalChecks, setTotalChecks] = useState<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with provider email
  useEffect(() => {
    const initializeEmail = async () => {
      let email = params?.email;
      if (!email) {
        // Try to get from form data
        const formDataStr = await retrieveData('personalInfoFormData');
        if (formDataStr) {
          try {
            const formData = JSON.parse(formDataStr);
            email = formData.email;
          } catch (e) {
            console.error('Failed to parse form data:', e);
          }
        }
      }
      if (email) {
        dispatch(setEmail(email));
      }
    };
    
    initializeEmail();
  }, [params?.email, dispatch]);

  // Start polling for approval status
  useEffect(() => {
    const startPolling = async () => {
      // Get email for checking
      let email = params?.email;
      if (!email) {
        const formDataStr = await retrieveData('personalInfoFormData');
        if (formDataStr) {
          try {
            const formData = JSON.parse(formDataStr);
            email = formData.email;
          } catch (e) {
            console.error('Failed to parse form data:', e);
          }
        }
      }
      
      if (!email) {
        console.error('No email found for approval check');
        return;
      }
      
      // Initial check
      dispatch(checkProviderApprovalAsync({ email }));
      setTotalChecks(1);

      // Poll every 10 seconds
      pollIntervalRef.current = setInterval(() => {
        setTotalChecks(prev => prev + 1);
        dispatch(checkProviderApprovalAsync({ email: email! }));
      }, 10000);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [params?.email, dispatch]);

  // Handle approval status changes
  useEffect(() => {
    if (isApproved) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      Alert.alert(
        '🎉 Approved!',
        'Your profile has been approved by the admin. Welcome to MetroMatrix!',
        [
          {
            text: 'Go to Home',
            onPress: () => {
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'ProviderHome' }],
              });
            },
          },
        ]
      );
    } else if (isRejected) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      const rejectMessage = rejectionReason 
        ? `Your profile has been rejected.\n\nReason: ${rejectionReason}`
        : 'Your profile has been rejected. Please contact support for more information.';

      Alert.alert(
        '❌ Rejected',
        rejectMessage,
        [
          {
            text: 'Contact Support',
            onPress: () => {
              Alert.alert(
                'Support Contact',
                'Email us at support@metromatrix.com'
              );
            },
          },
          {
            text: 'OK',
            onPress: () => {
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'RoleSelection' }],
              });
            },
          },
        ]
      );
    }
  }, [isApproved, isRejected, navigation, rejectionReason]);

  // Handle errors
  useEffect(() => {
    if (error && !isPending) {
      Alert.alert('Error', error, [
        { text: 'OK' }
      ]);
    }
  }, [error, isPending]);

  // Countdown timer
  useEffect(() => {
    if (!isApproved && !isRejected) {
      const timer = setTimeout(() => {
        if (countdown > 0) {
          setCountdown(countdown - 1);
        } else {
          setCountdown(10);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown, isApproved, isRejected]);

  // Pulse animation
  useEffect(() => {
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
  }, []);

  const handleManualCheck = async () => {
    let email = params?.email;
    if (!email) {
      const formDataStr = await retrieveData('personalInfoFormData');
      if (formDataStr) {
        try {
          const formData = JSON.parse(formDataStr);
          email = formData.email;
        } catch (e) {
          console.error('Failed to parse form data:', e);
        }
      }
    }
    if (email) {
      dispatch(checkProviderApprovalAsync({ email }));
      setCountdown(10);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Email us at support@metromatrix.com for any inquiries about your application status.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Application Under Review</Text>
          <Text style={styles.headerSubtitle}>
            Your profile is being reviewed by our admin team
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Animated Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <MaterialCommunityIcons 
              name="clipboard-check" 
              size={80} 
              color="#00D4FF" 
            />
          </Animated.View>

          {/* Status Text */}
          <Text style={styles.statusText}>
            {isChecking ? 'Checking status...' : 'Waiting for approval'}
          </Text>

          {/* Checking Indicator */}
          {isChecking && (
            <View style={styles.checkingIndicator}>
              <ActivityIndicator size="small" color="#00D4FF" />
              <Text style={styles.checkingText}>Checking status...</Text>
            </View>
          )}

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statValue}>
                {isPending ? '⏳ Pending' : isApproved ? '✅ Approved' : '❌ Rejected'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Checks Made</Text>
              <Text style={styles.statValue}>{totalChecks}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Next Check</Text>
              <Text style={styles.statValue}>{countdown}s</Text>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons 
                name="information" 
                size={24} 
                color="#00D4FF" 
              />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>What happens next?</Text>
                <Text style={styles.infoDescription}>
                  Our admin team will review your profile and documents. You'll receive an email once your status is updated.
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <MaterialCommunityIcons 
                name="clock" 
                size={24} 
                color="#FFB800" 
              />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Expected Timeline</Text>
                <Text style={styles.infoDescription}>
                  Approval typically takes 24-48 hours. We'll keep you updated throughout the process.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleManualCheck}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name="refresh" 
                    size={20} 
                    color="#000000" 
                  />
                  <Text style={styles.primaryButtonText}>Check Now</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleContactSupport}
            >
              <MaterialCommunityIcons 
                name="phone" 
                size={20} 
                color="#00D4FF" 
              />
              <Text style={styles.secondaryButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          {/* Timeline Info */}
          <View style={styles.timelineSection}>
            <Text style={styles.timelineTitle}>Review Timeline</Text>
            
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#00D4FF' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Application Submitted</Text>
                <Text style={styles.timelineTime}>Just now</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#FFB800' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Under Review</Text>
                <Text style={styles.timelineTime}>In progress...</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#CCCCCC' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Approval Decision</Text>
                <Text style={styles.timelineTime}>Pending</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00D4FF15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#00D4FF30',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  checkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingVertical: 10,
  },
  checkingText: {
    marginLeft: 10,
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4FF',
  },
  infoSection: {
    marginBottom: 30,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  infoDescription: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 18,
  },
  buttonSection: {
    marginBottom: 30,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#00D4FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#00D4FF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4FF',
  },
  timelineSection: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 15,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  timelineTime: {
    fontSize: 12,
    color: '#888888',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#333333',
    marginLeft: 5,
    marginBottom: 5,
  },
});

export default ProviderApprovalPendingScreen;
