import { Moon, Sun } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import {
  selectThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../../store/themeSlice';

/**
 * The appearance control. One implementation, used by every role's settings.
 *
 * WHY A SWITCH AND NOT THE OLD THREE-WAY PICKER
 * ---------------------------------------------
 * This replaces `ThemeModeSelector`, a System / Light / Dark segmented control.
 * 'System' is gone because the app no longer reads the phone's theme at all —
 * see theme/mode.ts. With that option removed the remaining choice is a
 * boolean, and a boolean rendered as two segments is a switch wearing a costume.
 *
 * The framing matters as much as the control: the row is "Dark Mode", off by
 * default, not "Appearance" with two equal options. Light is the appearance
 * MetroMatrix is designed in; dark is the thing you turn on.
 *
 * SELF-CONTAINED ON PURPOSE
 * -------------------------
 * The row carries its own icon, label, subtitle and Switch, so five different
 * settings screens — customer, home-service provider, doctor, brand vendor,
 * admin — can drop it in without each re-deriving the dispatch, the selector
 * and the switch colours. They had three different half-answers before.
 */
export interface DarkModeSwitchProps {
  style?: StyleProp<ViewStyle>;
  /**
   * Ran AFTER the preference is written, for a screen that has to mirror the
   * choice somewhere else. Admin settings is the only caller: it also keeps the
   * server's `appearance.theme` in step, so an admin's stored preference does
   * not silently disagree with the app in front of them.
   *
   * This is a side channel, not a substitute — the device slice is always what
   * paints the app, and it wins if the two ever differ. A theme belongs to the
   * screen in your hand, not to the account.
   */
  onChange?: (next: ThemePreference) => void;
}

const DarkModeSwitch: React.FC<DarkModeSwitchProps> = ({ style, onChange }) => {
  const dispatch = useDispatch();
  const preference = useSelector(selectThemePreference);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isDark = preference === 'dark';

  return (
    <View style={[styles.row, style]}>
      <View style={styles.iconWrap}>
        {isDark ? (
          // accentDeep, not accent: an accent used as a FOREGROUND has to clear
          // contrast against the surface behind it.
          <Moon size={18} color={colors.accentDeep} strokeWidth={2} />
        ) : (
          <Sun size={18} color={colors.inkMuted} strokeWidth={2} />
        )}
      </View>

      <View style={styles.text}>
        <Text style={styles.label}>Dark Mode</Text>
        <Text style={styles.subtitle}>
          {isDark
            ? 'Dimmed surfaces, easier on the eyes at night'
            : 'The standard MetroMatrix look'}
        </Text>
      </View>

      <Switch
        value={isDark}
        onValueChange={(on) => {
          const next: ThemePreference = on ? 'dark' : 'light';
          dispatch(setThemePreference(next));
          onChange?.(next);
        }}
        trackColor={{ false: colors.line, true: colors.accentSoft }}
        thumbColor={isDark ? colors.accent : colors.inkFaint}
        ios_backgroundColor={colors.line}
        accessibilityRole="switch"
        accessibilityLabel="Dark mode"
        accessibilityState={{ checked: isDark }}
      />
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: S.md,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: R.chip,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceSunken,
      marginRight: S.md,
    },
    text: {
      flex: 1,
      marginRight: S.md,
    },
    label: {
      ...T.subhead,
      color: c.ink,
    },
    subtitle: {
      ...T.caption,
      color: c.inkMuted,
      marginTop: 2,
    },
  });

export default DarkModeSwitch;
