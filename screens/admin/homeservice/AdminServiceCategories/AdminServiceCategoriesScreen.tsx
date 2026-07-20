// ============================================
// Admin: service catalogue CRUD (HS8) — makes the categories customers can
// search for into data (HS5), replacing the hardcoded provider enum.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  AdminServiceCategory,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';

const COLORS = {
  primary: '#2A7FFF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
  danger: '#E74C3C',
};

const SUBTYPES = ['electrician', 'plumber', 'ac_repairer'];

const AdminServiceCategoriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<AdminServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminServiceCategory | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [providerSubType, setProviderSubType] = useState('electrician');
  const [basePrice, setBasePrice] = useState('500');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminCategories();
    if (res.success) setRows(res.data || []);
    else setError(res.message || 'Failed to load categories');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setSlug('');
    setProviderSubType('electrician');
    setBasePrice('500');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (c: AdminServiceCategory) => {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setProviderSubType(c.providerSubType);
    setBasePrice(String(c.basePrice));
    setIsActive(c.isActive);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !slug.trim()) {
      Alert.alert('Missing fields', 'Name and slug are required.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      providerSubType,
      basePrice: Number(basePrice) || 0,
      isActive,
    };
    const res = editing
      ? await updateAdminCategory(editing.id, payload)
      : await createAdminCategory(payload);
    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      load();
    } else {
      Alert.alert('Error', res.message || 'Could not save category');
    }
  };

  const remove = (c: AdminServiceCategory) => {
    Alert.alert('Delete category', `Remove "${c.name}" from the catalogue?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteAdminCategory(c.id);
          if (res.success) load();
          else Alert.alert('Error', res.message || 'Could not delete');
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AdminServiceCategory }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.name}>{item.name}</Text>
          {!item.isActive && (
            <View style={styles.inactiveChip}>
              <Text style={styles.inactiveText}>inactive</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          slug: {item.slug} · maps to {item.providerSubType} · base Rs. {item.basePrice}
        </Text>
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
        <Ionicons name="pencil" size={18} color={COLORS.textLight} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={() => remove(item)}>
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Categories</Text>
        <TouchableOpacity onPress={openAdd}>
          <Ionicons name="add-circle" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        These drive what customers can search for on the home screen and search results.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editing ? 'Edit category' : 'New category'}</Text>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Electricians" />
              <Text style={styles.fieldLabel}>Slug</Text>
              <TextInput
                style={styles.input}
                value={slug}
                onChangeText={setSlug}
                placeholder="electricians"
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>Maps to provider type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {SUBTYPES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.subChip, providerSubType === s && styles.subChipActive]}
                    onPress={() => setProviderSubType(s)}
                  >
                    <Text style={[styles.subChipText, providerSubType === s && styles.subChipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Base price (Rs.)</Text>
              <TextInput
                style={styles.input}
                value={basePrice}
                onChangeText={setBasePrice}
                keyboardType="numeric"
              />
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Active</Text>
                <Switch value={isActive} onValueChange={setIsActive} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: 16 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={save} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>{editing ? 'Save' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  hint: { fontSize: 12, color: COLORS.textLight, paddingHorizontal: 16, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  inactiveChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  inactiveText: { fontSize: 10, color: COLORS.textLight, fontWeight: '700' },
  meta: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  iconBtn: { padding: 6, marginLeft: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: COLORS.textLight, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  subChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  subChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  subChipTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelText: { color: COLORS.text, fontWeight: '700' },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700' },
});

export default AdminServiceCategoriesScreen;
