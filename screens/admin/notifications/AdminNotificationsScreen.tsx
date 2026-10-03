// ============================================================================
// Notifications — work that arrived for admins (a provider submitted, a
// dispute opened, a payout requested) and system alerts.
//
// Read state is per admin: marking one read here does not mark it read for
// everyone else (it used to — one `isRead` flag on the shared document). Each
// admin only sees notifications within their permissions.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AdminScreen, ConfirmSheet, FilterChips, QueryState } from '../../../components/admin';
import { Button, showToast } from '../../../components/ui';
import { usePermission } from '../../../hooks/useAdminPermission';
import {
  adminErrorOf,
  flattenPages,
  useClearNotificationsMutation,
  useDismissNotificationMutation,
  useListNotificationsInfiniteQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AdminNotification,
} from '../../../networks/admin/adminApi';
import { formatAgo, formatDateTime } from '../../../utils/admin/format';
import { GUTTER, S, T, useTheme, type ThemeColors } from '../../../theme';
import { routeForTarget } from './notificationTarget';

const SEVERITY_ICON: Record<AdminNotification['severity'], string> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'alert-circle-outline',
  error: 'close-circle-outline',
};

export default function AdminNotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const canClear = usePermission('canManageNotifications');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const list = useListNotificationsInfiniteQuery({ unread: filter === 'unread' });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, markAllState] = useMarkAllNotificationsReadMutation();
  const [dismiss] = useDismissNotificationMutation();
  const [clearAll, clearState] = useClearNotificationsMutation();

  const items = flattenPages(list.data?.pages);
  const unread = list.data?.pages[0]?.meta.unread;

  const open = (n: AdminNotification) => {
    if (!n.read) markRead(n.id);
    const route = routeForTarget(n.target);
    if (route) navigation.navigate(route.name, route.params);
  };

  const onDismiss = async (n: AdminNotification) => {
    const res = await dismiss(n.id);
    if ('error' in res) showToast({ tone: 'error', message: adminErrorOf(res.error)?.message || 'Could not dismiss.' });
  };

  const onMarkAll = async () => {
    const res = await markAll();
    if ('error' in res) showToast({ tone: 'error', message: adminErrorOf(res.error)?.message || 'Could not mark as read.' });
  };

  const onClear = async () => {
    const res = await clearAll();
    setConfirmClear(false);
    if ('error' in res) showToast({ tone: 'error', message: adminErrorOf(res.error)?.message || 'Could not clear.' });
    else showToast({ tone: 'success', message: 'Notifications cleared for you.' });
  };

  const renderItem = ({ item }: { item: AdminNotification }) => {
    const tone = item.severity === 'error' ? colors.error : item.severity === 'warning' ? colors.warning : item.severity === 'success' ? colors.success : colors.info;
    return (
      <View style={[styles.row, !item.read && styles.unreadRow]}>
        <Ionicons name={SEVERITY_ICON[item.severity] as any} size={22} color={tone} style={styles.icon} />
        <Pressable
          style={styles.body}
          onPress={() => open(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.message}. ${formatDateTime(item.createdAt)}`}
        >
          <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.when}>{formatAgo(item.createdAt)}</Text>
        </Pressable>
        <Ionicons
          name="close"
          size={20}
          color={colors.inkMuted}
          style={styles.dismiss}
          onPress={() => onDismiss(item)}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${item.title}`}
        />
      </View>
    );
  };

  return (
    <AdminScreen
      title="Notifications"
      scroll={false}
      right={
        unread ? (
          <Button label="Mark all read" variant="ghost" onPress={onMarkAll} loading={markAllState.isLoading} />
        ) : undefined
      }
    >
      <View style={styles.filters}>
        <FilterChips
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread', count: unread },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as 'all' | 'unread')}
        />
      </View>
      <QueryState
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        isEmpty={!items.length}
        emptyIcon="notifications-off-outline"
        emptyTitle={filter === 'unread' ? 'Nothing unread' : 'No notifications'}
        emptyMessage="New provider submissions, disputes and payout requests appear here."
        style={styles.state}
      >
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
          ListFooterComponent={
            <>
              {list.isFetchingNextPage && <ActivityIndicator color={colors.inkMuted} style={styles.more} />}
              {canClear && items.length > 0 && !list.hasNextPage && (
                <Button label="Clear all notifications" variant="ghost" onPress={() => setConfirmClear(true)} fullWidth style={styles.more} />
              )}
            </>
          }
        />
      </QueryState>

      <ConfirmSheet
        visible={confirmClear}
        title="Clear all notifications?"
        message="They are hidden for you only; other admins still see them."
        confirmLabel="Clear all"
        destructive
        busy={clearState.isLoading}
        onConfirm={onClear}
        onClose={() => setConfirmClear(false)}
      />
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    filters: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingBottom: S.huge },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: GUTTER,
      paddingVertical: S.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    unreadRow: { backgroundColor: c.accentSoft },
    icon: { marginTop: 1, marginRight: S.md },
    body: { flex: 1, minWidth: 0 },
    title: { ...T.body, color: c.ink },
    titleUnread: { ...T.bodyStrong },
    message: { ...T.body, color: c.inkMuted, marginTop: 2 },
    when: { ...T.caption, color: c.inkMuted, marginTop: S.xs },
    dismiss: { padding: S.md, margin: -S.md, marginLeft: S.xs },
    more: { marginVertical: S.lg },
  });
