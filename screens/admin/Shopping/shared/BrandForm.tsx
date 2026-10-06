// ============================================================================
// Everything a brand's storefront shows, in the order a customer meets it:
// who it is, how it looks, what it sells, its policies, and how to reach it.
// Shared by Add brand and the brand's own screen.
//
// Images are web addresses with a preview, like promo banners. The old form
// had "Tap to upload" boxes with nothing behind them, and an "Assign brand
// owner" picker that did nothing: the API has no owner field — a vendor's
// brand is created by the vendor, and one made here is run by the platform.
// ============================================================================

import React, { useMemo } from 'react';
import { Image, StyleSheet, Switch, Text, View } from 'react-native';

import { Section } from '../../../../components/admin';
import { Chip, TextField } from '../../../../components/ui';
import { SHOPPING_BRAND_CATEGORIES, SHOPPING_PAYMENT_METHODS } from '../../../../constants/shopping';
import { R, S, T, useTheme, type ThemeColors } from '../../../../theme';
import ColorField from './ColorField';
import { slugify, type BrandDraft } from './brandForm';

export interface BrandFormProps {
  draft: BrandDraft;
  onChange: (next: BrandDraft) => void;
  problems: Record<string, string>;
  mode: 'create' | 'edit';
}

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

const BrandForm: React.FC<BrandFormProps> = ({ draft, onChange, problems, mode }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const set = <K extends keyof BrandDraft>(key: K) => (value: BrandDraft[K]) => onChange({ ...draft, [key]: value });

  return (
    <>
      <Section title="The brand" card>
        <TextField
          label="Name"
          value={draft.name}
          onChangeText={(name) => onChange({ ...draft, name, slug: mode === 'create' && (!draft.slug || draft.slug === slugify(draft.name)) ? slugify(name) : draft.slug })}
          placeholder="e.g. Outfitters"
          error={problems.name}
          containerStyle={styles.field}
        />
        <TextField
          label="Web address name"
          value={draft.slug}
          onChangeText={(v) => set('slug')(slugify(v))}
          autoCapitalize="none"
          helper={mode === 'edit' ? 'Changing it breaks links customers saved.' : 'Made from the name; used in links.'}
          editable={mode === 'create'}
          containerStyle={styles.field}
        />
        <TextField label="Tagline" value={draft.tagline} onChangeText={set('tagline')} placeholder="e.g. Style that moves with you" containerStyle={styles.field} />
        <TextField label="Description" value={draft.description} onChangeText={set('description')} multiline error={problems.description} containerStyle={styles.field} />
        {mode === 'create' && (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Live straight away</Text>
              <Text style={styles.muted}>Off: the brand is created suspended and customers don't see it yet.</Text>
            </View>
            <Switch
              value={draft.isActive}
              onValueChange={set('isActive')}
              trackColor={{ true: colors.accent, false: colors.line }}
              thumbColor={colors.surface}
              accessibilityLabel="Live straight away"
            />
          </View>
        )}
      </Section>

      <Section title="Look" caption="Left empty, a colour falls back to the shopping default." card>
        <TextField label="Logo image address" value={draft.logo} onChangeText={(v) => set('logo')(v.trim())} autoCapitalize="none" placeholder="https://…" containerStyle={styles.field} />
        {!!draft.logo && <Image source={{ uri: draft.logo }} style={styles.logo} accessibilityLabel="Logo preview" />}
        <TextField
          label="Banner image address"
          value={draft.bannerImage}
          onChangeText={(v) => set('bannerImage')(v.trim())}
          autoCapitalize="none"
          placeholder="https://…"
          containerStyle={styles.field}
        />
        {!!draft.bannerImage && <Image source={{ uri: draft.bannerImage }} style={styles.banner} accessibilityLabel="Banner preview" />}
        <ColorField label="Primary colour" value={draft.primaryColor} onChange={set('primaryColor')} error={problems.primaryColor} />
        <ColorField label="Secondary colour" value={draft.secondaryColor} onChange={set('secondaryColor')} error={problems.secondaryColor} />
        <ColorField label="Accent colour" value={draft.accentColor} onChange={set('accentColor')} error={problems.accentColor} />
      </Section>

      <Section title="Departments" caption="Where the brand appears in the storefront." card>
        <View style={styles.chips}>
          {SHOPPING_BRAND_CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={draft.categories.includes(c)} onPress={() => set('categories')(toggle(draft.categories, c))} />
          ))}
        </View>
      </Section>

      <Section title="Policies" card>
        <TextField
          label="Return window (days)"
          value={draft.returnDays}
          onChangeText={(v) => set('returnDays')(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          error={problems.returnDays}
          containerStyle={styles.field}
        />
        <TextField
          label="Shipping information"
          value={draft.shippingInfo}
          onChangeText={set('shippingInfo')}
          placeholder="e.g. Delivered in 3–5 working days"
          multiline
          containerStyle={styles.field}
        />
        <Text style={styles.label}>Customers can pay with</Text>
        <View style={styles.chips}>
          {SHOPPING_PAYMENT_METHODS.map((m) => (
            <Chip key={m.value} label={m.label} selected={draft.paymentMethods.includes(m.value)} onPress={() => set('paymentMethods')(toggle(draft.paymentMethods, m.value))} />
          ))}
        </View>
        {!draft.paymentMethods.length && <Text style={styles.muted}>None ticked: customers can use every method checkout supports.</Text>}
      </Section>

      <Section title="Contact" card>
        <TextField label="Email" value={draft.contactEmail} onChangeText={set('contactEmail')} keyboardType="email-address" autoCapitalize="none" error={problems.contactEmail} containerStyle={styles.field} />
        <TextField label="Phone" value={draft.contactPhone} onChangeText={set('contactPhone')} keyboardType="phone-pad" containerStyle={styles.field} />
        <TextField label="Website" value={draft.website} onChangeText={(v) => set('website')(v.trim())} autoCapitalize="none" placeholder="https://…" containerStyle={styles.field} />
        <TextField label="Facebook" value={draft.facebook} onChangeText={(v) => set('facebook')(v.trim())} autoCapitalize="none" containerStyle={styles.field} />
        <TextField label="Instagram" value={draft.instagram} onChangeText={(v) => set('instagram')(v.trim())} autoCapitalize="none" containerStyle={styles.field} />
        <TextField label="X (Twitter)" value={draft.twitter} onChangeText={(v) => set('twitter')(v.trim())} autoCapitalize="none" containerStyle={styles.field} />
      </Section>
    </>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    field: { marginTop: S.md },
    label: { ...T.label, color: c.inkMuted, marginTop: S.md, marginBottom: S.sm },
    muted: { ...T.caption, color: c.inkMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingVertical: S.sm },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 56, marginTop: S.md },
    switchText: { flex: 1 },
    switchLabel: { ...T.body, color: c.ink },
    logo: { width: 72, height: 72, borderRadius: R.card, marginTop: S.sm, backgroundColor: c.surfaceSunken },
    banner: { width: '100%', height: 120, borderRadius: R.card, marginTop: S.sm, backgroundColor: c.surfaceSunken },
  });

export default BrandForm;
