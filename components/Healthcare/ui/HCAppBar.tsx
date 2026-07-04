import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { HC } from '../../../constants/HealthcareTheme';

const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

interface HCAppBarProps {
  title: string;
  subtitle?: string;
  variant?: 'solid' | 'gradient' | 'plain';
  /** Hide back when rendered as a tab root. */
  hideBack?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightBadge?: number;
  style?: StyleProp<ViewStyle>;
}

const HCAppBar: React.FC<HCAppBarProps> = ({
  title,
  subtitle,
  variant = 'plain',
  hideBack = false,
  onBack,
  rightIcon,
  onRightPress,
  rightBadge,
  style,
}) => {
  const navigation = useNavigation<any>();
  const onGradient = variant === 'gradient';
  const fg = onGradient ? '#FFFFFF' : HC.textHeading;
  const subFg = onGradient ? 'rgba(255,255,255,0.8)' : HC.textMuted;

  const inner = (
    <View style={[styles.bar, { paddingTop: STATUS_PAD + 8 }]}>
      <View style={styles.side}>
        {!hideBack && (
          <TouchableOpacity
            style={[styles.iconBtn, onGradient && styles.iconBtnOnGradient]}
            onPress={onBack || (() => navigation.goBack())}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={fg} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: subFg }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {rightIcon && (
          <TouchableOpacity
            style={[styles.iconBtn, onGradient && styles.iconBtnOnGradient]}
            onPress={onRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightIcon} size={20} color={fg} />
            {rightBadge != null && rightBadge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{rightBadge > 9 ? '9+' : rightBadge}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (onGradient) {
    return (
      <LinearGradient colors={HC.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View style={[variant === 'solid' && styles.solid, style]}>{inner}</View>
  );
};

const styles = StyleSheet.create({
  solid: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: HC.divider,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    minHeight: 52,
  },
  side: { width: 44, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnOnGradient: { backgroundColor: 'rgba(255,255,255,0.18)' },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: HC.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
});

export default HCAppBar;
