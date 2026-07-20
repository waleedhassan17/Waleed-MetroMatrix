// ============================================
// Address management (HS8) — list / add / edit / delete / set default.
// addUserAddress() and deleteUserAddress() existed in userNetwork with no
// screen; the Booking screen selects from these saved addresses.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  addUserAddress,
  deleteUserAddress,
} from '../../../../networks/serviceProviders/userNetwork';
import {
  fetchUserAddresses,
  updateUserAddressApi,
  UserAddressFull,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';

const ICONS: Record<string, string> = {
  home: 'home',
  building: 'business',
  briefcase: 'briefcase',
  location: 'location',
};

export default function AddressManagementScreen() {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<UserAddressFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddressFull | null>(null);
  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchUserAddresses();
    if (res.success) setRows(res.data || []);
    else setError(res.message || 'Failed to load addresses');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setLabel('Home');
    setAddress('');
    setCity('');
    setModalOpen(true);
  };

  const openEdit = (a: UserAddressFull) => {
    setEditing(a);
    setLabel(a.label);
    setAddress(a.address);
    setCity(a.city);
    setModalOpen(true);
  };

  const save = async () => {
    if (!address.trim()) {
      Alert.alert('Missing address', 'Please enter the address line.');
      return;
    }
    setSaving(true);
    const res = editing
      ? await updateUserAddressApi(editing.id, { label, address, city })
      : await addUserAddress({ label, address, city, isDefault: rows.length === 0 });
    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      load();
    } else {
      Alert.alert('Error', res.message || 'Could not save address');
    }
  };

  const remove = (a: UserAddressFull) => {
    Alert.alert('Delete address', `Delete "${a.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteUserAddress(a.id);
          if (res.success) load();
          else Alert.alert('Error', res.message || 'Could not delete');
        },
      },
    ]);
  };

  const makeDefault = async (a: UserAddressFull) => {
    const res = await updateUserAddressApi(a.id, { isDefault: true });
    if (res.success) load();
  };

  const renderItem = ({ item }: { item: UserAddressFull }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name={(ICONS[item.icon || 'location'] || 'location') as any} size={20} color="#4F46E5" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.cardLabel}>{item.label}</Text>
          {item.isDefault && (
            <View style={styles.defaultChip}>
              <Text style={styles.defaultChipText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardAddress} numberOfLines={2}>
          {item.address}
          {item.city ? `, ${item.city}` : ''}
        </Text>
        {!item.isDefault && (
          <TouchableOpacity onPress={() => makeDefault(item)}>
            <Text style={styles.makeDefault}>Set as default</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
        <Ionicons name="pencil" size={18} color="#6B7280" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={() => remove(item)}>
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity onPress={openAdd} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.stateText}>Loading addresses…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#9CA3AF" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(a) => a.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="location-outline" size={44} color="#D1D5DB" />
              <Text style={styles.stateText}>
                No saved addresses yet. Add one to speed up booking.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={openAdd}>
                <Text style={styles.retryText}>Add address</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit address' : 'New address'}</Text>
            <Text style={styles.fieldLabel}>Label</Text>
            <View style={styles.labelRow}>
              {['Home', 'Office', 'Other'].map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.labelChip, label === l && styles.labelChipActive]}
                  onPress={() => setLabel(l)}
                >
                  <Text style={[styles.labelChipText, label === l && styles.labelChipTextActive]}>
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Address line</Text>
            <TextInput
              style={styles.input}
              placeholder="House, street, area"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
            />
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Lahore"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{editing ? 'Save' : 'Add'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 14,
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  defaultChip: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  defaultChipText: { color: '#065F46', fontSize: 10, fontWeight: '700' },
  cardAddress: { color: '#6B7280', fontSize: 13, marginTop: 3, lineHeight: 18 },
  makeDefault: { color: '#4F46E5', fontSize: 12, fontWeight: '600', marginTop: 6 },
  iconBtn: { padding: 6, marginLeft: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: '#6B7280', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 10, marginBottom: 6 },
  labelRow: { flexDirection: 'row' },
  labelChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginRight: 8,
  },
  labelChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  labelChipText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  labelChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  modalActions: { flexDirection: 'row', marginTop: 18 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelText: { color: '#374151', fontWeight: '700' },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
