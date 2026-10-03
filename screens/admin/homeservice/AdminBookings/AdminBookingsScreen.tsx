// ============================================================================
// Home-services bookings — every booking, filterable by status (labels and
// tones from /admin/meta) and searchable by customer.
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
import { useListHSBookingsInfiniteQuery } from '../../../../networks/admin/homeServicesApi';
import { formatDateTime } from '../../../../utils/admin/format';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { categoryLabel } from '../labels';

export default function AdminBookingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());

  const list = useListHSBookingsInfiniteQuery({ status: status === 'all' ? undefined : status, search: query || undefined });
  const items = flattenPages(list.data?.pages);

  return (
    <AdminScreen title="Home-service bookings" scroll={false}>
      <PermissionGate all={['canManageHomeServices']} action="see home-service bookings">
        <View style={styles.controls}>
          <TextField placeholder="Search customer name or email" value={search} onChangeText={setSearch} autoCapitalize="none" returnKeyType="search" containerStyle={styles.search} accessibilityLabel="Search bookings by customer" />
          <FilterChips options={[{ value: 'all', label: 'All' }, ...enumOptions(meta, 'bookingStatuses')]} value={status} onChange={setStatus} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="calendar-outline"
          emptyTitle={query ? 'No matches' : 'No bookings here'}
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(b) => b.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <EntityRow
                title={`${categoryLabel(meta, item.serviceCategory)}${item.serviceType && item.serviceType !== item.serviceCategory ? ` · ${categoryLabel(meta, item.serviceType)}` : ''}`}
                subtitle={`${item.customer?.name ?? 'Customer'} → ${item.provider?.name ?? 'Unassigned'}${item.city ? ` · ${item.city}` : ''} · ${formatDateTime(item.scheduledFor ?? item.createdAt)}`}
                badge={presentStatus(meta, 'bookingStatuses', item.status)}
                meta={formatMoney(item.price)}
                onPress={() => navigation.navigate('AdminHSBookingDetail', { bookingId: item.id })}
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
    search: { marginBottom: S.sm },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
  });
