import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ChevronLeft,
  Wallet,
  Banknote,
  AlertCircle,
  TrendingUp,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { selectBalance, selectCurrency } from '../../../../services/wallet';
import {
  fetchPaymentMethods,
  refreshWalletBalance,
  selectCheckoutPaymentLoading,
  selectCheckoutPaymentMethods,
  selectSelectedCheckoutPaymentMethod,
  setSelectedMethod,
  type PaymentMethod,
} from './checkoutPaymentSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', badge: '#E74C3C' };

const getMethodIcon = (id: string) => {
  switch (id) {
    case 'wallet': return Wallet;
    case 'cod': return Banknote;
    default: return Wallet;
  }
};

const CheckoutPaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const paymentMethods = useAppSelector(selectCheckoutPaymentMethods);
  const selectedMethod = useAppSelector(selectSelectedCheckoutPaymentMethod);
  const loading = useAppSelector(selectCheckoutPaymentLoading);
  const walletBalance = useAppSelector(selectBalance) as number;
  const walletCurrency = useAppSelector(selectCurrency) as string;
  const orderTotal = 2500; // Placeholder — in production pass from checkout state

  useEffect(() => { dispatch(fetchPaymentMethods()); }, [dispatch]);

  // Keep wallet balance in checkout slice synced with live wallet state
  useEffect(() => {
    dispatch(refreshWalletBalance({ balance: walletBalance, currency: walletCurrency }));
  }, [walletBalance, walletCurrency, dispatch]);

  const isWalletSelected = selectedMethod?.id === 'wallet';
  const walletInsufficient = isWalletSelected && walletBalance < orderTotal;

  const handleContinue = useCallback(() => {
    if (!selectedMethod) return;
    if (walletInsufficient) {
      Alert.alert(
        'Insufficient wallet balance',
        `Your wallet has ${walletCurrency.toUpperCase()} ${walletBalance.toFixed(2)} but this order costs ${walletCurrency.toUpperCase()} ${orderTotal.toFixed(2)}.\n\nTop up your wallet or choose a different payment method.`,
        [{ text: 'OK' }]
      );
      return;
    }
    navigation.navigate(ShoppingRouteNames.CheckoutReview, { paymentMethodId: selectedMethod.id });
  }, [navigation, selectedMethod, walletInsufficient, walletBalance, walletCurrency, orderTotal]);

  const getCurrencySymbol = (code: string) => {
    const map: Record<string, string> = { usd: '$', eur: '€', gbp: '£', pkr: '₨', inr: '₹' };
    return map[(code || '').toLowerCase()] || code.toUpperCase();
  };

  const renderMethod = (method: PaymentMethod) => {
    const selected = selectedMethod?.id === method.id;
    const Icon = getMethodIcon(method.id);
    const isWallet = method.id === 'wallet';
    const sym = getCurrencySymbol(walletCurrency);

    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.methodCard, selected && styles.methodCardSelected]}
        activeOpacity={0.8}
        onPress={() => dispatch(setSelectedMethod(method.id))}
      >
        <View style={styles.methodLeft}>
          {selected ? (
            <CheckCircle2 size={20} stroke={ShopColors.primary} strokeWidth={2} />
          ) : (
            <Circle size={20} stroke={Colors.text.tertiary} strokeWidth={2} />
          )}
          <View style={[styles.methodIconWrap, isWallet && selected && { backgroundColor: ShopColors.primaryLight }]}>
            <Icon size={18} stroke={isWallet && selected ? ShopColors.primary : Colors.text.secondary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodName}>{method.name}</Text>
            {isWallet ? (
              <View style={styles.walletBalanceRow}>
                <TrendingUp size={11} stroke={walletBalance > 0 ? Colors.success : Colors.text.tertiary} strokeWidth={2} />
                <Text style={[styles.walletBalanceText, { color: walletBalance > 0 ? Colors.success : Colors.text.tertiary }]}>
                  {sym}{walletBalance.toFixed(2)} available
                </Text>
              </View>
            ) : (
              <Text style={styles.methodDesc}>{method.description}</Text>
            )}
          </View>
        </View>
        <View style={styles.methodTag}>
          <Text style={styles.methodTagText}>{method.iconLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const canContinue = !!selectedMethod && !walletInsufficient;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>Step 3 of 4</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={styles.stepCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabelDone}>Address</Text>
          <Text style={styles.stepLabelDone}>Delivery</Text>
          <Text style={styles.stepLabel}>Payment</Text>
          <Text style={styles.stepLabelMuted}>Review</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '75%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose payment method</Text>
          {loading && paymentMethods.length === 0 ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={ShopColors.primary} />
              <Text style={styles.helperText}>Loading payment methods...</Text>
            </View>
          ) : (
            paymentMethods.map(renderMethod)
          )}
        </View>

        {/* Wallet insufficient funds warning */}
        {walletInsufficient && (
          <View style={styles.warningCard}>
            <AlertCircle size={18} stroke={Colors.error} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Insufficient wallet balance</Text>
              <Text style={styles.warningDesc}>
                Your wallet has {getCurrencySymbol(walletCurrency)}{walletBalance.toFixed(2)}. Top up to use wallet payment.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.topUpBtn}
              onPress={() => navigation.navigate('WalletScreen' as never)}
            >
              <Text style={styles.topUpBtnText}>Top Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wallet info when selected & sufficient */}
        {isWalletSelected && !walletInsufficient && (
          <View style={styles.walletInfoCard}>
            <Wallet size={18} stroke={Colors.success} strokeWidth={2} />
            <Text style={styles.walletInfoText}>
              {getCurrencySymbol(walletCurrency)}{walletBalance.toFixed(2)} will be deducted from your MetroMatrix Wallet upon order confirmation.
            </Text>
          </View>
        )}

        {/* COD info when selected */}
        {selectedMethod?.id === 'cod' && (
          <View style={styles.walletInfoCard}>
            <Banknote size={18} stroke={ShopColors.primary} strokeWidth={2} />
            <Text style={styles.walletInfoText}>
              Pay with cash when your order is delivered to your doorstep.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!selectedMethod || walletInsufficient) && styles.continueBtnDisabled,
          ]}
          disabled={!selectedMethod || walletInsufficient}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>
            {walletInsufficient ? 'Insufficient balance' : 'Continue to Review'}
          </Text>
          {!walletInsufficient && <ArrowRight size={16} stroke="#FFF" strokeWidth={2} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', ...Shadows.sm },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: Colors.text.tertiary },
  stepCard: { marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: '#FFF', ...Shadows.sm },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  stepLabel: { fontSize: 12, fontWeight: '700', color: ShopColors.primary },
  stepLabelDone: { fontSize: 12, color: ShopColors.primary, opacity: 0.75 },
  stepLabelMuted: { fontSize: 12, color: Colors.text.tertiary },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: '#F4F4F5', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ShopColors.primary, borderRadius: 999 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },
  section: { marginBottom: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: '#FFF', ...Shadows.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.md },
  methodCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  methodCardSelected: { backgroundColor: ShopColors.primaryLight, marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  methodIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  methodDesc: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2, paddingRight: Spacing.md },
  walletBalanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  walletBalanceText: { fontSize: 12, fontWeight: '600' },
  methodTag: {
    backgroundColor: '#FDEAD7',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
  },
  methodTagText: { fontSize: 11, fontWeight: '800', color: ShopColors.primary },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helperText: { fontSize: 12, color: Colors.text.tertiary },
  warningCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(231,76,60,0.08)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.2)',
  },
  warningTitle: { fontSize: 13, fontWeight: '700', color: Colors.error },
  warningDesc: { fontSize: 12, color: Colors.error, opacity: 0.8, marginTop: 2 },
  topUpBtn: {
    backgroundColor: Colors.error, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  topUpBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  walletInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(39,174,96,0.08)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(39,174,96,0.2)',
  },
  walletInfoText: { flex: 1, fontSize: 13, color: Colors.success, fontWeight: '500', lineHeight: 19 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ShopColors.primary, paddingVertical: 16, borderRadius: BorderRadius.xl },
  continueBtnDisabled: { opacity: 0.45 },
  continueBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

export default CheckoutPaymentScreen;
