import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Animated,
  ScrollView,
  Linking,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  X,
  Wallet,
  Eye,
  EyeOff,
  Check,
  Clock,
  AlertCircle,
  Send,
  Building2,
  ShieldCheck,
  ChevronRight,
  RefreshCw as RefreshIcon,
  Banknote,
  Lock,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectWallet,
  selectConnect,
  fetchWallet,
  createTopUpSession,
  clearWalletError,
  fetchConnectStatus,
  startConnectOnboarding,
} from '../../../services/wallet';
import type { WalletState } from '../../../services/wallet';
import type { WalletTransaction, ConnectStatus } from '../../../models/wallet';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../constants/Colors';
import { KeyForStorage, retrieveData } from '../../../utils/storage_utils/storageUtils';
import TransferSheet from '../../../components/wallet/TransferSheet';
import PayoutSheet from '../../../components/wallet/PayoutSheet';
// Shared with TransactionHistoryScreen so a transaction reads identically
// wherever it's shown (Part 2.6 consistency).
import {
  splitMoney,
  getDateBucket,
  formatTime,
  formatFullDateTime,
  prettySource,
  getSourceIcon,
  getCurrencySymbol,
  formatMoney,
  STATUS_COLOR_KEY,
} from '../../../utils/wallet_utils/transactionFormat';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const QUICK_AMOUNTS = [10, 25, 50, 100];
type TxFilter = 'all' | 'credit' | 'debit';

// ============================================================
// FORMATTING HELPERS (see utils/wallet_utils/transactionFormat.ts for the
// currency/date/source helpers imported above)
// ============================================================

// ============================================================
// SKELETON
// ============================================================
const SkeletonBlock: React.FC<{ width: number | string; height: number; style?: any }> = ({
  width, height, style,
}) => {
  const opacity = React.useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 4, backgroundColor: Colors.borderLight, opacity },
        style,
      ]}
    />
  );
};

const TransactionSkeleton: React.FC = () => (
  <View style={styles.txRow}>
    <SkeletonBlock width={36} height={36} style={{ borderRadius: 18, marginRight: 12 }} />
    <View style={{ flex: 1, gap: 6 }}>
      <SkeletonBlock width="55%" height={13} />
      <SkeletonBlock width="35%" height={11} />
    </View>
    <View style={{ alignItems: 'flex-end', gap: 6 }}>
      <SkeletonBlock width={72} height={13} />
      <SkeletonBlock width={48} height={10} />
    </View>
  </View>
);

