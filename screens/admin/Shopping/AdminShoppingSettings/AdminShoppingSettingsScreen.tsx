import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Save, TriangleAlert } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchShoppingSettings,
  saveShoppingSettings,
  selectAdminShoppingSettings,
} from './adminShoppingSettingsSlice';

const COLORS = {
  primary: '#E67E22',
  warn: '#F59E0B',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const NUMERIC_FIELDS: { key: 'commissionPercent' | 'shippingFeePerBrand' | 'freeShippingThreshold' | 'lowStockThreshold' | 'defaultReturnDays'; label: string; hint: string }[] = [
  { key: 'commissionPercent', label: 'Platform commission (%)', hint: 'Deducted from vendor payouts at delivery' },
  { key: 'shippingFeePerBrand', label: 'Shipping fee per brand (PKR)', hint: 'Charged per brand in a checkout' },
  { key: 'freeShippingThreshold', label: 'Free shipping threshold (PKR)', hint: "Waives a brand's fee at this subtotal" },
  { key: 'lowStockThreshold', label: 'Low-stock threshold (units)', hint: 'Flags variants at or below this level' },
  { key: 'defaultReturnDays', label: 'Default return window (days)', hint: 'Fallback when a brand sets no policy' },
];

const AdminShoppingSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { settings, loading, saving, error } = useAppSelector(selectAdminShoppingSettings);
  const [form, setForm] = useState<Record<string, string>>({});
  const [autoApprove, setAutoApprove] = useState(false);

  useEffect(() => {
    dispatch(fetchShoppingSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setForm({
        commissionPercent: String(settings.commissionPercent),
        shippingFeePerBrand: String(settings.shippingFeePerBrand),
        freeShippingThreshold: String(settings.freeShippingThreshold),
        lowStockThreshold: String(settings.lowStockThreshold),
        defaultReturnDays: String(settings.defaultReturnDays),
      });
      setAutoApprove(settings.autoApproveBrands);
    }
  }, [settings]);

  const handleSave = async () => {
    const patch: Record<string, number | boolean> = { autoApproveBrands: autoApprove };
    for (const field of NUMERIC_FIELDS) {
      const parsed = Number(form[field.key]);
      if (Number.isNaN(parsed) || parsed < 0) {
        Alert.alert('Invalid value', `${field.label} must be a non-negative number.`);
        return;
      }
      patch[field.key] = parsed;
    }
    const result = await dispatch(saveShoppingSettings(patch));
    if (saveShoppingSettings.fulfilled.match(result)) {
      Alert.alert('Saved', 'Settings updated — these values drive live checkout behaviour.');
    } else {
      Alert.alert('Could not save', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Shopping Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !settings ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : error && !settings ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchShoppingSettings())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.warnBanner}>
            <TriangleAlert size={16} stroke={COLORS.warn} strokeWidth={2} />
            <Text style={styles.warnText}>
              These values drive LIVE behaviour: checkout totals, vendor payouts, stock alerts and brand approval.
            </Text>
          </View>

          <View style={styles.card}>
            {NUMERIC_FIELDS.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={form[field.key] ?? ''}
                  onChangeText={(value) => setForm((f) => ({ ...f, [field.key]: value }))}
                />
                <Text style={styles.fieldHint}>{field.hint}</Text>
              </View>
            ))}

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Auto-approve new vendor brands</Text>
                <Text style={styles.fieldHint}>When off, new brands stay pending until approved here</Text>
              </View>
              <Switch
                value={autoApprove}
                onValueChange={setAutoApprove}
                trackColor={{ true: COLORS.primary, false: COLORS.border }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Save size={18} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  center: { alignItems: 'center', padding: 24 },
  errorText: { color: COLORS.textLight, marginBottom: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  warnBanner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 14 },
  warnText: { flex: 1, fontSize: 12, color: '#92400E' },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  fieldHint: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: COLORS.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default AdminShoppingSettingsScreen;
