import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootState } from '../../../../store/store';
import {
  requestPaymentAsync,
  receiveOnlinePaymentAsync,
  receiveCashPaymentAsync,
  updateCharges,
} from './paymentRequestSlice';
import { setJobCompletionData } from '../job-completion/jobCompletionSlice';
import { useRoomSocket } from '../../../../hooks/useRoomSocket';
import { checkJobApprovalStatus } from '../../../../networks/serviceProviders/jobNetwork';
import { C, F, T } from '../../../../constants/theme';
import { AppBar, Screen } from '../../../../components/ui';

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

  // ---------------------------------------------------------------------
  // ADVANCING ON A REAL PAYMENT.
  //
  // This screen used to advance on `setTimeout(Math.random()*5000 + 3000)`, so
  // the provider was told the customer had paid 3–8 seconds after asking,
  // whether or not any money moved. Payment is server state, so it is read from
  // the server, by two independent routes because either alone can miss:
  //
  //   - the `payment_received` room event, which the backend now emits when a
  //     wallet payment succeeds. Instant, but only if the socket is up.
  //   - a poll of /approval-status, which is the backstop for a dropped socket,
  //     a backgrounded app, or a payment made before this screen mounted.
  //
  // Whichever confirms first wins; both assert the same server truth.
  // ---------------------------------------------------------------------
  const { payment: livePayment } = useRoomSocket(jobId || undefined, 'homeservice');

  const confirmedRef = useRef(false);
  const handleOnlinePaymentConfirmed = useCallback(
    (serverTransactionId?: string | null) => {
      // The socket event and a poll tick can land together; only advance once.
      if (confirmedRef.current) return;
      confirmedRef.current = true;
      finishOnline(serverTransactionId);
    },
    // finishOnline is defined below and is stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Route 1 — the live event. useRoomSocket normalises `payment_received` to
  // status 'paid' and carries the server's transaction id with it.
  useEffect(() => {
    if (livePayment?.status === 'paid') {
      handleOnlinePaymentConfirmed(livePayment.transactionId);
    }
  }, [livePayment, handleOnlinePaymentConfirmed]);

  // Route 2 — poll while waiting. Cleared on unmount and once confirmed, so a
  // backgrounded screen cannot leave a timer running against a finished job.
  useEffect(() => {
    if (!isWaitingPayment || !jobId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await checkJobApprovalStatus(jobId);
        if (!cancelled && res.success && res.data?.paid) {
          handleOnlinePaymentConfirmed(null);
        }
      } catch {
        // A failed poll is not evidence of anything — keep waiting.
      }
    };

    const id = setInterval(tick, 6000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isWaitingPayment, jobId, handleOnlinePaymentConfirmed]);

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

  // Ask the customer to pay. `requestPaymentAsync` reads jobId and totalAmount
  // off the slice, so the charges must be committed BEFORE it is dispatched or
  // the customer is billed the pre-edit figure.
  const handleRequestPayment = async () => {
    handleUpdateCharges();
    const result = await dispatch(requestPaymentAsync() as any);
    if (result?.meta?.requestStatus === 'rejected') {
      Alert.alert(
        'Could not request payment',
        (result.payload as string) || 'Please check your connection and try again.'
      );
      return; // stay put — the customer was never asked
    }
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
          onPress: async () => {
            handleUpdateCharges();
            // The server settles the cash payment and issues the transaction
            // id. This used to mint `CASH-${Date.now()}` locally and navigate
            // regardless, so a failed confirmation still looked like success
            // and the provider's earnings never moved.
            const result = await dispatch(receiveCashPaymentAsync() as any);
            if (result?.meta?.requestStatus === 'rejected') {
              Alert.alert(
                'Could not confirm cash payment',
                (result.payload as string) || 'Please check your connection and try again.'
              );
              return;
            }

            dispatch(setJobCompletionData({
              jobId,
              serviceType,
              customerName,
              actualDuration,
              earnings: calculateTotal(),
              paymentMethod: 'cash',
              transactionId: result.payload as string,
            }));

            navigation.navigate('JobCompletion');
          },
        },
      ]
    );
  };

  // Called only once the SERVER says the online payment landed.
  const finishOnline = async (serverTransactionId?: string | null) => {
    // Records the provider-side confirmation and returns the id we hand on.
    // If the id came with the socket event, pass it through; otherwise the
    // thunk still confirms and we fall back to whatever the slice holds.
    let txnId = serverTransactionId || null;
    if (txnId) {
      await dispatch(receiveOnlinePaymentAsync(txnId) as any);
    }

    dispatch(setJobCompletionData({
      jobId,
      serviceType,
      customerName,
      actualDuration,
      earnings: calculateTotal(),
      paymentMethod: 'online',
      transactionId: txnId,
    }));

    setIsWaitingPayment(false);
    navigation.navigate('JobCompletion');
  };

  if (!jobId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  return (
    <Screen>
      <AppBar
        title="Payment Request"
        subtitle={isWaitingPayment ? 'Waiting for payment…' : 'Review and request payment'}
        onBack={() => navigation.goBack()}
      />

      {/* The keyboard avoider sits INSIDE the screen now. It used to be the
          root, which is why this screen had no safe-area handling at all and
          its header sat under the notch. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

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
              <Icon name="receipt" size={22} color={C.success} />
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
                <View style={[styles.paymentMethodIcon, { backgroundColor: C.infoSoft }]}>
                  <Icon name="credit-card-outline" size={22} color={C.info} />
                </View>
                <Text style={styles.paymentMethodText}>Online Payment</Text>
              </View>
              <View style={styles.paymentMethodItem}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: C.successSoft }]}>
                  <Icon name="cash" size={22} color={C.success} />
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
              <Icon name="clock-outline" size={32} color={C.warning} />
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
              <Icon name="cash" size={20} color={C.success} />
              <Text style={styles.cashButtonText}>Paid in Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.requestButton}
              onPress={handleRequestPayment}
              activeOpacity={0.85}
            >
              <Icon name="send" size={20} color={C.surface} />
              <Text style={styles.requestButtonText}>Request Payment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Waiting on the customer. This branch used to hold ONLY a "Simulate
          // Payment Received" button, so the sole way forward was to fake it.
          // The screen now advances by itself when the payment really lands
          // (socket event, or the poll above); these are the two things a
          // provider legitimately still needs while waiting.
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cashButton}
              onPress={handleCashPayment}
              activeOpacity={0.85}
            >
              <Icon name="cash" size={20} color={C.success} />
              <Text style={styles.cashButtonText}>Paid in Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.requestButton}
              onPress={handleRequestPayment}
              activeOpacity={0.85}
            >
              <Icon name="send" size={20} color={C.surface} />
              <Text style={styles.requestButtonText}>Send Reminder</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  invoiceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceHeaderInfo: {
    marginLeft: 14,
  },
  invoiceTitle: {
    ...T.subhead,
    fontFamily: F.bold,
    color: C.ink,
  },
  invoiceNumber: {
    ...T.label,
    fontFamily: F.regular,
    color: C.inkMuted,
    marginTop: 2,
  },
  serviceInfo: {
    backgroundColor: C.surfaceSunken,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  serviceName: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: C.ink,
  },
  customerName: {
    ...T.label,
    fontFamily: F.regular,
    color: C.inkMuted,
    marginTop: 4,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: C.line,
    marginBottom: 16,
  },
  breakdownSection: {
    marginBottom: 16,
  },
  breakdownTitle: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.inkMuted,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownLabel: {
    ...T.body,
    fontFamily: F.regular,
    color: C.inkMuted,
  },
  breakdownValue: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.ink,
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
    backgroundColor: C.surfaceSunken,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  inputPrefix: {
    ...T.body,
    fontFamily: F.medium,
    color: C.inkMuted,
    marginRight: 4,
  },
  amountInput: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.ink,
    minWidth: 60,
    textAlign: 'right',
    padding: 0,
  },
  totalDivider: {
    height: 2,
    backgroundColor: C.success,
    marginBottom: 16,
    borderRadius: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: C.ink,
  },
  totalValue: {
    ...T.heading,
    fontFamily: F.bold,
    color: C.success,
  },
  paymentMethodsCard: {
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
  paymentMethodsTitle: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.inkMuted,
    marginBottom: 14,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.surfaceSunken,
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
    ...T.caption,
    fontFamily: F.medium,
    color: C.inkMuted,
  },
  waitingCard: {
    backgroundColor: C.warningSoft,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.warningSoft,
  },
  waitingIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  waitingTitle: {
    ...T.subhead,
    fontFamily: F.bold,
    color: C.warning,
    marginBottom: 8,
  },
  waitingSubtitle: {
    ...T.body,
    fontFamily: F.regular,
    color: C.warning,
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
    backgroundColor: C.line,
  },
  dotActive: {
    backgroundColor: C.warning,
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
    borderTopColor: C.surfaceSunken,
    shadowColor: C.ink,
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
    backgroundColor: C.successSoft,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: C.successSoft,
  },
  cashButtonText: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.success,
    marginLeft: 8,
  },
  requestButton: {
    flex: 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.success,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestButtonText: {
    ...T.body,
    fontFamily: F.semibold,
    color: C.surface,
    marginLeft: 8,
  },
});

export default PaymentRequestScreen;