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
  ScrollView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import {
  initializePayment,
  processPayment,
  setSelectedMethod,
  setCustomAmount,
  toggleCustomAmount,
  resetPaymentState,
  selectPaymentAmount,
  selectFormattedPaymentAmount,
  selectIsPaymentValid,
  selectPaymentSummaryData,
  selectEnabledPaymentMethods,
  PaymentMethodType,
  ServiceCategory,
} from './paymentSlice';
import { RootState, AppDispatch } from '../../../../store/store';

const { width, height } = Dimensions.get('window');

// Service type configurations - matching ServiceStatusScreen
const SERVICE_CONFIG: Record<
  ServiceCategory,
  {
    gradient: [string, string];
    lightGradient: [string, string];
    accentColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    successGradient: [string, string];
  }
> = {
  electricians: {
    gradient: ['#F59E0B', '#D97706'],
    lightGradient: ['#FEF3C7', '#FDE68A'],
    accentColor: '#F59E0B',
    icon: 'flash',
    successGradient: ['#FEF3C7', '#FDE68A'],
  },
  plumbers: {
    gradient: ['#3B82F6', '#2563EB'],
    lightGradient: ['#DBEAFE', '#BFDBFE'],
    accentColor: '#3B82F6',
    icon: 'water',
    successGradient: ['#DBEAFE', '#BFDBFE'],
  },
  'ac-repairers': {
    gradient: ['#06B6D4', '#0891B2'],
    lightGradient: ['#CFFAFE', '#A5F3FC'],
    accentColor: '#06B6D4',
    icon: 'snow',
    successGradient: ['#CFFAFE', '#A5F3FC'],
  },
};

