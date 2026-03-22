import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Colors';
import { Typography } from '../../constants/Fonts';

type ConsultationType = 'in-clinic' | 'video' | 'both';

interface ConsultationTypeBadgeProps {
  type: ConsultationType;
  compact?: boolean;
}

const CONFIG: Record<ConsultationType, { icon: keyof typeof Ionicons.glyphMap; label: string }[]> = {
  'in-clinic': [{ icon: 'medical-outline', label: 'In-Clinic' }],
  video: [{ icon: 'videocam-outline', label: 'Video' }],
  both: [
    { icon: 'medical-outline', label: 'In-Clinic' },
    { icon: 'videocam-outline', label: 'Video' },
  ],
};

const ConsultationTypeBadge: React.FC<ConsultationTypeBadgeProps> = ({
  type,
  compact = false,
}) => {
  const items = CONFIG[type];

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.label} style={styles.badge}>
          <Ionicons name={item.icon} size={compact ? 12 : 14} color={Colors.categories.medical.primary} />
          {!compact && <Text style={styles.label}>{item.label}</Text>}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.categories.medical.light,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  label: {
    ...Typography.caption.medium,
    color: Colors.categories.medical.primary,
  },
});

export default ConsultationTypeBadge;
