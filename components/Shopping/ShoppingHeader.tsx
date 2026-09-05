import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '../../constants/theme';
import { MODULE_PALETTES, ThemeColors, useTheme } from '../../theme';

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

interface ShoppingHeaderProps {
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
  const { colors } = useTheme();
  const Colors = useMemo(() => makeColors(colors), [colors]);
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
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