type PaymentRouteParams = {
  bookingId: string;
  category?: ServiceCategory;
  paymentData?: {
    providerName: string;
    providerPhone: string;
    service: string;
    invoiceId: string;
    description: string;
    amount: number;
    suggestedAmount: number;
  };
};

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: PaymentRouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { bookingId = 'default', category = 'ac-repairers', paymentData } = route.params || {};

  // Redux state
  const recipient = useSelector((state: RootState) => state.payment?.recipient);
  const paymentDetails = useSelector((state: RootState) => state.payment?.paymentDetails);
  const selectedMethod = useSelector((state: RootState) => state.payment?.selectedMethod);
  const useCustomAmount = useSelector((state: RootState) => state.payment?.useCustomAmount);
  const isLoading = useSelector((state: RootState) => state.payment?.isLoading);
  const isProcessing = useSelector((state: RootState) => state.payment?.isProcessing);
  const paymentStatus = useSelector((state: RootState) => state.payment?.paymentStatus);
  const error = useSelector((state: RootState) => state.payment?.error);
  const paymentAmount = useSelector(selectPaymentAmount);
  const formattedAmount = useSelector(selectFormattedPaymentAmount);
  const isPaymentValid = useSelector(selectIsPaymentValid);
  const paymentMethods = useSelector(selectEnabledPaymentMethods);

  // Local state
  const [manualAmount, setManualAmount] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const methodAnimations = useRef(
    paymentMethods.map(() => new Animated.Value(0))
  ).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  const serviceConfig = SERVICE_CONFIG[category] || SERVICE_CONFIG['ac-repairers'];

  // Initialize payment data
  useFocusEffect(
    useCallback(() => {
      setIsReady(false);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.95);

      const amount = paymentData?.amount || paymentData?.suggestedAmount;

      dispatch(
        initializePayment({
          bookingId,
          category,
          amount,
        })
      );

      return () => {
        // Cleanup if needed
      };
    }, [bookingId, category, paymentData, dispatch])
  );

  // Run entrance animations when data is loaded
  useEffect(() => {
    if (!isLoading && recipient && !isReady) {
      setIsReady(true);
      runEntranceAnimations();
    }
  }, [isLoading, recipient, isReady]);

  // Handle payment status changes
  useEffect(() => {
    if (paymentStatus === 'completed') {
      // @ts-ignore
      navigation.navigate('PaymentSuccess', {
        category,
        bookingId,
        amount: formattedAmount,
        method: selectedMethod,
        recipient: recipient?.name,
        transactionId: 'TXN-' + Date.now(),
      });
    }
  }, [paymentStatus]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Payment Error', error, [{ text: 'OK' }]);
    }
  }, [error]);

  const runEntranceAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered animation for payment methods
    methodAnimations.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.spring(anim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim, scaleAnim, methodAnimations]);

  const handleBackPress = useCallback(() => {
    if (isProcessing) {
      Alert.alert(
        'Payment in Progress',
        'Please wait for the payment to complete.',
        [{ text: 'OK' }]
      );
      return;
    }
    dispatch(resetPaymentState());
    navigation.goBack();
  }, [dispatch, navigation, isProcessing]);

  const handleMethodSelect = useCallback(
    (methodId: PaymentMethodType) => {
      dispatch(setSelectedMethod(methodId));

      // Pulse animation on button
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.02,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [dispatch, buttonPulse]
  );

  const handleAmountChange = useCallback(
    (text: string) => {
      const numericValue = text.replace(/[^0-9]/g, '');
      setManualAmount(numericValue);
      dispatch(setCustomAmount(parseInt(numericValue) || null));
    },
    [dispatch]
  );

  const handleToggleCustomAmount = useCallback(() => {
    dispatch(toggleCustomAmount());
    if (useCustomAmount) {
      setManualAmount('');
    }
  }, [dispatch, useCustomAmount]);

  const handleUseOriginalAmount = useCallback(() => {
    if (paymentDetails?.originalAmount) {
      const amount = paymentDetails.originalAmount.toString();
      setManualAmount(amount);
      dispatch(setCustomAmount(paymentDetails.originalAmount));
    }
  }, [dispatch, paymentDetails]);

  const handlePayment = useCallback(() => {
    if (!isPaymentValid) {
      if (!selectedMethod) {
        Alert.alert('Payment Method Required', 'Please select a payment method.');
      } else if (paymentAmount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      }
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay ${formattedAmount} via ${
        paymentMethods.find((m) => m.id === selectedMethod)?.name
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            dispatch(
              processPayment({
                bookingId,
                amount: paymentAmount,
                method: selectedMethod,
              })
            );
          },
        },
      ]
    );
  }, [
    isPaymentValid,
    selectedMethod,
    paymentAmount,
    formattedAmount,
    paymentMethods,
    bookingId,
    dispatch,
  ]);

  // Loading state
  if (isLoading || !recipient) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <LinearGradient colors={serviceConfig.gradient} style={styles.loadingIcon}>
            <Ionicons name="card-outline" size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.loadingText}>Preparing payment...</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[
                  styles.loadingDot,
                  { backgroundColor: serviceConfig.accentColor },
                ]}
              />
            ))}
          </View>
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
            disabled={isProcessing}
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Payment</Text>

          <View
            style={[
              styles.securityBadge,
              { backgroundColor: `${serviceConfig.accentColor}15` },
            ]}
          >
            <Ionicons name="shield-checkmark" size={16} color={serviceConfig.accentColor} />
            <Text style={[styles.securityText, { color: serviceConfig.accentColor }]}>
              Secure
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderRecipientCard = () => (
    <Animated.View
      style={[
        styles.recipientCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={serviceConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />

      <View style={styles.recipientContent}>
        <View style={styles.recipientHeader}>
          <View style={styles.recipientImageContainer}>
            <LinearGradient colors={serviceConfig.lightGradient} style={styles.imageRing}>
              <Image source={{ uri: recipient.image }} style={styles.recipientImage} />
            </LinearGradient>
            <View
              style={[styles.serviceIconBadge, { backgroundColor: serviceConfig.accentColor }]}
            >
              <Ionicons name={serviceConfig.icon} size={12} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{recipient.name}</Text>
            <Text style={styles.recipientService}>{recipient.service}</Text>
            <View style={styles.phoneContainer}>
              <Ionicons name="call-outline" size={12} color="#64748B" />
              <Text style={styles.recipientPhone}>{recipient.phone}</Text>
            </View>
          </View>

          <View style={[styles.verifiedBadge, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderPaymentSummary = () => (
    <Animated.View
      style={[
        styles.summaryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.summaryHeader}>
        <View style={styles.sectionTitleContainer}>
          <LinearGradient colors={serviceConfig.lightGradient} style={styles.sectionIconBg}>
            <Ionicons name="receipt-outline" size={18} color={serviceConfig.accentColor} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
        </View>
        <View style={[styles.invoiceBadge, { backgroundColor: `${serviceConfig.accentColor}15` }]}>
          <Text style={[styles.invoiceText, { color: serviceConfig.accentColor }]}>
            #{paymentDetails?.invoiceId}
          </Text>
        </View>
      </View>

      <View style={styles.descriptionBox}>
        <Text style={styles.descriptionText}>{paymentDetails?.description}</Text>
      </View>

      <View style={styles.summaryRows}>
        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="person-outline" size={16} color="#64748B" />
            <Text style={styles.rowLabel}>Recipient</Text>
          </View>
          <Text style={styles.rowValue}>{recipient.name}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="construct-outline" size={16} color="#64748B" />
            <Text style={styles.rowLabel}>Service</Text>
          </View>
          <Text style={styles.rowValue}>{recipient.service}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-outline" size={16} color="#64748B" />
            <Text style={styles.rowLabel}>Due Date</Text>
          </View>
          <Text style={[styles.rowValue, { color: '#F59E0B' }]}>
            {paymentDetails?.dueDate}
          </Text>
        </View>
      </View>

      {/* Amount Section */}
      <View style={styles.amountSection}>
        <View style={styles.amountHeader}>
          <View style={styles.rowLeft}>
            <Ionicons name="cash-outline" size={16} color={serviceConfig.accentColor} />
            <Text style={[styles.rowLabel, { color: serviceConfig.accentColor, fontWeight: '600' }]}>
              Payment Amount
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.customToggle, { borderColor: serviceConfig.accentColor }]}
            onPress={handleToggleCustomAmount}
            activeOpacity={0.8}
          >
            <Ionicons
              name={useCustomAmount ? 'checkmark-circle' : 'create-outline'}
              size={14}
              color={serviceConfig.accentColor}
            />
            <Text style={[styles.toggleText, { color: serviceConfig.accentColor }]}>
              {useCustomAmount ? 'Custom' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {useCustomAmount ? (
          <View style={styles.customAmountContainer}>
            <View
              style={[
                styles.amountInputWrapper,
                { borderColor: serviceConfig.accentColor },
              ]}
            >
              <Text style={[styles.currencySymbol, { color: serviceConfig.accentColor }]}>
                Rs
              </Text>
              <TextInput
                style={styles.amountInput}
                value={manualAmount}
                onChangeText={handleAmountChange}
                placeholder="Enter amount"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.useOriginalButton, { borderColor: serviceConfig.accentColor }]}
              onPress={handleUseOriginalAmount}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={14} color={serviceConfig.accentColor} />
              <Text style={[styles.useOriginalText, { color: serviceConfig.accentColor }]}>
                Use original: Rs {paymentDetails?.originalAmount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.originalAmount}>
            Rs {paymentDetails?.originalAmount.toLocaleString()}
          </Text>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={[styles.totalValue, { color: serviceConfig.accentColor }]}>
            {formattedAmount}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderPaymentMethods = () => (
    <Animated.View
      style={[
        styles.methodsSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.methodsHeader}>
        <LinearGradient colors={serviceConfig.lightGradient} style={styles.sectionIconBg}>
          <Ionicons name="wallet-outline" size={18} color={serviceConfig.accentColor} />
        </LinearGradient>
        <View>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.sectionSubtitle}>Choose how you'd like to pay</Text>
        </View>
      </View>

      <View style={styles.methodsList}>
        {paymentMethods.map((method, index) => {
          const isSelected = selectedMethod === method.id;
          const animValue = methodAnimations[index] || new Animated.Value(1);

          return (
            <Animated.View
              key={method.id}
              style={{
                opacity: animValue,
                transform: [
                  {
                    translateY: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: isSelected ? method.bgColor : '#FFFFFF',
                    borderColor: isSelected ? method.color : '#E2E8F0',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handleMethodSelect(method.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.methodIcon,
                    { backgroundColor: isSelected ? method.color : method.bgColor },
                  ]}
                >
                  <Ionicons
                    name={method.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={isSelected ? '#FFFFFF' : method.color}
                  />
                </View>

                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, { color: isSelected ? method.color : '#1E293B' }]}>
                    {method.name}
                  </Text>
                  <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected ? method.color : '#CBD5E1',
                      backgroundColor: isSelected ? method.color : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>

                {isSelected && (
                  <View
                    style={[styles.selectedIndicator, { backgroundColor: method.color }]}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderPayButton = () => (
    <Animated.View
      style={[
        styles.payButtonContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: buttonPulse }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.payButton, !isPaymentValid && styles.payButtonDisabled]}
        onPress={handlePayment}
        activeOpacity={0.9}
        disabled={!isPaymentValid || isProcessing}
      >
        <LinearGradient
          colors={
            isPaymentValid && !isProcessing
              ? serviceConfig.gradient
              : ['#CBD5E1', '#94A3B8']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.payButtonGradient}
        >
          {isProcessing ? (
            <>
              <Animated.View style={styles.processingIcon}>
                <MaterialCommunityIcons name="loading" size={20} color="#FFFFFF" />
              </Animated.View>
              <Text style={styles.payButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>
                Pay {formattedAmount}
                {selectedMethod &&
                  ` via ${paymentMethods.find((m) => m.id === selectedMethod)?.name}`}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.securityNote}>
        <Ionicons name="lock-closed" size={14} color="#94A3B8" />
        <Text style={styles.securityNoteText}>
          Secured with end-to-end encryption
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderHeader()}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderRecipientCard()}
          {renderPaymentSummary()}
          {renderPaymentMethods()}
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPayButton()}
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
    paddingHorizontal: 32,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
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
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  recipientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardAccent: {
    height: 4,
  },
  recipientContent: {
    padding: 16,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientImageContainer: {
    position: 'relative',
  },
  imageRing: {
    width: 56,
    height: 56,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  serviceIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  recipientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  recipientService: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipientPhone: {
    fontSize: 12,
    color: '#94A3B8',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  invoiceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  invoiceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
  summaryRows: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
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
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  customAmountContainer: {
    marginBottom: 12,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    paddingVertical: 12,
  },
  useOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  useOriginalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  originalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  methodsSection: {
    marginBottom: 16,
  },
  methodsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodsList: {
    gap: 12,
  },
  methodCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  payButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  processingIcon: {
    marginRight: 4,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});