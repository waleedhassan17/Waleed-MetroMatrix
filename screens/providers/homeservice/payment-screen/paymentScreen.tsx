import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../../../store/store';
import {
  requestPayment,
  receiveOnlinePayment,
  receiveCashPayment,
  updateCharges,
} from './paymentRequestSlice';
import { setJobCompletionData } from '../job-completion/jobCompletionSlice';

type RootStackParamList = {
  JobCompletion: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PaymentRequestScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  
  // Use paymentRequest slice
  const {
    jobId,
    serviceType,
    customerName,
    serviceCharge,
    totalAmount,
    paymentRequested,
    paymentReceived,
    paymentMethod,
    transactionId,
  } = useSelector((state: RootState) => state.paymentRequest);
  
  // Get duration from jobInProgress slice
  const { actualDuration } = useSelector((state: RootState) => state.jobInProgress);

  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [materialCost, setMaterialCost] = useState('0');
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for waiting state
  useEffect(() => {
    if (isWaitingPayment) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return () => pulse.stop();
    }
  }, [isWaitingPayment]);

  // Simulate online payment received
  useEffect(() => {
    if (isWaitingPayment) {
      const timeout = setTimeout(() => {
        handlePaymentReceived('online');
      }, Math.random() * 5000 + 3000);
      return () => clearTimeout(timeout);
    }
  }, [isWaitingPayment]);

  const calculateTotal = (): number => {
    const base = serviceCharge || 0;
    const additional = parseFloat(additionalCharges) || 0;
    const materials = parseFloat(materialCost) || 0;
    return base + additional + materials;
  };

  const handleUpdateCharges = () => {
    dispatch(
      updateCharges({
        additionalCharges: parseFloat(additionalCharges) || 0,
        materialCost: parseFloat(materialCost) || 0,
      })
    );
  };

  const handleRequestPayment = () => {
    handleUpdateCharges();
    dispatch(requestPayment());
    setIsWaitingPayment(true);
  };

  const handleCashPayment = () => {
    Alert.alert(
      'Cash Payment',
      `Confirm that you received Rs ${calculateTotal().toLocaleString()} in cash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            handleUpdateCharges();
            dispatch(receiveCashPayment());
            
            // Set data for job completion slice
            dispatch(setJobCompletionData({
              jobId,
              serviceType,
              customerName,
              actualDuration,
              earnings: calculateTotal(),
              paymentMethod: 'cash',
              transactionId: `CASH-${Date.now()}`,
            }));
            
            navigation.navigate('JobCompletion');
          },
        },
      ]
    );
  };

  const handlePaymentReceived = (method: 'online' | 'cash') => {
    if (method === 'online') {
      const txnId = `TXN${Date.now()}`;
      dispatch(receiveOnlinePayment(txnId));
      
      // Set data for job completion slice
      dispatch(setJobCompletionData({
        jobId,
        serviceType,
        customerName,
        actualDuration,
        earnings: calculateTotal(),
        paymentMethod: 'online',
        transactionId: txnId,
      }));
    }
    navigation.navigate('JobCompletion');
  };

  // Demo function to simulate payment
  const simulatePayment = () => {
    handlePaymentReceived('online');
  };

  if (!jobId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Request</Text>
        <Text style={styles.headerSubtitle}>
          {isWaitingPayment ? 'Waiting for payment...' : 'Review and request payment'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Invoice Card */}
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceIconBg}>
              <Icon name="receipt" size={22} color="#10B981" />
            </View>
            <View style={styles.invoiceHeaderInfo}>
              <Text style={styles.invoiceTitle}>Invoice</Text>
              <Text style={styles.invoiceNumber}>#{jobId.slice(-8).toUpperCase()}</Text>
            </View>
          </View>

          {/* Service Info */}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceType}</Text>
            <Text style={styles.customerName}>For: {customerName}</Text>
          </View>

          {/* Divider */}
          <View style={styles.invoiceDivider} />

          {/* Breakdown */}
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>

            {/* Service Charge */}
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Service Charge</Text>
              <Text style={styles.breakdownValue}>
                Rs {serviceCharge.toLocaleString()}
              </Text>
            </View>

            {/* Additional Charges */}
            <View style={styles.editableRow}>
              <Text style={styles.breakdownLabel}>Additional Charges</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>Rs</Text>
                <TextInput
                  style={styles.amountInput}
                  value={additionalCharges}
                  onChangeText={setAdditionalCharges}
                  keyboardType="numeric"
                  placeholder="0"
                  editable={!isWaitingPayment}
                />
              </View>
            </View>

            {/* Material Cost */}
            <View style={styles.editableRow}>
              <Text style={styles.breakdownLabel}>Material Cost</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>Rs</Text>
                <TextInput
                  style={styles.amountInput}
                  value={materialCost}
                  onChangeText={setMaterialCost}
                  keyboardType="numeric"
                  placeholder="0"
                  editable={!isWaitingPayment}
                />
              </View>
            </View>
          </View>

          {/* Total Divider */}
          <View style={styles.totalDivider} />

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>Rs {calculateTotal().toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Methods Info */}
        {!isWaitingPayment && (
          <View style={styles.paymentMethodsCard}>
            <Text style={styles.paymentMethodsTitle}>Payment Options</Text>
            <View style={styles.paymentMethodsRow}>
              <View style={styles.paymentMethodItem}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="credit-card-outline" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.paymentMethodText}>Online Payment</Text>
              </View>
              <View style={styles.paymentMethodItem}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="cash" size={22} color="#10B981" />
                </View>
                <Text style={styles.paymentMethodText}>Cash Payment</Text>
              </View>
            </View>
          </View>
        )}

        {/* Waiting State Card */}
        {isWaitingPayment && (
          <Animated.View
            style={[
              styles.waitingCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.waitingIconBg}>
              <Icon name="clock-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.waitingTitle}>Payment Requested</Text>
            <Text style={styles.waitingSubtitle}>
              The customer has been notified. Waiting for payment...
            </Text>
            <View style={styles.waitingDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotActive]} />
            </View>
          </Animated.View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        {!isWaitingPayment ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cashButton}
              onPress={handleCashPayment}
              activeOpacity={0.85}
            >
              <Icon name="cash" size={20} color="#10B981" />
              <Text style={styles.cashButtonText}>Paid in Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.requestButton}
              onPress={handleRequestPayment}
              activeOpacity={0.85}
            >
              <Icon name="send" size={20} color="#FFFFFF" />
              <Text style={styles.requestButtonText}>Request Payment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={simulatePayment}
          >
            <Text style={styles.simulateButtonText}>Simulate Payment Received</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  invoiceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceHeaderInfo: {
    marginLeft: 14,
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  invoiceNumber: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  serviceInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  customerName: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  breakdownSection: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  editableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputPrefix: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    minWidth: 60,
    textAlign: 'right',
    padding: 0,
  },
  totalDivider: {
    height: 2,
    backgroundColor: '#10B981',
    marginBottom: 16,
    borderRadius: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  paymentMethodsCard: {
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
  paymentMethodsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 14,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentMethodText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  waitingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  waitingIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  waitingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#92400E',
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#B45309',
    textAlign: 'center',
    marginBottom: 16,
  },
  waitingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: '#F59E0B',
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cashButton: {
    flex: 0.45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cashButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginLeft: 8,
  },
  requestButton: {
    flex: 0.55,
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
  requestButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  simulateButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  simulateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});

export default PaymentRequestScreen;