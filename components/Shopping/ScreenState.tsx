import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { darkShift, type DarkShift } from '../../constants/darkShift';
import { useTheme } from '../../theme';

/**
 * Shared loading / error-with-retry / empty states for the shopping screens.
 *
 * Before this, each screen hand-rolled its own: some had a retry button, some
 * showed an error with no way to recover, and several had no error branch at
 * all — so a failed fetch left a permanently blank screen with no explanation.
 * The visual language here matches the screens that already did it well
 * (BrandList, MyOrders, Wishlist) so nothing looks out of place.
 *
 * The palette is duplicated as a local `ShopColors` const in ~20 shopping
 * screens; this component intentionally exports its own copy rather than
 * adding a 21st inline definition. Consolidating all of them is a separate
 * cleanup.
 */
export const ShopStateColors = {
  primary: '#E67E22',
  surface: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

interface LoadingProps {
  label?: string;
  sublabel?: string;
  emoji?: string;
}

export const LoadingState: React.FC<LoadingProps> = ({
  label = 'Loading...',
  sublabel,
  emoji = '🛍️',
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);

  return (
  <View style={styles.container}>
    <Text style={styles.emoji}>{emoji}</Text>
    <ActivityIndicator size="large" color={ShopStateColors.primary} style={{ marginTop: 16 }} />
    <Text style={styles.title}>{label}</Text>
    {!!sublabel && <Text style={styles.message}>{sublabel}</Text>}
  </View>
  );
};

interface ErrorProps {
  /** Message from the API/thunk. A generic fallback is used when absent. */
  message?: string | null;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorProps> = ({
  message,
  title = "Something went wrong",
  onRetry,
  retryLabel = 'Try Again',
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);

  return (
  <View style={styles.container}>
    <Text style={styles.emoji}>⚠️</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>
      {message || 'Please check your connection and try again.'}
    </Text>
    {!!onRetry && (
      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onRetry}>
        <Text style={styles.buttonText}>{retryLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
  );
};

interface EmptyProps {
  emoji?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyProps> = ({
  emoji = '📦',
  title = 'Nothing here yet',
  message,
  actionLabel,
  onAction,
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);

  return (
  <View style={styles.container}>
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={styles.title}>{title}</Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
    {!!actionLabel && !!onAction && (
      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onAction}>
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '700',
    color: ShopStateColors.textPrimary,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: ShopStateColors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    backgroundColor: ShopStateColors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: ShopStateColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default { LoadingState, ErrorState, EmptyState };
