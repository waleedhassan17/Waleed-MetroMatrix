import { Moon, Smartphone, Sun } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { F, R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import {
  selectThemePreference,
  setThemePreference,
  ThemePreference,
} from '../../store/themeSlice';

/**
 * The appearance control. One implementation, used by every role's settings.
 *
 * WHY THREE OPTIONS AND NOT A SWITCH
 * ----------------------------------
 * A boolean cannot say "follow my phone", and that is the setting most people
 * actually want — it is why the OS has the toggle in the first place. With a
 * switch, a user who dims their phone at night has to come back here and dim
 * the app separately, then undo both in the morning.
 *
 * 'System' is also the honest default for a fresh install: the app matches the
 * phone the user already set up instead of announcing its own preference.
 *
 * The three sit in a segmented track rather than a modal or a list of rows so
 * the current state and the alternatives are visible at once — an appearance
 * setting the user cannot preview is a setting they poke at twice.
 */
const OPTIONS: { key: ThemePreference; label: string; icon: typeof Sun }[] = [
  { key: 'system', label: 'System', icon: Smartphone },
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
];

export interface ThemeModeSelectorProps {
  style?: StyleProp<ViewStyle>;
}

const ThemeModeSelector: React.FC<ThemeModeSelectorProps> = ({ style }) => {
  const dispatch = useDispatch();
  const preference = useSelector(selectThemePreference);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.track, style]} accessibilityRole="radiogroup">
      {OPTIONS.map(({ key, label, icon: Icon }) => {
        const active = preference === key;

        return (
          <TouchableOpacity
            key={key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => dispatch(setThemePreference(key))}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} appearance`}
          >
            <Icon
              size={15}
              color={active ? colors.accentDeep : colors.inkMuted}
              strokeWidth={2}
            />
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSunken,
      borderRadius: R.control,
      padding: 3,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: S.sm,
      paddingHorizontal: 6,
      borderRadius: R.control - 3,
      // Selection is carried by ground AND weight, not colour alone — the same
      // rule Chip follows, for the same reason.
      backgroundColor: 'transparent',
    },
    segmentActive: {
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    label: {
      ...T.label,
      color: c.inkMuted,
      marginLeft: 6,
    },
    labelActive: {
      fontFamily: F.semibold,
      color: c.accentDeep,
    },
  });

export default ThemeModeSelector;
