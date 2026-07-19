import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Wallet, Banknote, TriangleAlert } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchPaymentMethods,
  selectCheckoutPaymentLoading,
  selectCheckoutPaymentMethods,
  selectCheckoutWalletBalance,
  selectCheckoutWalletCurrency,
  selectSelectedCheckoutPaymentMethod,
  setSelectedMethod,
} from '../CheckoutPayment/checkoutPaymentSlice';
import { selectCartTotal } from '../Cart/cartSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', danger: '#E74C3C' };
const CURRENCY = 'PKR';

const PaymentSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const methods = useAppSelector(selectCheckoutPaymentMethods);
  const selected = useAppSelector(selectSelectedCheckoutPaymentMethod);
  const loading = useAppSelector(selectCheckoutPaymentLoading);
  const walletBalance = useAppSelector(selectCheckoutWalletBalance);
  const walletCurrency = useAppSelector(selectCheckoutWalletCurrency);
  const cartTotal = useAppSelector(selectCartTotal);

  useEffect(() => {
    dispatch(fetchPaymentMethods());
  }, [dispatch]);

  const walletInsufficient = walletBalance < cartTotal;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && methods.length === 0 && (
          <ActivityIndicator color={ShopColors.primary} style={{ marginVertical: Spacing.xl }} />
        )}

        {methods.map((method) => {
          const isWallet = method.id === 'wallet';
          const disabled = isWallet && walletInsufficient;
          const isSelected = selected?.id === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.card, isSelected && styles.cardSelected, disabled && styles.cardDisabled]}
              disabled={disabled}
              onPress={() => dispatch(setSelectedMethod(method.id))}
            >
              <View style={[styles.iconWrap, isSelected && { backgroundColor: ShopColors.primaryLight }]}>
                {isWallet ? (
                  <Wallet size={20} stroke={isSelected ? ShopColors.primary : Colors.text.secondary} strokeWidth={2} />
                ) : (
                  <Banknote size={20} stroke={isSelected ? ShopColors.primary : Colors.text.secondary} strokeWidth={2} />
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{method.name}</Text>
                {isWallet ? (
                  <Text style={styles.cardDesc}>
                    Balance: {CURRENCY} {walletBalance.toLocaleString()} {walletCurrency !== 'pkr' ? `(${walletCurrency.toUpperCase()})` : ''}
                  </Text>
                ) : (
                  <Text style={styles.cardDesc}>{method.description}</Text>
                )}
                {disabled && (
                  <View style={styles.warnRow}>
                    <TriangleAlert size={14} stroke={ShopColors.danger} strokeWidth={2} />
                    <Text style={styles.warnText}>
                      Insufficient balance for this order ({CURRENCY} {cartTotal.toLocaleString()}). Top up your wallet or choose COD.
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.radio, isSelected && styles.radioOn]} />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.confirmBtn, !selected && { opacity: 0.5 }]}
          disabled={!selected}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.confirmText}>Use {selected?.name || 'Payment Method'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 2, borderColor: 'transparent', ...Shadows.sm },
  cardSelected: { borderColor: ShopColors.primary },
  cardDisabled: { opacity: 0.7 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, marginHorizontal: Spacing.md },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  cardDesc: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Spacing.xs },
  warnText: { flex: 1, fontSize: 12, color: ShopColors.danger },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioOn: { borderColor: ShopColors.primary, backgroundColor: ShopColors.primary },
  confirmBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  confirmText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default PaymentSelectionScreen;
