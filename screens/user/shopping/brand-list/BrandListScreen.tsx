// ============================================
// Brand List Screen — Production UI
// ============================================

import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchBrands,
  loadMoreBrands,
  setSearchQuery,
  setCategoryFilter,
  setSortBy,
  clearError,
  resetBrandList,
} from './brandListSlice';
import type { BrandSortOption } from './brandListSlice';
import type { BrandListItem } from './brandListApi';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

// ── Theme ───────────────────────────────────

const T = {
  bg: '#F8F9FD',
  surface: '#FFFFFF',
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#F0EDFF',
  accent: '#A29BFE',
  text: '#1A1B2E',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E8EAF0',
  star: '#FBBF24',
  danger: '#EF4444',
};

// ── Category Chips ──────────────────────────

const CATEGORIES = ['All', 'Women', 'Men', 'Kids', 'Home'];

// ── Sort Options ────────────────────────────

const SORT_OPTIONS: { key: BrandSortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'az', label: 'A — Z', icon: 'text-outline' },
  { key: 'rating', label: 'Top Rated', icon: 'star-outline' },
  { key: 'newest', label: 'Newest First', icon: 'time-outline' },
  { key: 'products', label: 'Most Products', icon: 'grid-outline' },
];

// ── Skeleton ────────────────────────────────

const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#E5E7EB', opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }) },
        style,
      ]}
    />
  );
};

const BrandCardSkeleton: React.FC = () => (
  <View style={styles.brandCard}>
    <SkeletonBox width={64} height={64} borderRadius={32} />
    <SkeletonBox width={90} height={14} style={{ marginTop: 12 }} />
    <SkeletonBox width={110} height={11} style={{ marginTop: 6 }} />
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
      <SkeletonBox width={50} height={12} />
      <SkeletonBox width={50} height={12} />
    </View>
  </View>
);

// ════════════════════════════════════════════
// ── Main Component
// ════════════════════════════════════════════

const BrandListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const {
    brands,
    searchQuery,
    categoryFilter,
    sortBy,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
  } = useAppSelector((s) => s.brandList);

  const [refreshing, setRefreshing] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showSort, setShowSort] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Initial Load ──────────────────────────

  useEffect(() => {
    dispatch(fetchBrands());
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    return () => {
      dispatch(resetBrandList());
    };
  }, [dispatch]);

  // ── Debounced Search ──────────────────────

  const handleSearchChange = useCallback(
    (text: string) => {
      setLocalSearch(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        dispatch(setSearchQuery(text));
        dispatch(fetchBrands({ search: text }));
      }, 300);
    },
    [dispatch],
  );

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    dispatch(setSearchQuery(''));
    dispatch(fetchBrands({ search: '' }));
  }, [dispatch]);

  // ── Handlers ──────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchBrands());
    setRefreshing(false);
  }, [dispatch]);

  const handleCategoryPress = useCallback(
    (cat: string) => {
      dispatch(setCategoryFilter(cat));
      dispatch(fetchBrands({ category: cat }));
    },
    [dispatch],
  );

  const handleSortSelect = useCallback(
    (opt: BrandSortOption) => {
      dispatch(setSortBy(opt));
      dispatch(fetchBrands({ sortBy: opt }));
      setShowSort(false);
    },
    [dispatch],
  );

  const handleBrandPress = useCallback(
    (brand: BrandListItem) => {
      navigation.navigate(ShoppingRouteNames.BrandStore, { brandId: brand.brandId });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      dispatch(loadMoreBrands());
    }
  }, [dispatch, loadingMore, hasMore]);

  // ── Brand Card ────────────────────────────

  const renderBrandCard = useCallback(
    ({ item }: { item: BrandListItem }) => {
      const initials = item.name.substring(0, 2).toUpperCase();
      return (
        <TouchableOpacity
          style={styles.brandCard}
          onPress={() => handleBrandPress(item)}
          activeOpacity={0.85}
          accessibilityLabel={`${item.name} — ${item.tagline}`}
        >
          {/* Circular Logo */}
          <LinearGradient
            colors={[item.primaryColor, item.secondaryColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandLogo}
          >
            <Text style={styles.brandLogoText}>{initials}</Text>
          </LinearGradient>

          {/* Name & Tagline */}
          <Text style={styles.brandName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.brandTagline} numberOfLines={1}>{item.tagline}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={11} color={T.star} />
              <Text style={styles.statText}>{item.avgRating.toFixed(1)}</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={11} color={T.textTertiary} />
              <Text style={styles.statText}>{item.productCount}</Text>
            </View>
          </View>

          {/* Visit CTA */}
          <View style={styles.visitBtn}>
            <Text style={styles.visitBtnText}>Visit Store</Text>
            <Ionicons name="arrow-forward" size={12} color={T.primary} />
          </View>
        </TouchableOpacity>
      );
    },
    [handleBrandPress],
  );

  // ── Footer (load more) ────────────────────

  const renderFooter = useCallback(() => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={T.primary} />
        <Text style={styles.footerText}>Loading more brands…</Text>
      </View>
    );
  }, [loadingMore]);

  // ── Empty State ───────────────────────────

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyWrap}>
        <LinearGradient
          colors={[T.primaryLight, '#E8E0FF']}
          style={styles.emptyIcon}
        >
          <Ionicons name="storefront-outline" size={48} color={T.primary} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No brands found</Text>
        <Text style={styles.emptyMsg}>
          Try adjusting your search or clearing the filter.
        </Text>
        <TouchableOpacity
          style={styles.clearFilterBtn}
          onPress={() => {
            clearSearch();
            handleCategoryPress('All');
          }}
          accessibilityLabel="Clear all filters"
        >
          <LinearGradient
            colors={[T.primary, T.primaryDark]}
            style={styles.clearFilterGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.clearFilterText}>Clear Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }, [loading, clearSearch, handleCategoryPress]);

  // ── Error State ───────────────────────────

  if (error && !loading && brands.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
        <View style={styles.emptyWrap}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.emptyIcon}>
            <Ionicons name="cloud-offline-outline" size={48} color={T.danger} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptyMsg}>We couldn't load brands. Please try again.</Text>
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => { dispatch(clearError()); dispatch(fetchBrands()); }}
            accessibilityLabel="Retry"
          >
            <LinearGradient colors={[T.primary, T.primaryDark]} style={styles.clearFilterGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.clearFilterText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════
  // ── Main Render
  // ════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} translucent={false} />

      <SafeAreaView style={styles.headerSafe}>
        {/* ── Header Row ─────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>All Brands</Text>
            {!loading && <Text style={styles.headerCount}>{total} brands</Text>}
          </View>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setShowSort(true)}
            accessibilityLabel="Sort brands"
          >
            <Ionicons name="swap-vertical-outline" size={20} color={T.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Sticky Search Bar ──────────────── */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={T.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search brands…"
              placeholderTextColor={T.textTertiary}
              value={localSearch}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search brands"
            />
            {localSearch.length > 0 && (
              <TouchableOpacity onPress={clearSearch} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={T.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Category Chips ─────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {CATEGORIES.map((cat: string) => {
            const isActive = categoryFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleCategoryPress(cat)}
                accessibilityLabel={`Filter: ${cat}`}
                accessibilityState={{ selected: isActive }}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[T.primary, T.primaryDark]}
                    style={styles.chipGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.chipTextActive}>{cat}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.chipText}>{cat}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Brand Grid ───────────────────────── */}
      {loading && brands.length === 0 ? (
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <BrandCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={brands}
          renderItem={renderBrandCard}
          keyExtractor={(item: BrandListItem) => item.brandId}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[T.primary]}
              tintColor={T.primary}
            />
          }
        />
      )}

      {/* ── Sort Bottom Sheet (Modal) ────────── */}
      <Modal
        visible={showSort}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSort(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSort(false)}
        >
          <View style={styles.sortSheet}>
            <View style={styles.sortHandle} />
            <Text style={styles.sortTitle}>Sort Brands</Text>
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortItem, isActive && styles.sortItemActive]}
                  onPress={() => handleSortSelect(opt.key)}
                  accessibilityLabel={`Sort by ${opt.label}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isActive ? T.primary : T.textSecondary}
                  />
                  <Text style={[styles.sortItemText, isActive && styles.sortItemTextActive]}>
                    {opt.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={T.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ══════════════════════════════════════════════
// ── Styles
// ══════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  headerSafe: { backgroundColor: T.bg },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.3 },
  headerCount: { fontSize: 12, color: T.textTertiary, marginTop: 1 },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 14, color: T.text, padding: 0 },

  // Chips
  chipsScroll: { maxHeight: 44, marginBottom: 6 },
  chipsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipActive: { padding: 0, borderWidth: 0 },
  chipGrad: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12 },
  chipText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  chipTextActive: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Grid
  gridContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },

  // Skeleton Grid
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },

  // Brand Card
  brandCard: {
    width: CARD_WIDTH,
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 14 },
      android: { elevation: 3 },
    }),
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  brandName: { fontSize: 15, fontWeight: '700', color: T.text, marginTop: 12, textAlign: 'center' },
  brandTagline: { fontSize: 11, color: T.textTertiary, marginTop: 3, textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: T.border, marginHorizontal: 4 },
  visitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    backgroundColor: T.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  visitBtnText: { fontSize: 12, fontWeight: '700', color: T.primary },

  // Footer
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: { fontSize: 13, color: T.textTertiary },

  // Empty State
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 8 },
  emptyMsg: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  clearFilterBtn: { borderRadius: 14, overflow: 'hidden' },
  clearFilterGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    borderRadius: 14,
  },
  clearFilterText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Sort Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  sortHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sortTitle: { fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 16 },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sortItemActive: { borderBottomColor: T.primaryLight },
  sortItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: T.textSecondary },
  sortItemTextActive: { fontWeight: '700', color: T.primary },
});

export default BrandListScreen;
