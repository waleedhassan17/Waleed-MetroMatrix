// ============================================================================
// Queue — everything waiting for an admin decision, oldest first, across the
// platform: provider and doctor applications, brand applications, disputes,
// payout and return requests, wallet adjustments awaiting a second approver.
//
// The server merges the sources and only includes the ones this admin may act
// on; each item opens the screen where it is decided.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, EntityRow, FilterChips, QueryState } from '../../../components/admin';
import { hasPermission, useAdminProfile, type PermissionKey } from '../../../hooks/useAdminPermission';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import { flattenPages, useGetQueueInfiniteQuery, type QueueItem } from '../../../networks/admin/adminApi';
import { formatMoney } from '../../../constants/Currency';
import { formatAgo } from '../../../utils/admin/format';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../theme';
import { routeForTarget } from '../notifications/notificationTarget';

type QueueType = { value: string; label: string; permission: string };

export default function AdminQueueScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const admin = useAdminProfile();
  const { data: meta } = useAdminMeta();
  const initialType = (route.params as { type?: string } | undefined)?.type ?? 'all';
  const [type, setType] = useState(initialType);

  // A type passed from Overview ("Open disputes") applies when the tab opens.
  React.useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  const types = ((meta?.enums.queueTypes ?? []) as QueueType[]).filter((t) => hasPermission(admin, t.permission as PermissionKey));
  const labelOf = (value: string) => types.find((t) => t.value === value)?.label ?? value;

  const queue = useGetQueueInfiniteQuery({ type: type === 'all' ? undefined : type });
  const items = flattenPages(queue.data?.pages);

  const open = (item: QueueItem) => {
    const target = routeForTarget(item.target);
    if (target) navigation.navigate(target.name, target.params);
  };

  return (
    <AdminScreen title="Queue" hideBack scroll={false}>
      <View style={styles.filters}>
        <FilterChips options={[{ value: 'all', label: 'Everything' }, ...types.map((t) => ({ value: t.value, label: t.label }))]} value={type} onChange={setType} />
      </View>
      <QueryState
        isLoading={queue.isLoading}
        error={queue.error}
        onRetry={queue.refetch}
        isEmpty={!items.length}
        emptyIcon="checkmark-done-outline"
        emptyTitle="Nothing waiting"
        emptyMessage={type === 'all' ? 'Every queue you work on is empty.' : `No ${labelOf(type).toLowerCase()} waiting.`}
        style={styles.state}
      >
        <FlatList
          data={items}
          keyExtractor={(i) => `${i.type}:${i.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <EntityRow
              title={item.title}
              subtitle={[labelOf(item.type), item.subtitle, item.amount?.value !== undefined ? formatMoney(item.amount.value, { code: item.amount.currency }) : null].filter(Boolean).join(' · ')}
              meta={item.waitingSince ? formatAgo(item.waitingSince) : null}
              onPress={routeForTarget(item.target) ? () => open(item) : undefined}
              divider={index < items.length - 1}
            />
          )}
          onEndReached={() => queue.hasNextPage && !queue.isFetchingNextPage && queue.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={queue.isFetching && !queue.isFetchingNextPage && !queue.isLoading} onRefresh={queue.refetch} tintColor={colors.inkMuted} />}
          ListFooterComponent={queue.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
        />
      </QueryState>
    </AdminScreen>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    filters: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
  });
