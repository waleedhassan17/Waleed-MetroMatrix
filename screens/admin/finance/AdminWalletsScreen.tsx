// ============================================================================
// Wallets and adjustments (needs Finance).
//
//   Wallets       every customer and provider wallet, by owner or search; a
//                 row opens its ledger and the "Adjust balance" action
//   Adjustments   manual credits and debits; those above the approval
//                 threshold wait here for a different super admin
//   Ledger check  whether wallet balances add up to what was topped up minus
//                 what was paid out (plus adjustments)
//
// Opened from the Queue or a notification about an adjustment, it starts on
// Adjustments and opens that one.
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, EntityRow, FilterChips, KpiGrid, KpiTile, PermissionGate, QueryState, Section } from '../../../components/admin';
import { ActionSheet, SegmentedControl, TextField, ToneBadge, showToast, type SheetOption } from '../../../components/ui';
import { formatMoney } from '../../../constants/Currency';
import { enumOptions, presentStatus, useAdminMeta } from '../../../hooks/useAdminMeta';
import { useAdminProfile } from '../../../hooks/useAdminPermission';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { adminErrorOf, flattenPages } from '../../../networks/admin/adminApi';
import {
  useDecideAdjustmentMutation,
  useGetReconciliationQuery,
  useListAdjustmentsInfiniteQuery,
  useListWalletsInfiniteQuery,
  type AdjustmentStatus,
  type WalletAdjustment,
  type WalletOwnerType,
} from '../../../networks/admin/walletsApi';
import { formatAgo, formatDateTime } from '../../../utils/admin/format';
import { GUTTER, S, T, useTheme, type ThemeColors } from '../../../theme';
import { OWNER_FILTERS, OWNER_TYPE_LABEL, adjustmentTitle, decisionBlock } from './walletRules';

type Segment = 'wallets' | 'adjustments' | 'ledger';
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'wallets', label: 'Wallets' },
  { value: 'adjustments', label: 'Adjustments' },
  { value: 'ledger', label: 'Ledger check' },
];

export default function AdminWalletsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = (useRoute().params ?? {}) as { segment?: Segment; adjustmentId?: string };
  const [segment, setSegment] = useState<Segment>(params.segment ?? (params.adjustmentId ? 'adjustments' : 'wallets'));

  return (
    <AdminScreen title="Wallets and adjustments" scroll={false}>
      <PermissionGate all={['canManageFinance']} action="see wallets">
        <View style={styles.tabs}>
          <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />
        </View>
        {segment === 'wallets' && <WalletsTab />}
        {segment === 'adjustments' && <AdjustmentsTab focusId={params.adjustmentId} />}
        {segment === 'ledger' && <LedgerTab />}
      </PermissionGate>
    </AdminScreen>
  );
}

function WalletsTab() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [owner, setOwner] = useState('all');
  const [search, setSearch] = useState('');
  const searchQuery = useDebouncedValue(search.trim());
  const list = useListWalletsInfiniteQuery({ ownerType: owner === 'all' ? undefined : (owner as WalletOwnerType), search: searchQuery || undefined });
  const items = flattenPages(list.data?.pages);

  return (
    <>
      <View style={styles.controls}>
        <TextField placeholder="Search name or email" value={search} onChangeText={setSearch} autoCapitalize="none" returnKeyType="search" accessibilityLabel="Search wallets by owner" />
        <FilterChips options={OWNER_FILTERS} value={owner} onChange={setOwner} />
      </View>
      <QueryState
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        isEmpty={!items.length}
        emptyIcon="wallet-outline"
        emptyTitle={searchQuery ? 'No wallets match' : 'No wallets'}
        skeleton="rows"
        style={styles.state}
      >
        <FlatList
          data={items}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <EntityRow
              avatar={item.ownerType === 'Platform' ? undefined : { name: item.ownerName }}
              icon={item.ownerType === 'Platform' ? 'business-outline' : undefined}
              title={item.ownerName}
              subtitle={[OWNER_TYPE_LABEL[item.ownerType], item.ownerEmail].filter(Boolean).join(' · ')}
              meta={formatMoney(item.balance, { code: item.currency })}
              onPress={() =>
                navigation.navigate('AdminWalletDetail', { walletId: item.id, ownerName: item.ownerName, ownerType: item.ownerType, ownerId: item.ownerId })
              }
              divider={index < items.length - 1}
            />
          )}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
        />
      </QueryState>
    </>
  );
}

