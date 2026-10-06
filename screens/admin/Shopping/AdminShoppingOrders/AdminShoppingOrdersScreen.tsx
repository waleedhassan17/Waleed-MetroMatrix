// ============================================================================
// Every shopping order, newest first: filter by status and payment, search by
// order code or customer, and page through all of them (the old screen stopped
// at 25). A row opens the order; a long press opens the brand's vendor.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { TextField } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { enumOptions, presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import useDebouncedValue from '../../../../hooks/useDebouncedValue';
import { flattenPages } from '../../../../networks/admin/adminApi';
import { useListShopOrdersInfiniteQuery } from '../../../../networks/admin/shoppingApi';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { formatAgo } from '../../../../utils/admin/format';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { PAYMENT_FILTERS, paymentLabel } from '../shared/orders';

export default function AdminShoppingOrdersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [search, setSearch] = useState('');
  const searchQuery = useDebouncedValue(search.trim());

  const list = useListShopOrdersInfiniteQuery({
    status: status === 'all' ? undefined : status,
    paymentStatus: payment === 'all' ? undefined : payment,
    search: searchQuery || undefined,
  });
  const items = flattenPages(list.data?.pages);

  return (
    <AdminScreen title="Orders" subtitle="Shopping" scroll={false}>
      <PermissionGate all={['canManageShopping']} action="see orders">
        <View style={styles.controls}>
          <TextField
            placeholder="Search order code or customer"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search orders by code or customer"
          />
          <FilterChips options={[{ value: 'all', label: 'All' }, ...enumOptions(meta, 'orderStatuses')]} value={status} onChange={setStatus} />
          <FilterChips options={PAYMENT_FILTERS} value={payment} onChange={setPayment} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="receipt-outline"
          emptyTitle="No orders match"
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(o) => o.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <EntityRow
                title={item.odexId}
                subtitle={[item.brandName || 'Brand', item.customerName || 'Customer', paymentLabel(item.paymentStatus)].join(' · ')}
                badge={presentStatus(meta, 'orderStatuses', item.orderStatus)}
                meta={[formatMoney(item.total), formatAgo(item.createdAt)].filter(Boolean).join(' · ')}
                onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminShoppingOrderDetail, { orderId: item.id })}
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
