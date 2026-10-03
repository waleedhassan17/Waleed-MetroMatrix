// ============================================================================
// Platform settings — rendered from the server's spec.
//
// GET /admin/settings returns the values AND a spec of every field (type,
// limits, unit, label, who may edit it). Only settings the backend actually
// enforces are in that spec; the old screen offered a language picker, an IP
// whitelist and an appearance section that nothing read. Each section saves
// on its own; leaving with unsaved changes asks first.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AdminScreen, QueryState, Section } from '../../../components/admin';
import { Button, TextField, showToast } from '../../../components/ui';
import { useAdminProfile, hasPermission, type PermissionKey } from '../../../hooks/useAdminPermission';
import useUnsavedChangesGuard from '../../../hooks/useUnsavedChangesGuard';
import { adminErrorOf, useGetSettingsQuery, useUpdateSettingsMutation } from '../../../networks/admin/adminApi';
import { formatDateTime } from '../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../theme';
import { fieldProblem, type FieldSpec, type SectionKey, type SectionSpec } from './settingsSpec';

type Draft = Record<string, string | boolean>;

const toDraft = (values: Record<string, unknown>, spec: SectionSpec): Draft =>
  Object.fromEntries(
    Object.entries(spec.fields).map(([key, f]) => [key, f.type === 'boolean' ? values[key] === true : values[key] == null ? '' : String(values[key])])
  );

export default function AdminSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const admin = useAdminProfile();
  const settings = useGetSettingsQuery();
  const [update] = useUpdateSettingsMutation();

  const spec = settings.data?.spec as Record<SectionKey, SectionSpec> | undefined;
  const values = settings.data?.values as Record<string, Record<string, unknown>> | undefined;

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!spec || !values) return;
    const fresh = Object.fromEntries(Object.entries(spec).map(([section, s]) => [section, toDraft(values[section] ?? {}, s)]));
    setDrafts(fresh);
    setSaved(fresh);
  }, [spec, values]);

  const dirtySections = Object.keys(drafts).filter((k) => JSON.stringify(drafts[k]) !== JSON.stringify(saved[k]));
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirtySections.length > 0);

  const canEdit = (s: SectionSpec) =>
    !!admin && (s.superAdminOnly ? admin.isSuperAdmin : s.permission ? hasPermission(admin, s.permission as PermissionKey) : true);

  const setField = (section: string, key: string, value: string | boolean) => {
    setDrafts((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
    setErrors((e) => ({ ...e, [section]: { ...e[section], [key]: '' } }));
  };

  const save = async (section: SectionKey) => {
    if (!spec) return;
    const sectionSpec = spec[section];
    const draft = drafts[section];
    const problems: Record<string, string> = {};
    const body: Record<string, unknown> = {};
    for (const [key, f] of Object.entries(sectionSpec.fields)) {
      if (draft[key] === saved[section][key]) continue;
      const problem = fieldProblem(f, draft[key]);
      if (problem) problems[key] = problem;
      else body[key] = f.type === 'integer' ? Number(draft[key]) : draft[key];
    }
    setErrors((e) => ({ ...e, [section]: problems }));
    if (Object.keys(problems).length || !Object.keys(body).length) return;

    setSaving(section);
    const res = await update({ section, values: body });
    setSaving(null);
    if ('error' in res) {
      const err = adminErrorOf(res.error);
      const fields = (err?.details as { fields?: { field: string | null; message: string }[] } | undefined)?.fields ?? [];
      if (fields.length) {
        setErrors((e) => ({ ...e, [section]: Object.fromEntries(fields.map((x) => [x.field ?? '', x.message])) }));
      }
      showToast({ tone: 'error', message: err?.message || 'Could not save.' });
      return;
    }
    const next = toDraft(res.data.values as Record<string, unknown>, sectionSpec);
    setSaved((s) => ({ ...s, [section]: next }));
    setDrafts((d) => ({ ...d, [section]: next }));
    if (dirtySections.length <= 1) allowLeave();
    showToast({ tone: 'success', message: `${sectionSpec.label} settings saved.` });
  };

  const renderField = (section: SectionKey, key: string, f: FieldSpec, editable: boolean, last: boolean) => {
    const value = drafts[section]?.[key];
    const error = errors[section]?.[key];
    if (f.type === 'boolean') {
      return (
        <View key={key} style={[styles.switchRow, !last && styles.divider]}>
          <Text style={styles.switchLabel}>{f.label}</Text>
          <Switch
            value={value === true}
            onValueChange={(v) => setField(section, key, v)}
            disabled={!editable}
            trackColor={{ true: colors.accent, false: colors.line }}
            thumbColor={colors.surface}
            accessibilityLabel={f.label}
          />
        </View>
      );
    }
    const range = f.type === 'integer' ? `${f.min}–${f.max}${f.unit ? ` ${f.unit}` : ''}` : f.max ? `Up to ${f.max} characters` : undefined;
    return (
      <TextField
        key={key}
        label={f.label}
        value={typeof value === 'string' ? value : ''}
        onChangeText={(v) => setField(section, key, f.type === 'integer' ? v.replace(/[^0-9]/g, '') : v)}
        keyboardType={f.type === 'integer' ? 'number-pad' : f.type === 'email' ? 'email-address' : 'default'}
        autoCapitalize={f.type === 'email' ? 'none' : 'sentences'}
        editable={editable}
        helper={range}
        error={error || null}
        containerStyle={styles.field}
      />
    );
  };

  return (
    <AdminScreen title="Platform settings" refreshing={settings.isFetching && !settings.isLoading} onRefresh={settings.refetch}>
      <QueryState isLoading={settings.isLoading} error={settings.error} onRetry={settings.refetch} action="see platform settings">
        {spec &&
          (Object.entries(spec) as [SectionKey, SectionSpec][]).map(([section, s]) => {
            const editable = canEdit(s);
            const fields = Object.entries(s.fields);
            const dirty = dirtySections.includes(section);
            return (
              <Section
                key={section}
                title={s.label}
                caption={editable ? undefined : s.superAdminOnly ? 'Only a super admin can change these.' : 'You can view these settings.'}
                card
              >
                {fields.map(([key, f], i) => renderField(section, key, f, editable && saving !== section, i === fields.length - 1))}
                {editable && (
                  <Button
                    label={`Save ${s.label.toLowerCase()}`}
                    onPress={() => save(section)}
                    loading={saving === section}
                    disabled={!dirty || saving !== null}
                    fullWidth
                    style={styles.save}
                  />
                )}
              </Section>
            );
          })}
        {!!settings.data?.updatedAt && <Text style={styles.updated}>Last changed {formatDateTime(settings.data.updatedAt)}</Text>}
      </QueryState>
      {sheet}
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    field: { marginTop: S.md },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.lg, minHeight: 56, paddingVertical: S.sm },
    switchLabel: { ...T.body, color: c.ink, flex: 1 },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    save: { marginTop: S.md, marginBottom: S.sm },
    updated: { ...T.caption, color: c.inkMuted, textAlign: 'center' },
  });
