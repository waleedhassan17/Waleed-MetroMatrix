import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HC } from '../../../constants/HealthcareTheme';
import HCButton from './HCButton';

interface HCEmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
}

const HCEmptyState: React.FC<HCEmptyStateProps> = ({
  icon = 'document-text-outline',
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
}) => {
  const colors =
    tone === 'error'
      ? ([HC.errorLight, '#FECACA'] as [string, string])
      : (HC.gradient.soft as [string, string]);
  const iconColor = tone === 'error' ? HC.error : HC.primary;

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={colors} style={styles.iconWrap}>
        <Ionicons name={icon} size={42} color={iconColor} />
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <HCButton label={actionLabel} onPress={onAction} fullWidth={false} size="md" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 48 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: HC.textHeading, textAlign: 'center', marginBottom: 6 },
  message: { fontSize: 14, fontWeight: '500', color: HC.textLight, textAlign: 'center', lineHeight: 20 },
  action: { marginTop: 22 },
});

export default HCEmptyState;
