import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, GUTTER, S, T } from '../../constants/theme';

/**
 * The one page header.
 *
 * Solid surface with a hairline rule — no gradient. Seven home-service screens
 * used the identical white-to-slate gradient here, a gradient so slight it read
 * as a rendering artefact while still costing a native view.
 */
export interface AppBarProps {
  title?: string;
  subtitle?: string;
  /** Hide the back chevron on a tab root. */
  hideBack?: boolean;
  onBack?: () => void;
  /** Ionicons glyph for the trailing action. */
  rightIcon?: string;
  onRightPress?: () => void;
  /** Unread count on the trailing action. Hidden at 0. */
  rightBadge?: number;
  /** Anything richer than a single icon. Wins over `rightIcon`. */
  right?: React.ReactNode;
  /** Drop the bottom rule when the content below provides its own edge. */
  borderless?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppBar: React.FC<AppBarProps> = ({
  title,
  subtitle,
  hideBack,
  onBack,
  rightIcon,
  onRightPress,
  rightBadge,
  right,
  borderless,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + S.sm },
        borderless && styles.borderless,
        style,
      ]}
    >
      <View style={styles.slot}>
        {!hideBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={C.ink} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titles} pointerEvents="none">
        {!!title && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.slot, styles.slotEnd]}>
        {right ??
          (rightIcon ? (
            <TouchableOpacity
              onPress={onRightPress}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <Ionicons name={rightIcon as any} size={22} color={C.ink} />
              {!!rightBadge && rightBadge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{rightBadge > 9 ? '9+' : rightBadge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER - S.sm,
    paddingBottom: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  borderless: {
    borderBottomWidth: 0,
  },
  // Equal-width side slots keep the title optically centred whether or not
  // there is a trailing action.
  slot: {
    width: 40,
    alignItems: 'flex-start',
  },
  slotEnd: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...T.subhead,
    color: C.ink,
  },
  subtitle: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: C.inkInverse,
    fontSize: 10,
    lineHeight: Platform.OS === 'ios' ? 13 : 14,
    fontWeight: '700',
  },
});

export default AppBar;
