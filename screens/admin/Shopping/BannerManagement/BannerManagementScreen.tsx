// ============================================================================
// Promo banners — the storefront carousel. Each banner is an image with a
// title, optionally linking to a brand's storefront, in sort order (lower
// first). An inactive banner stays here but never shows. With none active,
// the storefront hides the carousel.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';

import { AdminScreen, ConfirmSheet, PermissionGate, QueryState } from '../../../../components/admin';
import { Button, Chip, FormSheet, TextField, ToneBadge, showToast } from '../../../../components/ui';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import {
  useDeleteShopBannerMutation,
  useListShopBannersInfiniteQuery,
  useListShopBrandOptionsQuery,
  useSaveShopBannerMutation,
  type ShopBanner,
} from '../../../../networks/admin/shoppingApi';
import { parseWholeNumber } from '../../../../utils/admin/parse';
import { GUTTER, R, S, T, useTheme, type ThemeColors } from '../../../../theme';

type Draft = { id?: string; title: string; subtitle: string; image: string; brandId: string | null; sortOrder: string; isActive: boolean };

const EMPTY: Draft = { title: '', subtitle: '', image: '', brandId: null, sortOrder: '0', isActive: true };

export default function BannerManagementScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const list = useListShopBannersInfiniteQuery();
  const items = flattenPages(list.data?.pages);
  const brands = useListShopBrandOptionsQuery();
  const [save, saveState] = useSaveShopBannerMutation();
  const [remove, removeState] = useDeleteShopBannerMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ShopBanner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const brandName = (id?: string | null) => (id ? brands.data?.find((b) => b.id === id)?.name : null);

  const edit = (b?: ShopBanner) => {
    setError(null);
    setDraft(
      b
        ? { id: b.id, title: b.title, subtitle: b.subtitle ?? '', image: b.image, brandId: b.brandId ?? null, sortOrder: String(b.sortOrder), isActive: b.isActive }
        : { ...EMPTY }
    );
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.image.trim()) return setError('A banner needs a title and an image.');
    const res = await save({
      id: draft.id,
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      image: draft.image.trim(),
      brandId: draft.brandId,
      sortOrder: parseWholeNumber(draft.sortOrder),
      isActive: draft.isActive,
    });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The banner was not saved.');
    setDraft(null);
    showToast({ tone: 'success', message: draft.id ? 'Banner saved. The storefront shows it on its next refresh.' : 'Banner added.' });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await remove({ id: deleting.id });
    if ('error' in res) return setDeleteError(adminErrorOf(res.error)?.message || 'The banner was not deleted.');
    setDeleting(null);
    showToast({ tone: 'success', message: 'Banner deleted.' });
  };

  return (
    <AdminScreen
      title="Promo banners"
      subtitle="Shopping"
      scroll={false}
      footer={
        <PermissionGate all={['canManageShopping']} fallback={null}>
          <Button label="Add banner" icon="add" onPress={() => edit()} fullWidth size="lg" />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageShopping']} action="manage banners">
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="images-outline"
          emptyTitle="No banners yet"
          emptyMessage="The storefront simply hides the carousel until you add one."
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(b) => b.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => edit(item)}
                style={({ pressed }) => [styles.row, index < items.length - 1 && styles.divider, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}${item.isActive ? '' : ', hidden'}. Edit.`}
              >
                <Image source={{ uri: item.image }} style={styles.thumb} />
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!!item.subtitle && (
                    <Text style={styles.sub} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  )}
                  <Text style={styles.meta}>{[`Position ${item.sortOrder}`, brandName(item.brandId) ? `opens ${brandName(item.brandId)}` : null].filter(Boolean).join(' · ')}</Text>
                </View>
                {!item.isActive && <ToneBadge label="Hidden" tone="neutral" />}
              </Pressable>
            )}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <FormSheet
        visible={!!draft}
        title={draft?.id ? 'Edit banner' : 'Add banner'}
        onClose={() => setDraft(null)}
        busy={saveState.isLoading}
        footer={<Button label="Save" onPress={submit} loading={saveState.isLoading} fullWidth size="lg" />}
      >
        {draft && (
          <>
            <TextField label="Title" value={draft.title} onChangeText={(v) => setDraft((d) => (d ? { ...d, title: v } : d))} placeholder="e.g. Winter collection" />
            <TextField label="Subtitle" value={draft.subtitle} onChangeText={(v) => setDraft((d) => (d ? { ...d, subtitle: v } : d))} placeholder="Optional supporting line" />
            <TextField
              label="Image address"
              value={draft.image}
              onChangeText={(v) => setDraft((d) => (d ? { ...d, image: v.trim() } : d))}
              autoCapitalize="none"
              placeholder="https://…"
            />
            {!!draft.image && <Image source={{ uri: draft.image }} style={styles.preview} accessibilityLabel="Banner preview" />}
            <Text style={styles.label}>Opens</Text>
            <View style={styles.chips}>
              <Chip label="Nothing (decorative)" selected={!draft.brandId} onPress={() => setDraft((d) => (d ? { ...d, brandId: null } : d))} />
              {(brands.data ?? []).map((b) => (
                <Chip key={b.id} label={b.name} selected={draft.brandId === b.id} onPress={() => setDraft((d) => (d ? { ...d, brandId: b.id } : d))} />
              ))}
            </View>
            <TextField
              label="Position"
              helper="Lower numbers come first in the carousel."
              value={draft.sortOrder}
              onChangeText={(v) => setDraft((d) => (d ? { ...d, sortOrder: v.replace(/[^0-9]/g, '') } : d))}
              keyboardType="number-pad"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show in the storefront</Text>
              <Switch
                value={draft.isActive}
                onValueChange={(v) => setDraft((d) => (d ? { ...d, isActive: v } : d))}
                trackColor={{ true: colors.accent, false: colors.line }}
                thumbColor={colors.surface}
                accessibilityLabel="Show in the storefront"
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            {draft.id && (
              <Button
                label="Delete banner"
                variant="ghost"
                onPress={() => {
                  const b = items.find((x) => x.id === draft.id) ?? null;
                  setDraft(null);
                  setDeleteError(null);
                  setDeleting(b);
                }}
                fullWidth
              />
            )}
          </>
        )}
      </FormSheet>

      <ConfirmSheet
        visible={!!deleting}
        title={`Delete “${deleting?.title}”?`}
        message="It disappears from the storefront carousel."
        confirmLabel="Delete"
        destructive
        busy={removeState.isLoading}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    state: { marginHorizontal: GUTTER, marginTop: S.md },
    list: { paddingHorizontal: GUTTER, paddingTop: S.md, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
    row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, minHeight: 64 },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    pressed: { backgroundColor: c.surfaceSunken },
    thumb: { width: 72, height: 40, borderRadius: R.control, backgroundColor: c.surfaceSunken },
    body: { flex: 1, minWidth: 0 },
    title: { ...T.bodyStrong, color: c.ink },
    sub: { ...T.caption, color: c.inkMuted },
    meta: { ...T.caption, color: c.inkFaint, marginTop: 2 },
    preview: { width: '100%', height: 140, borderRadius: R.card, marginBottom: S.md, backgroundColor: c.surfaceSunken },
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginBottom: S.md },
    switchLabel: { ...T.body, color: c.ink },
    error: { ...T.body, color: c.error, marginBottom: S.md },
  });
