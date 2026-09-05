// ============================================================================
// Brand theme editor
//
// Replaces three bare hex TextInputs (BrandProfileScreen:141-157) that had no
// validation, no preview, and no contrast check — a vendor could type "blue",
// save it, and discover later that their storefront header had gone
// transparent with white text on it.
//
// Three things a colour control has to do that a text field cannot:
//   1. Show the colour. A hex string is not a colour to anybody.
//   2. Show it IN CONTEXT. #F5D142 looks fine in a swatch and is unreadable as
//      a header behind white text.
//   3. Say when the result fails contrast, in the same breath as the choice.
//
// Deliberately NOT built on components/Shopping/ColorPicker.tsx: that is a
// product-variant swatch picker, it emits a colour NAME rather than a hex, its
// "is this light?" test is a hardcoded three-value list, and it has no
// importers anywhere in the app.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { darkShift, type DarkShift } from '../../constants/darkShift';
import { useTheme } from '../../theme';

import { AA_BODY, AA_LARGE, contrastRatio, isHexColor, textOn } from '../../theme';
import { C, F, R, S, T } from '../../constants/theme';

export interface BrandThemeValue {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

interface Props {
  value: BrandThemeValue;
  onChange: (next: BrandThemeValue) => void;
}

type Role = keyof BrandThemeValue;

/**
 * Each role says what it DOES, not what it is called. "Secondary" told a vendor
 * nothing, which is one reason `secondaryColor` had no consumer in the app for
 * so long — nobody knew what it was supposed to affect.
 */
const ROLES: { key: Role; label: string; help: string }[] = [
  {
    key: 'primaryColor',
    label: 'Primary',
    help: 'Your tab bar, store header and main buttons.',
  },
  {
    key: 'secondaryColor',
    label: 'Pressed',
    help: 'The darker shade a button goes while it is being tapped.',
  },
  {
    key: 'accentColor',
    label: 'Highlight',
    help: 'Small attention marks — cart count, sale flags.',
  },
];

// A spread across hue and value, all dark enough to carry white text, so the
// obvious choices are also legible ones.
const PRESETS = [
  '#E67E22', '#D35400', '#C0392B', '#B91C1C',
  '#7C3AED', '#4F46E5', '#1D4ED8', '#0E7490',
  '#047857', '#15803D', '#B45309', '#1C1917',
];

const ContrastNote: React.FC<{ background: string }> = ({ background }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  if (!isHexColor(background)) return null;

  const ink = textOn(background);
  const ratio = contrastRatio(ink, background);
  const passesBody = ratio >= AA_BODY;
  const passesLarge = ratio >= AA_LARGE;

  // The tone is the message: green when text of any size is safe, amber when
  // only large text is, red when nothing on this colour will read.
  const tone = passesBody ? C.success : passesLarge ? C.warning : C.error;
  const label = passesBody
    ? 'Text reads clearly on this colour'
    : passesLarge
      ? 'Only large text will read on this colour'
      : 'Text will be hard to read on this colour';

  return (
    <View style={styles.contrastRow}>
      <View style={[styles.contrastChip, { backgroundColor: background }]}>
        <Text style={[styles.contrastChipText, { color: ink }]}>Aa</Text>
      </View>
      <Text style={[styles.contrastLabel, { color: tone }]} numberOfLines={2}>
        {label} · {ratio.toFixed(1)}:1
      </Text>
    </View>
  );
};

const ColorRole: React.FC<{
  role: (typeof ROLES)[number];
  value: string;
  onChange: (hex: string) => void;
  showContrast: boolean;
}> = ({ role, value, onChange, showContrast }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  // Held separately so a half-typed "#E6" does not repaint the preview or fail
  // validation on every keystroke.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const valid = isHexColor(shown);

  const commit = () => {
    const next = shown.trim();
    const withHash = next && !next.startsWith('#') ? `#${next}` : next;
    if (isHexColor(withHash)) onChange(withHash.toLowerCase());
    setDraft(null);
  };

  return (
    <View style={styles.role}>
      <View style={styles.roleHead}>
        <View
          style={[
            styles.swatch,
            { backgroundColor: valid ? shown : C.surfaceSunken },
            !valid && styles.swatchInvalid,
          ]}
        />
        <View style={styles.roleText}>
          <Text style={styles.roleLabel}>{role.label}</Text>
          <Text style={styles.roleHelp}>{role.help}</Text>
        </View>
        <TextInput
          style={[styles.hexInput, !valid && styles.hexInputInvalid]}
          value={shown}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          placeholder="#000000"
          placeholderTextColor={C.inkFaint}
          accessibilityLabel={`${role.label} colour, hex value`}
        />
      </View>

      {!valid && (
        <Text style={styles.invalidNote}>
          Needs a hex colour like #E67E22.
        </Text>
      )}

      <View style={styles.presets}>
        {PRESETS.map((hex) => {
          const selected = value.toLowerCase() === hex.toLowerCase();
          return (
            <TouchableOpacity
              key={hex}
              onPress={() => {
                setDraft(null);
                onChange(hex.toLowerCase());
              }}
              style={[
                styles.preset,
                { backgroundColor: hex },
                selected && styles.presetSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Use ${hex} for ${role.label}`}
              accessibilityState={{ selected }}
            />
          );
        })}
      </View>

      {showContrast && <ContrastNote background={valid ? shown : value} />}
    </View>
  );
};

/**
 * Live preview. Small, but it is the only place the three colours are seen
 * doing their actual jobs at the same time — which is the whole question a
 * vendor is trying to answer.
 */
const Preview: React.FC<{ value: BrandThemeValue }> = ({ value }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const primary = isHexColor(value.primaryColor) ? value.primaryColor : C.inkFaint;
  const pressed = isHexColor(value.secondaryColor) ? value.secondaryColor : primary;
  const highlight = isHexColor(value.accentColor) ? value.accentColor : primary;
  const ink = textOn(primary);

  return (
    <View style={styles.preview}>
      <View style={[styles.previewHeader, { backgroundColor: primary }]}>
        <Text style={[styles.previewTitle, { color: ink }]}>Your store</Text>
        <View style={[styles.previewBadge, { backgroundColor: highlight }]}>
          <Text style={[styles.previewBadgeText, { color: textOn(highlight) }]}>3</Text>
        </View>
      </View>
      <View style={styles.previewBody}>
        <View style={styles.previewLine} />
        <View style={[styles.previewLine, styles.previewLineShort]} />
        <View style={styles.previewButtons}>
          <View style={[styles.previewButton, { backgroundColor: primary }]}>
            <Text style={[styles.previewButtonText, { color: ink }]}>Add to cart</Text>
          </View>
          <View style={[styles.previewButton, { backgroundColor: pressed }]}>
            <Text style={[styles.previewButtonText, { color: textOn(pressed) }]}>Pressed</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const BrandThemeEditor: React.FC<Props> = ({ value, onChange }) => (
  <View>
    <Preview value={value} />
    {ROLES.map((role) => (
      <ColorRole
        key={role.key}
        role={role}
        value={value[role.key] ?? ''}
        onChange={(hex) => onChange({ ...value, [role.key]: hex })}
        // Only the primary carries body text in the real UI, so only it needs
        // the contrast verdict. Repeating it three times would train people to
        // ignore it.
        showContrast={role.key === 'primaryColor'}
      />
    ))}
  </View>
);

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  role: {
    paddingVertical: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  roleHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  swatchInvalid: {
    borderStyle: 'dashed',
    borderColor: C.error,
  },
  roleText: {
    flex: 1,
    marginHorizontal: S.md,
  },
  roleLabel: {
    ...T.bodyStrong,
    color: C.ink,
  },
  roleHelp: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: 1,
  },
  hexInput: {
    ...T.mono,
    width: 92,
    color: C.ink,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: C.surfaceSunken,
    textAlign: 'center',
  },
  hexInputInvalid: {
    borderColor: C.error,
  },
  invalidNote: {
    ...T.caption,
    color: C.error,
    marginTop: S.xs,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  preset: {
    width: 28,
    height: 28,
    borderRadius: R.chip,
    marginRight: S.sm,
    marginBottom: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  presetSelected: {
    borderWidth: 3,
    borderColor: C.ink,
  },
  contrastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs,
  },
  contrastChip: {
    width: 30,
    height: 24,
    borderRadius: R.chip,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.sm,
  },
  contrastChipText: {
    ...T.label,
  },
  contrastLabel: {
    ...T.caption,
    flex: 1,
  },

  preview: {
    borderRadius: R.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginBottom: S.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  previewTitle: {
    ...T.subhead,
  },
  previewBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: R.pill,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeText: {
    ...T.caption,
    fontFamily: F.bold,
  },
  previewBody: {
    padding: S.lg,
    backgroundColor: C.surface,
  },
  previewLine: {
    height: 8,
    borderRadius: R.chip,
    backgroundColor: C.lineSoft,
    marginBottom: S.sm,
  },
  previewLineShort: {
    width: '55%',
    marginBottom: S.lg,
  },
  previewButtons: {
    flexDirection: 'row',
  },
  previewButton: {
    flex: 1,
    paddingVertical: S.sm,
    borderRadius: R.control,
    alignItems: 'center',
    marginRight: S.sm,
  },
  previewButtonText: {
    ...T.label,
  },
});

export default BrandThemeEditor;
