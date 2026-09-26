import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { E, R, S, T, W } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';

/**
 * Two to four mutually exclusive views of the same content: Day / Week,
 * Today / All patients, Weekly hours / Calendar / Time off.
 *
 * The screens it replaces animated a percentage `left` on the JS thread and
 * hardcoded each segment's position; this lays out with flex and needs neither.
 */
export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Optional trailing count, e.g. pending requests. Hidden when undefined. */
  count?: number;
}

export interface SegmentedControlProps<V extends string> {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  style?: StyleProp<ViewStyle>;
}

function SegmentedControl<V extends string>({ options, value, onChange, style }: SegmentedControlProps<V>) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, selected && styles.selected]}
            onPress={() => !selected && onChange(option.value)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.count ? `${option.label}, ${option.count}` : option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
            {option.count !== undefined && option.count > 0 && (
              <View style={[styles.count, selected && styles.countSelected]}>
                <Text style={[styles.countText, selected && styles.countTextSelected]}>
                  {option.count > 99 ? '99+' : option.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSunken,
      borderRadius: R.control,
      padding: 3,
    },
    segment: {
      flex: 1,
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: R.control - 2,
      paddingHorizontal: S.sm,
    },
    selected: {
      backgroundColor: isDark ? c.surfaceRaised : c.surface,
      ...E.raised,
    },
    label: { ...T.label, color: c.inkMuted },
    labelSelected: { fontWeight: W.semibold, color: c.ink },
    count: {
      marginLeft: 6,
      minWidth: 18,
      height: 18,
      borderRadius: R.pill,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.line,
    },
    countSelected: { backgroundColor: c.accentSoft },
    countText: { ...T.micro, color: c.inkMuted },
    countTextSelected: { color: c.accentDeep },
  });

export default SegmentedControl;
