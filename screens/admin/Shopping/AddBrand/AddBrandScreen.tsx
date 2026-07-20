import React, { useState, useCallback } from 'react';
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
  Upload,
  Palette,
  Tag,
  Shield,
  Mail,
  Eye,
  Save,
  X,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import type { AdminShoppingParamList } from '../../../../types/shopping';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  setStep,
  updateBrandData,
  validateStep,
  clearErrors,
  resetWizard,
  createBrandAsync,
  selectWizardStep,
  selectBrandData,
  selectWizardErrors,
  selectIsSaving,
  selectCreateError,
  selectCreatedBrandId,
} from './addBrandSlice';
import { computeStepErrors } from './addBrandSlice';
import type { WizardStep } from './addBrandSlice';

type NavigationProp = NativeStackNavigationProp<AdminShoppingParamList>;

const STEPS: { num: WizardStep; label: string; icon: React.ElementType }[] = [
  { num: 1, label: 'Basic', icon: Tag },
  { num: 2, label: 'Branding', icon: Palette },
  { num: 3, label: 'Categories', icon: Check },
  { num: 4, label: 'Policies', icon: Shield },
  { num: 5, label: 'Contact', icon: Mail },
  { num: 6, label: 'Review', icon: Eye },
];

const PAYMENT_METHODS = ['Cash on Delivery', 'Credit/Debit Card', 'Bank Transfer', 'JazzCash', 'EasyPaisa'];

