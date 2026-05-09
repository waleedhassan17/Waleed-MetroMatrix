import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Colors';

export interface ColorOption {
  name: string;
  code: string;
}

interface ColorPickerProps {
  colors: ColorOption[];
  selected: string | null;
  onSelect: (colorName: string) => void;
  showLabels?: boolean;
  style?: ViewStyle;
}

const ShopColors = { primary: '#E67E22' };

const ColorPicker: React.FC<ColorPickerProps> = ({
  colors,
  selected,
  onSelect,
  showLabels = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {colors.map(({ name, code }) => {
        const isActive = selected === name;
        const isLight = code === '#FFFFFF' || code === '#F1C40F' || code === '#FFF5E6';
        return (
          <TouchableOpacity
            key={name}
            style={styles.item}
            onPress={() => onSelect(name)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: code },
                isLight && styles.swatchLight,
                isActive && { borderColor: ShopColors.primary, borderWidth: 3 },
              ]}
            >
              {isActive && (
                <Check size={14} stroke={isLight ? '#333' : '#FFF'} strokeWidth={3} />
              )}
            </View>
            {showLabels && (
              <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                {name}
              </Text>
            )}
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
    gap: Spacing.lg,
  },
  item: {
    alignItems: 'center',
    width: 50,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchLight: {
    borderColor: Colors.borderDark,
  },
  label: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  labelActive: {
    color: ShopColors.primary,
    fontWeight: '600',
  },
});

export default React.memo(ColorPicker);
