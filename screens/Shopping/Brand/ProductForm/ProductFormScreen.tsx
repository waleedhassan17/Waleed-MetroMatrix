import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Save,
  ImagePlus,
  Tag,
  DollarSign,
  Check,
} from 'lucide-react-native';
import { Shadows } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { resetDraft, selectProductForm, setError, setField, setSaving, toggleFlag } from './productFormSlice';

const STATUS_BAR_H = Platform.OS === 'android' ? StatusBar.currentHeight || 44 : 44;

const B = {
  primary: '#E67E22',
  primaryLight: '#FFF5EB',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
};

const FLAG_LABELS: Record<string, string> = {
  isFeatured: 'Featured',
  isNewArrival: 'New Arrival',
  inStock: 'In Stock',
};

const ProductFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { draft, saving } = useAppSelector(selectProductForm);
  const productId = route.params?.productId as string | undefined;
  const isEdit = Boolean(productId);

  useEffect(() => {
    if (!productId) { dispatch(resetDraft()); }
  }, [dispatch, productId]);

  const handleSave = () => {
    if (!draft.name.trim()) {
      Alert.alert('Validation', 'Product name is required.');
      return;
    }
    dispatch(setSaving(true));
    setTimeout(() => {
      dispatch(setSaving(false));
      dispatch(setError(null));
      Alert.alert('Saved', isEdit ? 'Product has been updated.' : 'Product has been created.');
      navigation.goBack();
    }, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{isEdit ? 'Edit Product' : 'New Product'}</Text>
          <Text style={styles.subtitle}>{isEdit ? 'Update product details' : 'Add to your catalog'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveHeaderBtn, saving && { opacity: 0.5 }]}
          disabled={saving}
          onPress={handleSave}
        >
          <Save size={16} stroke="#FFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image placeholder */}
        <TouchableOpacity style={styles.imagePlaceholder} activeOpacity={0.7}>
          <ImagePlus size={28} stroke={B.textMuted} strokeWidth={1.5} />
          <Text style={styles.imagePlaceholderText}>Tap to add product images</Text>
        </TouchableOpacity>

        {/* Basic Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Tag size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Classic Fit Polo Shirt"
            placeholderTextColor={B.textMuted}
            value={draft.name}
            onChangeText={(text) => dispatch(setField({ key: 'name', value: text }))}
          />
          <Text style={styles.label}>SKU</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. OUT-POLO-001"
            placeholderTextColor={B.textMuted}
            value={draft.sku}
            onChangeText={(text) => dispatch(setField({ key: 'sku', value: text }))}
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Describe the product..."
            placeholderTextColor={B.textMuted}
            multiline
            value={draft.description}
            onChangeText={(text) => dispatch(setField({ key: 'description', value: text }))}
          />
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Base Price (PKR)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={B.textMuted}
                value={String(draft.basePrice)}
                onChangeText={(text) => dispatch(setField({ key: 'basePrice', value: Number(text) || 0 }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Sale Price (PKR)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Optional"
                placeholderTextColor={B.textMuted}
                value={draft.salePrice ? String(draft.salePrice) : ''}
                onChangeText={(text) => dispatch(setField({ key: 'salePrice', value: text ? Number(text) : undefined }))}
              />
            </View>
          </View>
        </View>

        {/* Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Flags</Text>
          <View style={styles.flagsRow}>
            {(['isFeatured', 'isNewArrival', 'inStock'] as const).map((flag) => {
              const active = draft[flag];
              return (
                <TouchableOpacity
                  key={flag}
                  style={[styles.flagChip, active && styles.flagChipActive]}
                  onPress={() => dispatch(toggleFlag(flag))}
                >
                  {active && <Check size={14} stroke="#FFF" strokeWidth={2.5} />}
                  <Text style={[styles.flagText, active && styles.flagTextActive]}>
                    {FLAG_LABELS[flag]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          disabled={saving}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Save size={18} stroke="#FFF" strokeWidth={2} />
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_H + 10,
    paddingBottom: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: B.text },
  subtitle: { fontSize: 12, fontWeight: '600', color: B.textMuted, marginTop: 1 },
  saveHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.primary,
  },
  content: { padding: 16, paddingBottom: 40 },

  // Image placeholder
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 140,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: B.border,
    backgroundColor: B.surface,
    marginBottom: 16,
  },
  imagePlaceholderText: { fontSize: 13, fontWeight: '600', color: B.textMuted },

  // Section
  section: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: B.text, marginBottom: 4 },

  // Form
  label: { fontSize: 12, fontWeight: '700', color: B.textSec, marginBottom: 6, marginTop: 4 },
  input: {
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: B.bg,
    color: B.text,
    fontSize: 14,
  },
  multiline: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 10 },

  // Flags
  flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: B.bg,
    borderWidth: 1,
    borderColor: B.border,
  },
  flagChipActive: {
    backgroundColor: B.primary,
    borderColor: B.primary,
  },
  flagText: { fontSize: 13, fontWeight: '700', color: B.textSec },
  flagTextActive: { color: '#FFF' },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: B.primary,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});

export default ProductFormScreen;