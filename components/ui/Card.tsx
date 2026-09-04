import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { C, E, R, S } from '../../constants/theme';

/**
 * The content container.
 *
 * `elevation` is hierarchy, not decoration: most cards on a screen should be
 * `flat`, and at most one should be `raised`. The old screens gave every card
 * r20 and the same soft shadow, so nothing led.
 *
 * `accentRule` is the only structural job a category colour has — a 3px rule
 * down the leading edge. Not a gradient, not a coloured ground.
 */
export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  elevation?: keyof typeof E;
  /** Colour of the leading-edge rule. Omit for no rule. */
  accentRule?: string;
  /** Set false to lay out your own padding (media that bleeds to the edge). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  elevation = 'flat',
  accentRule,
  padded = true,
  style,
  accessibilityLabel,
}) => {
  const body = (
    <>
      {!!accentRule && <View style={[styles.rule, { backgroundColor: accentRule }]} />}
      <View style={[padded && styles.padding, !!accentRule && styles.ruleInset]}>{children}</View>
    </>
  );

  const shell = [
    styles.card,
    E[elevation],
    elevation === 'flat' && styles.bordered,
    style,
  ];

  if (!onPress) return <View style={shell}>{body}</View>;

  return (
    <TouchableOpacity
      style={shell}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.card,
    overflow: 'hidden',
  },
  bordered: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  padding: {
    padding: S.lg,
  },
  rule: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  ruleInset: {
    paddingLeft: S.lg,
  },
});

export default Card;
