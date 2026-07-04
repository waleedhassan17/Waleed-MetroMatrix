import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HC, HCRadius, HCShadow } from '../../../constants/HealthcareTheme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface HCButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHTS: Record<Size, number> = { sm: 40, md: 50, lg: 56 };
const FONTS: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

const HCButton: React.FC<HCButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}) => {
  const height = HEIGHTS[size];
  const isSolid = variant === 'primary' || variant === 'danger';
  const isDisabled = disabled || loading;

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'secondary'
      ? HC.primaryDark
      : variant === 'outline'
      ? HC.primary
      : HC.textMedium;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={FONTS[size] + 4} color={textColor} />}
          <Text style={[styles.label, { color: textColor, fontSize: FONTS[size] }]}>{label}</Text>
          {iconRight && <Ionicons name={iconRight} size={FONTS[size] + 4} color={textColor} />}
        </>
      )}
    </View>
  );

  const base: StyleProp<ViewStyle> = [
    styles.base,
    { height, borderRadius: HCRadius.md },
    fullWidth && { alignSelf: 'stretch' },
    isDisabled && { opacity: 0.5 },
    style,
  ];

  if (isSolid) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={isDisabled} style={[fullWidth && { alignSelf: 'stretch' }, style]}>
        <LinearGradient
          colors={variant === 'danger' ? [HC.error, HC.errorDark] : HC.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, { height, borderRadius: HCRadius.md }, isDisabled && { opacity: 0.5 }, !isDisabled && HCShadow.brand]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        base,
        variant === 'secondary' && { backgroundColor: HC.primaryLight },
        variant === 'outline' && { borderWidth: 1.5, borderColor: HC.primary, backgroundColor: '#FFFFFF' },
        variant === 'ghost' && { backgroundColor: 'transparent' },
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontWeight: '700', letterSpacing: 0.2 },
});

export default HCButton;
