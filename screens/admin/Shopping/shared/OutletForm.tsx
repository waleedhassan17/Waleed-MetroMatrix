// ============================================================================
// An outlet — a physical store — as customers find it: its name, where it is,
// how to reach it, which brand it sells, and its storefront colours. Shared by
// Add outlet and the outlet's own screen. The old outlet screen showed the
// address but could not change it; here it can.
// ============================================================================

import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Section } from '../../../../components/admin';
import { Chip, TextField } from '../../../../components/ui';
import { useListShopBrandOptionsQuery } from '../../../../networks/admin/shoppingApi';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import ColorField from './ColorField';
import { slugify } from './brandForm';
import { COLOR_SCHEME_FIELDS, type OutletDraft } from './outletForm';

export interface OutletFormProps {
  draft: OutletDraft;
  onChange: (next: OutletDraft) => void;
  problems: Record<string, string>;
  mode: 'create' | 'edit';
}

const OutletForm: React.FC<OutletFormProps> = ({ draft, onChange, problems, mode }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const brands = useListShopBrandOptionsQuery();
  const set = <K extends keyof OutletDraft>(key: K) => (value: OutletDraft[K]) => onChange({ ...draft, [key]: value });

  return (
    <>
      <Section title="The outlet" card>
        <TextField
          label="Name"
          value={draft.name}
          onChangeText={(name) => onChange({ ...draft, name, slug: mode === 'create' && (!draft.slug || draft.slug === slugify(draft.name)) ? slugify(name) : draft.slug })}
          placeholder="e.g. Outfitters — Gulberg"
          error={problems.name}
          containerStyle={styles.field}
        />
        {mode === 'create' && (
          <TextField label="Web address name" value={draft.slug} onChangeText={(v) => set('slug')(slugify(v))} autoCapitalize="none" helper="Made from the name; used in links." containerStyle={styles.field} />
        )}
        <TextField label="Description" value={draft.description} onChangeText={set('description')} multiline containerStyle={styles.field} />
        <TextField label="Manager" value={draft.managerName} onChangeText={set('managerName')} placeholder="e.g. Ahmed Khan" containerStyle={styles.field} />
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Open to customers</Text>
            <Text style={styles.muted}>Off: it stays here but customers don't see it.</Text>
          </View>
          <Switch
            value={draft.isActive}
            onValueChange={set('isActive')}
            trackColor={{ true: colors.accent, false: colors.line }}
            thumbColor={colors.surface}
            accessibilityLabel="Open to customers"
          />
        </View>
      </Section>

      <Section title="Where it is" card>
        <TextField label="Street address" value={draft.address} onChangeText={set('address')} placeholder="e.g. 25-A, Main Boulevard" error={problems.address} containerStyle={styles.field} />
        <TextField label="City" value={draft.city} onChangeText={set('city')} placeholder="e.g. Lahore" error={problems.city} containerStyle={styles.field} />
        <TextField label="Province" value={draft.state} onChangeText={set('state')} placeholder="e.g. Punjab" containerStyle={styles.field} />
        <TextField label="Country" value={draft.country} onChangeText={set('country')} containerStyle={styles.field} />
        <TextField label="Postal code" value={draft.postalCode} onChangeText={set('postalCode')} keyboardType="number-pad" containerStyle={styles.field} />
      </Section>

      <Section title="Contact and hours" card>
        <TextField label="Phone" value={draft.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={problems.phone} containerStyle={styles.field} />
        <TextField label="Email" value={draft.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={problems.email} containerStyle={styles.field} />
        <TextField label="Opening hours" value={draft.openingHours} onChangeText={set('openingHours')} placeholder="e.g. 10:00 AM – 10:00 PM" containerStyle={styles.field} />
      </Section>

      <Section title="Sells" caption="The brand customers find at this outlet." card>
        <View style={styles.chips}>
          <Chip label="No brand" selected={!draft.brandId} onPress={() => set('brandId')(null)} />
          {(brands.data ?? []).map((b) => (
            <Chip key={b.id} label={b.name} selected={draft.brandId === b.id} onPress={() => set('brandId')(b.id)} />
          ))}
        </View>
        {brands.isError && <Text style={styles.error}>The brands could not be loaded. Pull to refresh and try again.</Text>}
      </Section>

      <Section title="Colours" caption="Saved with the outlet. The customer app does not show outlet colours yet." card>
        {COLOR_SCHEME_FIELDS.map(({ key, label }) => (
          <ColorField
            key={key}
            label={label}
            value={draft.colorScheme[key] ?? ''}
            onChange={(v) => onChange({ ...draft, colorScheme: { ...draft.colorScheme, [key]: v } })}
            error={problems[key]}
          />
        ))}
      </Section>
    </>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    field: { marginTop: S.md },
    muted: { ...T.caption, color: c.inkMuted },
    error: { ...T.caption, color: c.error, marginBottom: S.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingVertical: S.sm },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 56, marginTop: S.md },
    switchText: { flex: 1 },
    switchLabel: { ...T.body, color: c.ink },
  });

export default OutletForm;
