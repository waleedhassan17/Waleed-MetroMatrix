import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Colors = {
  primary: '#E67E22',
  surface: '#FFFFFF',
  backgroundAlt: '#F8F9FA',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F3F4F6',
  borderDark: '#E5E7EB',
};

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

const styles = StyleSheet.create({
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
