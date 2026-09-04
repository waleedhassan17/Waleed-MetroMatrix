import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { B, BRadius, BSpacing } from './theme';
import { F, T, useTheme } from '../../../theme';

interface BrandHeaderProps {
  title: string;
  /** Small line under the title — a count, a filter, the store name. */
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Buttons on the trailing edge. Keep to two. */
  actions?: React.ReactNode;
}

/**
 * The one header for every brand screen.
 *
 * Each screen used to build its own, and they disagreed on all three things
 * that make a header feel settled: the top offset (eight screens padded by
 * StatusBar.currentHeight, which is 0 on iOS and ignores the notch; five had
 * no offset at all, so the title sat under the status bar), the title size,
 * and whether a back control existed. Taking the offset from the safe-area
 * inset fixes the notch and edge-to-edge cases in one place.
 */
export const BrandHeader: React.FC<BrandHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
}) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 10, borderBottomColor: colors.accent },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      {showBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
      )}

      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>

      {!!actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
};

/** Circular icon button sized for the header's trailing edge. */
export const BrandHeaderAction: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
}> = ({ onPress, children }) => (
  <TouchableOpacity
    style={styles.actionBtn}
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    {children}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BSpacing.md,
    paddingHorizontal: BSpacing.xl,
    paddingBottom: 14,
    backgroundColor: B.surface,
    // A 2pt brand stripe replaces the grey hairline. The header keeps a white
    // ground and ink title — a brand-coloured header bar would put the title's
    // legibility at the mercy of whatever hex the vendor picked — so this rule
    // is where the brand actually shows on their own screens.
    borderBottomWidth: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...T.heading,
    color: B.text,
  },
  subtitle: {
    ...T.caption,
    fontFamily: F.medium,
    color: B.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BSpacing.sm,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: BRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
  },
});

export default BrandHeader;