function AdjustmentsTab({ focusId }: { focusId?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const me = useAdminProfile();
  const [status, setStatus] = useState<string>('pending');
  const list = useListAdjustmentsInfiniteQuery({ status: status === 'all' ? undefined : (status as AdjustmentStatus) });
  const items = flattenPages(list.data?.pages);
  const [decide, decideState] = useDecideAdjustmentMutation();

  const [menu, setMenu] = useState<WalletAdjustment | null>(null);
  const [deciding, setDeciding] = useState<{ adjustment: WalletAdjustment; decision: 'approve' | 'reject' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opened on one adjustment: show its choices once it has loaded.
  const focused = useRef(false);
  useEffect(() => {
    if (!focusId || focused.current) return;
    const hit = items.find((a) => a.id === focusId);
    if (hit) {
      focused.current = true;
      setMenu(hit);
    }
  }, [focusId, items]);

  const confirm = async (note: string) => {
    if (!deciding) return;
    const res = await decide({ id: deciding.adjustment.id, decision: deciding.decision, note: note || undefined });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The decision was not saved.');
    setDeciding(null);
    showToast({ tone: 'success', message: deciding.decision === 'approve' ? 'Adjustment approved and applied.' : 'Adjustment rejected.' });
  };

  const options = (a: WalletAdjustment): SheetOption[] => {
    const blocked = decisionBlock(a, me);
    const start = (decision: 'approve' | 'reject') => () => {
      setMenu(null);
      setError(null);
      setDeciding({ adjustment: a, decision });
    };
    return [
      ...(blocked ? [] : [{ label: 'Approve and apply', icon: 'checkmark-circle-outline', onPress: start('approve') }, { label: 'Reject', icon: 'close-circle-outline', tone: 'destructive' as const, onPress: start('reject') }]),
      {
        label: 'Open the wallet',
        icon: 'wallet-outline',
        onPress: () => {
          setMenu(null);
          navigation.navigate('AdminWalletDetail', { walletId: a.walletId });
        },
      },
    ];
  };

  return (
    <>
      <View style={styles.controls}>
        <FilterChips options={[...enumOptions(meta, 'adjustmentStatuses'), { value: 'all', label: 'All' }]} value={status} onChange={setStatus} />
      </View>
      <QueryState
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        isEmpty={!items.length}
        emptyIcon="swap-vertical-outline"
        emptyTitle={status === 'pending' ? 'Nothing waiting for approval' : 'No adjustments here'}
        skeleton="rows"
        style={styles.state}
      >
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <EntityRow
              icon={item.direction === 'credit' ? 'add-circle-outline' : 'remove-circle-outline'}
              title={adjustmentTitle(item)}
              subtitle={item.reason}
              badge={presentStatus(meta, 'adjustmentStatuses', item.status)}
              meta={formatAgo(item.createdAt)}
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

      <ActionSheet
        visible={!!menu}
        title={menu ? adjustmentTitle(menu) : undefined}
        message={menu ? [menu.reason, decisionBlock(menu, me)].filter(Boolean).join('\n\n') : undefined}
        options={menu ? options(menu) : []}
        onClose={() => setMenu(null)}
      />
      <ConfirmSheet
        visible={!!deciding}
        title={deciding?.decision === 'approve' ? `Approve: ${deciding ? adjustmentTitle(deciding.adjustment) : ''}?` : 'Reject this adjustment?'}
        message={
          deciding?.decision === 'approve'
            ? 'It is applied to the wallet straight away. A debit the balance cannot cover fails, and nothing moves.'
            : 'Nothing moves. The admin who asked for it sees your note.'
        }
        confirmLabel={deciding?.decision === 'approve' ? 'Approve' : 'Reject'}
        destructive={deciding?.decision === 'reject'}
        requireReason={deciding?.decision === 'reject'}
        reasonLabel="Note"
        busy={decideState.isLoading}
        error={error}
        onConfirm={confirm}
        onClose={() => setDeciding(null)}
      />
    </>
  );
}

function LedgerTab() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ledger = useGetReconciliationQuery();
  const r = ledger.data;

  return (
    <QueryState isLoading={ledger.isLoading} error={ledger.error} onRetry={ledger.refetch} skeleton="tiles" skeletonCount={4} style={styles.state}>
      {r && (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={ledger.isFetching && !ledger.isLoading} onRefresh={ledger.refetch} tintColor={colors.inkMuted} />}
        >
          <View style={styles.verdict}>
            <ToneBadge label={r.balanced ? 'Balanced' : `Out by ${formatMoney(r.drift, { decimals: true })}`} tone={r.balanced ? 'success' : 'error'} />
            <Text style={styles.muted}>Checked {formatDateTime(r.computedAt)}</Text>
          </View>
          <Section title="What wallets hold">
            <KpiGrid>
              <KpiTile label="Customers" value={formatMoney(r.totalUserBalance)} />
              <KpiTile label="Providers" value={formatMoney(r.totalProviderBalance)} />
            </KpiGrid>
          </Section>
          <Section title="How it should add up" card>
            <DetailRow label="Topped up" value={formatMoney(r.totalToppedUp)} />
            <DetailRow label="Paid out to banks" value={formatMoney(r.totalPaidOut)} />
            <DetailRow label="Manual adjustments" value={formatMoney(r.netAdjustments)} />
            <DetailRow label="Expected in wallets" value={formatMoney(r.expected)} />
            <DetailRow label="Actually in wallets" value={formatMoney(r.sumOfAllWallets)} last={!r.platformWalletBalance} />
            {!!r.platformWalletBalance && (
              <DetailRow label="Of which the platform account (fees before Oct 2026)" value={formatMoney(r.platformWalletBalance)} last />
            )}
          </Section>
          {!r.balanced && (
            <Text style={styles.muted}>
              A difference means money moved without a matching ledger line. Finance has been notified; open the wallets with recent activity to find it.
            </Text>
          )}
        </ScrollView>
      )}
    </QueryState>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tabs: { paddingHorizontal: GUTTER, paddingTop: S.md },
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER, marginTop: S.md },
    list: { paddingHorizontal: GUTTER, paddingTop: S.md, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
    verdict: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.lg },
    muted: { ...T.caption, color: c.inkMuted },
  });
