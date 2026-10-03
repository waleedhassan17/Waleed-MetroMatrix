// ============================================================================
// Home-services settings — values the platform uses live: commission on paid
// bookings, the smallest payout a provider can request, how far to search for
// providers, the speed used for arrival estimates, and how matching weighs
// distance, rating and availability. The server checks every limit; saving
// asks for a reason, which goes in the audit log.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AdminScreen, ConfirmSheet, PermissionGate, QueryState, Section } from '../../../../components/admin';
import { Button, TextField, showToast } from '../../../../components/ui';
import useUnsavedChangesGuard from '../../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import { useGetHSSettingsQuery, useUpdateHSSettingsMutation, type HSSettings } from '../../../../networks/admin/homeServicesApi';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';

type Form = Record<'commissionPercent' | 'minPayoutAmount' | 'defaultSearchRadiusKm' | 'avgUrbanSpeedKmh' | 'distance' | 'rating' | 'availability', string>;

const toForm = (s: HSSettings): Form => ({
  commissionPercent: String(s.commissionPercent),
  minPayoutAmount: String(s.minPayoutAmount),
  defaultSearchRadiusKm: String(s.defaultSearchRadiusKm),
  avgUrbanSpeedKmh: String(s.avgUrbanSpeedKmh),
  distance: String(s.matchingWeights.distance),
  rating: String(s.matchingWeights.rating),
  availability: String(s.matchingWeights.availability),
});

const FIELDS: { key: keyof Form; label: string; helper: string; min: number; max: number }[] = [
  { key: 'commissionPercent', label: 'Commission (%)', helper: 'Taken from each paid booking. 0–100.', min: 0, max: 100 },
  { key: 'minPayoutAmount', label: 'Smallest payout (PKR)', helper: 'Providers cannot request less.', min: 0, max: 1_000_000 },
  { key: 'defaultSearchRadiusKm', label: 'Search radius (km)', helper: 'How far from the customer to look for providers. 1–100.', min: 1, max: 100 },
  { key: 'avgUrbanSpeedKmh', label: 'Average speed (km/h)', helper: 'Used for arrival estimates. 5–120.', min: 5, max: 120 },
];
const WEIGHTS: { key: 'distance' | 'rating' | 'availability'; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'rating', label: 'Rating' },
  { key: 'availability', label: 'Availability' },
];

export default function AdminHomeServiceSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const settings = useGetHSSettingsQuery();
  const [update, updateState] = useUpdateHSSettingsMutation();
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'matchingWeights', string>>>({});
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setForm(toForm(settings.data));
  }, [settings.data]);

  const saved = settings.data ? toForm(settings.data) : null;
  const dirty = !!form && !!saved && (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== saved[k]);
  const { sheet } = useUnsavedChangesGuard(dirty);

  const weightSum = form ? WEIGHTS.reduce((sum, w) => sum + Number(form[w.key]), 0) : 1;

  const validate = (): boolean => {
    if (!form) return false;
    const next: typeof errors = {};
    for (const f of FIELDS) {
      const n = Number(form[f.key]);
      if (form[f.key].trim() === '' || !Number.isFinite(n) || n < f.min || n > f.max) next[f.key] = `Enter a number from ${f.min} to ${f.max}.`;
    }
    const weights = WEIGHTS.map((w) => Number(form[w.key]));
    if (weights.some((w) => !Number.isFinite(w) || w < 0 || w > 1)) next.matchingWeights = 'Each weight is a number from 0 to 1.';
    else if (Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 0.01) next.matchingWeights = 'The three weights must add up to 1.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (reason: string) => {
    if (!form) return;
    const res = await update({
      commissionPercent: Number(form.commissionPercent),
      minPayoutAmount: Number(form.minPayoutAmount),
      defaultSearchRadiusKm: Number(form.defaultSearchRadiusKm),
      avgUrbanSpeedKmh: Number(form.avgUrbanSpeedKmh),
      matchingWeights: { distance: Number(form.distance), rating: Number(form.rating), availability: Number(form.availability) },
      reason,
    });
    if ('error' in res) return setSaveError(adminErrorOf(res.error)?.message || 'Could not save.');
    setConfirming(false);
    showToast({ tone: 'success', message: 'Home-services settings saved.' });
  };

  const set = (key: keyof Form) => (v: string) => {
    setForm((f) => (f ? { ...f, [key]: v.replace(/[^0-9.]/g, '') } : f));
    setErrors((e) => ({ ...e, [key]: undefined, matchingWeights: undefined }));
  };

  return (
    <AdminScreen
      title="Home-services settings"
      footer={
        <PermissionGate all={['canManageHomeServices']} fallback={null}>
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
      <PermissionGate all={['canManageHomeServices']} action="change home-services settings">
        <QueryState isLoading={settings.isLoading} error={settings.error} onRetry={settings.refetch}>
          {form && (
            <>
              <Section title="Money and matching" card>
                {FIELDS.map((f) => (
                  <TextField key={f.key} label={f.label} helper={f.helper} value={form[f.key]} onChangeText={set(f.key)} keyboardType="decimal-pad" error={errors[f.key]} containerStyle={styles.field} />
                ))}
              </Section>
              <Section title="Matching weights" caption={`Must add up to 1. Now: ${Number.isFinite(weightSum) ? weightSum.toFixed(2) : '—'}`} card>
                {WEIGHTS.map((w) => (
                  <TextField key={w.key} label={w.label} value={form[w.key]} onChangeText={set(w.key)} keyboardType="decimal-pad" containerStyle={styles.field} />
                ))}
                {!!errors.matchingWeights && <Text style={styles.error}>{errors.matchingWeights}</Text>}
              </Section>
            </>
          )}
        </QueryState>
      </PermissionGate>

      <ConfirmSheet
        visible={confirming}
        title="Save home-services settings?"
        message="They apply to new bookings, matching and payout requests straight away."
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
    error: { ...T.body, color: c.error, marginBottom: S.md },
  });
