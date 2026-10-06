// ============================================================================
// Specialties — what patients can book a doctor for.
//
// Each has a name, a description, an icon and the common conditions patients
// search by. Deactivating hides it from patients; the server refuses while
// verified doctors still practise it, and says so. Changes are audited.
//
// The old screen also offered a colour per specialty. The server never stored
// it (colours were reassigned by position on every load), so it is gone
// rather than offered and silently dropped.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AdminScreen, ConfirmSheet, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { Button, Chip, FormSheet, TextField, showToast } from '../../../../components/ui';
import { adminErrorOf } from '../../../../networks/admin/adminApi';
import {
  useListHCSpecialtiesQuery,
  useSaveHCSpecialtyMutation,
  useSetHCSpecialtyActiveMutation,
  type HCSpecialty,
} from '../../../../networks/admin/healthcareApi';
import { formatCount } from '../../../../utils/admin/format';
import { R, S, T, useTheme, type ThemeColors } from '../../../../theme';
import { SPECIALTY_ICONS, filterSpecialties, specialtySubtitle, type SpecialtyFilter } from './specialtyList';

type Draft = { id?: string; name: string; icon: string; description: string; conditions: string[]; isActive: boolean };

const EMPTY: Draft = { name: '', icon: 'medkit', description: '', conditions: [], isActive: true };

