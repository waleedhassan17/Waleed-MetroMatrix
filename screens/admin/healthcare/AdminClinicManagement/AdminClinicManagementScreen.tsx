// ============================================================================
// Clinics — where doctors see patients in person.
//
// A deactivated clinic stops taking in-clinic bookings; existing appointments
// stay. Every change carries a reason and is audited. A row's doctor opens
// that doctor's details and analytics.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, EntityRow, PermissionGate, QueryState } from '../../../../components/admin';
import { ActionSheet, TextField, showToast } from '../../../../components/ui';
import { usePermission } from '../../../../hooks/useAdminPermission';
import useDebouncedValue from '../../../../hooks/useDebouncedValue';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import { nameOf, useListHCClinicsInfiniteQuery, useSetHCClinicActiveMutation, type HCClinic } from '../../../../networks/admin/healthcareApi';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { idOf, openProvider } from '../../people/openProvider';

export default function AdminClinicManagementScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const canManage = usePermission('canManageHealthcare');
  const [city, setCity] = useState('');
  const cityQuery = useDebouncedValue(city.trim());

  const list = useListHCClinicsInfiniteQuery({ city: cityQuery || undefined });
  const items = flattenPages(list.data?.pages);
  const [setActive, setActiveState] = useSetHCClinicActiveMutation();

  const [menu, setMenu] = useState<HCClinic | null>(null);
  const [changing, setChanging] = useState<HCClinic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmChange = async (reason: string) => {
    if (!changing) return;
    const activating = !changing.isActive;
    const res = await setActive({ id: changing.id, isActive: activating, reason });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The clinic was not updated.');
    setChanging(null);
    showToast({ tone: 'success', message: `${changing.name} ${activating ? 'is taking bookings again' : 'is deactivated'}.` });
  };

  const doctorOf = (clinic: HCClinic | null) => clinic?.doctorId?.providerId;

  return (
    <AdminScreen title="Clinics" subtitle="Healthcare" scroll={false}>
      <PermissionGate all={['canManageHealthcare']} action="see clinics">
        <View style={styles.controls}>
          <TextField
            placeholder="Filter by city, e.g. Lahore"
            value={city}
            onChangeText={setCity}
            returnKeyType="search"
            accessibilityLabel="Filter clinics by city"
          />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="business-outline"
          emptyTitle={cityQuery ? `No clinics in ${cityQuery}` : 'No clinics yet'}
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <EntityRow
                icon="business-outline"
                title={item.name}
                subtitle={[`Dr. ${nameOf(doctorOf(item), '—')}`, item.city || item.address].filter(Boolean).join(' · ')}
                badge={item.isActive ? { label: 'Active', tone: 'success' } : { label: 'Deactivated', tone: 'neutral' }}
                onPress={() => setMenu(item)}
                divider={index < items.length - 1}
              />
            )}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <ActionSheet
        visible={!!menu}
        title={menu?.name}
        onClose={() => setMenu(null)}
        options={[
          ...(idOf(doctorOf(menu))
            ? [
                {
                  label: `Open Dr. ${nameOf(doctorOf(menu), '')}`.trim(),
                  icon: 'person-outline',
                  onPress: () => {
                    const id = idOf(doctorOf(menu));
                    setMenu(null);
                    openProvider(navigation, id);
                  },
                },
              ]
            : []),
          ...(canManage && menu
            ? [
                {
                  label: menu.isActive ? 'Deactivate clinic' : 'Activate clinic',
                  icon: menu.isActive ? 'pause-circle-outline' : 'play-circle-outline',
                  tone: menu.isActive ? ('destructive' as const) : ('default' as const),
                  onPress: () => {
                    const clinic = menu;
                    setMenu(null);
                    setError(null);
                    setChanging(clinic);
                  },
                },
              ]
            : []),
        ]}
      />

      <ConfirmSheet
        visible={!!changing}
        title={changing?.isActive ? `Deactivate ${changing?.name}?` : `Activate ${changing?.name}?`}
        message={
          changing?.isActive
            ? 'Patients can no longer book in-clinic visits here. Existing appointments stay as they are.'
            : 'Patients can book in-clinic visits here again.'
        }
        confirmLabel={changing?.isActive ? 'Deactivate' : 'Activate'}
        destructive={!!changing?.isActive}
        requireReason
        busy={setActiveState.isLoading}
        error={error}
        onConfirm={confirmChange}
        onClose={() => setChanging(null)}
      />
    </AdminScreen>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
  });
