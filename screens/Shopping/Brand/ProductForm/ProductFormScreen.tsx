import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Save } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { resetDraft, selectProductForm, setError, setField, setSaving, toggleFlag } from './productFormSlice';

const ProductFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { draft, saving } = useAppSelector(selectProductForm);
  const productId = route.params?.productId as string | undefined;

  useEffect(() => {
    if (!productId) {
      dispatch(resetDraft());
    }
  }, [dispatch, productId]);

  const handleSave = () => {
    dispatch(setSaving(true));
    setTimeout(() => {
      dispatch(setSaving(false));
      dispatch(setError(null));
      Alert.alert('Saved', 'Product details have been updated.');
      navigation.goBack();
    }, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>{productId ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={draft.name} onChangeText={(text) => dispatch(setField({ key: 'name', value: text }))} />

        <Text style={styles.label}>SKU</Text>
        <TextInput style={styles.input} value={draft.sku} onChangeText={(text) => dispatch(setField({ key: 'sku', value: text }))} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline value={draft.description} onChangeText={(text) => dispatch(setField({ key: 'description', value: text }))} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Base price</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={String(draft.basePrice)} onChangeText={(text) => dispatch(setField({ key: 'basePrice', value: Number(text) || 0 }))} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Sale price</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={draft.salePrice ? String(draft.salePrice) : ''} onChangeText={(text) => dispatch(setField({ key: 'salePrice', value: text ? Number(text) : undefined }))} />
          </View>
        </View>

        <View style={styles.switchRow}>
          {(['isFeatured', 'isNewArrival', 'inStock'] as const).map((flag) => {
            const active = draft[flag];
            return (
              <TouchableOpacity key={flag} style={[styles.switchChip, active && styles.switchChipActive]} onPress={() => dispatch(toggleFlag(flag))}>
                <Text style={[styles.switchText, active && styles.switchTextActive]}>{flag.replace(/([A-Z])/g, ' $1')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={handleSave}>
          <Save size={16} stroke="#FFF" strokeWidth={2} />
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Product'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, marginBottom: 6 },
  input: { marginBottom: Spacing.md, paddingHorizontal: Spacing.md, height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, color: Colors.text.primary, ...Shadows.sm },
  multiline: { height: 100, textAlignVertical: 'top', paddingTop: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  switchChip: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, ...Shadows.sm },
  switchChipActive: { backgroundColor: Colors.primary },
  switchText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, textTransform: 'capitalize' },
  switchTextActive: { color: '#FFF' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

export default ProductFormScreen;