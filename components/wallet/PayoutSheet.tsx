import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  X,
  Building2,
  AlertCircle,
  Check,
  ArrowRight,
  Clock,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  requestPayout,
  clearLastPayout,
  clearWalletError,
  selectWallet,
  selectPayingOut,
  selectLastPayout,
  selectConnect,
} from '../../screens/user/wallet/walletSlice';
import type { WalletState } from '../../screens/user/wallet/walletSlice';
import { generateIdempotencyKey } from '../../networks/wallet/walletApi';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';

interface PayoutSheetProps {
  visible: boolean;
  onClose: () => void;
}

const getCurrencySymbol = (code: string): string => {
  const map: Record<string, string> = {
    usd: '$', eur: '€', gbp: '£', pkr: '₨', inr: '₹', aed: 'د.إ', sar: '﷼',
  };
  return map[(code || '').toLowerCase()] || code.toUpperCase();
};

const formatMoney = (amount: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
};

const formatArrivalDate = (unix: number): string => {
  try {
    const date = new Date(unix * 1000);
    return date.toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric',
    });
  } catch { return '—'; }
};

const PayoutSheet: React.FC<PayoutSheetProps> = ({ visible, onClose }) => {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector(selectWallet) as WalletState;
  const payingOut = useAppSelector(selectPayingOut) as boolean;
  const lastPayout = useAppSelector(selectLastPayout);
  const connect = useAppSelector(selectConnect);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const idemKeyRef = useRef(generateIdempotencyKey());

  useEffect(() => {
    if (visible) {
      setAmount('');
      setDescription('');
      idemKeyRef.current = generateIdempotencyKey();
      dispatch(clearWalletError());
      dispatch(clearLastPayout());
    }
  }, [visible, dispatch]);

  const amountNum = parseFloat(amount);
  const amountValid = !isNaN(amountNum) && amountNum > 0;
  const hasEnoughBalance = amountValid && amountNum <= wallet.balance;
  const canSubmit = !payingOut && amountValid && hasEnoughBalance && connect.payoutsEnabled;

  const handleMaxAmount = () => {
    if (wallet.balance > 0) setAmount(wallet.balance.toString());
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await dispatch(
      requestPayout({
        amount: amountNum,
        description: description.trim() || undefined,
        idempotencyKey: idemKeyRef.current,
      })
    );
  };

  const handleDone = () => {
    dispatch(clearLastPayout());
    onClose();
  };

  // ===== SUCCESS =====
  if (visible && lastPayout && !payingOut) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={handleDone}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Check size={28} color="#FFFFFF" strokeWidth={2.75} />
              </View>

              <Text style={styles.successEyebrow}>Payout initiated</Text>
              <Text style={styles.successAmount}>
                {formatMoney(parseFloat(amount) || 0, wallet.currency)}
              </Text>
              <Text style={styles.successCurrency}>
                {wallet.currency.toUpperCase()}
              </Text>
              <Text style={styles.successSubtitle}>
                On its way to your bank account.
              </Text>

              <View style={styles.successCard}>
                <SuccessRow
                  label="Status"
                  value={lastPayout.stripe.status}
                  capitalize
                />
                <SuccessRow
                  label="Expected arrival"
                  value={formatArrivalDate(lastPayout.stripe.arrivalDate)}
                />
                <SuccessRow
                  label="New balance"
                  value={formatMoney(
                    lastPayout.wallet.balance,
                    lastPayout.wallet.currency
                  )}
                />
                <SuccessRow
                  label="Payout ID"
                  value={lastPayout.stripe.payoutId}
                  monospace
                />
              </View>

              <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.9}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ===== FORM =====
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Withdraw</Text>
              <Text style={styles.title}>Move to bank</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
            >
              <X size={18} color={Colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!connect.payoutsEnabled && (
              <View style={styles.warningBanner}>
                <AlertCircle size={14} color={Colors.warning} strokeWidth={2} />
                <Text style={styles.warningText}>
                  Payouts aren't enabled yet. Complete Stripe Connect onboarding first.
                </Text>
              </View>
            )}

            {/* Bank destination card */}
            <View style={styles.destinationCard}>
              <View style={styles.destIcon}>
                <Building2 size={16} color={Colors.text.primary} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.destLabel}>Destination</Text>
                <Text style={styles.destValue}>Connected bank account</Text>
              </View>
            </View>

            {/* Balance + max */}
            <View style={styles.balanceHint}>
              <Text style={styles.balanceHintLabel}>Available</Text>
              <Text style={styles.balanceHintValue}>
                {formatMoney(wallet.balance, wallet.currency)}
              </Text>
            </View>

            {/* Amount */}
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Amount</Text>
              <TouchableOpacity onPress={handleMaxAmount} disabled={wallet.balance <= 0}>
                <Text style={[
                  styles.maxLink,
                  wallet.balance <= 0 && { color: Colors.text.tertiary },
                ]}>
                  Use max
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[
              styles.amountWrap,
              amount.length > 0 && amountValid && !hasEnoughBalance && styles.inputError,
            ]}>
              <Text style={styles.currencySymbol}>
                {getCurrencySymbol(wallet.currency)}
              </Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={Colors.text.tertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.amountCurrency}>{wallet.currency.toUpperCase()}</Text>
            </View>
            {amount.length > 0 && !amountValid && (
              <Text style={styles.helperError}>Please enter a valid amount</Text>
            )}
            {amountValid && !hasEnoughBalance && (
              <Text style={styles.helperError}>Insufficient balance</Text>
            )}

            {/* Description */}
            <Text style={styles.fieldLabel}>Reference</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekly payout (optional)"
                placeholderTextColor={Colors.text.tertiary}
                value={description}
                onChangeText={setDescription}
                maxLength={280}
              />
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              <Clock size={13} color={Colors.text.tertiary} strokeWidth={2} />
              <Text style={styles.infoCardText}>
                Funds typically arrive in 1–3 business days.
              </Text>
            </View>

            {wallet.error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={13} color={Colors.error} strokeWidth={2} />
                <Text style={styles.errorBannerText}>{wallet.error}</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            {payingOut ? (
              <ActivityIndicator size={18} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {amountValid
                    ? `Withdraw ${formatMoney(amountNum, wallet.currency)}`
                    : 'Withdraw'}
                </Text>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.25} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const SuccessRow: React.FC<{
  label: string;
  value: string;
  monospace?: boolean;
  capitalize?: boolean;
}> = ({ label, value, monospace, capitalize }) => (
  <View style={styles.successRow}>
    <Text style={styles.successRowLabel}>{label}</Text>
    <Text
      style={[
        styles.successRowValue,
        monospace && { fontFamily: 'monospace', fontSize: 11, color: Colors.text.secondary },
        capitalize && { textTransform: 'capitalize' },
      ]}
      numberOfLines={1}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.backgroundAlt,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.warningLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warningDark,
    lineHeight: 17,
    fontWeight: '500',
  },

  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    marginBottom: 12,
  },
  destIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  destLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  destValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },

  balanceHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 10,
    marginBottom: 14,
  },
  balanceHintLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  balanceHintValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },

  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 14,
  },
  maxLink: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
  },
  inputError: { borderColor: Colors.error },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  amountCurrency: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.5,
  },

  inputWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
  },
  input: {
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  helperError: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 6,
    paddingHorizontal: 4,
    fontWeight: '500',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.backgroundAlt,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  infoCardText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.text.primary,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 16,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.border,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Success
  successWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  successEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 38,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  successCurrency: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  successCard: {
    width: '100%',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  successRowLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  successRowValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.text.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default PayoutSheet;