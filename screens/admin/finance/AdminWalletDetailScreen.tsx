// ============================================================================
// One wallet: its balance, its owner, its full ledger, and a manual
// adjustment (needs Finance).
//
// An adjustment always carries a reason. At or below the approval threshold
// it is applied at once; above it, it waits for a different super admin, and
// the sheet says so. A debit the balance cannot cover is refused.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, EntityRow, FilterChips, PermissionGate, QueryState, Section } from '../../../components/admin';
import { Button, FormSheet, TextField, ToneBadge, showToast } from '../../../components/ui';
import { formatMoney } from '../../../constants/Currency';
import { adminErrorOf, flattenPages } from '../../../networks/admin/adminApi';
import { useAdjustWalletMutation, useWalletTransactionsInfiniteQuery, type WalletOwnerType } from '../../../networks/admin/walletsApi';
import { formatDateTime } from '../../../utils/admin/format';
import { prettySource } from '../../../utils/wallet_utils/transactionFormat';
import { GUTTER, S, T, useTheme, type ThemeColors } from '../../../theme';
import { openProvider } from '../people/openProvider';
import { OWNER_TYPE_LABEL, parseAmount, signedAmount } from './walletRules';

type Params = { walletId: string; ownerName?: string; ownerType?: WalletOwnerType; ownerId?: string };

const DIRECTIONS = [
  { value: 'credit', label: 'Add money' },
  { value: 'debit', label: 'Take money' },
];

export default function AdminWalletDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { walletId, ownerName, ownerType, ownerId } = (useRoute().params ?? {}) as Params;
  const ledger = useWalletTransactionsInfiniteQuery(walletId);
  const items = flattenPages(ledger.data?.pages);
  const wallet = ledger.data?.pages[0]?.wallet;
  const [adjust, adjustState] = useAdjustWalletMutation();

  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDirection('credit');
    setAmount('');
    setReason('');
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    const value = parseAmount(amount);
    if (value === null) return setError('Enter an amount above 0, with at most two decimals.');
    if (reason.trim().length < 3) return setError('Say why — the reason goes in the audit log.');
    const res = await adjust({ id: walletId, type: direction, amount: value, reason: reason.trim() });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The adjustment did not go through.');
    setOpen(false);
    showToast(
      res.data.requiresApproval
        ? { tone: 'neutral', message: `Above ${formatMoney(res.data.adjustment.thresholdAtRequest)}: it waits for a second super admin to approve it.` }
        : { tone: 'success', message: `Done. The balance is now ${formatMoney(res.data.wallet?.balance, { code: res.data.wallet?.currency })}.` }
    );
  };

  const openOwner = () => {
    if (!ownerId) return;
    if (ownerType === 'Provider') openProvider(navigation, ownerId);
    else if (ownerType === 'User') navigation.navigate('AdminUserDetail', { userId: ownerId });
  };

  return (
    <AdminScreen
      title={ownerName ?? 'Wallet'}
      subtitle="Wallet"
      scroll={false}
      footer={
        <PermissionGate all={['canManageFinance']} fallback={null}>
          <Button label="Adjust balance" icon="swap-vertical-outline" onPress={start} disabled={!wallet} fullWidth size="lg" />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageFinance']} action="see this wallet">
        <QueryState isLoading={ledger.isLoading} error={ledger.error} onRetry={ledger.refetch} skeleton="rows" style={styles.state} action="see this wallet">
          <FlatList
            data={items}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <>
                <View style={styles.header}>
                  <Text style={styles.balance}>{formatMoney(wallet?.balance, { code: wallet?.currency })}</Text>
                  <Text style={styles.sub}>Balance</Text>
                </View>
                {!!ownerType && (
                  <Section title="Owner" card>
                    <EntityRow
                      avatar={ownerType === 'Platform' ? undefined : { name: ownerName }}
                      icon={ownerType === 'Platform' ? 'business-outline' : undefined}
                      title={ownerName ?? '—'}
                      subtitle={ownerType === 'Platform' ? 'Holds fees collected before Oct 2026; nothing new reaches it' : OWNER_TYPE_LABEL[ownerType]}
                      onPress={ownerType !== 'Platform' && ownerId ? openOwner : undefined}
                      divider={false}
                    />
                  </Section>
                )}
                <Text style={styles.sectionTitle}>Ledger</Text>
                {!items.length && <Text style={styles.muted}>No transactions yet.</Text>}
              </>
            }
            renderItem={({ item, index }) => (
              <View style={[styles.txn, index < items.length - 1 && styles.divider]}>
                <View style={styles.txnBody}>
                  <Text style={styles.txnTitle} numberOfLines={1}>
                    {prettySource(item.source)}
                  </Text>
                  {!!item.description && (
                    <Text style={styles.muted} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.muted}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <View style={styles.txnSide}>
                  <Text style={styles.amount}>{signedAmount(item)}</Text>
                  {item.status !== 'completed' && <ToneBadge label={item.status} tone={item.status === 'failed' ? 'error' : 'warning'} />}
                </View>
              </View>
            )}
            onEndReached={() => ledger.hasNextPage && !ledger.isFetchingNextPage && ledger.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={ledger.isFetching && !ledger.isFetchingNextPage && !ledger.isLoading} onRefresh={ledger.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={ledger.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <FormSheet
        visible={open}
        title="Adjust balance"
        subtitle={ownerName}
        onClose={() => setOpen(false)}
        busy={adjustState.isLoading}
        footer={<Button label={direction === 'credit' ? 'Add money' : 'Take money'} onPress={submit} loading={adjustState.isLoading} fullWidth size="lg" />}
      >
        <FilterChips options={DIRECTIONS} value={direction} onChange={(v) => setDirection(v as 'credit' | 'debit')} />
        <TextField label="Amount (PKR)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
        <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Recorded in the audit log" multiline />
        <Text style={styles.muted}>Large amounts wait for a second super admin before anything moves.</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </FormSheet>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    state: { marginHorizontal: GUTTER, marginTop: S.md },
    list: { paddingHorizontal: GUTTER, paddingTop: S.md, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
    header: { marginBottom: S.xl },
    balance: { ...T.title, color: c.ink },
    sub: { ...T.body, color: c.inkMuted },
    sectionTitle: { ...T.subhead, color: c.ink, marginBottom: S.sm },
    muted: { ...T.caption, color: c.inkMuted },
    error: { ...T.body, color: c.error, marginTop: S.md },
    txn: { flexDirection: 'row', gap: S.md, paddingVertical: S.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    txnBody: { flex: 1, minWidth: 0 },
    txnTitle: { ...T.bodyStrong, color: c.ink },
    txnSide: { alignItems: 'flex-end', gap: S.xs },
    // The sign says which way the money went; colour alone would not, and green text fails contrast on paper.
    amount: { ...T.bodyStrong, color: c.ink },
  });
