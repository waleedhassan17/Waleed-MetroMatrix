import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { C, R, S, T } from '../../constants/theme';
import { darkShift } from '../../constants/darkShift';
import { MODULE_PALETTES, ThemeColors, mix, useTheme } from '../../theme';
import BackButton from '../ui/BackButton';

/**
 * The header's own palette, as a function of the ramp.
 *
 * This block is why the Explore header stayed white on a dark page: the screen
 * body below it had been migrated, but the header carried its own frozen
 * surface. Nothing else imports these values, so making it a function is
 * contained to this file.
 */
const makeColors = (c: ThemeColors) => ({
  primary: c.accent,
  surface: c.surface,
  backgroundAlt: c.surfaceSunken,
  textPrimary: c.ink,
  textSecondary: c.inkMuted,
  textMuted: c.inkFaint,
  border: c.lineSoft,
  borderDark: c.line,
});

/** The light instance, for anything reading it outside a component. */
export const Colors = makeColors({ ...C, ...MODULE_PALETTES.shopping });

/**
 * The shopping page-header gradient — the same shape as the healthcare and
 * home-service headers, in shopping's own orange.
 *
 * It starts at the DEEP orange, not the brand orange: white measures 2.9:1 on
 * #E67E22 (fails even large text) but 5.4:1 on #D35400, and it only gets
 * darker from there, so the white title reads everywhere on the ramp. Built
 * from the LIGHT palette's value and then shifted for dark mode, because the
 * dark palette's accentDeep is lightened for text and would glow as a band.
 */
const SHOP_DEEP = MODULE_PALETTES.shopping.accentDeep;
export const shoppingHeaderGradient = (mode: 'light' | 'dark'): [string, string] =>
  darkShift(mode).grad([SHOP_DEEP, mix(SHOP_DEEP, '#000000', 0.22)]);

interface ShoppingHeaderProps {
  /**
   * 'surface' — the white bar (default, unchanged for every existing screen).
   * 'gradient' — the module-page header: shopping's orange gradient under the
   * status bar, rounded bottom, large white title, search pill inside it.
   */
  tone?: 'surface' | 'gradient';
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: React.ReactNode;
  
  // Search Integration
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onSearchPress?: () => void;
  onClearSearch?: () => void;
}

export const ShoppingHeader: React.FC<ShoppingHeaderProps> = ({
  tone = 'surface',
  title,
  subtitle,
  showBack = false,
  onBack,
  rightContent,
  showSearch = false,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  onSearchPress,
  onClearSearch,
}) => {
  const { colors, mode } = useTheme();
  const Colors = useMemo(() => makeColors(colors), [colors]);
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const gradientStyles = useMemo(() => makeGradientStyles(colors), [colors]);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const renderSearchBar = () => {
    if (!showSearch) return null;

    if (onSearchPress) {
      return (
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={onSearchPress}>
          <Search size={18} stroke={Colors.textMuted} strokeWidth={2} />
          <Text style={styles.searchPlaceholder}>{searchPlaceholder}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.searchBar}>
        <Search size={18} stroke={Colors.textMuted} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={Colors.textMuted}
          value={searchValue}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {searchValue.length > 0 && onClearSearch && (
          <TouchableOpacity
            onPress={onClearSearch}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} stroke={Colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (tone === 'gradient') {
    return (
      <LinearGradient
        colors={shoppingHeaderGradient(mode)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          gradientStyles.wrap,
          { paddingTop: insets.top + S.xl, paddingBottom: showSearch ? S.xxl : S.xxxl },
        ]}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={gradientStyles.row}>
          {showBack && <BackButton tone="onAccent" onPress={handleBack} />}
          <View style={gradientStyles.titles}>
            <Text style={gradientStyles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={gradientStyles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>{rightContent}</View>
        </View>

        {showSearch && (
          <TouchableOpacity
            style={gradientStyles.search}
            activeOpacity={0.85}
            onPress={onSearchPress}
            disabled={!onSearchPress}
            accessibilityRole="search"
          >
            <Search size={18} stroke={colors.inkFaint} strokeWidth={2} />
            <Text style={gradientStyles.searchText} numberOfLines={1}>
              {searchPlaceholder}
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.headerWrapper, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerMain}>
        <View style={styles.headerLeft}>
          {showBack && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <ChevronLeft size={24} stroke={Colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{title}</Text>
            {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
          </View>
        </View>

        <View style={styles.headerRight}>
          {rightContent}
        </View>
      </View>
      
      {showSearch && (
        <View style={styles.searchContainer}>
          {renderSearchBar()}
        </View>
      )}
    </View>
  );
};

const makeGradientStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: R.sheet,
    borderBottomRightRadius: R.sheet,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  titles: {
    flex: 1,
  },
  title: {
    ...T.title,
    color: c.inkInverse,
  },
  subtitle: {
    ...T.label,
    color: c.inkInverseSoft,
    marginTop: S.xs,
  },
  // A white pill on the orange, like the search field in healthcare's header.
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: R.control,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    marginTop: S.lg,
  },
  searchText: {
    ...T.body,
    color: c.inkFaint,
    marginLeft: S.sm,
    flex: 1,
  },
});

const makeStyles = (Colors: ReturnType<typeof makeColors>) => StyleSheet.create({
  headerWrapper: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 6,
    marginLeft: -6,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
