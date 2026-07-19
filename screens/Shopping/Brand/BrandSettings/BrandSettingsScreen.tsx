import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Save } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchMyBrand, selectBrandProfile, updateMyBrand } from '../BrandProfile/brandProfileSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6' };
const PAYMENT_OPTIONS = ['wallet', 'cod'];

const BrandSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { brand, loading, saving, error } = useAppSelector(selectBrandProfile);

  const [returnDays, setReturnDays] = useState('7');
  const [shippingInfo, setShippingInfo] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(PAYMENT_OPTIONS);

  useEffect(() => {
    if (!brand) dispatch(fetchMyBrand());
  }, [dispatch, brand]);

  useEffect(() => {
    if (brand?.policies) {
      setReturnDays(String(brand.policies.returnDays ?? 7));
      setShippingInfo(brand.policies.shippingInfo ?? '');
      setPaymentMethods(brand.policies.paymentMethods?.length ? brand.policies.paymentMethods : PAYMENT_OPTIONS);
    }
  }, [brand]);

  const togglePayment = (method: string) => {
    setPaymentMethods((current) => {
      if (current.includes(method)) {
        if (current.length === 1) return current; // keep at least one
        return current.filter((m) => m !== method);
      }
      return [...current, method];
    });
  };

  const handleSave = async () => {
    const days = parseInt(returnDays, 10);
    if (Number.isNaN(days) || days < 0) {
      Alert.alert('Invalid value', 'Return window must be a non-negative number of days.');
      return;
    }
    const result = await dispatch(
      updateMyBrand({ policies: { returnDays: days, shippingInfo, paymentMethods } })
    );
    if (updateMyBrand.fulfilled.match(result)) {
      Alert.alert('Saved', 'Your brand settings have been updated.');
    } else {
      Alert.alert('Could not save', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Brand Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !brand ? (
        <View style={styles.center}><ActivityIndicator color={ShopColors.primary} size="large" /></View>
      ) : error && !brand ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchMyBrand())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Return Policy</Text>
            <Text style={styles.fieldLabel}>Return window (days after delivery)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={returnDays}
              onChangeText={setReturnDays}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shipping Information</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              placeholder="e.g. Delivery within 3-5 working days."
              placeholderTextColor={Colors.text.tertiary}
              value={shippingInfo}
              onChangeText={setShippingInfo}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
            {PAYMENT_OPTIONS.map((method) => (
              <View key={method} style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {method === 'wallet' ? 'MetroMatrix Wallet' : 'Cash on Delivery'}
                </Text>
                <Switch
                  value={paymentMethods.includes(method)}
                  onValueChange={() => togglePayment(method)}
                  trackColor={{ true: ShopColors.primary, false: Colors.border }}
                  thumbColor="#FFF"
                />
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Save size={18} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text.primary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  switchLabel: { fontSize: 14, color: Colors.text.primary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ShopColors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default BrandSettingsScreen;
