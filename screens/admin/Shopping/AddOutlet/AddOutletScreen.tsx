// ============================================================================
// Add an outlet — a physical store customers can visit. One form instead of
// the old five-step wizard: the same fields, problems shown next to them.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, PermissionGate } from '../../../../components/admin';
import { Button, showToast } from '../../../../components/ui';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import { useCreateShopOutletMutation } from '../../../../networks/admin/shoppingApi';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import OutletForm from '../shared/OutletForm';
import { EMPTY_OUTLET, outletPayload, outletProblems, type OutletDraft } from '../shared/outletForm';

export default function AddOutletScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [create, createState] = useCreateShopOutletMutation();
  const [draft, setDraft] = useState<OutletDraft>(EMPTY_OUTLET);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problems = tried ? outletProblems(draft) : {};
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY_OUTLET);
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirty, { title: 'Discard this outlet?', message: 'Nothing has been created yet.' });

  const submit = async () => {
    setTried(true);
    setError(null);
    if (Object.keys(outletProblems(draft)).length) return setError('Some details need fixing first.');
    const res = await create(outletPayload(draft, 'create'));
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The outlet was not created.');
    allowLeave();
    showToast({ tone: 'success', message: `${res.data.name} added.` });
    navigation.replace(AdminShoppingRouteNames.AdminOutletDetail, { outletId: res.data.id });
  };

  return (
    <AdminScreen
      title="New outlet"
      subtitle="Shopping"
      footer={
        <PermissionGate all={['canManageShopping']} fallback={null}>
          <Button label="Add outlet" onPress={submit} loading={createState.isLoading} fullWidth size="lg" />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageShopping']} action="add outlets">
        <OutletForm draft={draft} onChange={setDraft} problems={problems} mode="create" />
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
