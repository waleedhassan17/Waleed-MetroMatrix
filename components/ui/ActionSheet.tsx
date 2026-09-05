import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Bottom action sheet — the replacement for `Alert.alert` on primary flows.
 *
 * There were 32 native alerts across these screens, including "Contact
 * provider", which is a choice between two actions rather than a warning. A
 * native alert is the OS's chrome, not the product's: it cannot carry the
 * product's type, colour or tone, and on Android it looks like a system error.
 *
 * Native `Alert` is still right for a genuine OS-level interruption
 * (permissions) — this is for choices the product owns.
 */
export interface SheetOption {
  label: string;
  /** Ionicons glyph. */
  icon?: string;
  description?: string;
  tone?: 'default' | 'destructive';
  onPress: () => void;
}

export interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: SheetOption[];
  cancelLabel?: string;
  onClose: () => void;
}

const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  title,
  message,
  options,
  cancelLabel = 'Cancel',
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const slide = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      // Jump to the end state. Freezing at the start state is how a sheet ends
      // up rendered but invisible.
      slide.setValue(visible ? 1 : 0);
      return;
    }
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 140,
      useNativeDriver: true,
    }).start();
  }, [visible, reducedMotion, slide]);

  const handle = (option: SheetOption) => {
    onClose();
    option.onPress();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Dismiss" />
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + S.lg,
            transform: [
              { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
            opacity: slide,
          },
        ]}
      >
        <View style={styles.grabber} />

        {!!title && <Text style={styles.title}>{title}</Text>}
        {!!message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.options}>
          {options.map((option, index) => {
            const destructive = option.tone === 'destructive';
            const fg = destructive ? colors.error : colors.ink;
            return (
              <TouchableOpacity
                key={option.label}
                style={[styles.option, index > 0 && styles.optionDivider]}
                onPress={() => handle(option)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                {!!option.icon && (
                  <View
                    style={[
                      styles.optionIcon,
                      destructive && { backgroundColor: colors.errorSoft },
                    ]}
                  >
                    <Ionicons name={option.icon as any} size={18} color={fg} />
                  </View>
                )}
                <View style={styles.optionText}>
                  <Text style={[T.subhead, { color: fg }]}>{option.label}</Text>
                  {!!option.description && (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.surface,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: GUTTER,
    paddingTop: S.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.line,
    marginBottom: S.lg,
  },
  title: {
    ...T.heading,
    color: c.ink,
  },
  message: {
    ...T.body,
    color: c.inkMuted,
    marginTop: S.xs,
  },
  options: {
    marginTop: S.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
  },
  optionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: R.control,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.md,
  },
  optionText: { flex: 1 },
  optionDescription: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 1,
  },
  cancel: {
    marginTop: S.sm,
    height: 46,
    borderRadius: R.control,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...T.bodyStrong,
    color: c.inkMuted,
  },
});

export default ActionSheet;
