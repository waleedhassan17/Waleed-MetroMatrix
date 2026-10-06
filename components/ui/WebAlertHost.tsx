import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type AlertButton } from 'react-native';

import { E, R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { resolveWebAlert, subscribeWebAlerts, type WebAlertRequest } from '../../utils/webAlert';

/**
 * Renders Alert.alert on web (see utils/webAlert.ts).
 *
 * Shows the oldest queued alert with every one of its buttons and runs the
 * pressed button's onPress, so flows that only continue from inside an alert
 * work in the browser. Mirrors the native rules for leaving without a button:
 * Escape or a tap outside dismiss only when `cancelable` is set, and Escape
 * otherwise presses the alert's cancel-style button when it has one.
 *
 * Mounted once at the app root, on web only.
 */
const WebAlertHost: React.FC = () => {
  const [queue, setQueue] = useState<readonly WebAlertRequest[]>([]);
  useEffect(() => subscribeWebAlerts(setQueue), []);

  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const current = queue[0];
  if (!current) return null;

  const cancelable = current.options?.cancelable === true;
  const cancelButton = current.buttons.find((b) => b.style === 'cancel');
  const onRequestClose = () => {
    if (cancelable) resolveWebAlert(current.id);
    else if (cancelButton) resolveWebAlert(current.id, cancelButton);
  };
  const stacked = current.buttons.length > 2;

  const labelStyle = (button: AlertButton) => [
    styles.buttonText,
    button.style === 'destructive' && styles.destructiveText,
    button.style === 'cancel' && styles.cancelText,
  ];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.scrim}
          onPress={cancelable ? () => resolveWebAlert(current.id) : undefined}
          accessible={false}
        />
        <View style={styles.card} accessibilityRole="alert" aria-modal>
          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && <Text style={styles.message}>{current.message}</Text>}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {current.buttons.map((button, index) => (
              <Pressable
                key={`${index}-${button.text ?? 'OK'}`}
                onPress={() => resolveWebAlert(current.id, button)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, stacked && styles.buttonStacked, pressed && styles.buttonPressed]}
              >
                <Text style={labelStyle(button)}>{button.text ?? 'OK'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: S.xxl,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.scrim,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: c.surface,
      borderRadius: R.card,
      paddingTop: S.xl,
      paddingHorizontal: S.xl,
      paddingBottom: S.md,
      ...E.overlay,
    },
    title: {
      ...T.subhead,
      color: c.ink,
    },
    message: {
      ...T.body,
      color: c.inkMuted,
      marginTop: S.sm,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      marginTop: S.lg,
    },
    actionsStacked: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    button: {
      minHeight: 40,
      paddingHorizontal: S.md,
      borderRadius: R.control,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: S.xs,
    },
    buttonStacked: {
      marginLeft: 0,
    },
    buttonPressed: {
      backgroundColor: c.surfaceSunken,
    },
    buttonText: {
      ...T.bodyStrong,
      color: c.accentDeep,
    },
    destructiveText: {
      color: c.error,
    },
    cancelText: {
      color: c.inkMuted,
    },
  });

export default WebAlertHost;
