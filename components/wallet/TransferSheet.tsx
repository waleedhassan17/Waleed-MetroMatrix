import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  User as UserIcon,
  Briefcase,
  AlertCircle,
  Check,
  ArrowRight,
  Send,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  transfer,
  clearLastTransfer,
  clearWalletError,
  selectWallet,
  selectTransferring,
  selectLastTransfer,
} from '../../services/wallet';
import type { WalletState, CounterpartyType } from '../../services/wallet';
import { generateIdempotencyKey } from '../../services/wallet';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';

interface TransferSheetProps {
  visible: boolean;
  onClose: () => void;
  prefillReceiverId?: string;
  prefillReceiverType?: CounterpartyType;
  prefillAmount?: number;
  prefillDescription?: string;
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

const MONGO_ID_RE = /^[a-fA-F0-9]{24}$/;

const TransferSheet: React.FC<TransferSheetProps> = ({
  visible,
  onClose,
  prefillReceiverId,
  prefillReceiverType,
  prefillAmount,
  prefillDescription,
}) => {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector(selectWallet) as WalletState;
  const transferring = useAppSelector(selectTransferring) as boolean;
  const lastTransfer = useAppSelector(selectLastTransfer);

  const [receiverType, setReceiverType] = useState<CounterpartyType>(
    prefillReceiverType || 'Provider'
  );
  const [receiverId, setReceiverId] = useState(prefillReceiverId || '');
  const [amount, setAmount] = useState(prefillAmount ? String(prefillAmount) : '');
  const [description, setDescription] = useState(prefillDescription || '');
  const idemKeyRef = useRef<string>(generateIdempotencyKey());

  useEffect(() => {
    if (visible) {
      setReceiverType(prefillReceiverType || 'Provider');
      setReceiverId(prefillReceiverId || '');
      setAmount(prefillAmount ? String(prefillAmount) : '');
      setDescription(prefillDescription || '');
      idemKeyRef.current = generateIdempotencyKey();
      dispatch(clearWalletError());
      dispatch(clearLastTransfer());
    }
  }, [visible, prefillReceiverId, prefillReceiverType, prefillAmount, prefillDescription, dispatch]);

  const amountNum = parseFloat(amount);
  const receiverIdValid = MONGO_ID_RE.test(receiverId.trim());
  const amountValid = !isNaN(amountNum) && amountNum >= 0.01 && amountNum <= 100000;
  const hasEnoughBalance = amountValid && amountNum <= wallet.balance;
  const descriptionValid = description.length <= 280;

  const canSubmit =
    !transferring && receiverIdValid && amountValid && hasEnoughBalance && descriptionValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await dispatch(
      transfer({
        receiverId: receiverId.trim(),
        receiverType,
        amount: amountNum,
        description: description.trim() || undefined,
        idempotencyKey: idemKeyRef.current,
      })
    );
  };

  const handleDone = () => {
    dispatch(clearLastTransfer());
    onClose();
  };

