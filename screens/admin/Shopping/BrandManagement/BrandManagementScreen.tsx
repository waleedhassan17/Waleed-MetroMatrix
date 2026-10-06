// ============================================================================
// Brands — every storefront in shopping, newest first.
//
// Filter by status (pending approval is the usual way in) and search by name;
// both are asked of the server, and the list pages through everything (the old
// screen filtered the first hundred on the phone). A row opens the brand; its
// menu approves, suspends or reactivates it and deletes it, each with a reason.
// A long press opens the vendor who owns it.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { ActionSheet, Button, TextField, showToast, type SheetOption } from '../../../../components/ui';
import { enumOptions, presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { usePermission } from '../../../../hooks/useAdminPermission';
import useDebouncedValue from '../../../../hooks/useDebouncedValue';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import {
  useDeleteShopBrandMutation,
  useListShopBrandsInfiniteQuery,
  useSetShopBrandStatusMutation,
  type ShopBrand,
} from '../../../../networks/admin/shoppingApi';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { formatCount } from '../../../../utils/admin/format';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { idOf, openProvider } from '../../people/openProvider';
import { nextDecision } from '../shared/brandStatus';

export default function BrandManagementScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const canManage = usePermission('canManageShopping');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const searchQuery = useDebouncedValue(search.trim());

  const list = useListShopBrandsInfiniteQuery({ status: status === 'all' ? undefined : status, search: searchQuery || undefined });
  const items = flattenPages(list.data?.pages);
  const [setBrandStatus, statusState] = useSetShopBrandStatusMutation();
  const [remove, removeState] = useDeleteShopBrandMutation();

  const [menu, setMenu] = useState<ShopBrand | null>(null);
  const [acting, setActing] = useState<{ brand: ShopBrand; kind: 'status' | 'delete' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decision = acting?.kind === 'status' ? nextDecision(acting.brand.status) : null;

  const confirm = async (reason: string) => {
    if (!acting) return;
    const res =
      acting.kind === 'status' && decision
        ? await setBrandStatus({ id: acting.brand.id, status: decision.status, reason })
        : await remove({ id: acting.brand.id, reason });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'That did not work.');
    setActing(null);
    showToast({
      tone: 'success',
      message: acting.kind === 'delete' ? `${acting.brand.name} deleted.` : decision?.status === 'active' ? `${acting.brand.name} is live.` : `${acting.brand.name} is suspended.`,
    });
  };

  const options = (b: ShopBrand): SheetOption[] => {
    const next = nextDecision(b.status);
    const start = (kind: 'status' | 'delete') => () => {
      setMenu(null);
      setError(null);
      setActing({ brand: b, kind });
    };
    return [
      {
        label: 'Open the brand',
        icon: 'storefront-outline',
        onPress: () => {
          setMenu(null);
          navigation.navigate(AdminShoppingRouteNames.AdminBrandDetail, { brandId: b.id });
        },
      },
      ...(idOf(b.owner)
        ? [
            {
              label: `Open ${b.ownerName || 'the vendor'}`,
              icon: 'person-outline',
              onPress: () => {
                setMenu(null);
                openProvider(navigation, idOf(b.owner));
              },
            },
          ]
        : []),
      ...(canManage && next ? [{ label: next.verb, icon: next.status === 'active' ? 'checkmark-circle-outline' : 'pause-circle-outline', onPress: start('status') }] : []),
      ...(canManage ? [{ label: 'Delete brand', icon: 'trash-outline', tone: 'destructive' as const, onPress: start('delete') }] : []),
    ];
  };

  return (
    <AdminScreen
      title="Brands"
      subtitle="Shopping"
      scroll={false}
      headerActions={[{ icon: 'business-outline', label: 'Outlets', onPress: () => navigation.navigate(AdminShoppingRouteNames.AdminOutletList) }]}
      footer={
        <PermissionGate all={['canManageShopping']} fallback={null}>
          <Button label="Add brand" icon="add" onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminAddBrand, {})} fullWidth size="lg" />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageShopping']} action="see brands">
        <View style={styles.controls}>
          <TextField placeholder="Search brands" value={search} onChangeText={setSearch} returnKeyType="search" accessibilityLabel="Search brands by name" />
          <FilterChips options={[{ value: 'all', label: 'All' }, ...enumOptions(meta, 'brandStatuses')]} value={status} onChange={setStatus} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="storefront-outline"
          emptyTitle={searchQuery ? 'No brands match' : status === 'pending' ? 'No brands waiting for approval' : 'No brands here'}
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(b) => b.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => {
              const ownerId = idOf(item.owner);
              return (
                <EntityRow
                  avatar={{ name: item.name, uri: item.logo || null }}
                  title={item.name}
                  subtitle={[ownerId ? item.ownerName || 'Vendor' : 'Run by the platform', typeof item.productCount === 'number' ? `${formatCount(item.productCount)} products` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  badge={presentStatus(meta, 'brandStatuses', item.status)}
                  onPress={() => setMenu(item)}
                  onLongPress={ownerId ? () => openProvider(navigation, ownerId) : undefined}
                  accessibilityLabel={`${item.name}, ${presentStatus(meta, 'brandStatuses', item.status).label}.${ownerId ? ' Long press to open the vendor.' : ''}`}
                  divider={index < items.length - 1}
                />
              );
            }}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <ActionSheet visible={!!menu} title={menu?.name} options={menu ? options(menu) : []} onClose={() => setMenu(null)} />

      <ConfirmSheet
        visible={!!acting}
        title={acting?.kind === 'delete' ? `Delete ${acting.brand.name}?` : decision?.title ?? ''}
        message={acting?.kind === 'delete' ? 'It disappears from the storefront and from this console. Its orders and their history stay.' : decision?.message}
        confirmLabel={acting?.kind === 'delete' ? 'Delete' : decision?.verb ?? ''}
        destructive={acting?.kind === 'delete' || !!decision?.destructive}
        requireReason
        busy={statusState.isLoading || removeState.isLoading}
        error={error}
        onConfirm={confirm}
        onClose={() => setActing(null)}
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
