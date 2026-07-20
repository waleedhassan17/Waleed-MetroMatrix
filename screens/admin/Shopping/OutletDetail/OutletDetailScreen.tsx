import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Check,
  Save,
  Link2,
  Palette,
  Info,
  MapPin,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import type { AdminShoppingParamList, OutletColorScheme } from '../../../../types/shopping';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  fetchOutletDetail,
  saveOutletChanges,
  assignBrand,
  applyColorScheme,
  setActiveTab,
  patchEdit,
  patchColorScheme,
  clearMessages,
  selectOutletDetail,
  selectEditedOutlet,
  selectOutletDetailLoading,
  selectOutletDetailSaving,
  selectOutletDetailAssigning,
  selectOutletDetailUpdatingColors,
  selectOutletDetailError,
  selectOutletDetailSuccess,
  selectOutletActiveTab,
} from './outletDetailSlice';
import { fetchAdminBrandsApi, type AdminBrandView } from '../../../../networks/shopping/adminShoppingApi';

type Props = NativeStackScreenProps<AdminShoppingParamList, 'AdminOutletDetail'>;

const COLORS = {
  primary: '#E67E22',
  success: '#27AE60',
  danger: '#E74C3C',
  info: '#3498DB',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const COLOR_PRESETS = [
  '#E67E22', '#C0392B', '#2980B9', '#27AE60', '#8E44AD',
  '#D35400', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6',
  '#F39C12', '#1ABC9C', '#2C3E50', '#7F8C8D', '#ECF0F1',
];

const OutletDetailScreen: React.FC<Props> = ({ route }) => {
  const { outletId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<AdminShoppingParamList>>();
  const dispatch = useAppDispatch();

  const outlet = useAppSelector(selectOutletDetail);
  const edited = useAppSelector(selectEditedOutlet);
  const loading = useAppSelector(selectOutletDetailLoading);
  const saving = useAppSelector(selectOutletDetailSaving);
  const assigning = useAppSelector(selectOutletDetailAssigning);
  const updatingColors = useAppSelector(selectOutletDetailUpdatingColors);
  const error = useAppSelector(selectOutletDetailError);
  const successMessage = useAppSelector(selectOutletDetailSuccess);
  const activeTab = useAppSelector(selectOutletActiveTab);

  const [brands, setBrands] = useState<AdminBrandView[]>([]);
  useEffect(() => {
    fetchAdminBrandsApi({ page: 1, limit: 100 })
      .then((res) => setBrands(res.data || []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => { dispatch(fetchOutletDetail(outletId)); }, [dispatch, outletId]);

  useEffect(() => {
    if (error) { Alert.alert('Error', error); dispatch(clearMessages()); }
  }, [error, dispatch]);

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Success', successMessage);
      dispatch(clearMessages());
    }
  }, [successMessage, dispatch]);

  const handleSaveInfo = useCallback(() => { dispatch(saveOutletChanges()); }, [dispatch]);

  const handleAssignBrand = useCallback((brandId: string, brandName: string) => {
    Alert.alert(
      'Assign Brand',
      `Assign "${brandName}" to this outlet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: () => dispatch(assignBrand({ outletId, brandId })),
        },
      ]
    );
  }, [dispatch, outletId]);

  const handleApplyColors = useCallback(() => {
    const cs = edited?.colorScheme || outlet?.colorScheme;
    if (!cs) return;
    dispatch(applyColorScheme({ outletId, colorScheme: cs as OutletColorScheme }));
  }, [dispatch, outletId, edited, outlet]);

  const handleApplyBrandColors = useCallback((brand: AdminBrandView) => {
    const cs: OutletColorScheme = {
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      accentColor: brand.accentColor,
      headerBg: brand.primaryColor,
      textOnHeader: '#FFFFFF',
    };
    dispatch(patchColorScheme(cs));
  }, [dispatch]);

  if (loading || !outlet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <ChevronLeft size={22} stroke={COLORS.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Outlet Details</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading outlet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cs = edited?.colorScheme || outlet.colorScheme || {
    primaryColor: '#E67E22', secondaryColor: '#2C3E50',
    accentColor: '#F1C40F', headerBg: '#E67E22', textOnHeader: '#FFFFFF',
  };

  const tabs = [
    { key: 'info', label: 'Info', icon: Info },
    { key: 'brand', label: 'Brand', icon: Link2 },
    { key: 'colors', label: 'Colors', icon: Palette },
  ] as const;

  // ── Info Tab ──────────────────────────────────────
  const InfoTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Basic Information</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Outlet Name</Text>
          <TextInput
            style={styles.input}
            value={edited?.name ?? outlet.name}
            onChangeText={(t) => dispatch(patchEdit({ name: t }))}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={edited?.description ?? outlet.description}
            onChangeText={(t) => dispatch(patchEdit({ description: t }))}
            multiline
            numberOfLines={3}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Manager</Text>
          <TextInput
            style={styles.input}
            value={edited?.managerName ?? outlet.managerName ?? ''}
            onChangeText={(t) => dispatch(patchEdit({ managerName: t }))}
            placeholder="Manager name"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={[styles.field, styles.rowBetween]}>
          <Text style={styles.label}>Active</Text>
          <Switch
            value={edited?.isActive ?? outlet.isActive}
            onValueChange={(v: boolean) => { dispatch(patchEdit({ isActive: v })); }}
            trackColor={{ false: COLORS.border, true: COLORS.success }}
          />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Location</Text>
        <InfoRow icon={MapPin} label={outlet.location.address} />
        <InfoRow icon={MapPin} label={`${outlet.location.city}, ${outlet.location.state}`} />
        <InfoRow icon={MapPin} label={`${outlet.location.country} ${outlet.location.postalCode}`} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Contact</Text>
        <InfoRow icon={Phone} label={outlet.phone} />
        <InfoRow icon={Mail} label={outlet.email} />
        <InfoRow icon={Clock} label={outlet.openingHours} />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSaveInfo}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator size={18} color="#FFF" />
          : <><Save size={16} stroke="#FFF" strokeWidth={2} /><Text style={styles.saveBtnText}>Save Changes</Text></>}
      </TouchableOpacity>
    </View>
  );

  // ── Brand Tab ─────────────────────────────────────
  const BrandTab = () => (
    <View style={styles.tabContent}>
      {outlet.brandId ? (
        <View style={styles.assignedBrandCard}>
          <CheckCircle2 size={20} stroke={COLORS.success} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.assignedBrandName}>{outlet.brandName}</Text>
            <Text style={styles.assignedBrandSub}>Currently assigned</Text>
          </View>
          <TouchableOpacity
            style={styles.unassignBtn}
            onPress={() => Alert.alert('Unassign Brand', 'Remove brand assignment from this outlet?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Unassign', style: 'destructive', onPress: () => dispatch(assignBrand({ outletId, brandId: '' })) },
            ])}
          >
            <Text style={styles.unassignBtnText}>Unassign</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.unassignedBanner}>
          <AlertCircle size={16} stroke={COLORS.info} strokeWidth={2} />
          <Text style={styles.unassignedText}>This outlet is not assigned to any brand yet.</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Available Brands</Text>
      {brands.map((brand) => {
        const isCurrentBrand = outlet.brandId === brand.brandId;
        return (
          <TouchableOpacity
            key={brand.brandId}
            style={[styles.brandRow, isCurrentBrand && styles.brandRowActive]}
            onPress={() => !isCurrentBrand && handleAssignBrand(brand.brandId, brand.name)}
            disabled={isCurrentBrand || assigning}
          >
            <View style={[styles.brandColorDot, { backgroundColor: brand.primaryColor }]} />
            <Text style={styles.brandRowName}>{brand.name}</Text>
            {isCurrentBrand
              ? <Check size={16} stroke={COLORS.success} strokeWidth={2.5} />
              : assigning
                ? <ActivityIndicator size={14} color={COLORS.primary} />
                : <Text style={styles.assignText}>Assign</Text>}
          </TouchableOpacity>
        );
      })}

      <Text style={styles.brandHint}>
        Assigning a brand will automatically import its color scheme. You can customize colors in the Colors tab.
      </Text>
    </View>
  );

  // ── Colors Tab ────────────────────────────────────
  const ColorsTab = () => {
    const ColorRow = ({ label, field }: { label: string; field: keyof OutletColorScheme }) => {
      const value = (cs as OutletColorScheme)[field] || '#E67E22';
      return (
        <View style={styles.field}>
          <View style={styles.colorLabelRow}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.colorPreviewBox, { backgroundColor: value }]} />
          </View>
          <View style={styles.colorSwatchRow}>
            {COLOR_PRESETS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, value === c && styles.colorSwatchActive]}
                onPress={() => dispatch(patchColorScheme({ [field]: c }))}
              >
                {value === c && <Check size={10} stroke="#FFF" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: Spacing.xs }]}
            value={value}
            onChangeText={(t) => dispatch(patchColorScheme({ [field]: t }))}
            placeholder="#E67E22"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="characters"
            maxLength={7}
          />
        </View>
      );
    };

    return (
      <View style={styles.tabContent}>
        {/* Live preview */}
        <View style={styles.livePreview}>
          <View style={[styles.previewHeader, { backgroundColor: (cs as any).headerBg || cs.primaryColor }]}>
            <Text style={[styles.previewHeaderText, { color: (cs as any).textOnHeader || '#FFF' }]}>
              {outlet.name}
            </Text>
            <Text style={[styles.previewHeaderSub, { color: (cs as any).textOnHeader || '#FFF' }]}>
              {outlet.location.city}
            </Text>
          </View>
          <View style={styles.previewBody}>
            <View style={[styles.previewChip, { backgroundColor: cs.accentColor }]}>
              <Text style={[styles.previewChipText, { color: cs.secondaryColor }]}>SALE</Text>
            </View>
            <View style={[styles.previewBtn, { backgroundColor: cs.primaryColor }]}>
              <Text style={styles.previewBtnText}>Shop Now</Text>
            </View>
          </View>
        </View>

        {outlet.brandId && (
          <>
            <Text style={styles.sectionLabel}>Import from Brand</Text>
            {brands.filter((b) => b.brandId === outlet.brandId).map((brand) => (
              <TouchableOpacity
                key={brand.brandId}
                style={styles.importBrandBtn}
                onPress={() => handleApplyBrandColors(brand)}
              >
                <View style={[styles.brandColorDot, { backgroundColor: brand.primaryColor }]} />
                <Text style={styles.importBrandText}>Import {brand.name} colors</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <ColorRow label="Primary Color" field="primaryColor" />
        <ColorRow label="Secondary Color" field="secondaryColor" />
        <ColorRow label="Accent Color" field="accentColor" />
        <ColorRow label="Header Background" field="headerBg" />

        <View style={styles.field}>
          <Text style={styles.label}>Header Text</Text>
          <View style={styles.radioRow}>
            {[{ val: '#FFFFFF', label: 'White' }, { val: '#000000', label: 'Black' }, { val: '#1A1A2E', label: 'Dark' }].map((opt) => {
              const selected = ((cs as any).textOnHeader || '#FFFFFF') === opt.val;
              return (
                <TouchableOpacity
                  key={opt.val}
                  style={[styles.radioOption, { borderColor: selected ? COLORS.primary : COLORS.border }]}
                  onPress={() => dispatch(patchColorScheme({ textOnHeader: opt.val } as any))}
                >
                  <View style={[styles.radioDot, { backgroundColor: opt.val, borderWidth: opt.val === '#FFFFFF' ? 1 : 0, borderColor: COLORS.border }]} />
                  <Text style={styles.radioLabel}>{opt.label}</Text>
                  {selected && <Check size={12} stroke={COLORS.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, updatingColors && { opacity: 0.6 }]}
          onPress={handleApplyColors}
          disabled={updatingColors}
        >
          {updatingColors
            ? <ActivityIndicator size={18} color="#FFF" />
            : <><Palette size={16} stroke="#FFF" strokeWidth={2} /><Text style={styles.saveBtnText}>Apply Color Scheme</Text></>}
        </TouchableOpacity>
      </View>
    );
  };

  const tabContent = {
    info: <InfoTab />,
    brand: <BrandTab />,
    colors: <ColorsTab />,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: outlet.colorScheme?.primaryColor || COLORS.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ChevronLeft size={22} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{outlet.name}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{outlet.location.city} · {outlet.brandName || 'No brand'}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: outlet.isActive ? COLORS.success : COLORS.textLight }]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setActiveTab(key))}
            >
              <Icon size={16} stroke={active ? COLORS.primary : COLORS.textLight} strokeWidth={2} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tabContent[activeTab]}
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <View style={styles.infoRow}>
    <Icon size={14} stroke={COLORS.textLight} strokeWidth={2} />
    <Text style={styles.infoRowText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: (StatusBar.currentHeight || 44) + Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: COLORS.card,
    ...Shadows.small,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
    gap: Spacing.sm,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textLight },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  tabLabelActive: { color: COLORS.primary },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  tabContent: { gap: Spacing.md },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.small,
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  textArea: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.bg, minHeight: 80, textAlignVertical: 'top',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoRowText: { fontSize: 14, color: COLORS.text },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  assignedBrandCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(39,174,96,0.08)',
    borderWidth: 1, borderColor: 'rgba(39,174,96,0.25)',
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  assignedBrandName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  assignedBrandSub: { fontSize: 12, color: COLORS.success, marginTop: 2 },
  unassignBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: COLORS.danger,
  },
  unassignBtnText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  unassignedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(52,152,219,0.08)',
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(52,152,219,0.2)',
    marginBottom: Spacing.md,
  },
  unassignedText: { fontSize: 13, color: COLORS.info, flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: Spacing.sm, ...Shadows.small,
  },
  brandRowActive: { borderColor: COLORS.success, backgroundColor: 'rgba(39,174,96,0.04)' },
  brandColorDot: { width: 16, height: 16, borderRadius: 8 },
  brandRowName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  assignText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  brandHint: { fontSize: 12, color: COLORS.textLight, lineHeight: 18, marginTop: Spacing.sm },
  livePreview: {
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    ...Shadows.medium, marginBottom: Spacing.md,
  },
  previewHeader: { padding: Spacing.md, alignItems: 'center' },
  previewHeaderText: { fontSize: 17, fontWeight: '700' },
  previewHeaderSub: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  previewBody: {
    padding: Spacing.md, backgroundColor: COLORS.card,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  previewChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  previewChipText: { fontSize: 11, fontWeight: '800' },
  previewBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md },
  previewBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  importBrandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(52,152,219,0.08)',
    borderWidth: 1, borderColor: 'rgba(52,152,219,0.2)',
    marginBottom: Spacing.md,
  },
  importBrandText: { fontSize: 14, color: COLORS.info, fontWeight: '600' },
  colorLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  colorPreviewBox: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  colorSwatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  colorSwatch: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: COLORS.text },
  radioRow: { flexDirection: 'row', gap: Spacing.sm },
  radioOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 2 },
  radioDot: { width: 18, height: 18, borderRadius: 9 },
  radioLabel: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
});

export default OutletDetailScreen;
