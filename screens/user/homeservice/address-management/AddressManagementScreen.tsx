// ============================================================================
// Address management — list / add / edit / delete / set default.
// The Booking screen selects from these saved addresses.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ActionSheet,
  AppBar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
} from '../../../../components/ui';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, F, GUTTER, R, S, T } from '../../../../constants/theme';
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
  home: 'home-outline',
  building: 'business-outline',
  briefcase: 'briefcase-outline',
  location: 'location-outline',
};

export default function AddressManagementScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [rows, setRows] = useState<UserAddressFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddressFull | null>(null);
  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserAddressFull | null>(null);

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
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (a: UserAddressFull) => {
    setEditing(a);
    setLabel(a.label);
    setAddress(a.address);
    setCity(a.city);
    setFormError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!address.trim()) {
      setFormError('Add the address line before saving.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const res = editing
      ? await updateUserAddressApi(editing.id, { label, address, city })
      : await addUserAddress({ label, address, city, isDefault: rows.length === 0 });
    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      load();
    } else {
      setFormError(res.message || "We couldn't save that address. Try again.");
    }
  };

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const res = await deleteUserAddress(pendingDelete.id);
    setPendingDelete(null);
    if (res.success) load();
    else setError(res.message || "We couldn't delete that address.");
  }, [pendingDelete, load]);

  const makeDefault = async (a: UserAddressFull) => {
    const res = await updateUserAddressApi(a.id, { isDefault: true });
    if (res.success) load();
  };

  const renderItem = ({ item }: { item: UserAddressFull }) => (
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <Ionicons
            name={(ICONS[item.icon || 'location'] || 'location-outline') as any}
            size={19}
            color={C.inkMuted}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.labelRow}>
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
            <TouchableOpacity
              onPress={() => makeDefault(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.link}>Set as default</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => openEdit(item)}
          accessibilityLabel={`Edit ${item.label}`}
        >
          <Ionicons name="pencil-outline" size={17} color={C.inkMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setPendingDelete(item)}
          accessibilityLabel={`Delete ${item.label}`}
        >
          <Ionicons name="trash-outline" size={17} color={C.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <Screen>
      <AppBar
        title="Addresses"
        onBack={() => navigation.goBack()}
        rightIcon="add"
        onRightPress={openAdd}
      />

      {loading ? (
        <View style={styles.loading} accessibilityLabel="Loading addresses">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={92} radius={R.card} style={styles.loadingGap} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="We couldn't load your addresses" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(a) => a.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="location-outline"
              title="No saved addresses"
              message="Save the places you book for and they'll be one tap away next time."
              actionLabel="Add an address"
              onAction={openAdd}
            />
          }
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.scrim}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrap}
          >
            <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
              <View style={styles.grabber} />
              <Text style={styles.sheetTitle}>{editing ? 'Edit address' : 'New address'}</Text>

              <Text style={styles.fieldLabel}>Label</Text>
              <View style={styles.chipRow}>
                {['Home', 'Office', 'Other'].map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.chip, label === l && styles.chipActive]}
                    onPress={() => setLabel(l)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: label === l }}
                  >
                    <Text style={[styles.chipText, label === l && styles.chipTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="House, street, area"
                placeholderTextColor={C.inkFaint}
                value={address}
                onChangeText={setAddress}
              />

              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Lahore"
                placeholderTextColor={C.inkFaint}
                value={city}
                onChangeText={setCity}
              />

              {!!formError && <Text style={styles.error}>{formError}</Text>}

              <View style={styles.sheetActions}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setModalOpen(false)}
                  style={styles.sheetButton}
                />
                <Button
                  label={editing ? 'Save' : 'Add address'}
                  onPress={save}
                  loading={saving}
                  style={styles.sheetButton}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ActionSheet
        visible={!!pendingDelete}
        title={`Delete "${pendingDelete?.label ?? ''}"?`}
        message="You can add it again later, but it will disappear from the booking screen now."
        cancelLabel="Keep it"
        onClose={() => setPendingDelete(null)}
        options={[
          {
            label: 'Delete address',
            icon: 'trash-outline',
            tone: 'destructive',
            onPress: confirmDelete,
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: GUTTER,
    flexGrow: 1,
  },
  loading: {
    padding: GUTTER,
  },
  loadingGap: {
    marginBottom: S.md,
  },

  card: {
    marginBottom: S.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: R.control,
    backgroundColor: C.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    marginHorizontal: S.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLabel: {
    ...T.subhead,
    color: C.ink,
  },
  defaultChip: {
    marginLeft: S.sm,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: R.chip,
    backgroundColor: HS.accentSoft,
  },
  defaultChipText: {
    ...T.caption,
    color: HS.accentDeep,
    fontFamily: F.semibold,
  },
  cardAddress: {
    ...T.body,
    color: C.inkMuted,
    marginTop: 2,
  },
  link: {
    ...T.label,
    color: HS.accentDeep,
    marginTop: S.sm,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrim: {
    flex: 1,
    backgroundColor: C.scrim,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: GUTTER,
    paddingTop: S.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    marginBottom: S.lg,
  },
  sheetTitle: {
    ...T.heading,
    color: C.ink,
    marginBottom: S.lg,
  },
  fieldLabel: {
    ...T.label,
    color: C.inkMuted,
    marginBottom: S.sm,
    marginTop: S.md,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginRight: S.sm,
  },
  chipActive: {
    backgroundColor: HS.accentSoft,
    borderColor: HS.accentLine,
  },
  chipText: {
    ...T.label,
    color: C.inkMuted,
  },
  chipTextActive: {
    color: HS.accentDeep,
    fontFamily: F.semibold,
  },
  input: {
    height: 46,
    paddingHorizontal: S.md,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: C.surface,
    ...T.body,
    color: C.ink,
  },
  error: {
    ...T.caption,
    color: C.error,
    marginTop: S.md,
  },
  sheetActions: {
    flexDirection: 'row',
    marginTop: S.xl,
  },
  sheetButton: {
    flex: 1,
    marginHorizontal: S.xs,
  },
});
