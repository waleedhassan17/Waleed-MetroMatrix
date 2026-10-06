// ============================================================================
// One brand: who runs it, how it is doing, its storefront details, and the
// decisions on it.
//
//  - Approve a pending brand, suspend a live one, reactivate a suspended one.
//    Each needs a reason, which goes in the audit log.
//  - Delete (soft: the brand disappears from the storefront and the console,
//    its orders stay). Needs a reason too.
//
// Loaded from the admin brand endpoint. The old screen read the storefront
// one, which only returns live brands, so every pending or suspended brand —
// exactly the ones the approval queue opens — showed "Brand not found".
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, DetailRow, EntityRow, PermissionGate, QueryState, Section, StatusBadge } from '../../../../components/admin';
import { ActionSheet, Button, showToast, type SheetOption } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { usePermission } from '../../../../hooks/useAdminPermission';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import {
  useDeleteShopBrandMutation,
  useGetShopBrandQuery,
  useSetShopBrandStatusMutation,
  useUpdateShopBrandMutation,
} from '../../../../networks/admin/shoppingApi';
import { formatCount } from '../../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import { idOf, openProvider } from '../../people/openProvider';
import BrandForm from '../shared/BrandForm';
import { brandPayload, brandProblems, draftFromBrand, type BrandDraft } from '../shared/brandForm';
import { nextDecision } from '../shared/brandStatus';

export default function EditBrandScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { brandId } = (useRoute().params ?? {}) as { brandId: string };
  const canManage = usePermission('canManageShopping');
  const query = useGetShopBrandQuery(brandId);
  const brand = query.data;
  const [update, updateState] = useUpdateShopBrandMutation();
  const [setStatus, statusState] = useSetShopBrandStatusMutation();
  const [remove, removeState] = useDeleteShopBrandMutation();

  const [draft, setDraft] = useState<BrandDraft | null>(null);
  const [tried, setTried] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<null | 'status' | 'delete'>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    if (brand) setDraft(draftFromBrand(brand));
  }, [brand]);

  const saved = brand ? draftFromBrand(brand) : null;
  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);
  const { sheet: guard, allowLeave } = useUnsavedChangesGuard(dirty);
  const problems = tried && draft ? brandProblems(draft) : {};
  const decision = nextDecision(brand?.status);
  const ownerId = idOf(brand?.owner);
  const ownerName = brand?.owner && typeof brand.owner === 'object' ? brand.owner.fullName : brand?.ownerName;

  const save = async () => {
    if (!draft) return;
    setTried(true);
    setSaveError(null);
    if (Object.keys(brandProblems(draft)).length) return setSaveError('Some details need fixing first.');
    const res = await update({ id: brandId, ...brandPayload(draft, 'edit') });
    if ('error' in res) return setSaveError(adminErrorOf(res.error)?.message || 'The changes were not saved.');
    setTried(false);
    showToast({ tone: 'success', message: 'Brand saved.' });
  };

  const confirm = async (reason: string) => {
    if (sheet === 'status' && decision) {
      const res = await setStatus({ id: brandId, status: decision.status, reason });
      if ('error' in res) return setSheetError(adminErrorOf(res.error)?.message || 'That did not work.');
      setSheet(null);
      showToast({ tone: 'success', message: decision.status === 'active' ? 'The brand is live.' : 'The brand is suspended.' });
    } else if (sheet === 'delete') {
      const res = await remove({ id: brandId, reason });
      if ('error' in res) return setSheetError(adminErrorOf(res.error)?.message || 'The brand was not deleted.');
      setSheet(null);
      allowLeave();
      showToast({ tone: 'success', message: 'Brand deleted.' });
      navigation.goBack();
    }
  };

  const options: SheetOption[] = [
    ...(decision ? [{ label: decision.verb, icon: decision.status === 'active' ? 'checkmark-circle-outline' : 'pause-circle-outline', onPress: () => open('status') }] : []),
    { label: 'Delete brand', icon: 'trash-outline', tone: 'destructive' as const, onPress: () => open('delete') },
  ];
  function open(next: 'status' | 'delete') {
    setMenu(false);
    setSheetError(null);
    setSheet(next);
  }

  return (
    <AdminScreen
      title={brand?.name ?? 'Brand'}
      subtitle="Shopping"
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={query.refetch}
      headerActions={brand && canManage ? [{ icon: 'ellipsis-horizontal', label: 'More actions', onPress: () => setMenu(true) }] : undefined}
      footer={
        brand && draft ? (
          <PermissionGate all={['canManageShopping']} fallback={null}>
            <View style={styles.footer}>
              {decision && (
                <Button label={decision.verb} variant="secondary" onPress={() => open('status')} style={styles.footerButton} />
              )}
              <Button label="Save changes" onPress={save} disabled={!dirty} loading={updateState.isLoading} style={styles.footerButton} />
            </View>
          </PermissionGate>
        ) : undefined
      }
    >
      <PermissionGate all={['canManageShopping']} action="manage brands">
        <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} skeleton="detail" action="see this brand">
          {brand && draft && (
            <>
              <View style={styles.header}>
                <StatusBadge group="brandStatuses" value={brand.status} />
              </View>
              <Section title="Run by" card>
                {ownerId ? (
                  <EntityRow
                    avatar={{ name: ownerName }}
                    title={ownerName || 'Vendor'}
                    subtitle="Vendor · opens their details and analytics"
                    onPress={() => openProvider(navigation, ownerId)}
                    divider={false}
                  />
                ) : (
                  <Text style={styles.muted}>The platform runs this brand; no vendor owns it.</Text>
                )}
              </Section>
              <Section title="So far" card>
                <DetailRow label="Live products" value={formatCount(brand.productCount)} />
                <DetailRow label="Orders" value={formatCount(brand.orderCount)} />
                <DetailRow label="Delivered order value" value={formatMoney(brand.revenue)} last />
              </Section>
              <BrandForm draft={draft} onChange={setDraft} problems={problems} mode="edit" />
              {!!saveError && <Text style={styles.error}>{saveError}</Text>}
            </>
          )}
        </QueryState>
      </PermissionGate>

      <ActionSheet visible={menu} title={brand?.name} options={options} onClose={() => setMenu(false)} />

      <ConfirmSheet
        visible={sheet !== null}
        title={sheet === 'delete' ? `Delete ${brand?.name}?` : decision?.title ?? ''}
        message={
          sheet === 'delete'
            ? 'It disappears from the storefront and from this console. Its orders and their history stay.'
            : decision?.message
        }
        confirmLabel={sheet === 'delete' ? 'Delete' : decision?.verb ?? ''}
        destructive={sheet === 'delete' || !!decision?.destructive}
        requireReason
        busy={statusState.isLoading || removeState.isLoading}
        error={sheetError}
        onConfirm={confirm}
        onClose={() => setSheet(null)}
      />
      {guard}
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', marginBottom: S.lg },
    muted: { ...T.body, color: c.inkMuted, paddingVertical: S.md },
    error: { ...T.body, color: c.error, marginBottom: S.lg },
    footer: { flexDirection: 'row', gap: S.sm },
    footerButton: { flex: 1 },
  });
