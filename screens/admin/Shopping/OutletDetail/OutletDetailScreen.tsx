// ============================================================================
// One outlet: everything customers see about it, editable in place, and the
// brand it sells. Changing the brand goes through assign-brand, which checks
// the brand still exists. Deleting is from the "…" menu.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, PermissionGate, QueryState } from '../../../../components/admin';
import { ActionSheet, Button, ToneBadge, showToast } from '../../../../components/ui';
import { usePermission } from '../../../../hooks/useAdminPermission';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import {
  useAssignShopOutletBrandMutation,
  useDeleteShopOutletMutation,
  useGetShopOutletQuery,
  useUpdateShopOutletMutation,
} from '../../../../networks/admin/shoppingApi';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import OutletForm from '../shared/OutletForm';
import { draftFromOutlet, outletPayload, outletProblems, type OutletDraft } from '../shared/outletForm';

export default function OutletDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { outletId } = (useRoute().params ?? {}) as { outletId: string };
  const canManage = usePermission('canManageShopping');
  const query = useGetShopOutletQuery(outletId);
  const outlet = query.data;
  const [update, updateState] = useUpdateShopOutletMutation();
  const [assign, assignState] = useAssignShopOutletBrandMutation();
  const [remove, removeState] = useDeleteShopOutletMutation();

  const [draft, setDraft] = useState<OutletDraft | null>(null);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (outlet) setDraft(draftFromOutlet(outlet));
  }, [outlet]);

  const saved = outlet ? draftFromOutlet(outlet) : null;
  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirty);
  const problems = tried && draft ? outletProblems(draft) : {};

  const save = async () => {
    if (!draft || !saved) return;
    setTried(true);
    setError(null);
    if (Object.keys(outletProblems(draft)).length) return setError('Some details need fixing first.');
    if (draft.brandId !== saved.brandId) {
      const moved = await assign({ id: outletId, brandId: draft.brandId });
      if ('error' in moved) return setError(adminErrorOf(moved.error)?.message || 'The brand was not changed.');
    }
    const res = await update({ id: outletId, ...outletPayload(draft, 'edit') });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The changes were not saved.');
    setTried(false);
    showToast({ tone: 'success', message: 'Outlet saved.' });
  };

  const confirmDelete = async () => {
    const res = await remove({ id: outletId });
    if ('error' in res) return setDeleteError(adminErrorOf(res.error)?.message || 'The outlet was not deleted.');
    setDeleting(false);
    allowLeave();
    showToast({ tone: 'success', message: 'Outlet deleted.' });
    navigation.goBack();
  };

  return (
    <AdminScreen
      title={outlet?.name ?? 'Outlet'}
      subtitle="Shopping"
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      headerActions={outlet && canManage ? [{ icon: 'ellipsis-horizontal', label: 'More actions', onPress: () => setMenu(true) }] : undefined}
      footer={
        outlet && draft ? (
          <PermissionGate all={['canManageShopping']} fallback={null}>
            <Button label="Save changes" onPress={save} disabled={!dirty} loading={updateState.isLoading || assignState.isLoading} fullWidth size="lg" />
          </PermissionGate>
        ) : undefined
      }
    >
      <PermissionGate all={['canManageShopping']} action="manage outlets">
        <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} skeleton="detail" action="see this outlet">
          {outlet && draft && (
            <>
              <View style={styles.header}>
                <ToneBadge label={outlet.isActive ? 'Open to customers' : 'Closed to customers'} tone={outlet.isActive ? 'success' : 'neutral'} />
                {!!outlet.brandName && <Text style={styles.sub}>Sells {outlet.brandName}</Text>}
              </View>
              <OutletForm draft={draft} onChange={setDraft} problems={problems} mode="edit" />
              {!!error && <Text style={styles.error}>{error}</Text>}
            </>
          )}
        </QueryState>
      </PermissionGate>

      <ActionSheet
        visible={menu}
        title={outlet?.name}
        options={[
          {
            label: 'Delete outlet',
            icon: 'trash-outline',
            tone: 'destructive',
            onPress: () => {
              setMenu(false);
              setDeleteError(null);
              setDeleting(true);
            },
          },
        ]}
        onClose={() => setMenu(false)}
      />
      <ConfirmSheet
        visible={deleting}
        title={`Delete ${outlet?.name}?`}
        message="Customers stop finding it. This cannot be undone from the console."
        confirmLabel="Delete"
        destructive
        busy={removeState.isLoading}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(false)}
      />
      {sheet}
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.lg },
    sub: { ...T.body, color: c.inkMuted },
    error: { ...T.body, color: c.error, marginBottom: S.lg },
  });
