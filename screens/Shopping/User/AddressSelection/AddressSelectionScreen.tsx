import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, MapPin, Plus, Star, Trash2 } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  addNewAddress,
  deleteAddress,
  fetchAddresses,
  resetNewAddressForm,
  selectCheckoutAddressError,
  selectCheckoutAddressForm,
  selectCheckoutAddressLoading,
  selectCheckoutAddresses,
  selectSelectedCheckoutAddress,
  setSelectedAddress,
  updateAddress,
  updateNewAddressFormField,
  type CheckoutAddressForm,
} from '../CheckoutAddress/checkoutAddressSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', danger: '#E74C3C' };

const FIELDS: { key: keyof CheckoutAddressForm; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Full Name', placeholder: 'e.g. Muhammad Waleed' },
  { key: 'phone', label: 'Phone', placeholder: '+92 3xx xxxxxxx' },
  { key: 'address', label: 'Address', placeholder: 'House, street' },
  { key: 'city', label: 'City', placeholder: 'Lahore' },
  { key: 'area', label: 'Area', placeholder: 'Gulberg III' },
  { key: 'landmark', label: 'Landmark (optional)', placeholder: 'Near…' },
];

const AddressSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const addresses = useAppSelector(selectCheckoutAddresses);
  const selected = useAppSelector(selectSelectedCheckoutAddress);
  const form = useAppSelector(selectCheckoutAddressForm);
  const loading = useAppSelector(selectCheckoutAddressLoading);
  const error = useAppSelector(selectCheckoutAddressError);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.address || !form.city) {
      Alert.alert('Missing details', 'Name, phone, address and city are required.');
      return;
    }
    const result = await dispatch(addNewAddress(form));
    if (addNewAddress.fulfilled.match(result)) {
      setAdding(false);
      dispatch(resetNewAddressForm());
    } else {
      Alert.alert('Could not save', (result.payload as string) || 'Please try again.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete address', `Delete the address for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteAddress(id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>My Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && addresses.length === 0 && (
          <ActivityIndicator color={ShopColors.primary} style={{ marginVertical: Spacing.xl }} />
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {!loading && addresses.length === 0 && !adding && (
          <View style={styles.empty}>
            <MapPin size={40} stroke={Colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No saved addresses yet</Text>
          </View>
        )}

        {addresses.map((address) => (
          <TouchableOpacity
            key={address.id}
            style={[styles.card, selected?.id === address.id && styles.cardSelected]}
            onPress={() => dispatch(setSelectedAddress(address.id))}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{address.name}</Text>
              {address.isDefault && (
                <View style={styles.defaultChip}><Text style={styles.defaultText}>Default</Text></View>
              )}
            </View>
            <Text style={styles.cardLine}>{address.phone}</Text>
            <Text style={styles.cardLine}>
              {address.address}, {address.area ? `${address.area}, ` : ''}{address.city}
            </Text>
            {address.landmark ? <Text style={styles.cardLandmark}>{address.landmark}</Text> : null}
            <View style={styles.cardActions}>
              {!address.isDefault && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => dispatch(updateAddress({ id: address.id, updates: { isDefault: true } }))}
                >
                  <Star size={14} stroke={ShopColors.primary} strokeWidth={2} />
                  <Text style={styles.smallBtnText}>Set default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.smallBtn} onPress={() => handleDelete(address.id, address.name)}>
                <Trash2 size={14} stroke={ShopColors.danger} strokeWidth={2} />
                <Text style={[styles.smallBtnText, { color: ShopColors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {adding ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Address</Text>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.text.tertiary}
                  value={String(form[field.key] ?? '')}
                  onChangeText={(value) => dispatch(updateNewAddressFormField({ field: field.key, value }))}
                />
              </View>
            ))}
            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() => dispatch(updateNewAddressFormField({ field: 'isDefault', value: !form.isDefault }))}
            >
              <View style={[styles.checkbox, form.isDefault && styles.checkboxOn]} />
              <Text style={styles.defaultToggleText}>Set as default address</Text>
            </TouchableOpacity>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={loading}>
                <Text style={styles.saveText}>{loading ? 'Saving…' : 'Save Address'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
            <Plus size={18} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.addText}>Add New Address</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  errorText: { color: '#E74C3C', marginBottom: Spacing.md, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { color: Colors.text.secondary, marginTop: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 2, borderColor: 'transparent', ...Shadows.sm },
  cardSelected: { borderColor: ShopColors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  defaultChip: { backgroundColor: ShopColors.primaryLight, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  defaultText: { fontSize: 11, fontWeight: '700', color: ShopColors.primary },
  cardLine: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  cardLandmark: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallBtnText: { fontSize: 12, fontWeight: '600', color: ShopColors.primary },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ShopColors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, marginTop: Spacing.sm },
  addText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  formCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.sm, ...Shadows.sm },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text.primary },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: Colors.border },
  checkboxOn: { backgroundColor: ShopColors.primary, borderColor: ShopColors.primary },
  defaultToggleText: { fontSize: 13, color: Colors.text.secondary },
  formActions: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: Colors.text.secondary },
  saveBtn: { flex: 2, backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700' },
});

export default AddressSelectionScreen;
