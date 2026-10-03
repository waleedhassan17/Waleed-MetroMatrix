import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, FormSheet, TextField } from '../ui';
import { S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * Confirm a consequential action — approve, reject, suspend, refund, delete.
 *
 * Replaces the native Alert.alert confirmations: an Alert cannot take a
 * reason, cannot show the server's refusal next to the button, and looks like
 * the OS rather than the app. Every reason typed here is stored in the audit
 * log next to the admin who acted.
 */
export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Ask for a reason; the confirm button stays disabled until one is given. */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  busy?: boolean;
  /** The server's refusal, shown in the sheet so the admin can correct and retry. */
  error?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  /** Extra content between the message and the reason (e.g. reasons a delete is blocked). */
  children?: React.ReactNode;
}

const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  requireReason,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Recorded in the audit log',
  minReasonLength = 3,
  busy,
  error,
  onConfirm,
  onClose,
  children,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!visible) setReason('');
  }, [visible]);

  const ready = !requireReason || reason.trim().length >= minReasonLength;

  return (
    <FormSheet
      visible={visible}
      title={title}
      onClose={onClose}
      busy={busy}
      footer={
        <Button
          label={confirmLabel}
          variant={destructive ? 'destructive' : 'primary'}
          onPress={() => onConfirm(reason.trim())}
          loading={busy}
          disabled={!ready || busy}
          fullWidth
          size="lg"
        />
      }
    >
      {!!message && <Text style={styles.message}>{message}</Text>}
      {children}
      {requireReason && (
        <TextField
          label={reasonLabel}
          placeholder={reasonPlaceholder}
          value={reason}
          onChangeText={setReason}
          multiline
          editable={!busy}
          helper={reason.trim().length < minReasonLength ? `At least ${minReasonLength} characters.` : undefined}
        />
      )}
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </FormSheet>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    message: { ...T.body, color: c.inkMuted, marginBottom: S.lg },
    error: { ...T.body, color: c.error, marginTop: S.sm },
  });

export default ConfirmSheet;
