import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, makeColors, type ColorType } from '../../constants/Colors';
import { useTheme } from '../../theme';

interface PriceDisplayProps {
  basePrice: number;
  salePrice?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const ShopColors = { primary: '#E67E22' };

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  basePrice,
  salePrice,
  currency = 'PKR',
  size = 'md',
  style,
}) => {
  const { mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const hasDiscount = !!salePrice && salePrice < basePrice;
  const displayPrice = hasDiscount ? salePrice! : basePrice;

  const fontSizes = { sm: 13, md: 16, lg: 22 };
  const originalSizes = { sm: 10, md: 12, lg: 14 };

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.price, { fontSize: fontSizes[size] }]}>
        {currency} {displayPrice.toLocaleString()}
      </Text>
      {hasDiscount && (
        <Text style={[styles.original, { fontSize: originalSizes[size] }]}>
          {currency} {basePrice.toLocaleString()}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (Colors: ColorType) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  price: {
    fontWeight: '700',
    color: ShopColors.primary,
  },
  original: {
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
});

export default React.memo(PriceDisplay);
