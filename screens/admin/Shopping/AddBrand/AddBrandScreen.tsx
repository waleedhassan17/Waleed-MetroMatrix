// ============================================================================
// Add a brand the platform runs. (A vendor's brand is created by the vendor,
// from their own app, and arrives here for approval.)
//
// One form instead of the old six-step wizard: the same fields, the problems
// shown next to them, and nothing saved until "Create brand".
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, PermissionGate } from '../../../../components/admin';
import { Button, showToast } from '../../../../components/ui';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import { useCreateShopBrandMutation } from '../../../../networks/admin/shoppingApi';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import BrandForm from '../shared/BrandForm';
import { EMPTY_BRAND, brandPayload, brandProblems, type BrandDraft } from '../shared/brandForm';

export default function AddBrandScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [create, createState] = useCreateShopBrandMutation();
  const [draft, setDraft] = useState<BrandDraft>(EMPTY_BRAND);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problems = tried ? brandProblems(draft) : {};
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY_BRAND);
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirty, { title: 'Discard this brand?', message: 'Nothing has been created yet.' });

  const submit = async () => {
    setTried(true);
    setError(null);
    if (Object.keys(brandProblems(draft)).length) return setError('Some details need fixing first.');
    const res = await create(brandPayload(draft, 'create'));
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The brand was not created.');
    allowLeave();
    showToast({ tone: 'success', message: `${res.data.name} created.` });
    navigation.replace(AdminShoppingRouteNames.AdminBrandDetail, { brandId: res.data.id });
  };

  return (
    <AdminScreen
      title="New brand"
      subtitle="Shopping"
      footer={
        <PermissionGate all={['canManageShopping']} fallback={null}>
          <Button label="Create brand" onPress={submit} loading={createState.isLoading} fullWidth size="lg" />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageShopping']} action="add brands">
        <BrandForm draft={draft} onChange={setDraft} problems={problems} mode="create" />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </PermissionGate>
      {sheet}
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    error: { ...T.body, color: c.error, marginBottom: S.lg },
  });
