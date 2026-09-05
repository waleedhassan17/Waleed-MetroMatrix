import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { BorderRadius, makeColors, type ColorType } from '../../constants/Colors';
import { useTheme } from '../../theme';

interface SaleBadgeProps {
  basePrice: number;
  salePrice: number;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const SaleBadge: React.FC<SaleBadgeProps> = ({ basePrice, salePrice, style, size = 'sm' }) => {
  const { mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  if (!salePrice || salePrice >= basePrice) return null;
  const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);

  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, style]}>
      <Text style={[styles.text, size === 'md' && styles.textMd]}>{percent}% OFF</Text>
    </View>
  );
};

const makeStyles = (Colors: ColorType) => StyleSheet.create({
  badge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  textMd: {
    fontSize: 11,
  },
});

export default React.memo(SaleBadge);
