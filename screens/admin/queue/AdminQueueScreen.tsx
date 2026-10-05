// ============================================================================
// Queue — everything waiting for an admin decision, oldest first, across the
// platform: provider and doctor applications, brand applications, disputes,
// payout and return requests, wallet adjustments awaiting a second approver.
//
// The server merges the sources and only includes the ones this admin may act
// on; each item opens the screen where it is decided. Work about a provider
// (a doctor, a brand, a payout) opens that provider on a long press. A wait
// past a day reads as a warning, past three days as overdue — in words as
// well as colour.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, EntityRow, FilterChips, QueryState } from '../../../components/admin';
import { hasPermission, useAdminProfile, type PermissionKey } from '../../../hooks/useAdminPermission';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import { flattenPages, useGetQueueInfiniteQuery, type QueueItem } from '../../../networks/admin/adminApi';
import { formatMoney } from '../../../constants/Currency';
import { formatAgo, formatCount } from '../../../utils/admin/format';
import { GUTTER, S, T, useTheme, type ThemeColors } from '../../../theme';
import { routeForTarget } from '../notifications/notificationTarget';
import { openProvider } from '../people/openProvider';
import { queueIcon, waitTone } from './queueLook';

type QueueType = { value: string; label: string; permission: string };

export default function AdminQueueScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const admin = useAdminProfile();
  const { data: meta } = useAdminMeta();
  const [type, setType] = useState('all');

  // A type passed from Overview ("Open disputes") applies once per visit, then
  // the param is cleared — so the admin's own chip choice is never reset, and
  // the same link from Overview works again next time.
  const passedType = (route.params as { type?: string } | undefined)?.type;
  useEffect(() => {
    if (passedType) {
      setType(passedType);
      navigation.setParams({ type: undefined });
    }
  }, [passedType, navigation]);

  const types = ((meta?.enums.queueTypes ?? []) as QueueType[]).filter((t) => hasPermission(admin, t.permission as PermissionKey));
  const labelOf = (value: string) => types.find((t) => t.value === value)?.label ?? value;

  const queue = useGetQueueInfiniteQuery({ type: type === 'all' ? undefined : type });
  const items = flattenPages(queue.data?.pages);
  const total = queue.data?.pages?.[0]?.meta?.total;

  const open = (item: QueueItem) => {
    const target = routeForTarget(item.target);
    if (target) navigation.navigate(target.name, target.params);
  };

  const providerOf = (item: QueueItem): string | null => {
    const t = item.target as { type?: string; id?: string; providerId?: string | null };
    return t.type === 'Provider' ? null : t.providerId ?? null;
  };

  return (
    <AdminScreen
      title="Queue"
      hideBack
      scroll={false}
      summary={
        items.length ? (
          <Text style={styles.summary}>
            {typeof total === 'number' ? `${formatCount(total)} waiting` : `${formatCount(items.length)}${queue.hasNextPage ? '+' : ''} waiting`}
            {items[0]?.waitingSince ? ` · oldest added ${formatAgo(items[0].waitingSince)}` : ''}
          </Text>
        ) : undefined
      }
    >
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
        skeleton="rows"
        skeletonCount={6}
        style={styles.state}
      >
        <FlatList
          data={items}
          keyExtractor={(i) => `${i.type}:${i.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const tone = waitTone(item.waitingSince);
            const providerId = providerOf(item);
            return (
              <EntityRow
                icon={queueIcon(item.type)}
                iconTone={tone ?? 'accent'}
                title={item.title}
                subtitle={[labelOf(item.type), item.subtitle, item.amount?.value !== undefined ? formatMoney(item.amount.value, { code: item.amount.currency }) : null].filter(Boolean).join(' · ')}
                meta={item.waitingSince ? `${formatAgo(item.waitingSince)}${tone === 'error' ? ' · overdue' : ''}` : null}
                metaTone={tone}
                urgency={tone}
                onPress={routeForTarget(item.target) ? () => open(item) : undefined}
                onLongPress={providerId ? () => openProvider(navigation, providerId) : undefined}
                accessibilityLabel={[item.title, labelOf(item.type), item.subtitle, item.waitingSince ? `waiting ${formatAgo(item.waitingSince)}` : null, tone === 'error' ? 'overdue' : null, providerId ? 'long press to open the provider' : null]
                  .filter(Boolean)
                  .join(', ')}
                divider={index < items.length - 1}
              />
            );
          }}
          onEndReached={() => queue.hasNextPage && !queue.isFetchingNextPage && queue.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={queue.isFetching && !queue.isFetchingNextPage && !queue.isLoading} onRefresh={queue.refetch} tintColor={colors.inkMuted} />}
          ListFooterComponent={queue.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
        />
      </QueryState>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    summary: { ...T.caption, color: c.inkMuted },
    filters: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
  });
