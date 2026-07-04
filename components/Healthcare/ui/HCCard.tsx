import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { HC, HCRadius, HCShadow } from '../../../constants/HealthcareTheme';

interface HCCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  elevation?: 'none' | 'xs' | 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

const HCCard: React.FC<HCCardProps> = ({
  children,
  onPress,
  padded = true,
  elevation = 'sm',
  style,
}) => {
  const cardStyle = [
    styles.card,
    padded && styles.padded,
    elevation !== 'none' && HCShadow[elevation],
    style,
  ];
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: HC.card,
    borderRadius: HCRadius.lg,
    borderWidth: 1,
    borderColor: HC.borderLight,
  },
  padded: { padding: 16 },
});

export default HCCard;
