import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { HC, HCRadius, HCShadow, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';

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
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
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

const makeStyles = (HC: HCPalette) => StyleSheet.create({
  card: {
    backgroundColor: HC.card,
    borderRadius: HCRadius.lg,
    borderWidth: 1,
    borderColor: HC.borderLight,
  },
  padded: { padding: 16 },
});

export default HCCard;
