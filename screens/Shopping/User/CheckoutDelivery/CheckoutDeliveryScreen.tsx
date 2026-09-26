import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle2, Circle, ChevronLeft, Truck } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Spacing, BorderRadius, Shadows, makeColors, type ColorType } from '../../../../constants/Colors';
import { ThemeColors, useTheme } from '../../../../theme';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import {
  calculateDeliveryFee,
  fetchDeliveryOptions,
  selectCheckoutDeliveryLoading,
  selectCheckoutDeliveryOptions,
  selectEstimatedDelivery,
  selectSelectedCheckoutDeliveryOption,
  setSelectedOption,
  type DeliveryOption,
} from './checkoutDeliverySlice';
import { ShoppingHeader } from '../../../../components/Shopping/ShoppingHeader';

const CheckoutDeliveryScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(Colors, colors), [Colors, colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  // Absolute footer + Android edge-to-edge: without the inset the system
  // navigation bar sits over the Continue button.
  const insets = useSafeAreaInsets();

  const options = useAppSelector(selectCheckoutDeliveryOptions);
  const selectedOption = useAppSelector(selectSelectedCheckoutDeliveryOption);
  const estimatedDelivery = useAppSelector(selectEstimatedDelivery);
  const loading = useAppSelector(selectCheckoutDeliveryLoading);

  useEffect(() => {
    dispatch(fetchDeliveryOptions());
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    if (!selectedOption) return;
    navigation.navigate(ShoppingRouteNames.CheckoutPayment, { deliveryOptionId: selectedOption.id });
  }, [navigation, selectedOption]);

  const renderOption = (option: DeliveryOption) => {
    const selected = selectedOption?.id === option.id;
    return (
      <TouchableOpacity
        key={option.id}
        style={[styles.optionCard, selected && styles.optionCardSelected]}
        activeOpacity={0.8}
        onPress={() => {
          dispatch(setSelectedOption(option.id));
          dispatch(calculateDeliveryFee(option.id));
        }}
      >
        <View style={styles.optionLeft}>
          {selected ? (
            <CheckCircle2 size={20} stroke={Colors.primary} strokeWidth={2} />
          ) : (
            <Circle size={20} stroke={Colors.text.tertiary} strokeWidth={2} />
          )}
          <View>
            <Text style={styles.optionName}>{option.name}</Text>
            <Text style={styles.optionMeta}>{option.eta}</Text>
            <Text style={styles.optionDesc}>{option.description}</Text>
          </View>
        </View>
        {/* "+" marks it as a surcharge on top of the brand's shipping fee,
            not the whole delivery cost. */}
        <Text style={styles.optionPrice}>
          {option.cost === 0 ? 'Free' : `+PKR ${option.cost.toLocaleString()}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ShoppingHeader
        tone="gradient"
        title="Checkout"
        subtitle="Step 2 of 4 · Delivery"
        showBack
      />

      <View style={styles.stepCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabelDone}>Address</Text>
          <Text style={styles.stepLabel}>Delivery</Text>
          <Text style={styles.stepLabelMuted}>Payment</Text>
          <Text style={styles.stepLabelMuted}>Review</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Truck size={20} stroke={Colors.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Choose delivery speed</Text>
            <Text style={styles.heroText}>Select the option that fits your schedule and budget.</Text>
          </View>
        </View>

        <View style={styles.section}>
          {loading && options.length === 0 ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.helperText}>Loading delivery options...</Text>
            </View>
          ) : (
            options.map(renderOption)
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Estimated delivery</Text>
          <Text style={styles.summaryValue}>{estimatedDelivery}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity style={[styles.continueBtn, !selectedOption && styles.continueBtnDisabled]} disabled={!selectedOption} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <ArrowRight size={16} stroke="#FFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (Colors: ColorType, c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  stepCard: { marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: '#FFF', ...Shadows.sm },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  stepLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  stepLabelDone: { fontSize: 12, color: Colors.primary, opacity: 0.85 },
  stepLabelMuted: { fontSize: 12, color: Colors.text.tertiary },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: Colors.backgroundAlt, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 999 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },
  heroCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: c.accentSoft, marginBottom: Spacing.md },
  heroTitle: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  heroText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: Colors.text.secondary },
  section: { padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: '#FFF', ...Shadows.sm },
  optionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.backgroundAlt },
  optionCardSelected: { backgroundColor: c.accentSoft, marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md },
  optionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, flex: 1 },
  optionName: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  optionMeta: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  optionDesc: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2, paddingRight: Spacing.md },
  optionPrice: { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helperText: { fontSize: 12, color: Colors.text.tertiary },
  summaryCard: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: '#FFF', ...Shadows.sm },
  summaryLabel: { fontSize: 12, color: Colors.text.tertiary },
  summaryValue: { marginTop: 4, fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: Colors.backgroundAlt },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.xl },
  continueBtnDisabled: { opacity: 0.45 },
  continueBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

export default CheckoutDeliveryScreen;