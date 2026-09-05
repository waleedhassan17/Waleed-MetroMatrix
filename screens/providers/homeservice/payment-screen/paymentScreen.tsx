import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';
import { AppBar, Screen } from '../../../../components/ui';

type RootStackParamList = {
  JobCompletion: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PaymentRequestScreen: React.FC = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);

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
              <Icon name="receipt" size={22} color={colors.success} />
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
                <View style={[styles.paymentMethodIcon, { backgroundColor: colors.infoSoft }]}>
                  <Icon name="credit-card-outline" size={22} color={colors.info} />
                </View>
                <Text style={styles.paymentMethodText}>Online Payment</Text>
              </View>
              <View style={styles.paymentMethodItem}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: colors.successSoft }]}>
                  <Icon name="cash" size={22} color={colors.success} />
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
              <Icon name="clock-outline" size={32} color={colors.warning} />
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
              <Icon name="cash" size={20} color={colors.success} />
              <Text style={styles.cashButtonText}>Paid in Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.requestButton}
              onPress={handleRequestPayment}
              activeOpacity={0.85}
            >
              <Icon name="send" size={20} color={colors.surface} />
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
              <Icon name="cash" size={20} color={colors.success} />
              <Text style={styles.cashButtonText}>Paid in Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.requestButton}
              onPress={handleRequestPayment}
              activeOpacity={0.85}
            >
              <Icon name="send" size={20} color={colors.surface} />
              <Text style={styles.requestButtonText}>Send Reminder</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...T.subhead,
    color: c.inkMuted,
    fontFamily: F.medium,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  invoiceCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: c.ink,
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
    backgroundColor: c.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceHeaderInfo: {
    marginLeft: 14,
  },
  invoiceTitle: {
    ...T.subhead,
    fontFamily: F.bold,
    color: c.ink,
  },
  invoiceNumber: {
    ...T.label,
    fontFamily: F.regular,
    color: c.inkMuted,
    marginTop: 2,
  },
  serviceInfo: {
    backgroundColor: c.surfaceSunken,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  serviceName: {
    ...T.subhead,
    fontFamily: F.semibold,
    color: c.ink,
  },
  customerName: {
    ...T.label,
    fontFamily: F.regular,
    color: c.inkMuted,
    marginTop: 4,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: c.line,
    marginBottom: 16,
  },
  breakdownSection: {
    marginBottom: 16,
  },
  breakdownTitle: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.inkMuted,
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
    color: c.inkMuted,
  },
  breakdownValue: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.ink,
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
    backgroundColor: c.surfaceSunken,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: c.line,
  },
  inputPrefix: {
    ...T.body,
    fontFamily: F.medium,
    color: c.inkMuted,
    marginRight: 4,
  },
  amountInput: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.ink,
    minWidth: 60,
    textAlign: 'right',
    padding: 0,
  },
  totalDivider: {
    height: 2,
    backgroundColor: c.success,
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
    color: c.ink,
  },
  totalValue: {
    ...T.heading,
    fontFamily: F.bold,
    color: c.success,
  },
  paymentMethodsCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentMethodsTitle: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.inkMuted,
    marginBottom: 14,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: c.surfaceSunken,
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
    color: c.inkMuted,
  },
  waitingCard: {
    backgroundColor: c.warningSoft,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.warningSoft,
  },
  waitingIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  waitingTitle: {
    ...T.subhead,
    fontFamily: F.bold,
    color: c.warning,
    marginBottom: 8,
  },
  waitingSubtitle: {
    ...T.body,
    fontFamily: F.regular,
    color: c.warning,
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
    backgroundColor: c.line,
  },
  dotActive: {
    backgroundColor: c.warning,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: c.surfaceSunken,
    shadowColor: c.ink,
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
    backgroundColor: c.successSoft,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: c.successSoft,
  },
  cashButtonText: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.success,
    marginLeft: 8,
  },
  requestButton: {
    flex: 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.success,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: c.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestButtonText: {
    ...T.body,
    fontFamily: F.semibold,
    color: c.inkInverse,
    marginLeft: 8,
  },
});

export default PaymentRequestScreen;