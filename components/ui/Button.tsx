import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { HS } from '../../constants/HomeServiceTheme';
import { C, R, S, T } from '../../constants/theme';

/**
 * Buttons.
 *
 * Solid accent fill — no gradient. One `primary` per screen: the primary CTA is
 * the single confident element, and everything else steps back to `secondary`
 * or `ghost`. A screen with four gradient buttons has no primary action.
 *
 * The label keeps its name through the flow ("Mark complete" -> "Completed"),
 * and never has an arrow glued to it.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ionicons glyph shown before the label. */
  icon?: string;
  /** Ionicons glyph shown after the label. Use sparingly. */
  iconRight?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 46, lg: 52 };
const ICON: Record<ButtonSize, number> = { sm: 15, md: 17, lg: 18 };

const FILL: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: HS.accent, fg: C.inkInverse },
  secondary: { bg: C.surface, fg: C.ink, border: C.line },
  ghost: { bg: 'transparent', fg: HS.accentDeep },
  destructive: { bg: C.errorSoft, fg: C.error, border: C.errorLine },
};

const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth = true,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const inert = disabled || loading;
  const fill = FILL[variant];
  const fg = inert ? C.inkFaint : fill.fg;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inert}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        {
          height: HEIGHT[size],
          backgroundColor: inert && variant !== 'ghost' ? C.surfaceSunken : fill.bg,
          paddingHorizontal: size === 'sm' ? S.md : S.xl,
        },
        !!fill.border && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: inert ? C.line : fill.border,
        },
        fullWidth ? styles.full : styles.hug,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.row}>
          {!!icon && <Ionicons name={icon as any} size={ICON[size]} color={fg} />}
          <Text
            style={[
              size === 'sm' ? T.label : T.bodyStrong,
              { color: fg },
              !!icon && styles.afterIcon,
              !!iconRight && styles.beforeIcon,
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {!!iconRight && <Ionicons name={iconRight as any} size={ICON[size]} color={fg} />}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: R.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  afterIcon: { marginLeft: S.sm },
  beforeIcon: { marginRight: S.sm },
});

export default Button;
