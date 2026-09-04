import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { bookingStatus } from '../../constants/HomeServiceTheme';
import { F, R, S, T } from '../../constants/theme';

/**
 * The ONE status indicator.
 *
 * A booking card used to carry a status badge, a category pill, a rating pill
 * and a price pill in the same 80pt of height — pill soup, where nothing reads
 * first. A card gets one of these; everything else is plain text.
 *
 * Colour comes from `bookingStatus()` in constants/HomeServiceTheme, so an
 * unmapped server status degrades to a readable neutral pill instead of
 * crashing the list on lookup.
 */
export interface StatusPillProps {
  status?: string | null;
  size?: 'sm' | 'md';
  /** Hide the leading glyph where space is tight. */
  hideIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md', hideIcon, style }) => {
  const s = bookingStatus(status);
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: s.bg, paddingVertical: small ? 3 : 5 },
        style,
      ]}
      accessibilityLabel={`Status: ${s.label}`}
    >
      {!hideIcon && (
        <Ionicons name={s.icon as any} size={small ? 11 : 13} color={s.color} style={styles.icon} />
      )}
      <Text style={[small ? styles.textSm : T.label, { color: s.color }]} numberOfLines={1}>
        {s.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: S.sm,
    borderRadius: R.chip,
  },
  icon: { marginRight: 4 },
  textSm: { ...T.micro },
});

export default StatusPill;
