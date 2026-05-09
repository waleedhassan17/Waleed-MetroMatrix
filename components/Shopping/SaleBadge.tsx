import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { BorderRadius } from '../../constants/Colors';

interface SaleBadgeProps {
  basePrice: number;
  salePrice: number;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const SaleBadge: React.FC<SaleBadgeProps> = ({ basePrice, salePrice, style, size = 'sm' }) => {
  if (!salePrice || salePrice >= basePrice) return null;
  const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);

  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, style]}>
      <Text style={[styles.text, size === 'md' && styles.textMd]}>{percent}% OFF</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
