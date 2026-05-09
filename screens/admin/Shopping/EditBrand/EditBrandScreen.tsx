import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Check,
  Save,
  X,
  Tag,
  Palette,
  Shield,
  Mail,
  Package,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { AdminShoppingParamList } from '../../../../types/shopping';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  fetchBrandAsync,
  saveBrandAsync,
  updateBrandField,
  clearChanges,
  clearError,
  resetEditBrand,
  selectBrand,
  selectChanges,
  selectIsLoading,
  selectIsSaving,
  selectError,
  selectHasChanges,
} from './editBrandSlice';

type NavigationProp = NativeStackNavigationProp<AdminShoppingParamList>;
type RouteProps = RouteProp<AdminShoppingParamList, 'AdminBrandDetail'>;

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

type TabKey = 'basic' | 'branding' | 'categories' | 'policies' | 'contact';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'basic', label: 'Basic', icon: Tag },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'categories', label: 'Categories', icon: Package },
  { key: 'policies', label: 'Policies', icon: Shield },
  { key: 'contact', label: 'Contact', icon: Mail },
];

const GLOBAL_CATEGORIES = ['Men', 'Women', 'Kids', 'Shoes', 'Accessories', 'Home', 'Sports'];
const PAYMENT_METHODS = ['Cash on Delivery', 'Credit/Debit Card', 'Bank Transfer', 'JazzCash', 'EasyPaisa'];

const EditBrandScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  const brand = useAppSelector(selectBrand);
  const changes = useAppSelector(selectChanges);
  const loading = useAppSelector(selectIsLoading);
  const saving = useAppSelector(selectIsSaving);
  const error = useAppSelector(selectError);
  const hasChanges = useAppSelector(selectHasChanges);
  const brandId = route.params?.brandId;

  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  useEffect(() => {
    if (brandId) {
      dispatch(fetchBrandAsync(brandId));
    }
    return () => { dispatch(resetEditBrand()); };
  }, [brandId, dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSave = () => {
    if (brandId) dispatch(saveBrandAsync(brandId));
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const getValue = (field: keyof typeof changes) => {
    if (field in changes) return changes[field];
    if (brand) return brand[field];
    return '';
  };

  const TabBasic = () => (
    <View style={styles.tabContent}>
      <View style={styles.field}>
        <Text style={styles.label}>Brand Name</Text>
        <TextInput
          style={styles.input}
          value={String(getValue('name') || '')}
          onChangeText={(t) => dispatch(updateBrandField({ name: t }))}
          placeholder="Brand name"
          placeholderTextColor={COLORS.textLight}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Slug</Text>
        <TextInput
          style={styles.input}
          value={String(getValue('slug') || '')}
          onChangeText={(t) => dispatch(updateBrandField({ slug: t }))}
          placeholder="brand-slug"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Tagline</Text>
        <TextInput
          style={styles.input}
          value={String(getValue('tagline') || '')}
          onChangeText={(t) => dispatch(updateBrandField({ tagline: t }))}
          placeholder="Tagline"
          placeholderTextColor={COLORS.textLight}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={String(getValue('description') || '')}
          onChangeText={(t) => dispatch(updateBrandField({ description: t }))}
          placeholder="Description"
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={4}
        />
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>Active</Text>
        <Switch
          value={Boolean(getValue('isActive') ?? true)}
          onValueChange={(v) => { dispatch(updateBrandField({ isActive: v })); }}
          trackColor={{ false: COLORS.border, true: COLORS.success }}
        />
      </View>
    </View>
  );

  const TabBranding = () => (
    <View style={styles.tabContent}>
      <Text style={styles.label}>Primary Color</Text>
      <View style={styles.colorRow}>
        {['#E67E22', '#C0392B', '#2980B9', '#27AE60', '#8E44AD', '#D35400'].map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorSwatch,
              { backgroundColor: c },
              getValue('primaryColor') === c && styles.colorSwatchActive,
            ]}
            onPress={() => dispatch(updateBrandField({ primaryColor: c }))}
          >
            {getValue('primaryColor') === c && <Check size={14} stroke="#FFF" strokeWidth={3} />}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Secondary Color</Text>
      <View style={styles.colorRow}>
        {['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#ECF0F1'].map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorSwatch,
              { backgroundColor: c },
              getValue('secondaryColor') === c && styles.colorSwatchActive,
            ]}
            onPress={() => dispatch(updateBrandField({ secondaryColor: c }))}
          >
            {getValue('secondaryColor') === c && <Check size={14} stroke="#FFF" strokeWidth={3} />}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Accent Color</Text>
      <View style={styles.colorRow}>
        {['#F1C40F', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22'].map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorSwatch,
              { backgroundColor: c },
              getValue('accentColor') === c && styles.colorSwatchActive,
            ]}
            onPress={() => dispatch(updateBrandField({ accentColor: c }))}
          >
            {getValue('accentColor') === c && <Check size={14} stroke="#FFF" strokeWidth={3} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.previewCard}>
        <View style={[styles.previewHeader, { backgroundColor: String(getValue('primaryColor') || '#E67E22') }]}>
          <Text style={styles.previewName}>{String(getValue('name') || 'Brand')}</Text>
        </View>
      </View>
    </View>
  );

  const TabCategories = () => {
    const cats = (getValue('categories') as string[]) || [];
    return (
      <View style={styles.tabContent}>
        <Text style={styles.subtitle}>Select categories</Text>
        <View style={styles.chipGrid}>
          {GLOBAL_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, cats.includes(cat) && styles.chipActive]}
              onPress={() => {
                const next = cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat];
                dispatch(updateBrandField({ categories: next }));
              }}
            >
              <Text style={[styles.chipText, cats.includes(cat) && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const TabPolicies = () => {
    const policies = (getValue('policies') as any) || {};
    return (
      <View style={styles.tabContent}>
        <View style={styles.field}>
          <Text style={styles.label}>Return Days</Text>
          <TextInput
            style={styles.input}
            value={String(policies.returnDays ?? 7)}
            onChangeText={(t) => dispatch(updateBrandField({
              policies: { ...policies, returnDays: parseInt(t) || 0 },
            }))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Shipping Info</Text>
          <TextInput
            style={styles.textArea}
            value={String(policies.shippingInfo || '')}
            onChangeText={(t) => dispatch(updateBrandField({
              policies: { ...policies, shippingInfo: t },
            }))}
            multiline
            numberOfLines={3}
          />
        </View>
        <Text style={styles.label}>Payment Methods</Text>
        <View style={styles.chipGrid}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, (policies.paymentMethods || []).includes(m) && styles.chipActive]}
              onPress={() => {
                const pm = policies.paymentMethods || [];
                const next = pm.includes(m) ? pm.filter((p: string) => p !== m) : [...pm, m];
                dispatch(updateBrandField({ policies: { ...policies, paymentMethods: next } }));
              }}
            >
              <Text style={[styles.chipText, (policies.paymentMethods || []).includes(m) && styles.chipTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const TabContact = () => (
    <View style={styles.tabContent}>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={String(getValue('contactEmail') || '')}
          onChangeText={(t) => dispatch(updateBrandField({ contactEmail: t }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={String(getValue('contactPhone') || '')}
          onChangeText={(t) => dispatch(updateBrandField({ contactPhone: t }))}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={String(getValue('website') || '')}
          onChangeText={(t) => dispatch(updateBrandField({ website: t }))}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const tabComponents: Record<TabKey, React.FC> = {
    basic: TabBasic,
    branding: TabBranding,
    categories: TabCategories,
    policies: TabPolicies,
    contact: TabContact,
  };

  const CurrentTab = tabComponents[activeTab];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading brand...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <ChevronLeft size={22} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Brand</Text>
        <TouchableOpacity
          style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          <Save size={16} stroke={hasChanges ? '#FFF' : COLORS.textLight} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Icon size={15} stroke={isActive ? '#FFF' : COLORS.textLight} strokeWidth={2} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CurrentTab />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: COLORS.textLight },
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
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: COLORS.border },
  tabBarWrap: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
  tabTextActive: { color: '#FFF', fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  tabContent: { backgroundColor: COLORS.card, borderRadius: BorderRadius.lg, padding: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: Spacing.md },
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
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.md },
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
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
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
  previewCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  previewHeader: { padding: Spacing.md, alignItems: 'center' },
  previewName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export default EditBrandScreen;
