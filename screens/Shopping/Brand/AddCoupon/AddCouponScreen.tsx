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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Save } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  createBrandCoupon,
  selectBrandCoupons,
  updateBrandCoupon,
} from '../BrandCoupons/brandCouponsSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6' };

const DAY_MS = 86400000;

const AddCouponScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { coupons, saving } = useAppSelector(selectBrandCoupons);
  const editCode = route.params?.couponCode as string | undefined;
  const editing = coupons.find((c) => c.couponCode === editCode);

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('10');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('0');
  const [usageLimit, setUsageLimit] = useState('0');
  const [validDays, setValidDays] = useState('30');

  useEffect(() => {
    if (editing) {
      setCode(editing.couponCode);
      setType(editing.type);
      setValue(String(editing.value));
      setMinOrderAmount(String(editing.minOrderAmount));
      setMaxDiscount(String(editing.maxDiscount));
      setUsageLimit(String(editing.usageLimit));
      const daysLeft = Math.max(
        1,
        Math.ceil((new Date(editing.validUntil).getTime() - Date.now()) / DAY_MS)
      );
      setValidDays(String(daysLeft));
    }
  }, [editing]);

  const handleSave = async () => {
    if (!code.trim()) {
      Alert.alert('Validation', 'A coupon code is required.');
      return;
    }
    const numValue = Number(value);
    if (!numValue || numValue <= 0 || (type === 'percentage' && numValue > 100)) {
      Alert.alert('Validation', type === 'percentage' ? 'Percentage must be 1-100.' : 'Value must be positive.');
      return;
    }
    const days = Math.max(1, Number(validDays) || 30);
    const payload = {
      couponCode: code.trim().toUpperCase(),
      type,
      value: numValue,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      usageLimit: Number(usageLimit) || 0,
      validFrom: editing ? editing.validFrom : new Date().toISOString(),
      validUntil: new Date(Date.now() + days * DAY_MS).toISOString(),
    };

    const result = editing
      ? await dispatch(updateBrandCoupon({ couponCode: editing.couponCode, updates: payload }))
      : await dispatch(createBrandCoupon(payload));

    if (createBrandCoupon.fulfilled.match(result) || updateBrandCoupon.fulfilled.match(result)) {
      Alert.alert('Saved', editing ? 'Coupon updated.' : 'Coupon created.');
      navigation.goBack();
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
        <Text style={styles.title}>{editing ? 'Edit Coupon' : 'New Coupon'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Coupon Code</Text>
          <TextInput
            style={[styles.input, editing ? styles.inputDisabled : null]}
            autoCapitalize="characters"
            editable={!editing}
            value={code}
            onChangeText={setCode}
            placeholder="e.g. SAVE20"
            placeholderTextColor={Colors.text.tertiary}
          />

          <Text style={styles.fieldLabel}>Discount Type</Text>
          <View style={styles.typeRow}>
            {(['percentage', 'fixed'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipOn]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextOn]}>
                  {t === 'percentage' ? 'Percentage %' : 'Fixed amount'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{type === 'percentage' ? 'Percentage (1-100)' : 'Amount (PKR)'}</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={value} onChangeText={setValue} />

          <Text style={styles.fieldLabel}>Minimum order amount (PKR, 0 = none)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={minOrderAmount} onChangeText={setMinOrderAmount} />

          {type === 'percentage' && (
            <>
              <Text style={styles.fieldLabel}>Maximum discount (PKR, 0 = uncapped)</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={maxDiscount} onChangeText={setMaxDiscount} />
            </>
          )}

          <Text style={styles.fieldLabel}>Usage limit (0 = unlimited)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={usageLimit} onChangeText={setUsageLimit} />

          <Text style={styles.fieldLabel}>Valid for (days from now)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={validDays} onChangeText={setValidDays} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Save size={18} stroke="#FFF" strokeWidth={2} />
          <Text style={styles.saveText}>{saving ? 'Saving…' : editing ? 'Update Coupon' : 'Create Coupon'}</Text>
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
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, marginBottom: 4, marginTop: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text.primary },
  inputDisabled: { backgroundColor: Colors.background, color: Colors.text.tertiary },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeChip: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  typeChipOn: { backgroundColor: ShopColors.primaryLight, borderColor: ShopColors.primary },
  typeText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  typeTextOn: { color: ShopColors.primary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ShopColors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default AddCouponScreen;
