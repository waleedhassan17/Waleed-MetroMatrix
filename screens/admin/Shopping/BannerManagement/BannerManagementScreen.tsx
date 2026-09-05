import React, { useEffect, useMemo } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { useTheme } from '../../../../theme';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Save, Plus, Trash2, Pencil, EyeOff, X } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchBanners,
  saveBanner,
  removeBanner,
  startCreate,
  startEdit,
  updateDraft,
  selectBanners,
  selectBannerBrands,
  selectBannerDraft,
  selectBannerEditingId,
  selectBannerLoading,
  selectBannerSaving,
  selectBannerError,
} from './bannerManagementSlice';

const COLORS = {
  primary: '#E67E22',
  danger: '#E74C3C',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const BannerManagementScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const banners = useAppSelector(selectBanners);
  const brands = useAppSelector(selectBannerBrands);
  const draft = useAppSelector(selectBannerDraft);
  const editingId = useAppSelector(selectBannerEditingId);
  const loading = useAppSelector(selectBannerLoading);
  const saving = useAppSelector(selectBannerSaving);
  const error = useAppSelector(selectBannerError);

  useEffect(() => {
    dispatch(fetchBanners());
  }, [dispatch]);

  const handleSave = async () => {
    const result = await dispatch(saveBanner());
    if (saveBanner.fulfilled.match(result)) {
      Alert.alert('Saved', 'The storefront carousel updates on the next refresh.');
    } else {
      Alert.alert('Could not save', (result.payload as string) || 'Please try again.');
    }
  };

  const handleDelete = (bannerId: string, title: string) => {
    Alert.alert('Delete banner', `Remove "${title}" from the storefront?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(removeBanner(bannerId));
          if (removeBanner.rejected.match(result)) {
            Alert.alert('Could not delete', (result.payload as string) || 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Promo Banners</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && banners.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* ── Editor ─────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{editingId ? 'Edit banner' : 'New banner'}</Text>
              {!!editingId && (
                <TouchableOpacity onPress={() => dispatch(startCreate())} style={styles.linkBtn}>
                  <X size={14} stroke={COLORS.textLight} strokeWidth={2} />
                  <Text style={styles.linkText}>Cancel edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                placeholder="Winter Collection"
                placeholderTextColor={COLORS.textLight}
                onChangeText={(title) => dispatch(updateDraft({ title }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Subtitle</Text>
              <TextInput
                style={styles.input}
                value={draft.subtitle}
                placeholder="Optional supporting line"
                placeholderTextColor={COLORS.textLight}
                onChangeText={(subtitle) => dispatch(updateDraft({ subtitle }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Image URL</Text>
              <TextInput
                style={styles.input}
                value={draft.image}
                autoCapitalize="none"
                placeholder="https://…"
                placeholderTextColor={COLORS.textLight}
                onChangeText={(image) => dispatch(updateDraft({ image }))}
              />
              {!!draft.image.trim() && (
                <Image source={{ uri: draft.image.trim() }} style={styles.preview} />
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Links to brand</Text>
              <Text style={styles.fieldHint}>
                Tapping the banner opens this brand's storefront. Leave as "None" for a
                decorative banner.
              </Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  style={[styles.chip, !draft.brandId && styles.chipActive]}
                  onPress={() => dispatch(updateDraft({ brandId: '' }))}
                >
                  <Text style={[styles.chipText, !draft.brandId && styles.chipTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {brands.map((b) => (
                  <TouchableOpacity
                    key={b.brandId}
                    style={[styles.chip, draft.brandId === b.brandId && styles.chipActive]}
                    onPress={() => dispatch(updateDraft({ brandId: b.brandId }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.brandId === b.brandId && styles.chipTextActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sort order</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={draft.sortOrder}
                onChangeText={(sortOrder) => dispatch(updateDraft({ sortOrder }))}
              />
              <Text style={styles.fieldHint}>Lower numbers appear first in the carousel</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Active</Text>
                <Text style={styles.fieldHint}>Inactive banners stay here but never show</Text>
              </View>
              <Switch
                value={draft.isActive}
                onValueChange={(isActive) => {
                  dispatch(updateDraft({ isActive }));
                }}
                trackColor={{ true: COLORS.primary, false: COLORS.border }}
                thumbColor="#FFF"
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {editingId ? (
                <Save size={18} stroke="#FFF" strokeWidth={2} />
              ) : (
                <Plus size={18} stroke="#FFF" strokeWidth={2} />
              )}
              <Text style={styles.saveText}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add banner'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Existing banners ───────────────── */}
          <Text style={styles.sectionTitle}>
            {banners.length} banner{banners.length === 1 ? '' : 's'}
          </Text>

          {banners.length === 0 ? (
            <Text style={styles.emptyText}>
              No banners yet. The storefront simply hides the carousel until you add one.
            </Text>
          ) : (
            banners.map((banner) => (
              <View key={banner.bannerId} style={styles.row}>
                <Image source={{ uri: banner.image }} style={styles.rowImage} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTitleLine}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {banner.title}
                    </Text>
                    {!banner.isActive && (
                      <View style={styles.hiddenPill}>
                        <EyeOff size={11} stroke={COLORS.textLight} strokeWidth={2} />
                        <Text style={styles.hiddenPillText}>Hidden</Text>
                      </View>
                    )}
                  </View>
                  {!!banner.subtitle && (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {banner.subtitle}
                    </Text>
                  )}
                  <Text style={styles.rowMeta}>
                    #{banner.sortOrder}
                    {banner.brandId
                      ? ` · ${brands.find((b) => b.brandId === banner.brandId)?.name ?? 'brand'}`
                      : ' · no link'}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={styles.rowBtn}
                    onPress={() => dispatch(startEdit(banner.bannerId))}
                  >
                    <Pencil size={16} stroke={COLORS.primary} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rowBtn}
                    onPress={() => handleDelete(banner.bannerId, banner.title)}
                  >
                    <Trash2 size={16} stroke={COLORS.danger} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 16, paddingBottom: 40 },
  errorText: { color: COLORS.danger, fontSize: 13, marginBottom: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  fieldHint: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: COLORS.text },
  preview: { width: '100%', height: 110, borderRadius: 10, marginTop: 10, backgroundColor: COLORS.border },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textLight, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { fontSize: 13, color: COLORS.textLight, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  rowImage: { width: 64, height: 48, borderRadius: 8, backgroundColor: COLORS.border },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  hiddenPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.bg, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  hiddenPillText: { fontSize: 10, color: COLORS.textLight, fontWeight: '700' },
  rowSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
  rowMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
  rowActions: { flexDirection: 'row', gap: 4 },
  rowBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
});

export default BannerManagementScreen;
