// ============================================================================
// Product moderation — the platform's say over what customers see.
//
// Brands were approved by an admin, but a product went live the moment its
// vendor saved it, and the only way to take one down was to suspend the whole
// brand. Here an admin reviews the queue and approves, rejects (the vendor
// fixes it and it comes back for review) or removes (the vendor cannot
// republish it). Rejecting or removing requires a note: the vendor sees it.
// Whether new products wait here at all is the "auto-approve products"
// shopping setting.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AdminScreen, PermissionGate, QueryState } from '../../../../components/admin';
import { Button, Card, FormSheet, SegmentedControl, TextField, showToast } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { GUTTER, R, S, T, useTheme, type ThemeColors } from '../../../../theme';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import { useListShopProductsInfiniteQuery, useModerateShopProductMutation, type ModerationStatus, type ShopProduct } from '../../../../networks/admin/shoppingApi';

type Tab = ModerationStatus;
const TABS: { value: Tab; label: string }[] = [
  { value: 'pending', label: 'In review' },
  { value: 'approved', label: 'Live' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'removed', label: 'Removed' },
];

type Pending = { product: ShopProduct; action: 'rejected' | 'removed' } | null;

export default function ProductModerationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('pending');
  const list = useListShopProductsInfiniteQuery({ moderationStatus: tab });
  const rows = flattenPages(list.data?.pages);
  const [moderate] = useModerateShopProductMutation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState('');

  const act = async (product: ShopProduct, status: 'approved' | 'rejected' | 'removed', why?: string) => {
    setBusyId(product.id);
    const res = await moderate({ id: product.id, status, note: why });
    setBusyId(null);
    if ('error' in res) return showToast({ message: adminErrorOf(res.error)?.message || 'That did not save', tone: 'error' });
    showToast({
      message: status === 'approved' ? `"${product.name}" is live` : status === 'rejected' ? 'Sent back to the vendor' : 'Removed from the store',
      tone: status === 'approved' ? 'success' : 'neutral',
    });
  };

  const confirmNote = async () => {
    if (!pending || !note.trim()) return;
    const { product, action } = pending;
    setPending(null);
    await act(product, action, note.trim());
    setNote('');
  };

  const renderItem = ({ item }: { item: ShopProduct }) => {
    const price = item.salePrice ?? item.basePrice;
    const busy = busyId === item.id;
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[item.brandName, typeof price === 'number' ? formatMoney(price) : null, item.isActive === false ? 'hidden by vendor' : null].filter(Boolean).join(' · ')}
            </Text>
            {!!item.moderation?.note && <Text style={styles.note}>Note: {item.moderation.note}</Text>}
          </View>
        </View>
        {!!item.description && (
          <Text style={styles.desc} numberOfLines={3}>
            {item.description}
          </Text>
        )}
        <View style={styles.actions}>
          {tab !== 'approved' && tab !== 'removed' && (
            <Button label="Approve" size="sm" fullWidth={false} loading={busy} onPress={() => act(item, 'approved')} style={styles.btn} />
          )}
          {tab === 'pending' && (
            <Button label="Reject" variant="secondary" size="sm" fullWidth={false} disabled={busy} onPress={() => setPending({ product: item, action: 'rejected' })} style={styles.btn} />
          )}
          {tab !== 'removed' && (
            <Button label="Remove" variant="secondary" size="sm" fullWidth={false} disabled={busy} onPress={() => setPending({ product: item, action: 'removed' })} style={styles.btn} />
          )}
          {tab === 'removed' && <Button label="Restore" size="sm" fullWidth={false} loading={busy} onPress={() => act(item, 'approved')} style={styles.btn} />}
        </View>
      </Card>
    );
  };

  return (
    <AdminScreen title="Product moderation" subtitle="Shopping" scroll={false}>
      <PermissionGate all={['canManageShopping']} action="moderate products">
        <View style={styles.tabs}>
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!rows.length}
          emptyIcon="shield-checkmark-outline"
          emptyTitle={tab === 'pending' ? 'Nothing to review' : 'Nothing here'}
          emptyMessage={
            tab === 'pending'
              ? 'New and edited products wait here when auto-approve is off in Shopping settings.'
              : 'Products you move here will show up in this list.'
          }
          style={styles.state}
        >
          <FlatList
            data={rows}
            keyExtractor={(p) => p.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <FormSheet
        visible={!!pending}
        title={pending?.action === 'removed' ? 'Remove from the store' : 'Send back for changes'}
        subtitle="The vendor sees this note."
        onClose={() => setPending(null)}
        footer={<Button label={pending?.action === 'removed' ? 'Remove product' : 'Reject'} onPress={confirmNote} disabled={!note.trim()} />}
      >
        <TextField
          label="Reason"
          value={note}
          onChangeText={setNote}
          placeholder={pending?.action === 'removed' ? 'e.g. counterfeit, prohibited item' : 'e.g. photos are blurry, price looks wrong'}
          multiline
          maxLength={500}
        />
      </FormSheet>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tabs: { paddingHorizontal: GUTTER, paddingTop: S.md, paddingBottom: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge, flexGrow: 1 },
    more: { marginVertical: S.lg },
    card: { marginBottom: S.md },
    row: { flexDirection: 'row' },
    thumb: { width: 64, height: 64, borderRadius: R.control, backgroundColor: c.surfaceSunken },
    thumbEmpty: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
    info: { flex: 1, marginLeft: S.md },
    name: { ...T.subhead, color: c.ink },
    meta: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    note: { ...T.caption, color: c.error, marginTop: S.xs },
    desc: { ...T.body, color: c.inkMuted, marginTop: S.md },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: S.md },
    btn: { marginLeft: S.sm, paddingHorizontal: S.lg },
  });
