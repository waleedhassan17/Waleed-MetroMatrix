import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { makeColors, type ColorType } from '../constants/Colors';
import { useTheme } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * This component was the last one in the app reading the static light `Colors`
 * from module scope, which meant its styles were frozen at import time. In dark
 * that put a near-white `secondary` ground and a near-black `outline` label on a
 * dark page — the button was there, it just could not be read.
 *
 * The fix is the standard shape used everywhere else here: resolve the palette
 * per render and build the sheet from it. See constants/Colors.ts:354.
 */
const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style
}) => {
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(makeColors(mode)), [mode]);

  const getButtonStyle = (): StyleProp<ViewStyle> => {
    switch (variant) {
      case 'secondary':
        return [styles.button, styles.secondaryButton];
      case 'outline':
        return [styles.button, styles.outlineButton];
      default:
        return [styles.button, styles.primaryButton];
    }
  };

  const getTextStyle = (): StyleProp<TextStyle> => {
    switch (variant) {
      case 'secondary':
        return [styles.text, styles.secondaryText];
      case 'outline':
        return [styles.text, styles.outlineText];
      default:
        return [styles.text, styles.primaryText];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

export default Button;

const makeStyles = (Colors: ColorType) => StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.text.light,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: Colors.text.inverse,
  },
  secondaryText: {
    color: Colors.text.inverse,
  },
  outlineText: {
    color: Colors.primary,
  },
});