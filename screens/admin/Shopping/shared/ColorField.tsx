// ============================================================================
// One colour of a brand's or outlet's storefront theme: a hex field, a swatch
// of what it will look like, and quick picks from the shared colour list.
// The colour is the vendor's data — the field itself is drawn in the console's
// theme like any other.
// ============================================================================

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '../../../../components/ui';
import { R, S, useTheme, type ThemeColors } from '../../../../theme';
import { COLOR_SWATCHES, isHexColor } from './colors';

export interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  helper?: string;
}

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, error, helper }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const valid = isHexColor(value);
  return (
    <View style={styles.wrap}>
      <TextField
        label={label}
        value={value}
        onChangeText={(v) => onChange(v.trim())}
        placeholder="Default"
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        helper={helper}
        right={<View style={[styles.preview, valid ? { backgroundColor: value } : styles.previewEmpty]} accessibilityElementsHidden />}
      />
      <View style={styles.swatches}>
        {COLOR_SWATCHES.map((s) => {
          const selected = valid && value.toLowerCase() === s.hex.toLowerCase();
          return (
            <Pressable
              key={s.name}
              onPress={() => onChange(s.hex)}
              style={styles.hit}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${s.name}`}
            >
              <View style={[styles.swatch, { backgroundColor: s.hex }, selected && styles.selected]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginBottom: S.md },
    preview: { width: 24, height: 24, borderRadius: R.chip, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
    previewEmpty: { backgroundColor: c.surfaceSunken },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', marginTop: -S.xs },
    // 44pt targets around 28pt swatches.
    hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
    selected: { borderWidth: 3, borderColor: c.ink },
  });

export default ColorField;