// ============================================================
// MAIN
// ============================================================
const WalletScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const wallet = useAppSelector(selectWallet) as WalletState;
  const connect = useAppSelector(selectConnect);

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<TxFilter>('all');
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showPayoutSheet, setShowPayoutSheet] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userType = await retrieveData(KeyForStorage.userType);
        setIsProvider(userType === 'provider');
      } catch { setIsProvider(false); }
    })();
  }, []);

  useEffect(() => { dispatch(fetchWallet()); }, [dispatch]);

  useEffect(() => {
    if (isProvider) dispatch(fetchConnectStatus());
  }, [isProvider, dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchWallet());
      if (isProvider) dispatch(fetchConnectStatus());

      // Re-fetch once more after a longer delay — backend Stripe webhook may
      // still be processing the balance update after the transaction completed.
      const delayed = setTimeout(() => {
        dispatch(fetchWallet());
      }, 5000);
      return () => clearTimeout(delayed);
    }, [dispatch, isProvider])
  );

  useEffect(() => {
    if (!isProvider) return;
    const onUrl = ({ url }: { url: string }) => {
      if (url?.includes('wallet/connect-return') || url?.includes('wallet/connect-refresh')) {
        dispatch(fetchConnectStatus());
      }
    };
    const sub = Linking.addEventListener('url', onUrl);
    return () => sub.remove();
  }, [isProvider, dispatch]);

  const handleRefresh = () => {
    dispatch(fetchWallet());
    if (isProvider) dispatch(fetchConnectStatus());
  };

  const handleStartOnboarding = async () => {
    const result = await dispatch(startConnectOnboarding());
    if (startConnectOnboarding.fulfilled.match(result)) {
      const url = result.payload.url;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Unable to open onboarding', 'Please try again later.');
    }
  };

  const handleOpenPayout = () => {
    if (connect.status !== 'active' || !connect.payoutsEnabled) {
      Alert.alert(
        'Set up payouts first',
        'You need to complete Stripe Connect onboarding before you can withdraw funds.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowPayoutSheet(true);
  };

  const handleConfirmTopUp = async () => {
    const amount = isCustom ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount <= 0 || amount > 10000) return;

    const result = await dispatch(createTopUpSession({ amount }));
    if (createTopUpSession.fulfilled.match(result)) {
      setShowTopUpModal(false);
      setSelectedAmount(null);
      setCustomAmount('');
      setIsCustom(false);
      navigation.navigate('TopUpWebView' as never, {
        url: result.payload.url,
        sessionId: result.payload.sessionId,
      } as never);
    }
  };

  const balanceParts = splitMoney(wallet.balance);
  const symbol = getCurrencySymbol(wallet.currency);

  const getStatusColor = (status: string) => {
    const key = STATUS_COLOR_KEY[status] || 'tertiary';
    const colorMap = {
      success: Colors.success,
      warning: Colors.warning,
      error: Colors.error,
      info: Colors.info,
      tertiary: Colors.text.tertiary,
    };
    return colorMap[key];
  };

  const sections = useMemo(() => {
    const filtered = wallet.transactions.filter((t) => {
      if (filter === 'all') return true;
      return t.type === filter;
    });
    const buckets: Record<string, WalletTransaction[]> = {};
    filtered.forEach((t) => {
      const key = getDateBucket(t.createdAt);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(t);
    });
    const order = ['Today', 'Yesterday', 'This week'];
    return Object.keys(buckets)
      .sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return new Date(buckets[b][0].createdAt).getTime() - new Date(buckets[a][0].createdAt).getTime();
      })
      .map((title) => ({ title, data: buckets[title] }));
  }, [wallet.transactions, filter]);

  const renderTransactionItem = ({ item, index, section }: any) => {
    const isCredit = item.type === 'credit';
    const Icon = getSourceIcon(item.source, item.type);
    const amountColor = isCredit ? Colors.success : Colors.text.primary;
    const sign = isCredit ? '+' : '−';
    const isLast = index === section.data.length - 1;

    return (
      <TouchableOpacity
        style={[styles.txRow, !isLast && styles.txRowDivider]}
        onPress={() => setSelectedTx(item)}
        activeOpacity={0.6}
      >
        <View style={styles.txIcon}>
          <Icon size={16} color={Colors.text.primary} strokeWidth={1.75} />
        </View>
        <View style={styles.txContent}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {item.description || prettySource(item.source)}
          </Text>
          <View style={styles.txMetaRow}>
            <Text style={styles.txMeta}>
              {prettySource(item.source)} · {formatTime(item.createdAt)}
            </Text>
            {item.status !== 'completed' && (
              <View style={styles.statusInline}>
                <View
                  style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]}
                />
                <Text style={[styles.statusInlineText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: amountColor }]} numberOfLines={1}>
            {sign}{formatMoney(item.amount, item.currency || wallet.currency)}
          </Text>
          <Text style={styles.txCurrency}>
            {(item.currency || wallet.currency).toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Wallet size={28} color={Colors.text.tertiary} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'Top up your wallet to see your activity here.'
          : `No ${filter === 'credit' ? 'incoming' : 'outgoing'} transactions yet.`}
      </Text>
      {filter === 'all' && (
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => setShowTopUpModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyCtaText}>Add money</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilterChips = () => {
    const chips: { key: TxFilter; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'credit', label: 'In' },
      { key: 'debit', label: 'Out' },
    ];
    return (
      <View style={styles.filterRow}>
        {chips.map((c) => {
          const active = filter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(c.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderQuickAmountChip = (amount: number) => {
    const active = selectedAmount === amount && !isCustom;
    return (
      <TouchableOpacity
        key={amount}
        style={[styles.amountChip, active && styles.amountChipSelected]}
        onPress={() => { setSelectedAmount(amount); setIsCustom(false); }}
        activeOpacity={0.75}
      >
        <Text style={[styles.amountChipText, active && styles.amountChipTextSelected]}>
          {symbol}{amount}
        </Text>
      </TouchableOpacity>
    );
  };

  const isLoadingInitial = wallet.loading && wallet.transactions.length === 0;
  const customAmountNum = parseFloat(customAmount);
  const customAmountValid = !isNaN(customAmountNum) && customAmountNum >= 1 && customAmountNum <= 10000;
  const confirmDisabled =
    wallet.toppingUp ||
    (!isCustom && !selectedAmount) ||
    (isCustom && !customAmountValid);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top app bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Wallet</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleRefresh}
          disabled={wallet.loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {wallet.loading ? (
            <ActivityIndicator size={16} color={Colors.text.primary} />
          ) : (
            <RefreshCw size={18} color={Colors.text.primary} strokeWidth={1.75} />
          )}
        </TouchableOpacity>
      </View>

      {wallet.error && !showTopUpModal && (
        <View style={styles.errorBanner}>
          <AlertCircle size={14} color={Colors.error} strokeWidth={2} />
          <Text style={styles.errorBannerText} numberOfLines={2}>{wallet.error}</Text>
          <TouchableOpacity onPress={() => dispatch(clearWalletError())}>
            <X size={14} color={Colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Balance hero — minimal, type-led, no gradient */}
      <View style={styles.balanceBlock}>
        <View style={styles.balanceLabelRow}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <TouchableOpacity
            onPress={() => setShowBalance(!showBalance)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {showBalance
              ? <Eye size={15} color={Colors.text.tertiary} strokeWidth={1.75} />
              : <EyeOff size={15} color={Colors.text.tertiary} strokeWidth={1.75} />}
          </TouchableOpacity>
        </View>

        {showBalance ? (
          <View style={styles.balanceLine} accessible accessibilityLabel={`Balance ${symbol}${balanceParts.whole}.${balanceParts.cents} ${wallet.currency}`}>
            <Text style={styles.balanceSymbol}>{symbol}</Text>
            <Text style={styles.balanceWhole} numberOfLines={1} adjustsFontSizeToFit>
              {balanceParts.whole}
            </Text>
            <Text style={styles.balanceCents}>.{balanceParts.cents}</Text>
            <Text style={styles.balanceCurrency}>{wallet.currency.toUpperCase()}</Text>
            {wallet.loading && (
              <ActivityIndicator size="small" color={Colors.text.tertiary} style={{ marginLeft: 8 }} />
            )}
          </View>
        ) : (
          <View style={styles.balanceLine}>
            <Text style={styles.balanceWhole}>••••••</Text>
          </View>
        )}

        {wallet.pagination?.total > 0 && (
          <Text style={styles.balanceFootnote}>
            {wallet.pagination.total} transaction{wallet.pagination.total === 1 ? '' : 's'} on file
          </Text>
        )}
      </View>

      {/* Action row — two equal pills, primary + secondary */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionPrimary}
          onPress={() => setShowTopUpModal(true)}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.25} />
          <Text style={styles.actionPrimaryText}>Add money</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionSecondary}
          activeOpacity={0.7}
          onPress={() => setShowTransferSheet(true)}
        >
          <Send size={15} color={Colors.text.primary} strokeWidth={2} />
          <Text style={styles.actionSecondaryText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Provider-only: pending vs available earnings, then Connect status
          + payout action. Same screen, role-aware section — no second
          wallet screen. */}
      {isProvider && (
        <>
          <ProviderEarningsSplit transactions={wallet.transactions} currency={wallet.currency} />
          <ProviderPayoutCard
            connect={connect}
            onStartOnboarding={handleStartOnboarding}
            onOpenPayout={handleOpenPayout}
            onRefresh={() => dispatch(fetchConnectStatus())}
          />
        </>
      )}

      {/* Activity */}
      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>Activity</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('TransactionHistoryScreen')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAllLink}>See all</Text>
          </TouchableOpacity>
          {renderFilterChips()}
        </View>
      </View>

      {isLoadingInitial ? (
        <View style={{ paddingHorizontal: 20 }}>
          {[0, 1, 2, 3, 4].map((i) => <TransactionSkeleton key={i} />)}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderTransactionItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={
            sections.length === 0 ? styles.emptyList : { paddingBottom: 40 }
          }
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={wallet.loading}
              onRefresh={handleRefresh}
              tintColor={Colors.text.tertiary}
            />
          }
        />
      )}

      {/* ===== TOP UP MODAL ===== */}
      <Modal
        visible={showTopUpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.grabber} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Top up</Text>
                <Text style={styles.modalTitle}>Add money to wallet</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTopUpModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconBtnGhost}
              >
                <X size={18} color={Colors.text.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabelTop}>Choose amount</Text>
            <View style={styles.amountChipsContainer}>
              {QUICK_AMOUNTS.map(renderQuickAmountChip)}
              <TouchableOpacity
                style={[styles.amountChip, isCustom && styles.amountChipSelected]}
                onPress={() => { setIsCustom(true); setSelectedAmount(null); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.amountChipText, isCustom && styles.amountChipTextSelected]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {isCustom && (
              <View style={styles.customInputWrapper}>
                <Text style={styles.customInputSymbol}>{symbol}</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.text.tertiary}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            )}

            {isCustom && customAmount.length > 0 && !customAmountValid && (
              <Text style={styles.helperError}>Amount must be between 1 and 10,000</Text>
            )}

            {wallet.error && (
              <View style={styles.modalErrorBanner}>
                <AlertCircle size={13} color={Colors.error} strokeWidth={2} />
                <Text style={styles.errorText}>{wallet.error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, confirmDisabled && styles.confirmButtonDisabled]}
              onPress={handleConfirmTopUp}
              disabled={confirmDisabled}
              activeOpacity={0.9}
            >
              {wallet.toppingUp
                ? <ActivityIndicator size={18} color="#FFFFFF" />
                : <Text style={styles.confirmButtonText}>Continue to payment</Text>}
            </TouchableOpacity>

            <View style={styles.secureRow}>
              <Lock size={11} color={Colors.text.tertiary} strokeWidth={2} />
              <Text style={styles.secureNote}>Secure checkout by Stripe</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== TRANSACTION DETAIL ===== */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        {selectedTx && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
              <View style={styles.grabber} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>{prettySource(selectedTx.source)}</Text>
                  <Text style={styles.modalTitle}>Transaction</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedTx(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.iconBtnGhost}
                >
                  <X size={18} color={Colors.text.primary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailHero}>
                <Text
                  style={[
                    styles.detailAmount,
                    { color: selectedTx.type === 'credit' ? Colors.success : Colors.text.primary },
                  ]}
                >
                  {selectedTx.type === 'credit' ? '+' : '−'}
                  {formatMoney(selectedTx.amount, selectedTx.currency || wallet.currency)}
                </Text>
                <Text style={styles.detailCurrency}>
                  {(selectedTx.currency || wallet.currency).toUpperCase()}
                </Text>
                <View style={styles.detailStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(selectedTx.status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.detailStatusText,
                      { color: getStatusColor(selectedTx.status) },
                    ]}
                  >
                    {selectedTx.status}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRows}>
                <DetailRow label="Description" value={selectedTx.description || '—'} />
                <DetailRow label="Type" value={selectedTx.type === 'credit' ? 'Incoming' : 'Outgoing'} />
                <DetailRow label="Date" value={formatFullDateTime(selectedTx.createdAt)} />
                {selectedTx.stripeSessionId && (
                  <DetailRow label="Session" value={selectedTx.stripeSessionId} monospace />
                )}
                {selectedTx.stripePaymentIntentId && (
                  <DetailRow label="Payment intent" value={selectedTx.stripePaymentIntentId} monospace />
                )}
                <DetailRow label="Reference" value={selectedTx._id} monospace />
              </View>
            </View>
          </View>
        )}
      </Modal>

      <TransferSheet
        visible={showTransferSheet}
        onClose={() => setShowTransferSheet(false)}
      />

      {isProvider && (
        <PayoutSheet
          visible={showPayoutSheet}
          onClose={() => setShowPayoutSheet(false)}
        />
      )}
    </SafeAreaView>
  );
};

// ============================================================
// PROVIDER PAYOUT STRIP
// ============================================================
/**
 * Pending vs available earnings — computed from the transaction list
 * already in state (no extra endpoint). "Available" is the current wallet
 * balance (spendable / withdrawable now); "Pending" is the sum of credits
 * still settling (e.g. a cash-collected commission the provider's balance
 * couldn't yet absorb — see WALLET_DESIGN.md Part C, homeservice confirmCash).
 */
function ProviderEarningsSplit({
  transactions,
  currency,
}: {
  transactions: WalletTransaction[];
  currency: string;
}) {
  const pending = transactions
    .filter((t) => t.type === 'credit' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  if (pending === 0) return null; // nothing settling — no need for the extra card

  return (
    <View style={providerEarningsStyles.card}>
      <View style={providerEarningsStyles.col}>
        <Text style={providerEarningsStyles.label}>Pending</Text>
        <Text style={providerEarningsStyles.pendingValue}>
          {formatMoney(pending, currency)}
        </Text>
        <Text style={providerEarningsStyles.hint}>Still settling</Text>
      </View>
    </View>
  );
}

const providerEarningsStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  col: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pendingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 2,
  },
  hint: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
});

