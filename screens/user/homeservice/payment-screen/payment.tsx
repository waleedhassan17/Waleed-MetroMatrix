// ============================================================================
// Payment
//
// The one screen where a mistake costs real money, so it is the quietest one
// in the module: a summary you can check, methods legible by shape and weight
// rather than by colour alone, and one confident CTA that names the amount.
//
// What went: eight gradients, the staggered per-method entrance, the pulse on
// the pay button, and six native Alerts — including the confirmation dialog,
// which is now a sheet in the product's own voice, and the validation alerts,
// which are inline because a disabled button with a reason beats an OS popup
// after the fact.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
  ActionSheet,
  AppBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  Skeleton,
} from '../../../../components/ui';
import { categoryAccent } from '../../../../constants/HomeServiceTheme';
import { GUTTER, PROSE_WIDTH, R, S, SECTION, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import { useRoomSocket } from '../../../../hooks/useRoomSocket';
import { fetchWallet, selectBalance } from '../../../../services/wallet';
import { AppDispatch, RootState } from '../../../../store/store';
import { formatAmount } from '../../../../utils/homeservice/format';
import {
  initializePayment,
  PaymentMethodType,
  processPayment,
  resetPaymentState,
  selectEnabledPaymentMethods,
  selectFormattedPaymentAmount,
  selectIsPaymentValid,
  selectPaymentAmount,
  ServiceCategory,
  markPaymentConfirmed,
  reopenPaymentChoice,
  setSelectedMethod,
} from './paymentSlice';

// The wallet is the only method that debits a balance; cash is settled
// in person. This used to list 'jazzcash' and 'easypaisa', which were the
// same wallet under two other brands' names.
const WALLET_BACKED_METHODS: PaymentMethodType[] = ['wallet'];

type RouteParams = {
  bookingId?: string;
  category?: ServiceCategory;
  /** Accepted from older call sites and ignored: the server's bill is the amount. */
  paymentData?: { amount?: number; suggestedAmount?: number };
};

export default function PaymentScreen() {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const bottomPad = useBottomBarPadding(GUTTER);

  const { bookingId, category = 'ac-repairers' } = route.params || {};
  const accent = categoryAccent(category, mode);

  const recipient = useSelector((state: RootState) => state.payment?.recipient);
  const paymentDetails = useSelector((state: RootState) => state.payment?.paymentDetails);
  const selectedMethod = useSelector((state: RootState) => state.payment?.selectedMethod);
  const paidWith = useSelector((state: RootState) => state.payment?.transaction.method);
  const isLoading = useSelector((state: RootState) => state.payment?.isLoading);
  const isProcessing = useSelector((state: RootState) => state.payment?.isProcessing);
  const paymentStatus = useSelector((state: RootState) => state.payment?.paymentStatus);
  const error = useSelector((state: RootState) => state.payment?.error);
  const paymentAmount = useSelector(selectPaymentAmount);
  const formattedAmount = useSelector(selectFormattedPaymentAmount);
  const isPaymentValid = useSelector(selectIsPaymentValid);
  const paymentMethods = useSelector(selectEnabledPaymentMethods);

  // Wallet balance — same slice, same source, as healthcare's and shopping's
  // payment screens, so all three treat insufficient balance identically.
  const walletBalance = useSelector(selectBalance) as number;
  const isWalletBacked = selectedMethod ? WALLET_BACKED_METHODS.includes(selectedMethod) : false;
  const insufficientBalance = isWalletBacked && walletBalance < paymentAmount;

  const [showConfirmSheet, setShowConfirmSheet] = useState(false);

  useEffect(() => {
    dispatch(fetchWallet());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (bookingId) dispatch(initializePayment({ bookingId, category }));
    }, [bookingId, category, dispatch])
  );

  // Cash: the provider confirms receipt on their phone, and this screen hears
  // it live (the backend emits `payment_received` to the booking's room) — so
  // "Pay in cash" turns into "Payment confirmed" without a refresh.
  const { payment: roomPayment } = useRoomSocket(bookingId, 'homeservice');
  useEffect(() => {
    if (roomPayment?.status === 'paid' && paymentStatus === 'awaiting_cash') {
      dispatch(markPaymentConfirmed());
    }
  }, [roomPayment, paymentStatus, dispatch]);

  // A completed payment used to navigate to a PaymentSuccess route. No such
  // screen exists anywhere in the app and it was never registered, so the one
  // moment the customer most needs confirming — their money has moved — did
  // nothing at all: the button stopped spinning and the screen sat there.
  // The success state is rendered here instead, with the next step attached.

  const handleBackPress = useCallback(() => {
    // A payment in flight must not be abandoned mid-request; the chevron is
    // simply inert until it resolves.
    if (isProcessing) return;
    dispatch(resetPaymentState());
    navigation.goBack();
  }, [dispatch, navigation, isProcessing]);

  const confirmPayment = useCallback(() => {
    if (!bookingId) return;
    // `amount` is only a check that the customer saw the current bill: if the
    // provider changed it since this screen loaded, the server says so and
    // charges nothing.
    dispatch(processPayment({ bookingId, amount: paymentAmount, method: selectedMethod }));
  }, [dispatch, bookingId, paymentAmount, selectedMethod]);

  if (!bookingId) {
    return (
      <Screen>
        <AppBar title="Payment" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="alert-circle-outline"
          tone="error"
          title="This payment can't be opened"
          message="Open it again from the booking you want to pay for."
          actionLabel="Go to bookings"
          onAction={() => navigation.navigate('HomeServiceLayout')}
        />
      </Screen>
    );
  }

  if (isLoading || !recipient) {
    return (
      <Screen>
        <AppBar title="Payment" onBack={() => navigation.goBack()} />
        <View style={styles.loading} accessibilityLabel="Preparing payment">
          <Skeleton width="100%" height={92} radius={R.card} />
          <Skeleton width="100%" height={200} radius={R.card} style={styles.loadingGap} />
          <Skeleton width="100%" height={140} radius={R.card} style={styles.loadingGapSm} />
        </View>
      </Screen>
    );
  }

  // Paid. This is the screen's terminal state — the back chevron is gone
  // because there is nothing to go back and change.
  if (paymentStatus === 'completed') {
    const byCash = paidWith === 'cash';
    return (
      <Screen>
        <AppBar title="Payment" hideBack />
        <EmptyState
          icon="checkmark-circle-outline"
          title={byCash ? 'Payment confirmed' : 'Payment sent'}
          message={
            byCash
              ? `${recipient.name} confirmed your cash payment of ${formattedAmount}.`
              : `${formattedAmount} was paid to ${recipient.name} from your wallet.`
          }
          actionLabel="Rate this service"
          onAction={() => navigation.navigate('ReviewRating', { bookingId, category })}
        />
        <View style={styles.secondaryAction}>
          <Button
            label="Back to bookings"
            variant="ghost"
            onPress={() => navigation.navigate('HomeServiceLayout')}
          />
        </View>
      </Screen>
    );
  }

  // Cash chosen, not yet confirmed. Nothing has been charged; the provider
  // confirms receipt and this state turns into "Payment confirmed".
  if (paymentStatus === 'awaiting_cash') {
    return (
      <Screen>
        <AppBar title="Payment" onBack={handleBackPress} />
        <EmptyState
          icon="cash-outline"
          title={`Pay ${formattedAmount} in cash`}
          message={`Hand the cash to ${recipient.name}. They'll confirm it in the app, and this screen will update when they do.`}
          actionLabel="Pay from wallet instead"
          onAction={() => dispatch(reopenPaymentChoice())}
        />
        <View style={styles.secondaryAction}>
          <Button
            label="Back to bookings"
            variant="ghost"
            onPress={() => navigation.navigate('HomeServiceLayout')}
          />
        </View>
      </Screen>
    );
  }

  const selectedMethodName = paymentMethods.find((m) => m.id === selectedMethod)?.name;
  const blocked = !isPaymentValid || insufficientBalance;
  const blockedReason = insufficientBalance
    ? 'Top up your wallet or pick another method.'
    : !selectedMethod
      ? 'Choose how you want to pay.'
      : paymentAmount <= 0
        ? 'This job has no amount to pay yet.'
        : null;
  const payLabel = selectedMethod === 'cash' ? "I'll pay in cash" : `Pay ${formattedAmount}`;

  return (
    <Screen>
      <AppBar title="Payment" onBack={handleBackPress} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card accentRule={accent.tint}>
            <View style={styles.recipientRow}>
              <Avatar
                uri={recipient.image}
                name={recipient.name}
                size={44}
                tint={accent.tintSoft}
                color={accent.tint}
              />
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName} numberOfLines={1}>
                  {recipient.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[recipient.service, recipient.phone].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader
              title="Summary"
              subtitle={paymentDetails?.invoiceId ? `Invoice #${paymentDetails.invoiceId}` : undefined}
            />
            <Card style={styles.card}>
              {!!paymentDetails?.description && (
                <Text style={styles.description}>{paymentDetails.description}</Text>
              )}

              <View style={styles.row}>
                <Text style={styles.rowKey}>Service</Text>
                <Text style={styles.rowValue}>{recipient.service}</Text>
              </View>
              {!!paymentDetails?.dueDate && (
                <View style={styles.row}>
                  <Text style={styles.rowKey}>Due</Text>
                  <Text style={styles.rowValue}>{paymentDetails.dueDate}</Text>
                </View>
              )}

              <View style={styles.amountBlock}>
                <View style={styles.amountHeader}>
                  <Text style={styles.rowKey}>Amount</Text>
                  <Text style={styles.quoted}>{formatAmount(paymentDetails?.originalAmount)}</Text>
                </View>
                {/* The provider sets the price; the customer can check it here
                    but not type their own. */}
                <Text style={styles.meta}>Set by {recipient.name} for this job</Text>
              </View>

              <View style={styles.total}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formattedAmount}</Text>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader title="How would you like to pay?" />

            {paymentMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.method, isSelected && styles.methodSelected]}
                  onPress={() => dispatch(setSelectedMethod(method.id))}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
                    <Ionicons
                      name={method.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={isSelected ? colors.accentDeep : colors.inkMuted}
                    />
                  </View>

                  <View style={styles.methodInfo}>
                    {/* Selection is carried by weight and the radio mark, not
                        by colour alone. */}
                    <Text style={[styles.methodName, isSelected && styles.methodNameSelected]}>
                      {method.name}
                    </Text>
                    <Text style={styles.meta}>{method.subtitle}</Text>
                  </View>

                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color={colors.inkInverse} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Insufficient balance — same treatment as healthcare/shopping
                payment screens, same slice, same top-up link. */}
            {isWalletBacked && !insufficientBalance && (
              <Text style={styles.balance}>Wallet balance {formatAmount(walletBalance)}</Text>
            )}
            {insufficientBalance && (
              <TouchableOpacity
                style={styles.banner}
                onPress={() => navigation.navigate('WalletScreen')}
                activeOpacity={0.85}
              >
                <Ionicons name="alert-circle-outline" size={17} color={colors.error} />
                <Text style={styles.bannerText}>
                  Your wallet is {formatAmount(paymentAmount - walletBalance)} short. Top up
                </Text>
                <Ionicons name="chevron-forward" size={15} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: bottomPad }]}>
        <Button
          label={isProcessing ? 'Paying' : payLabel}
          onPress={() => setShowConfirmSheet(true)}
          disabled={blocked}
          loading={!!isProcessing}
        />
        <Text style={styles.footerNote}>
          {blockedReason ??
            (selectedMethod === 'cash'
              ? 'Nothing is charged now. Pay the provider in person.'
              : "You'll be charged exactly this amount.")}
        </Text>
      </View>

      <ActionSheet
        visible={showConfirmSheet}
        title={selectedMethod === 'cash' ? `Pay ${formattedAmount} in cash?` : `Pay ${formattedAmount}?`}
        message={
          selectedMethod === 'cash'
            ? `You'll hand the cash to ${recipient.name}, who confirms it once received.`
            : selectedMethodName
              ? `This will be charged to your ${selectedMethodName} and sent to ${recipient.name}.`
              : undefined
        }
        cancelLabel="Not yet"
        onClose={() => setShowConfirmSheet(false)}
        options={[
          {
            label: payLabel,
            icon: selectedMethod === 'cash' ? 'cash-outline' : 'card-outline',
            onPress: confirmPayment,
          },
        ]}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: GUTTER,
    paddingBottom: S.huge,
  },
  loading: {
    padding: GUTTER,
  },
  loadingGap: { marginTop: SECTION },
  loadingGapSm: { marginTop: S.md },

  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientInfo: {
    flex: 1,
    marginLeft: S.md,
  },
  recipientName: {
    ...T.subhead,
    color: c.ink,
  },
  meta: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
  },

  section: {
    marginTop: SECTION,
  },
  card: {
    marginTop: S.md,
  },
  description: {
    ...T.body,
    color: c.inkMuted,
    marginBottom: S.md,
    maxWidth: PROSE_WIDTH,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  rowKey: {
    ...T.body,
    color: c.inkMuted,
  },
  rowValue: {
    ...T.bodyStrong,
    color: c.ink,
    marginLeft: S.lg,
    flexShrink: 1,
    textAlign: 'right',
  },
  link: {
    ...T.label,
    color: c.accentDeep,
  },

  amountBlock: {
    marginTop: S.lg,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.xs,
  },
  quoted: {
    ...T.heading,
    color: c.ink,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.xl,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  totalLabel: {
    ...T.subhead,
    color: c.ink,
  },
  totalValue: {
    ...T.title,
    color: c.ink,
  },

  method: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.lg,
    marginTop: S.md,
    borderRadius: R.card,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
  },
  methodSelected: {
    borderWidth: 1.5,
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: R.control,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconSelected: {
    backgroundColor: c.surface,
  },
  methodInfo: {
    flex: 1,
    marginHorizontal: S.md,
  },
  methodName: {
    ...T.body,
    color: c.ink,
  },
  methodNameSelected: {
    ...T.bodyStrong,
    color: c.ink,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: c.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },

  balance: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: S.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
    padding: S.md,
    borderRadius: R.control,
    backgroundColor: c.errorSoft,
  },
  bannerText: {
    ...T.label,
    color: c.error,
    flex: 1,
    marginHorizontal: S.sm,
  },
  error: {
    ...T.body,
    color: c.error,
    marginTop: S.lg,
  },

  secondaryAction: {
    paddingHorizontal: GUTTER,
    marginTop: -S.lg,
  },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: S.md,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
  footerNote: {
    ...T.caption,
    color: c.inkMuted,
    textAlign: 'center',
    marginTop: S.sm,
  },
});
