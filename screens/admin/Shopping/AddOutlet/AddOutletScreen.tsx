import React, { useCallback, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Phone,
  Palette,
  Store,
  Link2,
  Eye,
  Save,
  X,
  Clock,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import type { AdminShoppingParamList } from '../../../../types/shopping';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  setStep,
  updateOutletData,
  updateLocation,
  updateColorScheme,
  applyBrandColors,
  validateStep,
  clearErrors,
  resetWizard,
  createOutletAsync,
  selectOutletWizardStep,
  selectOutletData,
  selectOutletErrors,
  selectOutletIsSaving,
  selectOutletCreateError,
  selectCreatedOutletId,
} from './addOutletSlice';
import type { OutletWizardStep } from './addOutletSlice';

type NavigationProp = NativeStackNavigationProp<AdminShoppingParamList>;

const COLORS = {
  primary: '#E67E22',
  success: '#27AE60',
  danger: '#E74C3C',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const STEPS: { num: OutletWizardStep; label: string; icon: React.ElementType }[] = [
  { num: 1, label: 'Basics', icon: Store },
  { num: 2, label: 'Location', icon: MapPin },
  { num: 3, label: 'Contact', icon: Phone },
  { num: 4, label: 'Brand', icon: Link2 },
  { num: 5, label: 'Colors', icon: Palette },
];

// Dummy brand list – in production this would come from the brandList Redux state
const SAMPLE_BRANDS = [
  { brandId: 'brand-001', name: 'Outfitters', primaryColor: '#E74C3C', secondaryColor: '#2C3E50', accentColor: '#F39C12' },
  { brandId: 'brand-002', name: 'Bonanza Satrangi', primaryColor: '#8E44AD', secondaryColor: '#2C3E50', accentColor: '#F1C40F' },
  { brandId: 'brand-003', name: 'Junaid Jamshed', primaryColor: '#27AE60', secondaryColor: '#1A252F', accentColor: '#F39C12' },
  { brandId: 'brand-004', name: 'Khaadi', primaryColor: '#E67E22', secondaryColor: '#2C3E50', accentColor: '#BDC3C7' },
  { brandId: 'brand-005', name: 'Sapphire', primaryColor: '#2980B9', secondaryColor: '#1A252F', accentColor: '#ECF0F1' },
];

const COLOR_PRESETS = [
  '#E67E22', '#C0392B', '#2980B9', '#27AE60', '#8E44AD',
  '#D35400', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6',
  '#F39C12', '#1ABC9C', '#16A085', '#2C3E50', '#7F8C8D',
];

const AddOutletScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const step = useAppSelector(selectOutletWizardStep);
  const data = useAppSelector(selectOutletData);
  const errors = useAppSelector(selectOutletErrors);
  const saving = useAppSelector(selectOutletIsSaving);
  const createError = useAppSelector(selectOutletCreateError);
  const createdOutletId = useAppSelector(selectCreatedOutletId);

  useEffect(() => {
    if (createdOutletId) {
      Alert.alert('Outlet Created!', 'The outlet has been registered successfully.', [
        {
          text: 'OK',
          onPress: () => {
            dispatch(resetWizard());
            navigation.goBack();
          },
        },
      ]);
    }
  }, [createdOutletId, dispatch, navigation]);

  useEffect(() => {
    if (createError) {
      Alert.alert('Error', createError);
      dispatch(clearErrors());
    }
  }, [createError, dispatch]);

  const goBack = useCallback(() => {
    if (step > 1) {
      dispatch(setStep((step - 1) as OutletWizardStep));
    } else {
      Alert.alert('Discard', 'Discard this outlet?', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { dispatch(resetWizard()); navigation.goBack(); } },
      ]);
    }
  }, [step, dispatch, navigation]);

  const goNext = useCallback(() => {
    dispatch(validateStep(step));
    const hasErrors = Object.keys(errors).length > 0;
    if (!hasErrors && step < 5) dispatch(setStep((step + 1) as OutletWizardStep));
  }, [step, dispatch, errors]);

  const handleCreate = useCallback(() => {
    dispatch(createOutletAsync());
  }, [dispatch]);

  // ── Step Indicator ─────────────────────────────
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((s, i) => {
        const active = s.num === step;
        const completed = s.num < step;
        const Icon = s.icon;
        return (
          <View key={s.num} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              active && styles.stepCircleActive,
              completed && styles.stepCircleCompleted,
            ]}>
              {completed
                ? <Check size={13} stroke="#FFF" strokeWidth={2.5} />
                : <Icon size={13} stroke={active ? '#FFF' : COLORS.textLight} strokeWidth={2} />}
            </View>
            <Text style={[styles.stepLabel, (active || completed) && styles.stepLabelActive]}>
              {s.label}
            </Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, completed && styles.stepLineCompleted]} />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderError = (field: string) =>
    errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null;

  // ── Step 1: Basic Info ──────────────────────────
  const Step1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Outlet Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={data.name}
          onChangeText={(t) => dispatch(updateOutletData({ name: t, slug: t.toLowerCase().replace(/\s+/g, '-') }))}
          placeholder="e.g. Outfitters - Gulberg"
          placeholderTextColor={COLORS.textLight}
        />
        {renderError('name')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Slug (URL-friendly)</Text>
        <TextInput
          style={styles.input}
          value={data.slug}
          onChangeText={(t) => dispatch(updateOutletData({ slug: t }))}
          placeholder="outfitters-gulberg"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.textArea, errors.description && styles.inputError]}
          value={data.description}
          onChangeText={(t) => dispatch(updateOutletData({ description: t }))}
          placeholder="Brief description of this outlet location..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={4}
        />
        {renderError('description')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Manager Name</Text>
        <TextInput
          style={styles.input}
          value={data.managerName}
          onChangeText={(t) => dispatch(updateOutletData({ managerName: t }))}
          placeholder="e.g. Ahmed Khan"
          placeholderTextColor={COLORS.textLight}
        />
      </View>
      <View style={styles.field}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Active on Creation</Text>
          <Switch
            value={data.isActive}
            onValueChange={(v: boolean) => { dispatch(updateOutletData({ isActive: v })); }}
            trackColor={{ false: COLORS.border, true: COLORS.success }}
          />
        </View>
      </View>
    </View>
  );

  // ── Step 2: Location ─────────────────────────────
  const Step2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Location Details</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={[styles.input, errors.address && styles.inputError]}
          value={data.location.address}
          onChangeText={(t) => dispatch(updateLocation({ address: t }))}
          placeholder="e.g. 25-A, Main Boulevard"
          placeholderTextColor={COLORS.textLight}
        />
        {renderError('address')}
      </View>
      <View style={styles.fieldRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            value={data.location.city}
            onChangeText={(t) => dispatch(updateLocation({ city: t }))}
            placeholder="Lahore"
            placeholderTextColor={COLORS.textLight}
          />
          {renderError('city')}
        </View>
        <View style={[styles.field, { flex: 1, marginLeft: Spacing.sm }]}>
          <Text style={styles.label}>State / Province *</Text>
          <TextInput
            style={[styles.input, errors.state && styles.inputError]}
            value={data.location.state}
            onChangeText={(t) => dispatch(updateLocation({ state: t }))}
            placeholder="Punjab"
            placeholderTextColor={COLORS.textLight}
          />
          {renderError('state')}
        </View>
      </View>
      <View style={styles.fieldRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={data.location.country}
            onChangeText={(t) => dispatch(updateLocation({ country: t }))}
            placeholder="Pakistan"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={[styles.field, { flex: 1, marginLeft: Spacing.sm }]}>
          <Text style={styles.label}>Postal Code</Text>
          <TextInput
            style={styles.input}
            value={data.location.postalCode}
            onChangeText={(t) => dispatch(updateLocation({ postalCode: t }))}
            placeholder="54000"
            placeholderTextColor={COLORS.textLight}
            keyboardType="number-pad"
          />
        </View>
      </View>
    </View>
  );

  // ── Step 3: Contact ─────────────────────────────
  const Step3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Contact & Hours</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          value={data.phone}
          onChangeText={(t) => dispatch(updateOutletData({ phone: t }))}
          placeholder="+92 42 1234567"
          placeholderTextColor={COLORS.textLight}
          keyboardType="phone-pad"
        />
        {renderError('phone')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={data.email}
          onChangeText={(t) => dispatch(updateOutletData({ email: t }))}
          placeholder="gulberg@outfitters.pk"
          placeholderTextColor={COLORS.textLight}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {renderError('email')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Opening Hours</Text>
        <View style={styles.inputIconRow}>
          <Clock size={16} stroke={COLORS.textLight} strokeWidth={2} />
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            value={data.openingHours}
            onChangeText={(t) => dispatch(updateOutletData({ openingHours: t }))}
            placeholder="10:00 AM - 10:00 PM"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </View>
    </View>
  );

  // ── Step 4: Brand Assignment ─────────────────────
  const Step4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Assign to Brand</Text>
      <Text style={styles.subtitle}>
        Select which brand this outlet belongs to. You can change this later.
      </Text>
      <TouchableOpacity
        style={[styles.brandOption, !data.brandId && styles.brandOptionSelected]}
        onPress={() => dispatch(updateOutletData({ brandId: '', brandName: '' }))}
      >
        <View style={[styles.brandDot, { backgroundColor: COLORS.textLight }]} />
        <Text style={styles.brandOptionText}>No brand (standalone outlet)</Text>
        {!data.brandId && <Check size={16} stroke={COLORS.success} strokeWidth={2.5} />}
      </TouchableOpacity>
      {SAMPLE_BRANDS.map((brand) => (
        <TouchableOpacity
          key={brand.brandId}
          style={[styles.brandOption, data.brandId === brand.brandId && styles.brandOptionSelected]}
          onPress={() => dispatch(applyBrandColors({
            brandId: brand.brandId,
            brandName: brand.name,
            primaryColor: brand.primaryColor,
            secondaryColor: brand.secondaryColor,
            accentColor: brand.accentColor,
          }))}
        >
          <View style={[styles.brandDot, { backgroundColor: brand.primaryColor }]} />
          <Text style={styles.brandOptionText}>{brand.name}</Text>
          {data.brandId === brand.brandId && (
            <Check size={16} stroke={COLORS.success} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      ))}
      {data.brandId && (
        <View style={styles.brandPreview}>
          <Text style={styles.brandPreviewLabel}>Colors imported from brand:</Text>
          <View style={styles.schemePreviewRow}>
            <View style={[styles.schemeDot, { backgroundColor: data.colorScheme.primaryColor }]} />
            <View style={[styles.schemeDot, { backgroundColor: data.colorScheme.secondaryColor }]} />
            <View style={[styles.schemeDot, { backgroundColor: data.colorScheme.accentColor }]} />
            <Text style={styles.schemeDotLabel}>Primary · Secondary · Accent</Text>
          </View>
          <Text style={styles.brandPreviewHint}>You can customize these colors in the next step.</Text>
        </View>
      )}
    </View>
  );

  // ── Step 5: Color Scheme ────────────────────────
  const Step5 = () => {
    const ColorRow = ({ label, field, value }: { label: string; field: keyof typeof data.colorScheme; value: string }) => (
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
              onPress={() => dispatch(updateColorScheme({ [field]: c }))}
            >
              {value === c && <Check size={10} stroke="#FFF" strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { marginTop: Spacing.xs }]}
          value={value}
          onChangeText={(t) => dispatch(updateColorScheme({ [field]: t }))}
          placeholder="#E67E22"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="characters"
          maxLength={7}
        />
      </View>
    );

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Color Scheme</Text>
        <Text style={styles.subtitle}>
          Customize the outlet's visual identity.
          {data.brandId ? ' Colors pre-filled from the brand — adjust as needed.' : ''}
        </Text>

        {/* Live preview */}
        <View style={styles.livePreview}>
          <View style={[styles.previewHeader, { backgroundColor: data.colorScheme.headerBg }]}>
            <Text style={[styles.previewHeaderText, { color: data.colorScheme.textOnHeader }]}>
              {data.name || 'Outlet Name'}
            </Text>
            <Text style={[styles.previewHeaderSub, { color: data.colorScheme.textOnHeader }]}>
              {data.location.city || 'City'}
            </Text>
          </View>
          <View style={styles.previewBody}>
            <View style={[styles.previewAccentChip, { backgroundColor: data.colorScheme.accentColor }]}>
              <Text style={[styles.previewAccentText, { color: data.colorScheme.secondaryColor }]}>SALE</Text>
            </View>
            <View style={[styles.previewPrimaryBtn, { backgroundColor: data.colorScheme.primaryColor }]}>
              <Text style={styles.previewBtnText}>Shop Now</Text>
            </View>
          </View>
        </View>

        <ColorRow label="Primary Color" field="primaryColor" value={data.colorScheme.primaryColor} />
        <ColorRow label="Secondary Color" field="secondaryColor" value={data.colorScheme.secondaryColor} />
        <ColorRow label="Accent Color" field="accentColor" value={data.colorScheme.accentColor} />
        <ColorRow label="Header Background" field="headerBg" value={data.colorScheme.headerBg} />

        <View style={styles.field}>
          <Text style={styles.label}>Header Text Color</Text>
          <View style={styles.radioRow}>
            {['#FFFFFF', '#000000', '#1A1A2E'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.radioOption, { borderColor: data.colorScheme.textOnHeader === c ? COLORS.primary : COLORS.border }]}
                onPress={() => dispatch(updateColorScheme({ textOnHeader: c }))}
              >
                <View style={[styles.radioDot, { backgroundColor: c, borderWidth: c === '#FFFFFF' ? 1 : 0, borderColor: COLORS.border }]} />
                <Text style={styles.radioLabel}>{c === '#FFFFFF' ? 'White' : c === '#000000' ? 'Black' : 'Dark'}</Text>
                {data.colorScheme.textOnHeader === c && <Check size={14} stroke={COLORS.primary} strokeWidth={2.5} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Save size={18} stroke="#FFF" strokeWidth={2} />
          <Text style={styles.createBtnText}>{saving ? 'Creating outlet...' : 'Create Outlet'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const stepComponents: Record<OutletWizardStep, React.FC> = {
    1: Step1,
    2: Step2,
    3: Step3,
    4: Step4,
    5: Step5,
  };

  const CurrentStep = stepComponents[step];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
          <ChevronLeft size={22} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Outlet</Text>
        <TouchableOpacity onPress={() => dispatch(resetWizard())} style={styles.headerBtn}>
          <X size={20} stroke={COLORS.textLight} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <CurrentStep />
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.footerBtnSecondary} onPress={goBack}>
            <ChevronLeft size={16} stroke={COLORS.text} strokeWidth={2} />
            <Text style={styles.footerBtnTextSecondary}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 5 && (
          <TouchableOpacity style={styles.footerBtnPrimary} onPress={goNext}>
            <Text style={styles.footerBtnTextPrimary}>Next</Text>
            <ChevronRight size={16} stroke="#FFF" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: (StatusBar.currentHeight || 44) + Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: COLORS.card,
    ...Shadows.small,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepCircleCompleted: { backgroundColor: COLORS.success },
  stepLabel: { fontSize: 10, color: COLORS.textLight, marginTop: 4 },
  stepLabelActive: { color: COLORS.primary, fontWeight: '600' },
  stepLine: {
    position: 'absolute', top: 15, right: -25,
    width: 35, height: 2, backgroundColor: COLORS.border,
  },
  stepLineCompleted: { backgroundColor: COLORS.success },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl * 2 },
  stepContent: { backgroundColor: COLORS.card, borderRadius: BorderRadius.lg, padding: Spacing.md },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: Spacing.md },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: Spacing.md, lineHeight: 20 },
  field: { marginBottom: Spacing.md },
  fieldRow: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  inputError: { borderColor: COLORS.danger },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: COLORS.bg,
    gap: Spacing.sm,
  },
  textArea: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.bg,
    minHeight: 80, textAlignVertical: 'top',
  },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg, marginBottom: Spacing.sm,
  },
  brandOptionSelected: { borderColor: COLORS.success, backgroundColor: 'rgba(39,174,96,0.06)' },
  brandDot: { width: 18, height: 18, borderRadius: 9 },
  brandOptionText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  brandPreview: {
    marginTop: Spacing.md, padding: Spacing.md,
    borderRadius: BorderRadius.lg, backgroundColor: 'rgba(39,174,96,0.08)',
    borderWidth: 1, borderColor: 'rgba(39,174,96,0.25)',
  },
  brandPreviewLabel: { fontSize: 13, fontWeight: '600', color: COLORS.success, marginBottom: Spacing.sm },
  schemePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schemeDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  schemeDotLabel: { fontSize: 12, color: COLORS.textLight, marginLeft: 4 },
  brandPreviewHint: { fontSize: 12, color: COLORS.textLight, marginTop: Spacing.sm },
  livePreview: {
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    ...Shadows.medium, marginBottom: Spacing.lg,
  },
  previewHeader: { padding: Spacing.md, alignItems: 'center' },
  previewHeaderText: { fontSize: 18, fontWeight: '700' },
  previewHeaderSub: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  previewBody: {
    padding: Spacing.md, backgroundColor: COLORS.card,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  previewAccentChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  previewAccentText: { fontSize: 11, fontWeight: '800' },
  previewPrimaryBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  previewBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  colorLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  colorPreviewBox: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  colorSwatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  colorSwatch: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: COLORS.text },
  radioRow: { flexDirection: 'row', gap: Spacing.sm },
  radioOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  radioDot: { width: 20, height: 20, borderRadius: 10 },
  radioLabel: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: COLORS.success,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, marginTop: Spacing.md,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  footerBtnTextSecondary: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  footerBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  footerBtnTextPrimary: { fontSize: 15, color: '#FFF', fontWeight: '700' },
});

export default AddOutletScreen;
