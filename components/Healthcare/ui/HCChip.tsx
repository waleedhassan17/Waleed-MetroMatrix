import React, { useMemo } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';

interface HCChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'neutral';
}

const HCChip: React.FC<HCChipProps> = ({ label, selected, onPress, icon, tone = 'primary' }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  const Comp: any = onPress ? TouchableOpacity : View;
  const activeColor = tone === 'primary' ? HC.primary : HC.textBody;
  return (
    <Comp
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : { backgroundColor: '#FFFFFF', borderColor: HC.border },
      ]}
    >
      {icon && (
        <Ionicons name={icon} size={14} color={selected ? '#FFFFFF' : HC.textLight} />
      )}
      <Text style={[styles.label, { color: selected ? '#FFFFFF' : HC.textMedium }]}>{label}</Text>
    </Comp>
  );
};

const makeStyles = (HC: HCPalette) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 13, fontWeight: '600' },
});

export default HCChip;
