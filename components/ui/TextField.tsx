import React, { forwardRef, useMemo, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';

/**
 * A labelled text input with its error or helper line underneath.
 *
 * Forms here validated on save and reported everything in one Alert, or in one
 * message at the bottom of a scroll view the keyboard was covering. The error
 * belongs next to the field it is about.
 */
export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Shown in place of the helper, and outlines the field. */
  error?: string | null;
  helper?: string;
  /** A unit or action at the trailing edge, e.g. "PKR". */
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    { label, error, helper, right, containerStyle, inputStyle, multiline, editable = true, onFocus, onBlur, ...rest },
    ref
  ) => {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [focused, setFocused] = useState(false);

    const borderColor = error ? colors.error : focused ? colors.accent : colors.line;

    return (
      <View style={[styles.wrap, containerStyle]}>
        {!!label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.field,
            multiline && styles.fieldMultiline,
            { borderColor },
            !editable && styles.fieldDisabled,
          ]}
        >
          <TextInput
            ref={ref}
            {...rest}
            multiline={multiline}
            editable={editable}
            placeholderTextColor={colors.inkFaint}
            selectionColor={colors.accent}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
            accessibilityLabel={rest.accessibilityLabel ?? label}
            accessibilityHint={error ?? helper}
          />
          {right}
        </View>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : helper ? (
          <Text style={styles.helper}>{helper}</Text>
        ) : null}
      </View>
    );
  }
);

TextField.displayName = 'TextField';

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginBottom: S.lg },
    label: { ...T.label, color: c.inkMuted, marginBottom: S.xs + 2 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: R.control,
      backgroundColor: c.surface,
      paddingHorizontal: S.md,
    },
    fieldMultiline: { alignItems: 'flex-start', paddingVertical: S.sm },
    fieldDisabled: { backgroundColor: c.surfaceSunken },
    input: {
      ...T.body,
      flex: 1,
      color: c.ink,
      paddingVertical: S.sm,
    },
    inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
    helper: { ...T.caption, color: c.inkMuted, marginTop: S.xs },
    error: { ...T.caption, color: c.error, marginTop: S.xs },
  });

export default TextField;
