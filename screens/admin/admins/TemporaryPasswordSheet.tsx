import React, { useMemo } from 'react';
import { Share, StyleSheet, Text } from 'react-native';

import { Button, FormSheet } from '../../../components/ui';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';

/**
 * A temporary password, shown exactly once (the server stores only its hash).
 * The admin it belongs to must change it at first sign-in.
 */
const TemporaryPasswordSheet: React.FC<{ visible: boolean; email?: string; password: string | null; onClose: () => void }> = ({
  visible,
  email,
  password,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const share = async () => {
    if (!password) return;
    try {
      await Share.share({ message: `MetroMatrix admin sign-in${email ? ` for ${email}` : ''}\nTemporary password: ${password}\nYou will be asked to choose a new one.` });
    } catch {
      // Dismissed — the password is still on screen.
    }
  };

  return (
    <FormSheet
      visible={visible}
      title="Temporary password"
      subtitle="Shown once. Give it to the admin securely; they choose their own at first sign-in."
      onClose={onClose}
      footer={<Button label="Done" onPress={onClose} fullWidth size="lg" />}
    >
      <Text style={styles.password} selectable accessibilityLabel={`Temporary password ${password?.split('').join(' ')}`}>
        {password}
      </Text>
      <Button label="Share securely" variant="secondary" icon="share-outline" onPress={share} fullWidth />
    </FormSheet>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    password: {
      ...T.mono,
      fontSize: T.subhead.fontSize,
      lineHeight: T.subhead.lineHeight,
      color: c.ink,
      textAlign: 'center',
      padding: S.lg,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surfaceSunken,
      marginBottom: S.lg,
    },
  });

export default TemporaryPasswordSheet;
