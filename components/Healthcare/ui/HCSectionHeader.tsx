import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC } from '../../../constants/HealthcareTheme';

interface HCSectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const HCSectionHeader: React.FC<HCSectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel = 'See All',
  onAction,
}) => (
  <View style={styles.row}>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {onAction && (
      <TouchableOpacity style={styles.action} onPress={onAction} activeOpacity={0.7}>
        <Text style={styles.actionText}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={15} color={HC.primary} />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '800', color: HC.textHeading, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, fontWeight: '500', color: HC.textMuted, marginTop: 2 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: HC.primaryLight,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: HC.primary },
});

export default HCSectionHeader;
