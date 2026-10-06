// ============================================================================
// Healthcare settings — the two values the backend actually enforces: the
// free-cancellation window and the refund on a late cancellation. Doctors are
// paid the full fee; the platform takes no share. (Slot length, booking horizon
// and doctor auto-approval used to be here; nothing read them, and the backend
// removed them.)
//
// Saving asks for a reason, which goes in the audit log — as for every other
// module's settings.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AdminScreen, ConfirmSheet, PermissionGate, QueryState, Section } from '../../../../components/admin';
import { Button, TextField, showToast } from '../../../../components/ui';
import { usePermission } from '../../../../hooks/useAdminPermission';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import { useGetHCSettingsQuery, useUpdateHCSettingsMutation, type HCSettings } from '../../../../networks/admin/healthcareApi';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';

type Key = keyof HCSettings;

const FIELDS: { key: Key; label: string; helper: string; max: number }[] = [
  { key: 'cancellationWindowHours', label: 'Free cancellation window (hours)', helper: 'Patients cancelling at least this early get a full refund.', max: 168 },
  { key: 'lateCancelRefundPercent', label: 'Late cancellation refund (%)', helper: 'Refunded when cancelling inside the window. 0 means no refund.', max: 100 },
];

const toForm = (s: HCSettings): Record<Key, string> => ({
  cancellationWindowHours: String(s.cancellationWindowHours),
  lateCancelRefundPercent: String(s.lateCancelRefundPercent),
});

export default function AdminHealthcareSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const canEdit = usePermission('canManageHealthcare');
  const settings = useGetHCSettingsQuery();
  const [update, updateState] = useUpdateHCSettingsMutation();
  const [form, setForm] = useState<Record<Key, string> | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setForm(toForm(settings.data));
  }, [settings.data]);

  const saved = settings.data ? toForm(settings.data) : null;
  const dirty = !!form && !!saved && FIELDS.some((f) => form[f.key] !== saved[f.key]);
  const { sheet } = useUnsavedChangesGuard(dirty);

  const validate = (): boolean => {
    if (!form) return false;
    const next: Partial<Record<Key, string>> = {};
    for (const field of FIELDS) {
      const value = Number(form[field.key]);
      if (form[field.key].trim() === '' || !Number.isFinite(value) || value < 0 || value > field.max) next[field.key] = `Enter a number from 0 to ${field.max}.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (reason: string) => {
    if (!form) return;
    const res = await update({
      cancellationWindowHours: Number(form.cancellationWindowHours),
      lateCancelRefundPercent: Number(form.lateCancelRefundPercent),
      reason,
    });
    if ('error' in res) return setSaveError(adminErrorOf(res.error)?.message || 'Could not save.');
    setConfirming(false);
    showToast({ tone: 'success', message: 'Healthcare settings saved.' });
  };

  return (
    <AdminScreen
      title="Healthcare settings"
      footer={
        <PermissionGate all={['canManageHealthcare']} fallback={null}>
          <Button
            label="Save changes"
            onPress={() => {
              if (validate()) {
                setSaveError(null);
                setConfirming(true);
              }
            }}
            disabled={!dirty}
            fullWidth
            size="lg"
          />
        </PermissionGate>
      }
    >
      <QueryState isLoading={settings.isLoading} error={settings.error} onRetry={settings.refetch} action="see healthcare settings">
        {form && (
          <>
            <Text style={styles.note}>These apply to every consultation from the moment they are saved: payments, refunds and doctor payouts.</Text>
            <Section title="Cancellations and refunds" card>
              {FIELDS.map((field) => (
                <TextField
                  key={field.key}
                  label={field.label}
                  helper={field.helper}
                  value={form[field.key]}
                  onChangeText={(v) => {
                    setForm((f) => (f ? { ...f, [field.key]: v.replace(/[^0-9.]/g, '') } : f));
                    if (errors[field.key]) setErrors((e) => ({ ...e, [field.key]: undefined }));
                  }}
                  keyboardType="decimal-pad"
                  editable={canEdit}
                  error={errors[field.key]}
                  containerStyle={styles.field}
                />
              ))}
            </Section>
            {!canEdit && <Text style={styles.note}>You can view these settings. Changing them needs the Healthcare permission.</Text>}
          </>
        )}
      </QueryState>

      <ConfirmSheet
        visible={confirming}
        title="Save healthcare settings?"
        message="They apply to every cancellation and refund from now on."
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
    note: { ...T.body, color: c.inkMuted, marginBottom: S.lg },
    field: { marginTop: S.md },
  });
