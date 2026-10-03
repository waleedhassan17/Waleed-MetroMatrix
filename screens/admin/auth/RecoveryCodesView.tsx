import React, { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../components/ui';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';

/**
 * The recovery codes, shown exactly once (the server stores only their
 * hashes). The admin must say they saved them before moving on — closing this
 * without a copy is how an account gets locked out.
 */
export interface RecoveryCodesViewProps {
  codes: string[];
  onDone: () => void;
}

const RecoveryCodesView: React.FC<RecoveryCodesViewProps> = ({ codes, onDone }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [saved, setSaved] = useState(false);

  const share = async () => {
    try {
      const result = await Share.share({
        message: `MetroMatrix Admin recovery codes. Each works once.\n\n${codes.join('\n')}`,
      });
      if (result.action === Share.sharedAction) setSaved(true);
    } catch {
      // The share sheet was dismissed or is unavailable — the codes are still on screen.
    }
  };

  return (
    <View>
      <View style={styles.grid} accessibilityLabel={`Recovery codes: ${codes.join(', ')}`}>
        {codes.map((code) => (
          <Text key={code} style={styles.code} selectable>
            {code}
          </Text>
        ))}
      </View>
      <Text style={styles.note}>
        Keep these somewhere safe, like a password manager. Each one signs you in once if you lose your phone. You
        won't see them again.
      </Text>
      <Button label="Save or share codes" variant="secondary" icon="share-outline" onPress={share} fullWidth />
      <Button
        label={saved ? 'Done' : "I've saved my codes"}
        onPress={() => (saved ? onDone() : setSaved(true))}
        fullWidth
        size="lg"
        style={styles.done}
      />
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: S.md,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
      marginBottom: S.lg,
    },
    code: { ...T.mono, color: c.ink, width: '50%', paddingVertical: S.xs },
    note: { ...T.body, color: c.inkMuted, marginBottom: S.lg },
    done: { marginTop: S.md },
  });

export default RecoveryCodesView;
