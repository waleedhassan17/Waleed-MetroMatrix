import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Colors';

interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (quantity: number) => void;
  style?: ViewStyle;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  min = 1,
  max = 99,
  onChange,
  style,
}) => {
  const handleDecrement = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) onChange(value + 1);
  }, [value, max, onChange]);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.btn, value <= min && styles.btnDisabled]}
        disabled={value <= min}
        onPress={handleDecrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Minus size={16} stroke={value <= min ? Colors.text.tertiary : Colors.text.primary} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity
        style={[styles.btn, value >= max && styles.btnDisabled]}
        disabled={value >= max}
        onPress={handleIncrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Plus size={16} stroke={value >= max ? Colors.text.tertiary : Colors.text.primary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  btnDisabled: {
    backgroundColor: Colors.backgroundAlt,
    borderColor: Colors.borderLight,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },
});

export default React.memo(QuantitySelector);
