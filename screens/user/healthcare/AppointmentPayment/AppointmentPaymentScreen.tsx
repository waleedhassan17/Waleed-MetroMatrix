import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchWallet, selectBalance } from '../../../../services/wallet';
import {
  fetchAppointmentPaymentApi,
  payAppointmentApi,
  type AppointmentPaymentState,
} from '../../../../networks/healthcare/appointmentApi';

// Healthcare blue palette (matches the module)
const C = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  success: '#10B981',
  danger: '#EF4444',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  text: '#1A1A1A',
  textSec: '#64748B',
};

const AppointmentPaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const walletBalance = useAppSelector(selectBalance);
  const appointmentId = route.params?.appointmentId as string;

  const [payment, setPayment] = useState<AppointmentPaymentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'wallet' | 'cash_at_clinic'>('wallet');
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAppointmentPaymentApi(appointmentId);
    if (res.success) setPayment(res.data);
    else setError(res.message || 'Something went wrong');
    setLoading(false);
  }, [appointmentId]);

  useEffect(() => {
    load();
    dispatch(fetchWallet() as any);
  }, [load, dispatch]);

  const insufficient = method === 'wallet' && payment != null && walletBalance < payment.amount;

  const handlePay = async () => {
    if (!payment) return;
    setPaying(true);
    const res = await payAppointmentApi(appointmentId, method);
    setPaying(false);
    if (res.success) {
      Alert.alert(
        method === 'wallet' ? 'Payment successful' : 'Noted',
        method === 'wallet'
          ? `PKR ${payment.amount.toLocaleString()} paid from your wallet.`
          : 'You will pay in cash at the clinic. The doctor will confirm payment at your visit.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Payment failed', res.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Consultation Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : error || !payment ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Payment details unavailable'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fee Breakdown</Text>
            <View style={styles.row}><Text style={styles.rowLabel}>Doctor</Text><Text style={styles.rowValue}>{payment.doctorName || '—'}</Text></View>
            {payment.clinicName ? (
              <View style={styles.row}><Text style={styles.rowLabel}>Clinic</Text><Text style={styles.rowValue}>{payment.clinicName}</Text></View>
            ) : null}
            <View style={styles.row}><Text style={styles.rowLabel}>Consultation fee</Text><Text style={styles.rowValue}>PKR {payment.fee.toLocaleString()}</Text></View>
            {payment.discount > 0 && (
              <View style={styles.row}><Text style={styles.rowLabel}>Discount</Text><Text style={[styles.rowValue, { color: C.success }]}>−PKR {payment.discount.toLocaleString()}</Text></View>
            )}
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>PKR {payment.amount.toLocaleString()}</Text>
            </View>
          </View>

          {payment.status === 'paid' ? (
            <View style={[styles.card, styles.paidCard]}>
              <Ionicons name="checkmark-circle" size={36} color={C.success} />
              <Text style={styles.paidText}>
                Paid{payment.method === 'wallet' ? ' from wallet' : ' (cash at clinic)'}
                {payment.paidAt ? ` on ${new Date(payment.paidAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
          ) : payment.status === 'refunded' ? (
            <View style={[styles.card, styles.paidCard]}>
              <Ionicons name="arrow-undo-circle" size={36} color={C.primary} />
              <Text style={styles.paidText}>Refunded PKR {payment.refundAmount.toLocaleString()} to your wallet</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment Method</Text>
                <TouchableOpacity
                  style={[styles.methodRow, method === 'wallet' && styles.methodRowOn]}
                  onPress={() => setMethod('wallet')}
                >
                  <Ionicons name="wallet-outline" size={22} color={method === 'wallet' ? C.primary : C.textSec} />
                  <View style={styles.methodBody}>
                    <Text style={styles.methodName}>MetroMatrix Wallet</Text>
                    <Text style={styles.methodDesc}>Balance: PKR {walletBalance.toLocaleString()}</Text>
                    {insufficient && (
                      <Text style={styles.insufficientText}>
                        Insufficient balance — top up PKR {(payment.amount - walletBalance).toLocaleString()} more
                      </Text>
                    )}
                  </View>
                  <View style={[styles.radio, method === 'wallet' && styles.radioOn]} />
                </TouchableOpacity>
                {insufficient && (
                  <TouchableOpacity
                    style={styles.topUpBtn}
                    onPress={() => navigation.navigate('WalletScreen')}
                  >
                    <Text style={styles.topUpText}>Top up wallet</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.methodRow, method === 'cash_at_clinic' && styles.methodRowOn]}
                  onPress={() => setMethod('cash_at_clinic')}
                >
                  <Ionicons name="cash-outline" size={22} color={method === 'cash_at_clinic' ? C.primary : C.textSec} />
                  <View style={styles.methodBody}>
                    <Text style={styles.methodName}>Cash at Clinic</Text>
                    <Text style={styles.methodDesc}>Pay when you visit; confirmed by the doctor</Text>
                  </View>
                  <View style={[styles.radio, method === 'cash_at_clinic' && styles.radioOn]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.payBtn, (paying || insufficient) && { opacity: 0.5 }]}
                disabled={paying || insufficient}
                onPress={handlePay}
              >
                <Text style={styles.payText}>
                  {paying
                    ? 'Processing…'
                    : method === 'wallet'
                    ? `Pay PKR ${payment.amount.toLocaleString()}`
                    : 'Confirm Cash at Clinic'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.textSec, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { fontSize: 13, color: C.textSec },
  rowValue: { fontSize: 13, fontWeight: '600', color: C.text },
  totalRow: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 2 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: C.primary },
  paidCard: { alignItems: 'center', gap: 8 },
  paidText: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'center' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  methodRowOn: { borderColor: C.primary, backgroundColor: C.primaryLight },
  methodBody: { flex: 1 },
  methodName: { fontSize: 14, fontWeight: '700', color: C.text },
  methodDesc: { fontSize: 12, color: C.textSec, marginTop: 2 },
  insufficientText: { fontSize: 12, color: C.danger, marginTop: 4 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border },
  radioOn: { borderColor: C.primary, backgroundColor: C.primary },
  topUpBtn: { alignSelf: 'flex-start', marginBottom: 10, marginLeft: 4 },
  topUpText: { color: C.primary, fontWeight: '700', fontSize: 13 },
  payBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  payText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default AppointmentPaymentScreen;
