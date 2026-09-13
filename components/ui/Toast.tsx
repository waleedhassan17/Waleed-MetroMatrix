import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { E, GUTTER, R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * A short, self-dismissing message — "Slot closed", "Couldn't save. Try again."
 *
 * The doctor screens hand-rolled three different success banners and used a
 * native Alert for failures that asked for no decision. A message that asks
 * nothing should not block the screen, and should not look like the OS.
 *
 * Mount one <ToastHost /> per stack; call `showToast()` from anywhere.
 */
export type ToastTone = 'neutral' | 'success' | 'error';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  /** Defaults to 2.8 s, or 4.5 s for errors — they take longer to read. */
  durationMs?: number;
}

type QueuedToast = ToastOptions & { id: number };

const listeners = new Set<(toast: QueuedToast) => void>();
let nextId = 0;

export function showToast(options: ToastOptions | string): void {
  const toast = typeof options === 'string' ? { message: options } : options;
  nextId += 1;
  listeners.forEach((listener) => listener({ ...toast, id: nextId }));
}

const ICON: Record<ToastTone, string> = {
  neutral: 'information-circle',
  success: 'checkmark-circle',
  error: 'alert-circle',
};

export interface ToastHostProps {
  /** Distance above the bottom safe area, so a toast clears the tab bar. */
  bottomOffset?: number;
}

export const ToastHost: React.FC<ToastHostProps> = ({ bottomOffset = 76 }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [toast, setToast] = useState<QueuedToast | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (reducedMotion) {
      progress.setValue(0);
      setToast(null);
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: 140, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [progress, reducedMotion]);

  useEffect(() => {
    const listener = (next: QueuedToast) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(next);
      if (reducedMotion) progress.setValue(1);
      else Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, next.durationMs ?? (next.tone === 'error' ? 4500 : 2800));
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hide, progress, reducedMotion]);

  if (!toast) return null;
  const tone = toast.tone ?? 'neutral';
  // The toast is ink on paper inverted, so the soft status tones are the ones
  // that read on it in both modes.
  const iconColor = tone === 'success' ? colors.successSoft : tone === 'error' ? colors.errorSoft : colors.inkInverse;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + bottomOffset,
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={hide}
        style={styles.toast}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint="Tap to dismiss"
      >
        <Ionicons name={ICON[tone] as any} size={18} color={iconColor} />
        <Text style={styles.text} numberOfLines={3}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: GUTTER,
      right: GUTTER,
      alignItems: 'center',
      zIndex: 1000,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      maxWidth: 520,
      backgroundColor: c.ink,
      borderRadius: R.control,
      paddingVertical: S.md,
      paddingHorizontal: S.lg,
      ...E.overlay,
    },
    text: {
      ...T.label,
      color: c.inkInverse,
      flex: 1,
      marginLeft: S.sm,
    },
  });

export default ToastHost;
