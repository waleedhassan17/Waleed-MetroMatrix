// ============================================================================
// Payout requests — providers withdrawing their earnings. Finance only.
//
// Approving debits the provider's wallet and records the payout in one step
// (a double tap cannot pay twice); the server refuses if the balance no longer
// covers it. Rejecting needs a reason, which the provider sees.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { Button, showToast } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { enumOptions, presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import { useDecideHSPayoutMutation, useListHSPayoutsInfiniteQuery, type HSPayout } from '../../../../networks/admin/homeServicesApi';
import { formatAgo, formatCount } from '../../../../utils/admin/format';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { openProvider } from '../../people/openProvider';

export default function AdminPayoutsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [filter, setFilter] = useState('pending');
  const list = useListHSPayoutsInfiniteQuery({ status: filter === 'all' ? undefined : filter });
  const items = flattenPages(list.data?.pages);
  const [decide, decideState] = useDecideHSPayoutMutation();
  const [acting, setActing] = useState<{ payout: HSPayout; action: 'approve' | 'reject' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (reason: string) => {
    if (!acting) return;
    const res = await decide({ id: acting.payout.id, action: acting.action, reason: reason || undefined });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The decision was not saved.');
    setActing(null);
    showToast({ tone: 'success', message: acting.action === 'approve' ? `${formatMoney(acting.payout.amount)} paid out.` : 'Payout request rejected.' });
  };

  return (
    <AdminScreen title="Payout requests" scroll={false}>
      <PermissionGate all={['canManageFinance']} action="decide payouts">
        <View style={styles.controls}>
          <FilterChips options={[...enumOptions(meta, 'payoutStatuses'), { value: 'all', label: 'All' }]} value={filter} onChange={setFilter} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="cash-outline"
          emptyTitle={filter === 'pending' ? 'Nothing waiting' : 'No payout requests here'}
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <View style={index < items.length - 1 ? styles.divider : undefined}>
                <EntityRow
                  avatar={{ name: item.provider?.name }}
                  title={`${formatMoney(item.amount)} · ${item.method}`}
                  subtitle={
                    item.provider
                      ? `${item.provider.name} · balance ${formatMoney(item.provider.walletBalance)} · ${formatCount(item.provider.completedJobs)} jobs`
                      : 'Provider removed'
                  }
                  badge={presentStatus(meta, 'payoutStatuses', item.status)}
                  meta={formatAgo(item.createdAt)}
                  onPress={item.provider ? () => openProvider(navigation, item.provider!.id) : undefined}
                  accessibilityLabel={item.provider ? `${formatMoney(item.amount)} payout for ${item.provider.name}. Opens the provider.` : undefined}
                  divider={false}
                />
                {item.status === 'pending' && (
                  <View style={styles.actions}>
                    <Button label="Approve" onPress={() => { setError(null); setActing({ payout: item, action: 'approve' }); }} style={styles.action} />
                    <Button label="Reject" variant="secondary" onPress={() => { setError(null); setActing({ payout: item, action: 'reject' }); }} style={styles.action} />
                  </View>
                )}
              </View>
            )}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <ConfirmSheet
        visible={!!acting}
        title={acting?.action === 'approve' ? `Pay ${formatMoney(acting?.payout.amount)}?` : 'Reject this payout?'}
        message={
          acting?.action === 'approve'
            ? `Debits ${acting.payout.provider?.name ?? 'the provider'}'s wallet now. Send the money by ${acting.payout.method}.`
            : 'The provider sees the reason. Their balance is not touched.'
        }
        confirmLabel={acting?.action === 'approve' ? 'Approve payout' : 'Reject'}
        destructive={acting?.action === 'reject'}
        requireReason={acting?.action === 'reject'}
        reasonLabel="Reason shown to the provider"
        busy={decideState.isLoading}
        error={error}
        onConfirm={submit}
        onClose={() => setActing(null)}
      />
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    actions: { flexDirection: 'row', gap: S.sm, paddingBottom: S.md },
    action: { flex: 1 },
  });
