import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  fetchServiceStatus,
  markServiceCompleted,
  setPaymentAmount,
  setServiceStatus,
  clearServiceStatusState,
  selectIsPaymentReady,
  selectPaymentSummary,
  selectServiceProgress,
} from './serviceSlice';
import { RootState, AppDispatch } from '../../../../store/store';

const { width } = Dimensions.get('window');

// Service type configurations - matching BookingScreen
const SERVICE_CONFIG: Record<string, {
  gradient: string[];
  lightGradient: string[];
  accentColor: string;
  icon: string;
}> = {
  electricians: {
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
  },
  plumbers: {
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
  },
  'ac-repairers': {
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
  },
};

type ServiceStatusRouteParams = {
  bookingId: string;
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
};

export default function ServiceStatusScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ServiceStatusRouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { bookingId, category = 'ac-repairers' } = route.params || {};

  // Redux state
  const provider = useSelector((state: RootState) => state.serviceStatus?.provider);
  const serviceDetails = useSelector((state: RootState) => state.serviceStatus?.serviceDetails);
  const payment = useSelector((state: RootState) => state.serviceStatus?.payment);
  const serviceStatus = useSelector((state: RootState) => state.serviceStatus?.serviceStatus);
  const isLoading = useSelector((state: RootState) => state.serviceStatus?.isLoading);
  const isSubmitting = useSelector((state: RootState) => state.serviceStatus?.isSubmitting);
  const isPaymentReady = useSelector(selectIsPaymentReady);
  const paymentSummary = useSelector(selectPaymentSummary);
  const progressSteps = useSelector(selectServiceProgress);

  // Local state
  const [isReady, setIsReady] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const paymentSlideAnim = useRef(new Animated.Value(50)).current;
  const loadingFadeAnim = useRef(new Animated.Value(1)).current;

  const serviceConfig = SERVICE_CONFIG[category] || SERVICE_CONFIG['ac-repairers'];

  // Callbacks
  const handleBackPress = useCallback(() => {
    if (serviceStatus === 'completed' && !showPaymentSection) {
      Alert.alert(
        'Leave without payment?',
        'The service has been completed. Would you like to proceed to payment first?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              dispatch(clearServiceStatusState());
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      dispatch(clearServiceStatusState());
      navigation.goBack();
    }
  }, [dispatch, navigation, serviceStatus, showPaymentSection]);

  const handleServiceCompleted = useCallback(() => {
    dispatch(markServiceCompleted({ bookingId: bookingId || 'default' }));
    
    // Animate payment section
    setTimeout(() => {
      setShowPaymentSection(true);
      Animated.spring(paymentSlideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 500);
  }, [dispatch, bookingId, paymentSlideAnim]);

  const handleAmountChange = useCallback((text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setManualAmount(numericValue);
    dispatch(setPaymentAmount(parseInt(numericValue) || 0));
  }, [dispatch]);

  const handleUseSuggestedAmount = useCallback(() => {
    if (serviceDetails?.suggestedAmount) {
      const amount = serviceDetails.suggestedAmount.toString();
      setManualAmount(amount);
      dispatch(setPaymentAmount(serviceDetails.suggestedAmount));
    }
  }, [dispatch, serviceDetails]);

  const handleProceedToPayment = useCallback(() => {
    if (!payment?.amount || payment.amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    // @ts-ignore
    navigation.navigate('PaymentScreen', {
      category,
      bookingId,
      paymentData: paymentSummary,
    });
  }, [navigation, category, bookingId, payment, paymentSummary]);

  const handleRateProvider = useCallback(() => {
    // @ts-ignore
    navigation.navigate('ReviewRating', { category, bookingId });
  }, [navigation, category, bookingId]);

  const handleContactProvider = useCallback(() => {
    Alert.alert(
      'Contact Provider',
      'Choose how you want to contact the provider',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => console.log('Call provider') },
        { text: 'Message', onPress: () => console.log('Message provider') },
      ]
    );
  }, []);

  // Run entrance animations
  const runEntranceAnimations = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    scaleAnim.setValue(0.95);

    Animated.parallel([
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
    ]).start();

    // Pulse animation
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (serviceStatus === 'checking') {
          pulseAnimation();
        }
      });
    };
    pulseAnimation();
  }, [fadeAnim, slideAnim, scaleAnim, pulseAnim, serviceStatus]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      // Reset all states and animations on focus
      setIsReady(false);
      setShowPaymentSection(false);
      loadingFadeAnim.setValue(1);
      paymentSlideAnim.setValue(50);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.95);

      // Clear previous state to force re-fetch
      dispatch(clearServiceStatusState());

      const validCategory = ['electricians', 'plumbers', 'ac-repairers'].includes(category)
        ? category
        : 'ac-repairers';

      // Small delay to ensure state is cleared before fetching
      const timer = setTimeout(() => {
        dispatch(fetchServiceStatus({
          bookingId: bookingId || 'default',
          category: validCategory as 'electricians' | 'plumbers' | 'ac-repairers',
        }));
      }, 50);

      return () => {
        clearTimeout(timer);
        // Cleanup on blur - no need to reset animations here since we do it on focus
      };
    }, [bookingId, category, dispatch, fadeAnim, slideAnim, scaleAnim, loadingFadeAnim, paymentSlideAnim])
  );

  // Run animations when data is loaded
  useEffect(() => {
    if (!isLoading && provider && !isReady) {
      const timer = setTimeout(() => {
        setIsReady(true);
        runEntranceAnimations();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, provider, isReady, runEntranceAnimations]);

  // Loading state
  if (isLoading || !provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: loadingFadeAnim }}>
            <LinearGradient
              colors={serviceConfig.gradient as [string, string]}
              style={styles.loadingIcon}
            >
              <Ionicons name={serviceConfig.icon as any} size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.loadingText}>Loading service status...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

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

          <Text style={styles.headerTitle}>Service Status</Text>

          <TouchableOpacity
            style={[styles.helpButton, { backgroundColor: `${serviceConfig.accentColor}15` }]}
            onPress={handleContactProvider}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={20} color={serviceConfig.accentColor} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderProviderCard = () => (
    <Animated.View
      style={[
        styles.providerCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={serviceConfig.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardTopAccent}
      />

      <View style={styles.providerContent}>
        <Animated.View
          style={[
            styles.providerImageContainer,
            serviceStatus === 'checking' && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <LinearGradient
            colors={serviceConfig.gradient as [string, string]}
            style={styles.providerImageRing}
          >
            <View style={styles.providerImageInner}>
              <Image source={{ uri: provider.image }} style={styles.providerImage} />
            </View>
          </LinearGradient>
          <View style={[styles.statusIndicator, { backgroundColor: '#10B981' }]}>
            <Ionicons name="construct" size={12} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Text style={styles.providerName}>{provider.name}</Text>
        <Text style={styles.providerSpecialty}>{provider.specialty}</Text>

        <View style={styles.providerBadges}>
          <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.badge}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.badgeText}>{provider.rating}</Text>
          </LinearGradient>
          <View style={[styles.badge, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
            <Feather name="award" size={12} color={serviceConfig.accentColor} />
            <Text style={[styles.badgeText, { color: serviceConfig.accentColor }]}>
              {provider.experience}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="time-outline" size={12} color="#10B981" />
            <Text style={[styles.badgeText, { color: '#10B981' }]}>
              Started {provider.startTime}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderProgressSection = () => (
    <Animated.View
      style={[
        styles.progressSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={serviceConfig.lightGradient as [string, string]}
          style={styles.sectionIconBg}
        >
          <Ionicons name="git-branch-outline" size={20} color={serviceConfig.accentColor} />
        </LinearGradient>
        <Text style={styles.sectionTitle}>Service Progress</Text>
      </View>

      <View style={styles.progressContainer}>
        {progressSteps?.map((step, index) => (
          <View key={step.key} style={styles.progressStep}>
            <View style={styles.stepIndicatorContainer}>
              <View
                style={[
                  styles.stepDot,
                  step.completed
                    ? { backgroundColor: serviceConfig.accentColor }
                    : { backgroundColor: '#E2E8F0' },
                ]}
              >
                {step.completed && (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                )}
              </View>
              {index < progressSteps.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    step.completed
                      ? { backgroundColor: serviceConfig.accentColor }
                      : { backgroundColor: '#E2E8F0' },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                step.completed && { color: '#1E293B', fontWeight: '600' },
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderStatusCheck = () => {
    if (serviceStatus !== 'checking') return null;

    return (
      <Animated.View
        style={[
          styles.statusCheckCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.statusCheckIconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <LinearGradient
            colors={serviceConfig.lightGradient as [string, string]}
            style={styles.statusCheckIcon}
          >
            <Ionicons name="checkmark-done-outline" size={32} color={serviceConfig.accentColor} />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.statusCheckTitle}>Service Status Check</Text>
        <Text style={styles.statusCheckText}>
          Has {provider.name} completed your {provider.service.toLowerCase()}?
          Tap below when the work is finished.
        </Text>

        <TouchableOpacity
          style={styles.completedButton}
          onPress={handleServiceCompleted}
          activeOpacity={0.8}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={serviceConfig.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completedButtonGradient}
          >
            <View style={styles.completedButtonIcon}>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.completedButtonTextContainer}>
              <Text style={styles.completedButtonText}>
                {isSubmitting ? 'Processing...' : 'Mark as Completed'}
              </Text>
              <Text style={styles.completedButtonSubtext}>Service finished successfully</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPaymentSection = () => {
    if (!showPaymentSection || serviceStatus !== 'completed') return null;

    return (
      <Animated.View
        style={[
          styles.paymentSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: paymentSlideAnim }],
          },
        ]}
      >
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={['#D1FAE5', '#A7F3D0']}
              style={styles.successIcon}
            >
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>🎉 Service Completed!</Text>
          <Text style={styles.successText}>
            {provider.name} has successfully completed your {provider.service.toLowerCase()}.
            You can now proceed with the payment.
          </Text>
        </View>

        {/* Payment Summary Card */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentCardHeader}>
            <Text style={styles.paymentCardTitle}>Payment Summary</Text>
            <View style={[styles.invoiceBadge, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
              <Text style={[styles.invoiceText, { color: serviceConfig.accentColor }]}>
                #{serviceDetails?.invoiceId}
              </Text>
            </View>
          </View>

          <Text style={styles.serviceDescription}>
            {serviceDetails?.description}
          </Text>

          <View style={styles.paymentDetails}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <Ionicons name="person-outline" size={16} color="#64748B" />
                <Text style={styles.paymentLabel}>Recipient</Text>
              </View>
              <View style={styles.paymentRowRight}>
                <Text style={styles.paymentValue}>{provider.name}</Text>
                <Text style={styles.paymentSubvalue}>{provider.phone}</Text>
              </View>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <Ionicons name="construct-outline" size={16} color="#64748B" />
                <Text style={styles.paymentLabel}>Service</Text>
              </View>
              <Text style={styles.paymentValue}>{provider.service}</Text>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <Ionicons name="time-outline" size={16} color="#64748B" />
                <Text style={styles.paymentLabel}>Duration</Text>
              </View>
              <Text style={styles.paymentValue}>{serviceDetails?.estimatedDuration}</Text>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={styles.paymentLabel}>Completed</Text>
              </View>
              <Text style={[styles.paymentValue, { color: '#10B981' }]}>
                {serviceDetails?.completedAt || 'Just now'}
              </Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <View style={styles.amountHeader}>
              <View style={styles.paymentRowLeft}>
                <Ionicons name="cash-outline" size={16} color={serviceConfig.accentColor} />
                <Text style={[styles.paymentLabel, { color: serviceConfig.accentColor, fontWeight: '600' }]}>
                  Payment Amount
                </Text>
              </View>
              <View style={[styles.requiredBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>

            <View style={styles.amountInputContainer}>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencySymbol}>Rs</Text>
                <TextInput
                  style={styles.amountInput}
                  value={manualAmount}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
              </View>
              <Text style={styles.amountHint}>
                Enter the final amount agreed with {provider.name}
              </Text>

              <TouchableOpacity
                style={[styles.suggestedButton, { borderColor: serviceConfig.accentColor }]}
                onPress={handleUseSuggestedAmount}
                activeOpacity={0.8}
              >
                <Ionicons name="bulb-outline" size={16} color={serviceConfig.accentColor} />
                <Text style={[styles.suggestedButtonText, { color: serviceConfig.accentColor }]}>
                  Use suggested: Rs {serviceDetails?.suggestedAmount?.toLocaleString()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={[styles.totalValue, { color: serviceConfig.accentColor }]}>
                Rs {(payment?.amount || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.paymentButton,
              (!payment?.amount || payment.amount <= 0) && styles.paymentButtonDisabled,
            ]}
            onPress={handleProceedToPayment}
            activeOpacity={0.8}
            disabled={!payment?.amount || payment.amount <= 0}
          >
            <LinearGradient
              colors={
                payment?.amount && payment.amount > 0
                  ? (serviceConfig.gradient as [string, string])
                  : ['#CBD5E1', '#94A3B8']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.paymentButtonGradient}
            >
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
              <Text style={styles.paymentButtonText}>Proceed to Payment</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rateButton, { backgroundColor: `${serviceConfig.accentColor}15` }]}
            onPress={handleRateProvider}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={18} color={serviceConfig.accentColor} />
            <Text style={[styles.rateButtonText, { color: serviceConfig.accentColor }]}>
              Rate Provider
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderHelpSection = () => (
    <Animated.View
      style={[
        styles.helpSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.helpCard} activeOpacity={0.8}>
        <View style={[styles.helpIconContainer, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
          <Ionicons name="help-circle-outline" size={22} color={serviceConfig.accentColor} />
        </View>
        <View style={styles.helpContent}>
          <Text style={styles.helpTitle}>Need Assistance?</Text>
          <Text style={styles.helpText}>
            Our support team is available 24/7 to help with any questions.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderHeader()}
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderProviderCard()}
          {renderProgressSection()}
          {renderStatusCheck()}
          {renderPaymentSection()}
          {renderHelpSection()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  header: {
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: (StatusBar.currentHeight || 0) + 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  cardTopAccent: {
    height: 4,
  },
  providerContent: {
    padding: 24,
    alignItems: 'center',
  },
  providerImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  providerImageRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
  },
  providerImageInner: {
    flex: 1,
    borderRadius: 41,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  providerImage: {
    width: '100%',
    height: '100%',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  providerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  providerSpecialty: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  providerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  progressSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: 28,
    width: width / 4 - 20,
    height: 2,
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  statusCheckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  statusCheckIconContainer: {
    marginBottom: 16,
  },
  statusCheckIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCheckTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  statusCheckText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  completedButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  completedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  completedButtonIcon: {
    marginRight: 12,
  },
  completedButtonTextContainer: {
    flex: 1,
  },
  completedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  paymentSection: {
    marginBottom: 20,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  invoiceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  invoiceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentDetails: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentRowRight: {
    alignItems: 'flex-end',
  },
  paymentLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  paymentSubvalue: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  amountSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  amountInputContainer: {
    marginBottom: 16,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    paddingVertical: 12,
  },
  amountHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  suggestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  suggestedButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  actionButtons: {
    gap: 12,
  },
  paymentButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  paymentButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpSection: {
    marginTop: 4,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  helpIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpContent: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  helpText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
});