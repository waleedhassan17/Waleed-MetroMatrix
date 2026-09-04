import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { C, GUTTER, PROSE_WIDTH, R, S, T } from '../../constants/theme';
import Button from './Button';

/**
 * Empty and error states.
 *
 * An empty state says what is missing and what to do about it. An error state
 * says what happened and offers the retry — never "Something went wrong",
 * which tells the reader nothing they did not already know.
 */
export interface EmptyStateProps {
  /** Ionicons glyph. */
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
  style?: StyleProp<ViewStyle>;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
  style,
}) => {
  const error = tone === 'error';

  return (
    <View style={[styles.wrap, style]}>
      {!!icon && (
        <View style={[styles.icon, error && { backgroundColor: C.errorSoft }]}>
          <Ionicons name={icon as any} size={26} color={error ? C.error : C.inkFaint} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {!!actionLabel && !!onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={error ? 'secondary' : 'primary'}
          size="md"
          fullWidth={false}
          style={styles.action}
        />
      )}
    </View>
  );
};

/** Error state with a retry, for a failed fetch. */
export const ErrorState: React.FC<{
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}> = ({ title = "We couldn't load this", message, onRetry, style }) => (
  <EmptyState
    icon="cloud-offline-outline"
    tone="error"
    title={title}
    message={message || 'Check your connection and try again.'}
    actionLabel={onRetry ? 'Try again' : undefined}
    onAction={onRetry}
    style={style}
  />
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: S.huge,
    paddingHorizontal: GUTTER,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: R.card,
    backgroundColor: C.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.lg,
  },
  title: {
    ...T.subhead,
    color: C.ink,
    textAlign: 'center',
  },
  message: {
    ...T.body,
    color: C.inkMuted,
    textAlign: 'center',
    marginTop: S.sm,
    maxWidth: PROSE_WIDTH,
  },
  action: {
    marginTop: S.xl,
  },
});

export default EmptyState;
