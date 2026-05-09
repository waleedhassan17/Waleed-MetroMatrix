import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Colors';

interface SizeSelectorProps {
  sizes: string[];
  selected: string | null;
  onSelect: (size: string) => void;
  disabledSizes?: string[];
  style?: ViewStyle;
}

const ShopColors = { primary: '#E67E22' };

const SizeSelector: React.FC<SizeSelectorProps> = ({
  sizes,
  selected,
  onSelect,
  disabledSizes = [],
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {sizes.map((size) => {
        const isActive = selected === size;
        const isDisabled = disabledSizes.includes(size);
        return (
          <TouchableOpacity
            key={size}
            style={[
              styles.chip,
              isActive && styles.chipActive,
              isDisabled && styles.chipDisabled,
            ]}
            disabled={isDisabled}
            onPress={() => onSelect(size)}
          >
            <Text
              style={[
                styles.chipText,
                isActive && styles.chipTextActive,
                isDisabled && styles.chipTextDisabled,
              ]}
            >
              {size}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: ShopColors.primary,
    borderColor: ShopColors.primary,
  },
  chipDisabled: {
    backgroundColor: Colors.backgroundAlt,
    borderColor: Colors.borderLight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: '#FFF',
  },
  chipTextDisabled: {
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
});

export default React.memo(SizeSelector);