  // ===== SUCCESS STATE =====
  if (visible && lastTransfer && !transferring) {
    const replayed = lastTransfer.alreadyProcessed;
    return (
      <Modal visible transparent animationType="slide" onRequestClose={handleDone}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Check size={28} color="#FFFFFF" strokeWidth={2.75} />
              </View>

              <Text style={styles.successEyebrow}>
                {replayed ? 'Already processed' : 'Sent'}
              </Text>
              <Text style={styles.successAmount}>
                {formatMoney(lastTransfer.senderTransaction.amount, wallet.currency)}
              </Text>
              <Text style={styles.successCurrency}>
                {wallet.currency.toUpperCase()}
              </Text>
              <Text style={styles.successSubtitle}>
                {replayed
                  ? 'This transfer was already processed. No new debit was made.'
                  : 'Your transfer was sent successfully.'}
              </Text>

              <View style={styles.successCard}>
                <SuccessRow
                  label="New balance"
                  value={formatMoney(
                    lastTransfer.senderWallet.balance,
                    lastTransfer.senderWallet.currency
                  )}
                />
                <SuccessRow
                  label="Reference"
                  value={lastTransfer.transferGroupId}
                  monospace
                />
                {lastTransfer.feeTransaction && (
                  <SuccessRow
                    label="Fee"
                    value={formatMoney(lastTransfer.feeTransaction.amount, wallet.currency)}
                  />
                )}
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

  // ===== FORM STATE =====
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
              <Text style={styles.eyebrow}>Transfer</Text>
              <Text style={styles.title}>Send money</Text>
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
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {/* Balance hint */}
            <View style={styles.balanceHint}>
              <Text style={styles.balanceHintLabel}>Available</Text>
              <Text style={styles.balanceHintValue}>
                {formatMoney(wallet.balance, wallet.currency)}
              </Text>
            </View>

            {/* Receiver type — segmented */}
            <Text style={styles.fieldLabel}>Send to</Text>
            <View style={styles.segmented}>
              <TouchableOpacity
                style={[styles.segment, receiverType === 'User' && styles.segmentActive]}
                onPress={() => setReceiverType('User')}
                activeOpacity={0.7}
              >
                <UserIcon
                  size={14}
                  color={receiverType === 'User' ? Colors.text.primary : Colors.text.tertiary}
                  strokeWidth={2}
                />
                <Text style={[
                  styles.segmentText,
                  receiverType === 'User' && styles.segmentTextActive,
                ]}>
                  User
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, receiverType === 'Provider' && styles.segmentActive]}
                onPress={() => setReceiverType('Provider')}
                activeOpacity={0.7}
              >
                <Briefcase
                  size={14}
                  color={receiverType === 'Provider' ? Colors.text.primary : Colors.text.tertiary}
                  strokeWidth={2}
                />
                <Text style={[
                  styles.segmentText,
                  receiverType === 'Provider' && styles.segmentTextActive,
                ]}>
                  Provider
                </Text>
              </TouchableOpacity>
            </View>

            {/* Receiver ID */}
            <Text style={styles.fieldLabel}>Recipient ID</Text>
            <View style={[
              styles.inputWrap,
              receiverId.length > 0 && !receiverIdValid && styles.inputError,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="24-character ID"
                placeholderTextColor={Colors.text.tertiary}
                value={receiverId}
                onChangeText={setReceiverId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {receiverId.length > 0 && !receiverIdValid && (
              <Text style={styles.helperError}>Must be a valid 24-character ID</Text>
            )}

            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={[
              styles.amountWrap,
              amount.length > 0 && !hasEnoughBalance && amountValid && styles.inputError,
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
              <Text style={styles.helperError}>Must be between 0.01 and 100,000</Text>
            )}
            {amountValid && !hasEnoughBalance && (
              <Text style={styles.helperError}>Insufficient balance</Text>
            )}

            {/* Note */}
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Note</Text>
              <Text style={styles.charCount}>{description.length}/280</Text>
            </View>
            <View style={[styles.inputWrap, !descriptionValid && styles.inputError]}>
              <TextInput
                style={[styles.input, { minHeight: 56, textAlignVertical: 'top' }]}
                placeholder="What's this for? (optional)"
                placeholderTextColor={Colors.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={300}
              />
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
            {transferring ? (
              <ActivityIndicator size={18} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {amountValid
                    ? `Send ${formatMoney(amountNum, wallet.currency)}`
                    : 'Send'}
                </Text>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.25} />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Transfers are instant and cannot be reversed.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const SuccessRow: React.FC<{ label: string; value: string; monospace?: boolean }> = ({
  label, value, monospace,
}) => (
  <View style={styles.successRow}>
    <Text style={styles.successRowLabel}>{label}</Text>
    <Text
      style={[
        styles.successRowValue,
        monospace && { fontFamily: 'monospace', fontSize: 11, color: Colors.text.secondary },
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

  balanceHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 10,
    marginBottom: 18,
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

  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 14,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  segmentTextActive: {
    color: Colors.text.primary,
  },

  // Inputs
  inputWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
  },
  inputError: { borderColor: Colors.error },
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

  // Amount
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
  },
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

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
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
    marginTop: 14,
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
  disclaimer: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 12,
    fontWeight: '500',
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
    lineHeight: 19,
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

export default TransferSheet;