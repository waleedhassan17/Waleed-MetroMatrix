import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import { Typography } from '../../constants/Fonts';
import type { Specialty } from '../../models/healthcare/types';

// Map specialty icon strings to Ionicons names
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  heart: 'heart-outline',
  brain: 'fitness-outline',
  bone: 'body-outline',
  eye: 'eye-outline',
  baby: 'happy-outline',
  tooth: 'sparkles-outline',
  skin: 'leaf-outline',
  lungs: 'cloud-outline',
  kidney: 'water-outline',
  stomach: 'nutrition-outline',
};

// Distinct palette for specialty cards
const CARD_COLORS = [
  { bg: '#DBEAFE', fg: '#3B82F6' },
  { bg: '#D1FAE5', fg: '#10B981' },
  { bg: '#FEF3C7', fg: '#F59E0B' },
  { bg: '#EDE9FE', fg: '#8B5CF6' },
  { bg: '#CFFAFE', fg: '#06B6D4' },
  { bg: '#FEE2E2', fg: '#EF4444' },
  { bg: '#FEF9C3', fg: '#EAB308' },
  { bg: '#D6E8FF', fg: '#2A7FFF' },
];

interface SpecialtyCardProps {
  specialty: Specialty;
  index?: number;
  onPress?: (specialty: Specialty) => void;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ specialty, index = 0, onPress }) => {
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const iconName = ICON_MAP[specialty.icon] ?? 'medkit-outline';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(specialty)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: color.bg }]}>  
        <Ionicons name={iconName} size={24} color={color.fg} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {specialty.name}
      </Text>
      <Text style={styles.count}>
        {specialty.doctorCount} {specialty.doctorCount === 1 ? 'Doctor' : 'Doctors'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.small,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    ...Typography.label.medium,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  count: {
    ...Typography.caption.medium,
    color: Colors.text.tertiary,
  },
});

export default SpecialtyCard;
