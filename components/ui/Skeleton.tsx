import React from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { C, R, S } from '../../constants/theme';

/**
 * Loading placeholder.
 *
 * Deliberately STATIC — no shimmer, no pulse loop. Six infinite
 * `Animated.loop`s ran across these screens; an animation that never resolves
 * is noise, not feedback, and it keeps the JS thread busy behind a network
 * call. The shape of the block already says "content is coming".
 */
export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 12,
  radius = R.chip,
  style,
}) => (
  <View
    style={[{ width, height, borderRadius: radius, backgroundColor: C.surfaceSunken }, style]}
  />
);

/** A stand-in for one list card, so a loading list keeps the list's rhythm. */
export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <Skeleton width={36} height={36} radius={18} />
      <View style={styles.rowBody}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="35%" height={11} style={styles.gap} />
      </View>
    </View>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 ? '45%' : '85%'}
        height={11}
        style={styles.line}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: S.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, marginLeft: S.md },
  gap: { marginTop: 6 },
  line: { marginTop: S.md },
});

export default Skeleton;
