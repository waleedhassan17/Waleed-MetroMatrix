import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Save,
  ImagePlus,
  Tag,
  DollarSign,
  Check,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { Shadows } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  loadProductDraft,
  resetDraft,
  saveProductDraft,
  selectProductForm,
  setField,
  toggleFlag,
  addVariant,
  updateVariant,
  removeVariant,
  fetchFormCategories,
  createFormCategory,
} from './productFormSlice';
import { swatchColor } from '../../../../constants/ProductColors';
import { upsertProduct } from '../BrandProducts/brandProductsSlice';
import { B, formatOrderNumber } from '../theme';
import BrandHeader from '../BrandHeader';



// `inStock` is intentionally absent: it is not server-editable (the API derives
// it from variant stock), so a toggle for it looked active and did nothing.
const FLAG_LABELS: Record<string, string> = {
  isFeatured: 'Featured',
  isNewArrival: 'New Arrival',
};

const ProductFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { draft, saving, categories, categoriesLoading } = useAppSelector(selectProductForm);
  const [newCategory, setNewCategory] = useState('');
  const productId = route.params?.productId as string | undefined;
  const isEdit = Boolean(productId);

  useEffect(() => {
    if (!productId) {
      dispatch(resetDraft());
    } else {
      dispatch(loadProductDraft(productId));
    }
    // The only source of valid categoryIds. Without this the form shipped a
    // hardcoded slug the backend could not cast to an ObjectId.
    dispatch(fetchFormCategories());
  }, [dispatch, productId]);

  // The seed nests real categories under Men/Women parents and assigns
  // products to the leaves. A vendor who made their own will have none.
  const selectableCategories = useMemo(() => {
    const leaves = categories.filter((c) => c.parentId);
    return leaves.length > 0 ? leaves : categories;
  }, [categories]);

  const totalStock = draft.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);

  const handleSave = async () => {
    // Catch locally what the server would reject anyway, so the vendor gets a
    // useful message instead of a round trip.
    if (!draft.name.trim()) return Alert.alert('Validation', 'Product name is required.');
    if (!draft.sku.trim()) return Alert.alert('Validation', 'SKU is required.');
    if (!draft.basePrice || draft.basePrice <= 0)
      return Alert.alert('Validation', 'Base price must be greater than zero.');
    if (draft.salePrice && draft.salePrice >= draft.basePrice)
      return Alert.alert('Validation', 'Sale price must be lower than the base price.');
    if (!draft.categoryId)
      return Alert.alert('Validation', 'Choose a category for this product.');
    if (!draft.variants.some((v) => (v.size || '').trim() || (v.color || '').trim()))
      return Alert.alert('Validation', 'Add at least one variant with a size or a colour.');

    const result = await dispatch(saveProductDraft());
    if (saveProductDraft.fulfilled.match(result)) {
      dispatch(upsertProduct(result.payload));
      Alert.alert('Saved', isEdit ? 'Product has been updated.' : 'Product has been created.');
      navigation.goBack();
      return;
    }

    const err = result.payload as { message?: string; code?: string } | undefined;
    if (err?.code === 'NO_BRAND') {
      Alert.alert(
        'No brand profile',
        'Your vendor account is not linked to a brand yet, so products cannot be created. Ask the platform admin to set up your brand.'
      );
      return;
    }
    Alert.alert('Could not save', err?.message || 'Please try again.');
  };

  const handleCreateCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const res = await dispatch(createFormCategory(name));
    if (createFormCategory.fulfilled.match(res)) setNewCategory('');
    else Alert.alert('Could not create category', (res.payload as string) || 'Please try again.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      <BrandHeader
        title={isEdit ? 'Edit Product' : 'New Product'}
        subtitle={isEdit ? 'Update product details' : 'Add to your catalog'}
        showBack
        actions={
          <TouchableOpacity
            style={[styles.saveHeaderBtn, saving && { opacity: 0.5 }]}
            disabled={saving}
            onPress={handleSave}
          >
            <Save size={16} stroke="#FFF" strokeWidth={2} />
          </TouchableOpacity>
        }
      />

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

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          {categoriesLoading && <Text style={styles.hintText}>Loading categories...</Text>}

          {!categoriesLoading && selectableCategories.length === 0 && (
            <>
              <Text style={styles.hintText}>
                You have no categories yet. Create one to file this product under.
              </Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input, styles.inlineInput]}
                  placeholder="e.g. Shirts"
                  placeholderTextColor={B.textMuted}
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
                <TouchableOpacity
                  style={[styles.inlineBtn, !newCategory.trim() && styles.inlineBtnDisabled]}
                  onPress={handleCreateCategory}
                  disabled={!newCategory.trim()}
                >
                  <Text style={styles.inlineBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.flagsRow}>
            {selectableCategories.map((cat) => {
              const active = draft.categoryId === cat.categoryId;
              return (
                <TouchableOpacity
                  key={cat.categoryId}
                  style={[styles.flagChip, active && styles.flagChipActive]}
                  onPress={() => dispatch(setField({ key: 'categoryId', value: cat.categoryId }))}
                >
                  {active && <Check size={14} stroke="#FFF" strokeWidth={2.5} />}
                  <Text style={[styles.flagText, active && styles.flagTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Variants */}
        <View style={styles.section}>
          <View style={styles.variantHeaderRow}>
            <Text style={styles.sectionTitle}>Variants</Text>
            <TouchableOpacity style={styles.addVariantBtn} onPress={() => dispatch(addVariant())}>
              <Plus size={14} stroke={B.primary} strokeWidth={2.5} />
              <Text style={styles.addVariantText}>Add variant</Text>
            </TouchableOpacity>
          </View>

          {draft.variants.map((v, index) => (
            <View key={v.variantId ?? index} style={styles.variantCard}>
              <View style={styles.variantRow}>
                <View style={styles.variantField}>
                  <Text style={styles.label}>Size</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="M / 32 / One Size"
                    placeholderTextColor={B.textMuted}
                    value={v.size ?? ''}
                    onChangeText={(value) =>
                      dispatch(updateVariant({ index, key: 'size', value }))
                    }
                  />
                </View>

                <View style={styles.variantField}>
                  <Text style={styles.label}>Colour</Text>
                  <View style={styles.colorInputRow}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: swatchColor(v.color, v.colorCode) },
                      ]}
                    />
                    <TextInput
                      style={[styles.input, styles.colorInput]}
                      placeholder="Black"
                      placeholderTextColor={B.textMuted}
                      value={v.color ?? ''}
                      onChangeText={(value) =>
                        dispatch(updateVariant({ index, key: 'color', value }))
                      }
                    />
                  </View>
                </View>
              </View>

              <View style={styles.variantRow}>
                <View style={styles.variantField}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={B.textMuted}
                    keyboardType="number-pad"
                    value={String(v.stockQuantity ?? 0)}
                    onChangeText={(value) =>
                      dispatch(updateVariant({
                        index,
                        key: 'stockQuantity',
                        value: Number(value.replace(/[^0-9]/g, '')) || 0,
                      }))
                    }
                  />
                </View>

                {draft.variants.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeVariantBtn}
                    onPress={() => dispatch(removeVariant(index))}
                  >
                    <Trash2 size={16} stroke={B.danger} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Derived, never toggled — the server computes inStock from stock. */}
          <Text style={styles.hintText}>
            {totalStock > 0
              ? `In stock — ${totalStock} unit${totalStock === 1 ? '' : 's'} across ${draft.variants.length} variant${draft.variants.length === 1 ? '' : 's'}`
              : 'Out of stock — add stock to at least one variant'}
          </Text>
        </View>

        {/* Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Flags</Text>
          <View style={styles.flagsRow}>
            {(['isFeatured', 'isNewArrival'] as const).map((flag) => {
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
  hintText: { fontSize: 12, color: B.textMuted, marginBottom: 10, lineHeight: 17 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inlineInput: { flex: 1, marginBottom: 0 },
  inlineBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10,
    backgroundColor: B.primary,
  },
  inlineBtnDisabled: { opacity: 0.5 },
  inlineBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  variantHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  addVariantBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6 },
  addVariantText: { color: B.primary, fontWeight: '700', fontSize: 13 },
  variantCard: {
    borderWidth: 1, borderColor: B.border, borderRadius: 12,
    padding: 12, marginTop: 10, backgroundColor: B.surface,
  },
  variantRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  variantField: { flex: 1 },
  colorInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorInput: { flex: 1, marginBottom: 0 },
  colorDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, borderColor: B.border,
  },
  removeVariantBtn: {
    width: 44, height: 44, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: B.border,
  },

  container: { flex: 1, backgroundColor: B.bg },
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