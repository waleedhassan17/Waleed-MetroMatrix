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

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AppBar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormSheet,
  Screen,
  SegmentedControl,
  SkeletonCard,
  TextField,
  showToast,
} from '../../../../components/ui';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  AdminProductView,
  fetchAdminProductsApi,
  moderateProductApi,
} from '../../../../networks/shopping/adminShoppingApi';
import type { ProductModerationStatus } from '../../../../types/shopping';

type Tab = ProductModerationStatus;
const TABS: { value: Tab; label: string }[] = [
  { value: 'pending', label: 'In review' },
  { value: 'approved', label: 'Live' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'removed', label: 'Removed' },
];

type Pending = { product: AdminProductView; action: 'rejected' | 'removed' } | null;

export default function ProductModerationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<AdminProductView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState('');

  const load = useCallback(
    async (asRefresh = false) => {
      asRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminProductsApi({ moderationStatus: tab, limit: 50 });
        setRows(res.data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load products');
      }
      asRefresh ? setRefreshing(false) : setLoading(false);
    },
    [tab]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (product: AdminProductView, status: 'approved' | 'rejected' | 'removed', why?: string) => {
    setBusyId(product.productId);
    try {
      await moderateProductApi(product.productId, status, why);
      setRows((prev) => prev.filter((p) => p.productId !== product.productId));
      showToast({
        message: status === 'approved' ? `"${product.name}" is live` : status === 'rejected' ? 'Sent back to the vendor' : 'Removed from the store',
        tone: status === 'approved' ? 'success' : 'neutral',
      });
    } catch (e: any) {
      showToast({ message: e?.message || 'That did not save', tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const confirmNote = async () => {
    if (!pending || !note.trim()) return;
    const { product, action } = pending;
    setPending(null);
    await act(product, action, note.trim());
    setNote('');
  };

  const renderItem = ({ item }: { item: AdminProductView }) => {
    const price = item.salePrice ?? item.basePrice;
    const busy = busyId === item.productId;
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]} />
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[item.brandName, `Rs. ${Math.round(price || 0).toLocaleString('en-PK')}`, item.isActive === false ? 'hidden by vendor' : null]
                .filter(Boolean)
                .join(' · ')}
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
            <Button
              label="Reject"
              variant="secondary"
              size="sm"
              fullWidth={false}
              disabled={busy}
              onPress={() => setPending({ product: item, action: 'rejected' })}
              style={styles.btn}
            />
          )}
          {tab !== 'removed' && (
            <Button
              label="Remove"
              variant="secondary"
              size="sm"
              fullWidth={false}
              disabled={busy}
              onPress={() => setPending({ product: item, action: 'removed' })}
              style={styles.btn}
            />
          )}
          {tab === 'removed' && (
            <Button label="Restore" size="sm" fullWidth={false} loading={busy} onPress={() => act(item, 'approved')} style={styles.btn} />
          )}
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <AppBar title="Product moderation" onBack={() => navigation.goBack()} />
      <View style={styles.tabs}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>
      {loading ? (
        <View style={styles.list}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : error ? (
        <ErrorState title="We couldn't load products" message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.productId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              title={tab === 'pending' ? 'Nothing to review' : 'Nothing here'}
              message={
                tab === 'pending'
                  ? 'New and edited products wait here when auto-approve is off in Shopping Settings.'
                  : 'Products you move here will show up in this list.'
              }
            />
          }
        />
      )}

      <FormSheet
        visible={!!pending}
        title={pending?.action === 'removed' ? 'Remove from the store' : 'Send back for changes'}
        subtitle="The vendor sees this note."
        onClose={() => setPending(null)}
        footer={
          <Button
            label={pending?.action === 'removed' ? 'Remove product' : 'Reject'}
            onPress={confirmNote}
            disabled={!note.trim()}
          />
        }
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
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tabs: { paddingHorizontal: GUTTER, paddingTop: S.md },
    list: { padding: GUTTER, flexGrow: 1 },
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