const COLORS = {
  primary: '#E67E22',
  secondary: '#2C3E50',
  accent: '#F1C40F',
  success: '#27AE60',
  danger: '#E74C3C',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const AddBrandScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const step = useAppSelector(selectWizardStep);
  const data = useAppSelector(selectBrandData);
  const errors = useAppSelector(selectWizardErrors);
  const saving = useAppSelector(selectIsSaving);
  const createError = useAppSelector(selectCreateError);
  const createdBrandId = useAppSelector(selectCreatedBrandId);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(data.categories || []);
  const [selectedPayments, setSelectedPayments] = useState<string[]>(data.policies?.paymentMethods || []);

  const goBack = useCallback(() => {
    if (step > 1) {
      dispatch(setStep((step - 1) as WizardStep));
    } else {
      navigation.goBack();
    }
  }, [step, dispatch, navigation]);

  const goNext = useCallback(() => {
    // Compute synchronously against the current data rather than reading
    // the `errors` selector right after dispatch — that value is still the
    // previous render's snapshot until React re-renders, so it silently
    // let every step through regardless of real validation errors.
    const errs = computeStepErrors(step, data);
    dispatch(validateStep(step));
    if (Object.keys(errs).length === 0) {
      if (step < 6) dispatch(setStep((step + 1) as WizardStep));
    }
  }, [step, dispatch, data]);

  const handleCreate = useCallback(() => {
    dispatch(createBrandAsync());
  }, [dispatch]);

  React.useEffect(() => {
    if (createdBrandId) {
      Alert.alert('Success', 'Brand created successfully!', [
        { text: 'OK', onPress: () => {
          dispatch(resetWizard());
          navigation.navigate('AdminBrandList');
        }}
      ]);
    }
  }, [createdBrandId, dispatch, navigation]);

  React.useEffect(() => {
    if (createError) {
      Alert.alert('Error', createError);
      dispatch(clearErrors());
    }
  }, [createError, dispatch]);

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
    dispatch(updateBrandData({ categories: next }));
  };

  const togglePayment = (method: string) => {
    const next = selectedPayments.includes(method)
      ? selectedPayments.filter(m => m !== method)
      : [...selectedPayments, method];
    setSelectedPayments(next);
    dispatch(updateBrandData({
      policies: { returnDays: data.policies?.returnDays ?? 7, shippingInfo: data.policies?.shippingInfo ?? '', paymentMethods: next },
    }));
  };

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
              {completed ? (
                <Check size={14} stroke="#FFF" strokeWidth={2} />
              ) : (
                <Icon size={14} stroke={active ? '#FFF' : COLORS.textLight} strokeWidth={2} />
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              (active || completed) && styles.stepLabelActive,
            ]}>{s.label}</Text>
            {i < STEPS.length - 1 && (
              <View style={[
                styles.stepLine,
                completed && styles.stepLineCompleted,
              ]} />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderError = (field: string) =>
    errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null;

  const Step1_BasicInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Brand Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={data.name}
          onChangeText={(text) => dispatch(updateBrandData({ name: text }))}
          placeholder="e.g. Outfitters"
          placeholderTextColor={COLORS.textLight}
        />
        {renderError('name')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Slug</Text>
        <TextInput
          style={[styles.input, errors.slug && styles.inputError]}
          value={data.slug}
          onChangeText={(text) => dispatch(updateBrandData({ slug: text }))}
          placeholder="auto-generated-from-name"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
        {renderError('slug')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Tagline</Text>
        <TextInput
          style={styles.input}
          value={data.tagline}
          onChangeText={(text) => dispatch(updateBrandData({ tagline: text }))}
          placeholder="e.g. Style that moves with you"
          placeholderTextColor={COLORS.textLight}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.textArea, errors.description && styles.inputError]}
          value={data.description}
          onChangeText={(text) => dispatch(updateBrandData({ description: text }))}
          placeholder="Describe the brand..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={4}
        />
        {renderError('description')}
      </View>
    </View>
  );

  const Step2_Branding = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Branding</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Logo</Text>
        <TouchableOpacity style={styles.uploadBox}>
          <Upload size={24} stroke={COLORS.primary} strokeWidth={2} />
          <Text style={styles.uploadText}>Tap to upload logo</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Banner Image</Text>
        <TouchableOpacity style={styles.uploadBox}>
          <Upload size={24} stroke={COLORS.primary} strokeWidth={2} />
          <Text style={styles.uploadText}>Tap to upload banner</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Primary Color</Text>
        <View style={styles.colorRow}>
          {['#E67E22', '#C0392B', '#2980B9', '#27AE60', '#8E44AD', '#D35400'].map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                data.primaryColor === c && styles.colorSwatchActive,
              ]}
              onPress={() => dispatch(updateBrandData({ primaryColor: c }))}
            >
              {data.primaryColor === c && <Check size={14} stroke="#FFF" strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Secondary Color</Text>
        <View style={styles.colorRow}>
          {['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#ECF0F1'].map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                data.secondaryColor === c && styles.colorSwatchActive,
              ]}
              onPress={() => dispatch(updateBrandData({ secondaryColor: c }))}
            >
              {data.secondaryColor === c && <Check size={14} stroke="#FFF" strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Accent Color</Text>
        <View style={styles.colorRow}>
          {['#F1C40F', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22'].map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                data.accentColor === c && styles.colorSwatchActive,
              ]}
              onPress={() => dispatch(updateBrandData({ accentColor: c }))}
            >
              {data.accentColor === c && <Check size={14} stroke="#FFF" strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* Live Preview */}
      <View style={styles.previewCard}>
        <View style={[styles.previewHeader, { backgroundColor: data.primaryColor }]}>
          <Text style={styles.previewName}>{data.name || 'Brand Name'}</Text>
          <Text style={styles.previewTagline}>{data.tagline || 'Tagline'}</Text>
        </View>
        <View style={styles.previewBody}>
          <View style={[styles.previewBadge, { backgroundColor: data.accentColor }]}>
            <Text style={[styles.previewBadgeText, { color: data.secondaryColor }]}>NEW</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const Step3_Categories = () => {
    const globalCategories = ['Men', 'Women', 'Kids', 'Shoes', 'Accessories', 'Home', 'Sports'];
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Categories</Text>
        <Text style={styles.subtitle}>Select categories this brand will sell in</Text>
        <View style={styles.chipGrid}>
          {globalCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                selectedCategories.includes(cat) && styles.chipActive,
              ]}
              onPress={() => toggleCategory(cat)}
            >
              <Text style={[
                styles.chipText,
                selectedCategories.includes(cat) && styles.chipTextActive,
              ]}>{cat}</Text>
              {selectedCategories.includes(cat) && (
                <Check size={14} stroke="#FFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const Step4_Policies = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Policies</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Return Days</Text>
        <TextInput
          style={[styles.input, errors.returnDays && styles.inputError]}
          value={String(data.policies?.returnDays ?? 7)}
          onChangeText={(text) => dispatch(updateBrandData({
            policies: { returnDays: parseInt(text) || 0, shippingInfo: data.policies?.shippingInfo ?? '', paymentMethods: data.policies?.paymentMethods ?? [] },
          }))}
          keyboardType="number-pad"
          placeholder="7"
          placeholderTextColor={COLORS.textLight}
        />
        {renderError('returnDays')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Shipping Information</Text>
        <TextInput
          style={styles.textArea}
          value={data.policies?.shippingInfo}
          onChangeText={(text) => dispatch(updateBrandData({
            policies: { returnDays: data.policies?.returnDays ?? 7, shippingInfo: text, paymentMethods: data.policies?.paymentMethods ?? [] },
          }))}
          placeholder="e.g. Free shipping on orders over PKR 3000"
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={3}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Accepted Payment Methods</Text>
        <View style={styles.chipGrid}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method}
              style={[
                styles.chip,
                selectedPayments.includes(method) && styles.chipActive,
              ]}
              onPress={() => togglePayment(method)}
            >
              <Text style={[
                styles.chipText,
                selectedPayments.includes(method) && styles.chipTextActive,
              ]}>{method}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const Step5_Contact = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Contact Information</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={[styles.input, errors.contactEmail && styles.inputError]}
          value={data.contactEmail}
          onChangeText={(text) => dispatch(updateBrandData({ contactEmail: text }))}
          placeholder="brand@example.com"
          placeholderTextColor={COLORS.textLight}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {renderError('contactEmail')}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={data.contactPhone}
          onChangeText={(text) => dispatch(updateBrandData({ contactPhone: text }))}
          placeholder="+92 300 1234567"
          placeholderTextColor={COLORS.textLight}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Website URL</Text>
        <TextInput
          style={styles.input}
          value={data.website}
          onChangeText={(text) => dispatch(updateBrandData({ website: text }))}
          placeholder="https://brand.com"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
      </View>
      <Text style={styles.sectionLabel}>Social Links</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Facebook</Text>
        <TextInput
          style={styles.input}
          value={data.socialLinks?.facebook}
          onChangeText={(text) => dispatch(updateBrandData({
            socialLinks: { ...data.socialLinks, facebook: text },
          }))}
          placeholder="https://facebook.com/brand"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Instagram</Text>
        <TextInput
          style={styles.input}
          value={data.socialLinks?.instagram}
          onChangeText={(text) => dispatch(updateBrandData({
            socialLinks: { ...data.socialLinks, instagram: text },
          }))}
          placeholder="https://instagram.com/brand"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Twitter / X</Text>
        <TextInput
          style={styles.input}
          value={data.socialLinks?.twitter}
          onChangeText={(text) => dispatch(updateBrandData({
            socialLinks: { ...data.socialLinks, twitter: text },
          }))}
          placeholder="https://twitter.com/brand"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const Step6_Review = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Create</Text>
      <View style={styles.reviewCard}>
        <Text style={styles.reviewSection}>Basic Info</Text>
        <ReviewRow label="Name" value={data.name} />
        <ReviewRow label="Slug" value={data.slug} />
        <ReviewRow label="Tagline" value={data.tagline} />
        <ReviewRow label="Description" value={data.description} />

        <Text style={styles.reviewSection}>Branding</Text>
        <View style={styles.reviewColorRow}>
          <ColorDot label="Primary" color={data.primaryColor} />
          <ColorDot label="Secondary" color={data.secondaryColor} />
          <ColorDot label="Accent" color={data.accentColor} />
        </View>

        <Text style={styles.reviewSection}>Categories</Text>
        <Text style={styles.reviewValue}>{(data.categories || []).join(', ') || 'None selected'}</Text>

        <Text style={styles.reviewSection}>Policies</Text>
        <ReviewRow label="Return Days" value={String(data.policies?.returnDays ?? 7)} />
        <ReviewRow label="Shipping" value={data.policies?.shippingInfo || '-'} />
        <ReviewRow label="Payments" value={(data.policies?.paymentMethods || []).join(', ') || '-'} />

        <Text style={styles.reviewSection}>Contact</Text>
        <ReviewRow label="Email" value={data.contactEmail} />
        <ReviewRow label="Phone" value={data.contactPhone || '-'} />
        <ReviewRow label="Website" value={data.website || '-'} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Assign Brand Owner</Text>
        <TouchableOpacity style={styles.ownerSelector}>
          <Text style={styles.ownerText}>Select user...</Text>
          <ChevronRight size={18} stroke={COLORS.textLight} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Active on Creation</Text>
          <Switch
            value={data.isActive}
            onValueChange={(v) => { dispatch(updateBrandData({ isActive: v })); }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createBtn, saving && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        <Save size={18} stroke="#FFF" strokeWidth={2} />
        <Text style={styles.createBtnText}>
          {saving ? 'Creating...' : 'Create Brand'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const ReviewRow = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );

  const ColorDot = ({ label, color }: { label: string; color?: string }) => (
    <View style={styles.colorDotWrap}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <Text style={styles.colorDotLabel}>{label}</Text>
    </View>
  );

  const stepComponents: Record<WizardStep, React.FC> = {
    1: Step1_BasicInfo,
    2: Step2_Branding,
    3: Step3_Categories,
    4: Step4_Policies,
    5: Step5_Contact,
    6: Step6_Review,
  };

  const CurrentStep = stepComponents[step as WizardStep];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
          <ChevronLeft size={22} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Brand</Text>
        <TouchableOpacity
          onPress={() => dispatch(resetWizard())}
          style={styles.headerBtn}
        >
          <X size={20} stroke={COLORS.textLight} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CurrentStep />
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.footerBtnSecondary} onPress={goBack}>
            <ChevronLeft size={16} stroke={COLORS.text} strokeWidth={2} />
            <Text style={styles.footerBtnTextSecondary}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 6 ? (
          <TouchableOpacity style={styles.footerBtnPrimary} onPress={goNext}>
            <Text style={styles.footerBtnTextPrimary}>Next</Text>
            <ChevronRight size={16} stroke="#FFF" strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepCircleCompleted: { backgroundColor: COLORS.success },
  stepLabel: { fontSize: 10, color: COLORS.textLight, marginTop: 4 },
  stepLabelActive: { color: COLORS.primary, fontWeight: '600' },
  stepLine: {
    position: 'absolute',
    top: 16,
    right: -30,
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
  },
  stepLineCompleted: { backgroundColor: COLORS.success },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  stepContent: { backgroundColor: COLORS.card, borderRadius: BorderRadius.lg, padding: Spacing.md },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: Spacing.md },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: Spacing.xs },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  inputError: { borderColor: COLORS.danger },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: { fontSize: 14, color: COLORS.textLight, marginTop: Spacing.sm },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: COLORS.text },
  previewCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  previewHeader: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  previewName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  previewTagline: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  previewBody: { padding: Spacing.md, backgroundColor: COLORS.card, minHeight: 60 },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm, alignSelf: 'flex-start' },
  previewBadgeText: { fontSize: 10, fontWeight: '700' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  reviewCard: { backgroundColor: COLORS.bg, borderRadius: BorderRadius.lg, padding: Spacing.md },
  reviewSection: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reviewLabel: { fontSize: 13, color: COLORS.textLight },
  reviewValue: { fontSize: 13, color: COLORS.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  reviewColorRow: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
  colorDotWrap: { alignItems: 'center', gap: 4 },
  colorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  colorDotLabel: { fontSize: 10, color: COLORS.textLight },
  ownerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: COLORS.bg,
  },
  ownerText: { fontSize: 15, color: COLORS.textLight },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: COLORS.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  footerBtnTextSecondary: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  footerBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  footerBtnTextPrimary: { fontSize: 15, color: '#FFF', fontWeight: '700' },
});

export default AddBrandScreen;
