// ============================================================================
// Shopping settings — values checkout and the storefront use live: shipping
// per brand and the free-shipping threshold, the low-stock level, the default
// return window, the delivery options checkout offers (and what each adds),
// and whether new brands and products need approval. Brands are paid the full
// order value; there is no platform share to set.
//
// Saving asks for a reason, which goes in the audit log. The old screen never
// sent "Auto-approve products" when saving, so switching it did nothing.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AdminScreen, ConfirmSheet, PermissionGate, QueryState, Section } from '../../../../components/admin';
import { Button, TextField, showToast } from '../../../../components/ui';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import { useGetShopSettingsQuery, useUpdateShopSettingsMutation } from '../../../../networks/admin/shoppingApi';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import { SETTINGS_FIELDS, settingsFormFrom, settingsPatch, settingsProblems, type SettingsForm } from '../shared/settingsForm';

export default function AdminShoppingSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const settings = useGetShopSettingsQuery();
  const [update, updateState] = useUpdateShopSettingsMutation();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setForm(settingsFormFrom(settings.data));
  }, [settings.data]);

  const saved = settings.data ? settingsFormFrom(settings.data) : null;
  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);
  const { sheet } = useUnsavedChangesGuard(dirty);

  const save = async (reason: string) => {
    if (!form) return;
    const res = await update({ ...settingsPatch(form), reason });
    if ('error' in res) return setSaveError(adminErrorOf(res.error)?.message || 'Could not save.');
    setConfirming(false);
    showToast({ tone: 'success', message: 'Shopping settings saved. Checkout uses them straight away.' });
  };

  const setNumber = (key: keyof SettingsForm['numbers']) => (v: string) => {
    setForm((f) => (f ? { ...f, numbers: { ...f.numbers, [key]: v.replace(/[^0-9]/g, '') } } : f));
    setProblems((p) => ({ ...p, [key]: '' }));
  };
  const setTier = (id: string, patch: Partial<SettingsForm['tiers'][number]>) =>
    setForm((f) => (f ? { ...f, tiers: f.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) } : f));

  const switchRow = (label: string, hint: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.muted}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.line }} thumbColor={colors.surface} accessibilityLabel={label} />
    </View>
  );

  return (
    <AdminScreen
      title="Shopping settings"
      footer={
        <PermissionGate all={['canManageShopping']} fallback={null}>
          <Button
            label="Save changes"
            onPress={() => {
              if (!form) return;
              const next = settingsProblems(form);
              setProblems(next);
              if (Object.keys(next).length) return;
              setSaveError(null);
              setConfirming(true);
            }}
            disabled={!dirty}
            fullWidth
            size="lg"
          />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageShopping']} action="change shopping settings">
        <QueryState isLoading={settings.isLoading} error={settings.error} onRetry={settings.refetch}>
          {form && (
            <>
              <Section title="Checkout and stock" card>
                {SETTINGS_FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    label={f.label}
                    helper={f.helper}
                    value={form.numbers[f.key]}
                    onChangeText={setNumber(f.key)}
                    keyboardType="number-pad"
                    error={problems[f.key] || undefined}
                    containerStyle={styles.field}
                  />
                ))}
              </Section>

              <Section title="Approval" card>
                {switchRow('Auto-approve new vendor brands', 'Off: a new brand waits in Brands until it is approved here.', form.autoApproveBrands, (v) =>
                  setForm((f) => (f ? { ...f, autoApproveBrands: v } : f))
                )}
                {switchRow('Auto-approve products', 'Off: new and edited products wait in Product moderation before customers see them.', form.autoApproveProducts, (v) =>
                  setForm((f) => (f ? { ...f, autoApproveProducts: v } : f))
                )}
              </Section>

              <Section title="Delivery options" caption="What checkout offers. The extra charge is added on top of per-brand shipping, and the shopper sees exactly this amount." card>
                {form.tiers.map((t) => (
                  <View key={t.id} style={styles.tier}>
                    <View style={styles.tierHead}>
                      <View style={styles.switchText}>
                        <Text style={styles.switchLabel}>{t.name}</Text>
                        <Text style={styles.muted}>{t.eta || t.description}</Text>
                      </View>
                      <Switch
                        value={t.isActive}
                        onValueChange={(isActive) => setTier(t.id, { isActive })}
                        trackColor={{ true: colors.accent, false: colors.line }}
                        thumbColor={colors.surface}
                        accessibilityLabel={`Offer ${t.name}`}
                      />
                    </View>
                    <TextField
                      label="Extra charge (PKR)"
                      value={t.surcharge}
                      onChangeText={(v) => setTier(t.id, { surcharge: v.replace(/[^0-9]/g, '') })}
                      keyboardType="number-pad"
                      error={problems[`tier:${t.id}`] || undefined}
                    />
                  </View>
                ))}
                {!!problems.tiers && <Text style={styles.error}>{problems.tiers}</Text>}
              </Section>
            </>
          )}
        </QueryState>
      </PermissionGate>

      <ConfirmSheet
        visible={confirming}
        title="Save shopping settings?"
        message="Checkout totals, stock alerts and approval follow them straight away."
        confirmLabel="Save"
        requireReason
        busy={updateState.isLoading}
        error={saveError}
        onConfirm={save}
        onClose={() => setConfirming(false)}
      />
      {sheet}
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    field: { marginTop: S.md },
    muted: { ...T.caption, color: c.inkMuted },
    error: { ...T.body, color: c.error, marginVertical: S.md },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 64, paddingVertical: S.sm },
    switchText: { flex: 1 },
    switchLabel: { ...T.body, color: c.ink },
    tier: { paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    tierHead: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.sm },
  });
