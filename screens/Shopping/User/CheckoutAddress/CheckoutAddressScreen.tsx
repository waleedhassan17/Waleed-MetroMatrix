import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle2, Circle, ChevronLeft, MapPin, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import {
  addNewAddress,
  deleteAddress,
  fetchAddresses,
  resetNewAddressForm,
  selectCheckoutAddressForm,
  selectCheckoutAddressLoading,
  selectCheckoutAddresses,
  selectSelectedCheckoutAddress,
  setSelectedAddress,
  updateAddress,
  updateNewAddressFormField,
  type CheckoutAddressForm,
  type SavedAddress,
} from './checkoutAddressSlice';

const CURRENCY_NOTE = 'Step 1 of 4';

const CheckoutAddressScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const savedAddresses = useAppSelector(selectCheckoutAddresses);
  const selectedAddress = useAppSelector(selectSelectedCheckoutAddress);
  const form = useAppSelector(selectCheckoutAddressForm);
  const loading = useAppSelector(selectCheckoutAddressLoading);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const handleFieldChange = useCallback(
    (field: keyof CheckoutAddressForm, value: string | boolean) => {
      dispatch(updateNewAddressFormField({ field, value }));
    },
    [dispatch]
  );

  const handleSaveAddress = useCallback(() => {
    if (!form.name || !form.phone || !form.address || !form.city || !form.area) {
      Alert.alert('Missing information', 'Please fill in the required address fields.');
      return;
    }

    dispatch(addNewAddress(form));
  }, [dispatch, form]);

  const handleEditAddress = useCallback(
    (address: SavedAddress) => {
      dispatch(updateAddress({ id: address.id, updates: { isDefault: true } }));
    },
    [dispatch]
  );

  const handleDeleteAddress = useCallback(
    (addressId: string) => {
      Alert.alert('Delete address', 'Remove this address from saved addresses?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteAddress(addressId)) },
      ]);
    },
    [dispatch]
  );

  const handleContinue = useCallback(() => {
    if (!selectedAddress) return;
    navigation.navigate(ShoppingRouteNames.CheckoutDelivery, { addressId: selectedAddress.id });
  }, [navigation, selectedAddress]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>{CURRENCY_NOTE}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.stepCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>Address</Text>
          <Text style={styles.stepLabelMuted}>Delivery</Text>
          <Text style={styles.stepLabelMuted}>Payment</Text>
          <Text style={styles.stepLabelMuted}>Review</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '25%' }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            <TouchableOpacity style={styles.inlineBtn} onPress={() => dispatch(resetNewAddressForm())}>
              <Plus size={14} stroke={Colors.primary} strokeWidth={2} />
              <Text style={styles.inlineBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {savedAddresses.map((address) => {
            const selected = selectedAddress?.id === address.id;
            return (
              <TouchableOpacity
                key={address.id}
                style={[styles.addressCard, selected && styles.addressCardSelected]}
                activeOpacity={0.8}
                onPress={() => dispatch(setSelectedAddress(address.id))}
              >
                <View style={styles.addressCardTop}>
                  <View style={styles.radioWrap}>
                    {selected ? (
                      <CheckCircle2 size={20} stroke={Colors.primary} strokeWidth={2} />
                    ) : (
                      <Circle size={20} stroke={Colors.text.tertiary} strokeWidth={2} />
                    )}
                  </View>
                  <View style={styles.addressBody}>
                    <View style={styles.addressTitleRow}>
                      <Text style={styles.addressName}>{address.name}</Text>
                      {address.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
                    </View>
                    <Text style={styles.addressText}>{address.phone}</Text>
                    <Text style={styles.addressText}>
                      {address.address}, {address.area}, {address.city}
                    </Text>
                    {address.landmark ? <Text style={styles.addressTextMuted}>{address.landmark}</Text> : null}
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleEditAddress(address)}>
                    <Pencil size={14} stroke={Colors.primary} strokeWidth={2} />
                    <Text style={styles.cardActionText}>Mark Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDeleteAddress(address.id)}>
                    <Trash2 size={14} stroke={Colors.error} strokeWidth={2} />
                    <Text style={[styles.cardActionText, { color: Colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}

          {loading && <Text style={styles.helperText}>Loading saved addresses...</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Address</Text>

          <View style={styles.formGrid}>
            {[
              { field: 'name', placeholder: 'Name' },
              { field: 'phone', placeholder: 'Phone' },
              { field: 'address', placeholder: 'Address' },
              { field: 'city', placeholder: 'City' },
              { field: 'area', placeholder: 'Area' },
              { field: 'landmark', placeholder: 'Landmark' },
            ].map((item) => (
              <TextInput
                key={item.field}
                style={styles.input}
                placeholder={item.placeholder}
                placeholderTextColor={Colors.text.tertiary}
                value={(form[item.field as keyof CheckoutAddressForm] as string) || ''}
                onChangeText={(value) => handleFieldChange(item.field as keyof CheckoutAddressForm, value)}
              />
            ))}
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Set as default</Text>
              <Text style={styles.toggleSubtitle}>Use this address for future checkouts</Text>
            </View>
            <Switch
              value={form.isDefault}
              onValueChange={(value) => handleFieldChange('isDefault', value)}
              trackColor={{ false: '#E5E7EB', true: '#FDEAD7' }}
              thumbColor={form.isDefault ? Colors.primary : '#FFFFFF'}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
            <Text style={styles.saveBtnText}>Save Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noteCard}>
          <MapPin size={16} stroke={Colors.primary} strokeWidth={2} />
          <Text style={styles.noteText}>Make sure your address is complete so delivery can reach you without delays.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.continueBtn, !selectedAddress && styles.continueBtnDisabled]} disabled={!selectedAddress} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <ArrowRight size={16} stroke="#FFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    ...Shadows.sm,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: Colors.text.tertiary },
  stepCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#FFF',
    ...Shadows.sm,
  },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  stepLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  stepLabelMuted: { fontSize: 12, color: Colors.text.tertiary },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: '#F4F4F5', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 999 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#FFF',
    ...Shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  inlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  addressCard: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#FFF',
  },
  addressCardSelected: { borderColor: Colors.primary, backgroundColor: '#FFF8F2' },
  addressCardTop: { flexDirection: 'row', gap: Spacing.sm },
  radioWrap: { paddingTop: 2 },
  addressBody: { flex: 1 },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  addressName: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  defaultBadge: { fontSize: 11, fontWeight: '700', color: Colors.primary, backgroundColor: '#FDEAD7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  addressText: { fontSize: 13, color: Colors.text.secondary, marginBottom: 2 },
  addressTextMuted: { fontSize: 12, color: Colors.text.tertiary },
  cardActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cardActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardActionText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  helperText: { fontSize: 12, color: Colors.text.tertiary, marginTop: Spacing.xs },
  formGrid: { gap: Spacing.sm, marginTop: Spacing.md },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.surface,
  },
  toggleRow: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  toggleSubtitle: { marginTop: 4, fontSize: 12, color: Colors.text.tertiary },
  saveBtn: { marginTop: Spacing.md, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#FFF8F2' },
  noteText: { flex: 1, fontSize: 12, color: Colors.text.secondary, lineHeight: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.xl },
  continueBtnDisabled: { opacity: 0.45 },
  continueBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

export default CheckoutAddressScreen;