interface ProviderPayoutCardProps {
  connect: {
    status: ConnectStatus;
    loading: boolean;
    onboarding: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsDue: string[];
  };
  onStartOnboarding: () => void;
  onOpenPayout: () => void;
  onRefresh: () => void;
}

function ProviderPayoutCard({
  connect, onStartOnboarding, onOpenPayout, onRefresh,
}: ProviderPayoutCardProps) {
  const isActive = connect.status === 'active' && connect.payoutsEnabled;
  const isPending = connect.status === 'pending' || connect.status === 'restricted';

  const status = (() => {
    if (isActive) return { label: 'Ready for payouts', color: Colors.success };
    if (isPending) return { label: 'Setup in progress', color: Colors.warning };
    return { label: 'Not set up', color: Colors.text.tertiary };
  })();

  return (
    <View style={providerStyles.card}>
      <View style={providerStyles.row}>
        <View style={providerStyles.left}>
          <View style={providerStyles.iconBox}>
            <Building2 size={15} color={Colors.text.primary} strokeWidth={1.75} />
          </View>
          <View>
            <Text style={providerStyles.title}>Bank payouts</Text>
            <View style={providerStyles.statusRow}>
              <View style={[providerStyles.dot, { backgroundColor: status.color }]} />
              <Text style={[providerStyles.statusLabel, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          disabled={connect.loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {connect.loading
            ? <ActivityIndicator size={14} color={Colors.text.tertiary} />
            : <RefreshIcon size={14} color={Colors.text.tertiary} strokeWidth={1.75} />}
        </TouchableOpacity>
      </View>

      {isActive ? (
        <TouchableOpacity
          style={providerStyles.btn}
          onPress={onOpenPayout}
          activeOpacity={0.85}
        >
          <Text style={providerStyles.btnText}>Withdraw to bank</Text>
          <ChevronRight size={14} color={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
      ) : isPending ? (
        <>
          <Text style={providerStyles.desc}>
            {connect.requirementsDue.length > 0
              ? `${connect.requirementsDue.length} detail${connect.requirementsDue.length === 1 ? '' : 's'} still needed.`
              : 'Account under review — usually a few minutes.'}
          </Text>
          <TouchableOpacity
            style={providerStyles.btn}
            onPress={onStartOnboarding}
            disabled={connect.onboarding}
            activeOpacity={0.85}
          >
            {connect.onboarding
              ? <ActivityIndicator size={14} color={Colors.text.primary} />
              : (
                <>
                  <Text style={providerStyles.btnText}>Continue setup</Text>
                  <ChevronRight size={14} color={Colors.text.primary} strokeWidth={2} />
                </>
              )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={providerStyles.desc}>
            Connect a bank account to receive payouts. Takes about 2 minutes.
          </Text>
          <TouchableOpacity
            style={providerStyles.btnPrimary}
            onPress={onStartOnboarding}
            disabled={connect.onboarding}
            activeOpacity={0.9}
          >
            {connect.onboarding
              ? <ActivityIndicator size={14} color="#FFFFFF" />
              : (
                <>
                  <Text style={providerStyles.btnPrimaryText}>Set up payouts</Text>
                  <ChevronRight size={14} color="#FFFFFF" strokeWidth={2} />
                </>
              )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const providerStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginBottom: 4,
    letterSpacing: -0.1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: {
    fontSize: 11, fontWeight: '500', letterSpacing: 0.1,
  },
  desc: {
    fontSize: 12, color: Colors.text.secondary, lineHeight: 17, marginBottom: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  btnText: { color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.text.primary,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});

// ============================================================
// DETAIL ROW
// ============================================================
const DetailRow: React.FC<{ label: string; value: string; monospace?: boolean }> = ({
  label, value, monospace,
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text
      style={[styles.detailRowValue, monospace && styles.detailRowValueMono]}
      numberOfLines={monospace ? 1 : 3}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingBottom: 4,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 18,
  },
  iconBtnGhost: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.backgroundAlt,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.errorLight,
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorBannerText: { flex: 1, color: Colors.error, fontSize: 12, fontWeight: '500' },

  // Balance hero
  balanceBlock: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceSymbol: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text.primary,
    marginRight: 2,
    letterSpacing: -0.5,
  },
  balanceWhole: {
    fontSize: 44,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 50,
  },
  balanceCents: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text.tertiary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginLeft: 1,
  },
  balanceCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginLeft: 8,
    letterSpacing: 0.6,
  },
  balanceFootnote: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 8,
    fontWeight: '500',
  },

  // Action row
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.text.primary,
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  actionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionSecondaryText: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Activity header
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: Colors.backgroundAlt,
    padding: 3,
    borderRadius: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.1,
  },
  filterChipTextActive: {
    color: Colors.text.primary,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  // Tx row
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
  },
  txRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  txIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txContent: { flex: 1, marginRight: 8 },
  txTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txMeta: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 5, height: 5, borderRadius: 2.5,
  },
  statusInlineText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  txRight: { alignItems: 'flex-end' },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },
  txCurrency: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyCta: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: Colors.text.primary,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  emptyList: { flexGrow: 1 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  grabber: {
    alignSelf: 'center',
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },

  fieldLabelTop: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Amount chips
  amountChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  amountChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 68,
    alignItems: 'center',
  },
  amountChipSelected: {
    backgroundColor: Colors.text.primary,
    borderColor: Colors.text.primary,
  },
  amountChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  amountChipTextSelected: { color: '#FFFFFF' },

  // Custom input
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    marginBottom: 6,
  },
  customInputSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  helperError: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 6,
    paddingHorizontal: 4,
    fontWeight: '500',
  },

  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    flex: 1,
    fontWeight: '500',
  },

  confirmButton: {
    backgroundColor: Colors.text.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.border,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 14,
  },
  secureNote: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // Detail
  detailHero: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    marginBottom: 8,
  },
  detailAmount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  detailCurrency: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.1,
  },
  detailRows: { paddingTop: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  detailRowLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '500',
    minWidth: 100,
    paddingTop: 1,
    letterSpacing: 0.1,
  },
  detailRowValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '500',
    textAlign: 'right',
    lineHeight: 18,
  },
  detailRowValueMono: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.text.secondary,
  },
});

export default WalletScreen;