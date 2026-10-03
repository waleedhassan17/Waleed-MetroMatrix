// ============================================================================
// Healthcare settings — the three values the backend actually enforces:
// commission on consultations, the free-cancellation window, and the refund on
// a late cancellation. (Slot length, booking horizon and doctor auto-approval
// used to be here; nothing read them, and the backend removed them.)
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppBar, Button, Card, ErrorState, Screen, TextField, showToast } from '../../../../components/ui';
import { usePermission } from '../../../../hooks/useAdminPermission';
import {
  fetchHealthcareSettingsApi,
  updateHealthcareSettingsApi,
  type HealthcareSettingsView,
} from '../../../../networks/healthcare/adminApi';
import { GUTTER, R, S, T, useTheme, type ThemeColors } from '../../../../theme';

type Key = keyof HealthcareSettingsView;

const FIELDS: { key: Key; label: string; helper: string; max: number }[] = [
  { key: 'commissionPercent', label: 'Platform commission (%)', helper: 'Deducted from the doctor payout when a consultation completes.', max: 100 },
  { key: 'cancellationWindowHours', label: 'Free cancellation window (hours)', helper: 'Patients cancelling at least this early get a full refund.', max: 168 },
  { key: 'lateCancelRefundPercent', label: 'Late cancellation refund (%)', helper: 'Refunded when cancelling inside the window. 0 means no refund.', max: 100 },
];

const toForm = (s: HealthcareSettingsView): Record<Key, string> => ({
  commissionPercent: String(s.commissionPercent),
  cancellationWindowHours: String(s.cancellationWindowHours),
  lateCancelRefundPercent: String(s.lateCancelRefundPercent),
});

export default function AdminHealthcareSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const canEdit = usePermission('canManageHealthcare');

  const [saved, setSaved] = useState<Record<Key, string> | null>(null);
  const [form, setForm] = useState<Record<Key, string> | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetchHealthcareSettingsApi();
    if (res.success && res.data) {
      const values = toForm(res.data);
      setSaved(values);
      setForm(values);
    } else {
      setLoadError(res.message || 'Could not load the settings.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = !!form && !!saved && FIELDS.some((f) => form[f.key] !== saved[f.key]);

  const save = async () => {
    if (!form) return;
    const patch: Partial<HealthcareSettingsView> = {};
    const nextErrors: Partial<Record<Key, string>> = {};
    for (const field of FIELDS) {
      const value = Number(form[field.key]);
      if (form[field.key].trim() === '' || !Number.isFinite(value) || value < 0 || value > field.max) {
        nextErrors[field.key] = `Enter a number from 0 to ${field.max}.`;
      } else {
        patch[field.key] = value;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    const res = await updateHealthcareSettingsApi(patch);
    setSaving(false);
    if (res.success && res.data) {
      const values = toForm(res.data);
      setSaved(values);
      setForm(values);
      showToast({ tone: 'success', message: 'Healthcare settings saved.' });
    } else {
      showToast({ tone: 'error', message: res.message || 'Could not save. Try again.' });
    }
  };

  return (
    <Screen edges={['bottom']}>
      <AppBar title="Healthcare settings" tone="surface" onBack={() => navigation.goBack()} />
      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : !form ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.inkMuted} accessibilityLabel="Loading settings" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>
            These apply to every consultation from the moment they are saved: payments, refunds and doctor payouts.
          </Text>
          <Card>
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
                editable={canEdit && !saving}
                error={errors[field.key]}
              />
            ))}
          </Card>
          {canEdit ? (
            <Button label="Save changes" onPress={save} loading={saving} disabled={!dirty || saving} fullWidth size="lg" style={styles.save} />
          ) : (
            <Text style={styles.readOnly}>You can view these settings. Changing them needs the Healthcare permission.</Text>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: GUTTER, paddingBottom: S.huge },
    note: {
      ...T.body,
      color: c.ink,
      backgroundColor: c.warningSoft,
      borderRadius: R.card,
      padding: S.md,
      marginBottom: S.lg,
    },
    save: { marginTop: S.xl },
    readOnly: { ...T.caption, color: c.inkMuted, marginTop: S.lg, textAlign: 'center' },
  });
