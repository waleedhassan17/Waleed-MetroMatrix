import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { darkShift, type DarkShift } from '../../constants/darkShift';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { makeColors, Spacing, BorderRadius, type ColorType } from '../../constants/Colors';
import { Typography } from '../../constants/Fonts';

interface VerifiedBadgeProps {
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'small',
  showLabel = false,
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh, Colors), [sh, Colors]);
  const iconSize = size === 'small' ? 14 : 18;

  if (!showLabel) {
    return (
      <Ionicons
        name="checkmark-circle"
        size={iconSize}
        color={Colors.categories.medical.primary}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons
        name="shield-checkmark"
        size={iconSize}
        color={Colors.categories.medical.primary}
      />
      <Text style={[styles.label, size === 'medium' && styles.labelMedium]}>
        Verified
      </Text>
    </View>
  );
};

const makeStyles = (sh: DarkShift, Colors: ColorType) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.categories.medical.light,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  label: {
    ...Typography.caption.small,
    color: Colors.categories.medical.primary,
    fontWeight: '600',
  },
  labelMedium: {
    ...Typography.caption.large,
  },
});

export default VerifiedBadge;
