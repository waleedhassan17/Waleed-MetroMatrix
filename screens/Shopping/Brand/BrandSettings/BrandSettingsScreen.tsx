import React, { useEffect, useMemo, useState } from 'react';
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
import { Save } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchMyBrand, selectBrandProfile, updateMyBrand } from '../BrandProfile/brandProfileSlice';
import { ShopColors } from '../theme';
import BrandHeader from '../BrandHeader';
import BrandThemeEditor, { BrandThemeValue } from '../../../../components/Shopping/BrandThemeEditor';
import { ThemeColors, useTheme } from '../../../../theme';
import { C, F, T } from '../../../../constants/theme';
import { SHOPPING_PAYMENT_VALUES, paymentMethodLabel } from '../../../../constants/shopping';

// Same two rails, same values, one definition — see constants/shopping.ts.
const PAYMENT_OPTIONS = SHOPPING_PAYMENT_VALUES;

const BrandSettingsScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { brand, loading, saving, error } = useAppSelector(selectBrandProfile);

  const [returnDays, setReturnDays] = useState('7');
  const [shippingInfo, setShippingInfo] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(PAYMENT_OPTIONS);
  const [theme, setTheme] = useState<BrandThemeValue>({
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
  });

  useEffect(() => {
    if (!brand) dispatch(fetchMyBrand());
  }, [dispatch, brand]);

  useEffect(() => {
    if (brand) {
      setTheme({
        primaryColor: brand.primaryColor ?? '',
        secondaryColor: brand.secondaryColor ?? '',
        accentColor: brand.accentColor ?? '',
      });
    }
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
      updateMyBrand({
        policies: { returnDays: days, shippingInfo, paymentMethods },
        ...theme,
      })
    );
    if (updateMyBrand.fulfilled.match(result)) {
      Alert.alert('Saved', 'Your brand settings have been updated.');
    } else {
      Alert.alert('Could not save', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={Colors.background} />
      <BrandHeader title="Brand Settings" showBack />

      {loading && !brand ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
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
                <Text style={styles.switchLabel}>{paymentMethodLabel(method)}</Text>
                <Switch
                  value={paymentMethods.includes(method)}
                  onValueChange={() => togglePayment(method)}
                  trackColor={{ true: colors.accent, false: Colors.border }}
                  thumbColor={C.surface}
                />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Store appearance</Text>
            <Text style={styles.sectionHelp}>
              Your colours across your own dashboard and the store your customers see.
              Leave them as they are to use the MetroMatrix shopping default.
            </Text>
            <BrandThemeEditor value={theme} onChange={setTheme} />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Save size={18} stroke={C.surface} strokeWidth={2} />
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

// Built per render from the resolved theme so a brand's colours reach
// rules that live at module scope. Layout, spacing and type are unchanged.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { backgroundColor: c.accent, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: C.surface, fontFamily: F.bold },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  sectionTitle: { ...T.body, fontFamily: F.bold, color: Colors.text.primary, marginBottom: Spacing.md },
  sectionHelp: { ...T.caption, lineHeight: 17, color: Colors.text.secondary, marginBottom: Spacing.md },
  fieldLabel: { ...T.caption, fontFamily: F.semibold, color: Colors.text.secondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, ...T.body, color: Colors.text.primary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  switchLabel: { ...T.body, color: Colors.text.primary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.accent, borderRadius: BorderRadius.lg, paddingVertical: 14 },
  saveText: { color: C.surface, ...T.body, fontFamily: F.bold },
});

export default BrandSettingsScreen;
