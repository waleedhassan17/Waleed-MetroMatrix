import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Store, Save } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchMyBrand, selectBrandProfile, updateMyBrand } from './brandProfileSlice';
import { ShopColors } from '../theme';
import BrandHeader from '../BrandHeader';
import BrandThemeEditor from '../../../../components/Shopping/BrandThemeEditor';
import { ThemeColors, useTheme } from '../../../../theme';


type EditableField = 'name' | 'tagline' | 'description' | 'contactEmail' | 'contactPhone' | 'website';

const FIELDS: { key: EditableField; label: string; multiline?: boolean }[] = [
  { key: 'name', label: 'Brand Name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'description', label: 'Description', multiline: true },
  { key: 'contactEmail', label: 'Contact Email' },
  { key: 'contactPhone', label: 'Contact Phone' },
  { key: 'website', label: 'Website' },
];

const BrandProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { brand, loading, saving, error, noBrand } = useAppSelector(selectBrandProfile);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchMyBrand());
  }, [dispatch]);

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name,
        tagline: brand.tagline,
        description: brand.description,
        contactEmail: brand.contactEmail,
        contactPhone: brand.contactPhone,
        website: brand.website,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        accentColor: brand.accentColor,
      });
    }
  }, [brand]);

  const handleSave = async () => {
    const result = await dispatch(updateMyBrand(form));
    if (updateMyBrand.fulfilled.match(result)) {
      Alert.alert('Saved', 'Your brand profile has been updated.');
    } else {
      Alert.alert('Could not save', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <BrandHeader title="Brand Profile" showBack />

      {loading && !brand && (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      )}

      {noBrand && (
        <View style={styles.center}>
          <Store size={40} stroke={Colors.text.tertiary} strokeWidth={1.5} />
          <Text style={styles.emptyText}>
            You have no brand profile yet. Contact the platform admin to set up your brand, or create one from onboarding.
          </Text>
        </View>
      )}

      {error && !brand && !noBrand && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchMyBrand())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {brand && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.bannerWrap}>
            {brand.bannerImage ? (
              <Image source={{ uri: brand.bannerImage }} style={styles.banner} />
            ) : (
              <View style={[styles.banner, { backgroundColor: brand.primaryColor || colors.accent }]} />
            )}
            <View style={styles.logoWrap}>
              {brand.logo ? (
                <Image source={{ uri: brand.logo }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                  <Store size={24} stroke={colors.accent} strokeWidth={2} />
                </View>
              )}
            </View>
          </View>
          <Text style={styles.statusLine}>
            Status: <Text style={{ fontWeight: '700', color: brand.isActive ? '#27AE60' : '#F59E0B' }}>
              {brand.isActive ? 'Active' : 'Pending approval'}
            </Text>
          </Text>

          <View style={styles.card}>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.input, field.multiline && styles.multiline]}
                  multiline={field.multiline}
                  value={form[field.key] ?? ''}
                  onChangeText={(value) => setForm((f) => ({ ...f, [field.key]: value }))}
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Store appearance</Text>
            <Text style={styles.sectionHelp}>
              These colours are used across your own dashboard and the store your customers see.
            </Text>
            <BrandThemeEditor
              value={{
                primaryColor: form.primaryColor ?? '',
                secondaryColor: form.secondaryColor ?? '',
                accentColor: form.accentColor ?? '',
              }}
              onChange={(next) => setForm((f) => ({ ...f, ...next }))}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Save size={18} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

// Built per render from the resolved theme so a brand's colours reach
// rules that live at module scope. Layout, spacing and type are unchanged.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.md },
  errorText: { color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { backgroundColor: c.accent, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  bannerWrap: { marginBottom: 36 },
  banner: { width: '100%', height: 120, borderRadius: BorderRadius.lg },
  logoWrap: { position: 'absolute', bottom: -28, left: Spacing.lg },
  logo: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: Colors.surface },
  logoFallback: { backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  statusLine: { fontSize: 13, color: Colors.text.secondary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  sectionHelp: { fontSize: 12, lineHeight: 17, color: Colors.text.secondary, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text.primary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.accent, borderRadius: BorderRadius.lg, paddingVertical: 14 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default BrandProfileScreen;
