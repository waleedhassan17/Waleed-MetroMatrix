// ============================================================================
// Home-services disputes — raised by a customer or a provider about a booking.
//
// Deciding one needs Home services; a decision that moves money (a refund to
// the customer, a penalty on the provider) also needs Finance. A refund is
// capped by the server at what the customer paid minus earlier refunds.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { TextField, showToast } from '../../../../components/ui';
import { usePermission } from '../../../../hooks/useAdminPermission';
import { enumOptions, presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import { useListHSDisputesInfiniteQuery, useResolveHSDisputeMutation, type HSDispute } from '../../../../networks/admin/homeServicesApi';
import { formatAgo } from '../../../../utils/admin/format';
import { GUTTER, S, T, useTheme, type ThemeColors } from '../../../../theme';

export default function AdminDisputesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const canDecide = usePermission('canManageHomeServices');
  const canMoveMoney = usePermission('canManageFinance');
  const [filter, setFilter] = useState('open');

  const list = useListHSDisputesInfiniteQuery({ status: filter === 'all' ? undefined : filter });
  const items = flattenPages(list.data?.pages);
  const [resolve, resolveState] = useResolveHSDisputeMutation();

  const [open, setOpen] = useState<HSDispute | null>(null);
  const [decision, setDecision] = useState('');
  const [resolution, setResolution] = useState('');
  const [refund, setRefund] = useState('');
  const [penalty, setPenalty] = useState('');
  const [error, setError] = useState<string | null>(null);

  const start = (d: HSDispute) => {
    setOpen(d);
    setDecision(d.status === 'open' ? 'investigating' : d.status);
    setResolution(d.resolution ?? '');
    setRefund('');
    setPenalty('');
    setError(null);
  };

  const submit = async (reason: string) => {
    if (!open) return;
    const res = await resolve({
      id: open.id,
      status: decision,
      resolution: resolution.trim() || undefined,
      refundAmount: refund ? Number(refund) : undefined,
      penalizeProvider: penalty ? Number(penalty) : undefined,
      reason,
    });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The decision was not saved.');
    setOpen(null);
    showToast({ tone: 'success', message: `Dispute ${presentStatus(meta, 'disputeStatuses', decision).label.toLowerCase()}.` });
  };

  const decisions = enumOptions(meta, 'disputeStatuses').filter((o) => o.value !== 'open');

  return (
    <AdminScreen title="Disputes" scroll={false}>
      <PermissionGate all={['canManageHomeServices']} action="see disputes">
        <View style={styles.controls}>
          <FilterChips options={[...enumOptions(meta, 'disputeStatuses'), { value: 'all', label: 'All' }]} value={filter} onChange={setFilter} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="chatbox-ellipses-outline"
          emptyTitle="No disputes here"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <EntityRow
                title={item.reason}
                subtitle={`${item.customer || 'Customer'} vs ${item.provider || 'provider'} · raised by the ${item.raisedByRole}`}
                badge={presentStatus(meta, 'disputeStatuses', item.status)}
                meta={formatAgo(item.createdAt)}
                onPress={canDecide ? () => start(item) : undefined}
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

      <ConfirmSheet
        visible={!!open}
        title={open?.reason ?? 'Dispute'}
        message={open?.description || undefined}
        confirmLabel="Save decision"
        requireReason
        reasonLabel="Note for the record"
        busy={resolveState.isLoading}
        error={error}
        onConfirm={submit}
        onClose={() => setOpen(null)}
      >
        {!!open?.bookingId && (
          <Text
            style={styles.link}
            onPress={() => {
              const id = open.bookingId;
              setOpen(null);
              navigation.navigate('AdminHSBookingDetail', { bookingId: id });
            }}
            accessibilityRole="link"
          >
            Open the booking
          </Text>
        )}
        <Text style={styles.label}>Decision</Text>
        <FilterChips options={decisions} value={decision} onChange={setDecision} />
        <TextField label="Resolution (shown to both sides)" value={resolution} onChangeText={setResolution} multiline />
        {canMoveMoney ? (
          <>
            <TextField label="Refund to customer (PKR, optional)" value={refund} onChangeText={(v) => setRefund(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
            <TextField label="Penalty on provider (PKR, optional)" value={penalty} onChangeText={(v) => setPenalty(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
          </>
        ) : (
          <Text style={styles.muted}>Refunds and penalties need the Finance permission.</Text>
        )}
      </ConfirmSheet>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    link: { ...T.bodyStrong, color: c.accentDeep, marginBottom: S.lg, minHeight: 44, textAlignVertical: 'center' },
    muted: { ...T.caption, color: c.inkMuted, marginBottom: S.lg },
  });
