// ============================================================================
// Service categories — what customers can book in home services. Each maps to
// a provider sub-type (from /admin/meta), so providers of that type receive
// those jobs.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AdminScreen, ConfirmSheet, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { Button, FormSheet, TextField, showToast } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { enumOptions, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import {
  useDeleteHSCategoryMutation,
  useListHSCategoriesQuery,
  useSaveHSCategoryMutation,
  type HSCategory,
} from '../../../../networks/admin/homeServicesApi';
import { parseWholeNumber } from '../../../../utils/admin/parse';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';

type Draft = { id?: string; name: string; slug: string; providerSubType: string; icon: string; description: string; basePrice: string; sortOrder: string; isActive: boolean };

const EMPTY: Draft = { name: '', slug: '', providerSubType: '', icon: 'construct-outline', description: '', basePrice: '', sortOrder: '', isActive: true };
const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function AdminServiceCategoriesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: meta } = useAdminMeta();
  const categories = useListHSCategoriesQuery();
  const [save, saveState] = useSaveHSCategoryMutation();
  const [remove, removeState] = useDeleteHSCategoryMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<HSCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const subTypes = enumOptions(meta, 'providerSubTypes');
  const subTypeLabel = (v: string) => subTypes.find((o) => o.value === v)?.label ?? v;

  const edit = (c?: HSCategory) => {
    setError(null);
    setDraft(
      c
        ? {
            id: c.id,
            name: c.name,
            slug: c.slug,
            providerSubType: c.providerSubType,
            icon: c.icon || EMPTY.icon,
            description: c.description ?? '',
            basePrice: c.basePrice === null || c.basePrice === undefined ? '' : String(c.basePrice),
            sortOrder: String(c.sortOrder),
            isActive: c.isActive,
          }
        : { ...EMPTY }
    );
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.slug.trim() || !draft.providerSubType) return setError('Name, slug and provider type are required.');
    const res = await save({
      id: draft.id,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      providerSubType: draft.providerSubType,
      icon: draft.icon.trim(),
      description: draft.description.trim(),
      basePrice: draft.basePrice.trim() ? parseWholeNumber(draft.basePrice) : null,
      sortOrder: parseWholeNumber(draft.sortOrder),
      isActive: draft.isActive,
    });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'Could not save the category.');
    setDraft(null);
    showToast({ tone: 'success', message: draft.id ? 'Category updated.' : 'Category added.' });
  };

  const confirmDelete = async (reason: string) => {
    if (!deleting) return;
    const res = await remove({ id: deleting.id, reason });
    if ('error' in res) return setDeleteError(adminErrorOf(res.error)?.message || 'Could not delete.');
    setDeleting(null);
    showToast({ tone: 'success', message: 'Category deleted.' });
  };

  return (
    <AdminScreen
      title="Service categories"
      refreshing={categories.isFetching && !categories.isLoading}
      onRefresh={categories.refetch}
      footer={<PermissionGate all={['canManageHomeServices']} fallback={null}><Button label="Add category" icon="add" onPress={() => edit()} fullWidth size="lg" /></PermissionGate>}
    >
      <PermissionGate all={['canManageHomeServices']} action="manage service categories">
        <QueryState
          isLoading={categories.isLoading}
          error={categories.error}
          onRetry={categories.refetch}
          isEmpty={!categories.data?.length}
          emptyIcon="grid-outline"
          emptyTitle="No categories"
          emptyMessage="Customers can't book anything until there is at least one."
        >
          <View>
            {(categories.data ?? []).map((c, i, all) => (
              <EntityRow
                key={c.id}
                icon={c.icon || 'grid-outline'}
                title={c.name}
                subtitle={`${subTypeLabel(c.providerSubType)} · ${c.basePrice === null || c.basePrice === undefined ? 'no base price' : `from ${formatMoney(c.basePrice)}`}`}
                badge={c.isActive ? null : { label: 'Hidden', tone: 'neutral' }}
                onPress={() => edit(c)}
                divider={i < all.length - 1}
              />
            ))}
          </View>
        </QueryState>
      </PermissionGate>

      <FormSheet
        visible={!!draft}
        title={draft?.id ? 'Edit category' : 'Add category'}
        onClose={() => setDraft(null)}
        busy={saveState.isLoading}
        footer={<Button label="Save" onPress={submit} loading={saveState.isLoading} fullWidth size="lg" />}
      >
        {draft && (
          <>
            <TextField
              label="Name"
              value={draft.name}
              onChangeText={(v) => setDraft((d) => (d ? { ...d, name: v, slug: d.id ? d.slug : slugify(v) } : d))}
            />
            <TextField label="Slug" value={draft.slug} onChangeText={(v) => setDraft((d) => (d ? { ...d, slug: slugify(v) } : d))} autoCapitalize="none" helper="Used in links and filters. Changing it can break saved links." />
            <Text style={styles.label}>Provider type</Text>
            <FilterChips options={subTypes} value={draft.providerSubType} onChange={(v) => setDraft((d) => (d ? { ...d, providerSubType: v } : d))} />
            <TextField label="Icon (Ionicons name)" value={draft.icon} onChangeText={(v) => setDraft((d) => (d ? { ...d, icon: v } : d))} autoCapitalize="none" />
            <TextField label="Description" value={draft.description} onChangeText={(v) => setDraft((d) => (d ? { ...d, description: v } : d))} multiline />
            <TextField label="Starting price (PKR, optional)" value={draft.basePrice} onChangeText={(v) => setDraft((d) => (d ? { ...d, basePrice: v.replace(/[^0-9]/g, '') } : d))} keyboardType="number-pad" />
            <TextField label="Order in the list" value={draft.sortOrder} onChangeText={(v) => setDraft((d) => (d ? { ...d, sortOrder: v.replace(/[^0-9]/g, '') } : d))} keyboardType="number-pad" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Visible to customers</Text>
              <Switch
                value={draft.isActive}
                onValueChange={(v) => setDraft((d) => (d ? { ...d, isActive: v } : d))}
                trackColor={{ true: colors.accent, false: colors.line }}
                thumbColor={colors.surface}
                accessibilityLabel="Visible to customers"
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            {draft.id && (
              <Button
                label="Delete category"
                variant="ghost"
                onPress={() => {
                  const c = categories.data?.find((x) => x.id === draft.id) ?? null;
                  setDraft(null);
                  setDeleteError(null);
                  setDeleting(c);
                }}
                fullWidth
              />
            )}
          </>
        )}
      </FormSheet>

      <ConfirmSheet
        visible={!!deleting}
        title={`Delete ${deleting?.name}?`}
        message="It disappears from the app for customers and providers. Existing bookings keep their category. To keep it but stop new bookings, hide it instead."
        confirmLabel="Delete"
        destructive
        requireReason
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
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginBottom: S.md },
    switchLabel: { ...T.body, color: c.ink },
    error: { ...T.body, color: c.error, marginBottom: S.md },
  });