export default function SpecialtyManagementScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const specialties = useListHCSpecialtiesQuery();
  const [save, saveState] = useSaveHCSpecialtyMutation();
  const [setActive, setActiveState] = useSetHCSpecialtyActiveMutation();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SpecialtyFilter>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [condition, setCondition] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<HCSpecialty | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const all = specialties.data ?? [];
  const shown = filterSpecialties(all, filter, search);
  const active = all.filter((s) => s.isActive).length;
  const doctors = all.reduce((sum, s) => sum + (typeof s.doctorCount === 'number' ? s.doctorCount : 0), 0);

  const edit = (s?: HCSpecialty) => {
    setError(null);
    setCondition('');
    setDraft(
      s
        ? { id: s.id, name: s.name, icon: s.icon || EMPTY.icon, description: s.description ?? '', conditions: [...(s.commonConditions ?? [])], isActive: s.isActive }
        : { ...EMPTY, conditions: [] }
    );
  };

  const addCondition = () => {
    const name = condition.trim();
    if (!name) return;
    setDraft((d) => (d && !d.conditions.some((c) => c.toLowerCase() === name.toLowerCase()) ? { ...d, conditions: [...d.conditions, name] } : d));
    setCondition('');
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.description.trim()) return setError('A name and a description are required.');
    const res = await save({
      id: draft.id,
      name: draft.name.trim(),
      icon: draft.icon,
      description: draft.description.trim(),
      commonConditions: draft.conditions,
    });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The specialty was not saved.');
    setDraft(null);
    showToast({ tone: 'success', message: draft.id ? 'Specialty updated.' : 'Specialty added.' });
  };

  const confirmToggle = async (reason: string) => {
    if (!toggling) return;
    const activating = !toggling.isActive;
    const res = await setActive({ id: toggling.id, active: activating, reason });
    // e.g. "Cannot delete specialty with active doctors" — the server's reason, as it is.
    if ('error' in res) return setToggleError(adminErrorOf(res.error)?.message || 'The status was not changed.');
    setToggling(null);
    showToast({ tone: 'success', message: `${toggling.name} ${activating ? 'is bookable again' : 'is hidden from patients'}.` });
  };

  return (
    <AdminScreen
      title="Specialties"
      subtitle="Healthcare"
      refreshing={specialties.isFetching && !specialties.isLoading}
      onRefresh={specialties.refetch}
      footer={
        <PermissionGate all={['canManageHealthcare']} fallback={null}>
          <Button label="Add specialty" icon="add" onPress={() => edit()} fullWidth size="lg" />
        </PermissionGate>
      }
    >
      <PermissionGate all={['canManageHealthcare']} action="manage specialties">
        {specialties.data && (
          <Text style={styles.summary}>
            {formatCount(all.length)} specialties · {formatCount(doctors)} verified doctors
          </Text>
        )}
        <TextField placeholder="Search specialties" value={search} onChangeText={setSearch} returnKeyType="search" accessibilityLabel="Search specialties" />
        <FilterChips
          options={[
            { value: 'all', label: 'All', count: all.length },
            { value: 'active', label: 'Active', count: active },
            { value: 'inactive', label: 'Inactive', count: all.length - active },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as SpecialtyFilter)}
        />
        <QueryState
          isLoading={specialties.isLoading}
          error={specialties.error}
          onRetry={specialties.refetch}
          isEmpty={!shown.length}
          emptyIcon="medical-outline"
          emptyTitle={search.trim() ? 'No specialties match' : 'No specialties'}
          emptyMessage={search.trim() ? 'Try a different search.' : 'Patients cannot book a doctor until there is at least one.'}
          skeleton="rows"
        >
          <View>
            {shown.map((s, i) => (
              <EntityRow
                key={s.id}
                icon={s.icon || 'medkit'}
                title={s.name}
                subtitle={specialtySubtitle(s)}
                badge={s.isActive ? null : { label: 'Inactive', tone: 'neutral' }}
                onPress={() => edit(s)}
                divider={i < shown.length - 1}
              />
            ))}
          </View>
        </QueryState>
      </PermissionGate>

      <FormSheet
        visible={!!draft}
        title={draft?.id ? 'Edit specialty' : 'Add specialty'}
        onClose={() => setDraft(null)}
        busy={saveState.isLoading}
        footer={<Button label="Save" onPress={submit} loading={saveState.isLoading} fullWidth size="lg" />}
      >
        {draft && (
          <>
            <TextField label="Name" placeholder="e.g. General medicine" value={draft.name} onChangeText={(v) => setDraft((d) => (d ? { ...d, name: v } : d))} />
            <TextField
              label="Description"
              placeholder="What patients see under the name"
              value={draft.description}
              onChangeText={(v) => setDraft((d) => (d ? { ...d, description: v } : d))}
              multiline
            />
            <Text style={styles.label}>Icon</Text>
            <View style={styles.icons}>
              {SPECIALTY_ICONS.map((icon) => {
                const selected = draft.icon === icon;
                return (
                  <Pressable
                    key={icon}
                    onPress={() => setDraft((d) => (d ? { ...d, icon } : d))}
                    style={[styles.icon, selected && styles.iconSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Icon ${icon}`}
                  >
                    <Ionicons name={icon as any} size={22} color={selected ? colors.accentDeep : colors.inkMuted} />
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>Common conditions</Text>
            <View style={styles.addRow}>
              <TextField
                placeholder="Add a condition"
                value={condition}
                onChangeText={setCondition}
                onSubmitEditing={addCondition}
                returnKeyType="done"
                containerStyle={styles.addField}
                accessibilityLabel="Add a common condition"
              />
              <Button label="Add" variant="secondary" onPress={addCondition} disabled={!condition.trim()} />
            </View>
            <View style={styles.conditions}>
              {draft.conditions.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  icon="close"
                  onPress={() => setDraft((d) => (d ? { ...d, conditions: d.conditions.filter((x) => x !== c) } : d))}
                />
              ))}
              {!draft.conditions.length && <Text style={styles.muted}>None yet. Patients also find a specialty by these.</Text>}
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            {draft.id && (
              <Button
                label={draft.isActive ? 'Hide from patients' : 'Make bookable again'}
                variant="ghost"
                onPress={() => {
                  const s = all.find((x) => x.id === draft.id) ?? null;
                  setDraft(null);
                  setToggleError(null);
                  setToggling(s);
                }}
                fullWidth
              />
            )}
          </>
        )}
      </FormSheet>

      <ConfirmSheet
        visible={!!toggling}
        title={toggling?.isActive ? `Hide ${toggling?.name}?` : `Make ${toggling?.name} bookable?`}
        message={
          toggling?.isActive
            ? 'Patients stop seeing it. This is only possible once no verified doctor practises it.'
            : 'Patients can find and book doctors for it again.'
        }
        confirmLabel={toggling?.isActive ? 'Hide' : 'Make bookable'}
        destructive={!!toggling?.isActive}
        requireReason
        busy={setActiveState.isLoading}
        error={toggleError}
        onConfirm={confirmToggle}
        onClose={() => setToggling(null)}
      />
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    summary: { ...T.body, color: c.inkMuted, marginBottom: S.md },
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    icons: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
    icon: {
      width: 48,
      height: 48,
      borderRadius: R.control,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    iconSelected: { backgroundColor: c.accentSoft, borderColor: c.accentDeep },
    addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
    addField: { flex: 1 },
    conditions: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
    muted: { ...T.caption, color: c.inkMuted },
    error: { ...T.body, color: c.error, marginBottom: S.md },
  });
