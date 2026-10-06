// ============================================================================
// Outlets — the physical stores customers can visit, newest first.
//
// Search narrows what has loaded (name, brand or city; the server has no
// outlet search). A row opens the outlet; its menu opens or closes it to
// customers and deletes it.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, EntityRow, PermissionGate, QueryState } from '../../../../components/admin';
import { ActionSheet, Button, TextField, showToast, type SheetOption } from '../../../../components/ui';
import { usePermission } from '../../../../hooks/useAdminPermission';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import {
  useDeleteShopOutletMutation,
  useListShopOutletsInfiniteQuery,
  useToggleShopOutletMutation,
  type ShopOutlet,
} from '../../../../networks/admin/shoppingApi';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { matchesOutlet } from '../shared/outletForm';

export default function OutletManagementScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const canManage = usePermission('canManageShopping');
  const [search, setSearch] = useState('');

  const list = useListShopOutletsInfiniteQuery({});
  const all = flattenPages(list.data?.pages);
  const items = all.filter((o) => matchesOutlet(o, search));
  const [toggle, toggleState] = useToggleShopOutletMutation();
  const [remove, removeState] = useDeleteShopOutletMutation();

  const [menu, setMenu] = useState<ShopOutlet | null>(null);
  const [deleting, setDeleting] = useState<ShopOutlet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flip = async (o: ShopOutlet) => {
    setMenu(null);
    const res = await toggle({ id: o.id });
    if ('error' in res) return showToast({ tone: 'error', message: adminErrorOf(res.error)?.message || 'The outlet was not changed.' });
    showToast({ tone: 'success', message: res.data.isActive ? `${o.name} is open to customers.` : `${o.name} is closed to customers.` });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await remove({ id: deleting.id });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The outlet was not deleted.');
    setDeleting(null);
    showToast({ tone: 'success', message: 'Outlet deleted.' });
  };

  const options = (o: ShopOutlet): SheetOption[] => [
    {
      label: 'Open the outlet',
      icon: 'business-outline',
      onPress: () => {
        setMenu(null);
        navigation.navigate(AdminShoppingRouteNames.AdminOutletDetail, { outletId: o.id });
      },
    },
    ...(canManage
      ? [
          { label: o.isActive ? 'Close to customers' : 'Open to customers', icon: o.isActive ? 'pause-circle-outline' : 'play-circle-outline', onPress: () => flip(o) },
          {
            label: 'Delete outlet',
            icon: 'trash-outline',
            tone: 'destructive' as const,
            onPress: () => {
              setMenu(null);
              setError(null);
              setDeleting(o);
            },
          },
        ]
      : []),
  ];

  return (
    <AdminScreen
      title="Outlets"
      subtitle="Shopping"
      scroll={false}
      footer={
        <PermissionGate all={['canManageShopping']} fallback={null}>
          <Button label="Add outlet" icon="add" onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminAddOutlet, {})} fullWidth size="lg" />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageShopping']} action="see outlets">
        <View style={styles.controls}>
          <TextField placeholder="Search by outlet, brand or city" value={search} onChangeText={setSearch} returnKeyType="search" accessibilityLabel="Search outlets" />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="business-outline"
          emptyTitle={search.trim() ? 'No outlets match' : 'No outlets yet'}
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(o) => o.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <EntityRow
                icon="business-outline"
                title={item.name}
                subtitle={[item.brandName || 'No brand', item.location?.city].filter(Boolean).join(' · ')}
                badge={item.isActive ? { label: 'Open', tone: 'success' } : { label: 'Closed', tone: 'neutral' }}
                onPress={() => setMenu(item)}
                divider={index < items.length - 1}
              />
            )}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage || toggleState.isLoading ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <ActionSheet visible={!!menu} title={menu?.name} options={menu ? options(menu) : []} onClose={() => setMenu(null)} />
      <ConfirmSheet
        visible={!!deleting}
        title={`Delete ${deleting?.name}?`}
        message="Customers stop finding it. This cannot be undone from the console."
        confirmLabel="Delete"
        destructive
        busy={removeState.isLoading}
        error={error}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
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
